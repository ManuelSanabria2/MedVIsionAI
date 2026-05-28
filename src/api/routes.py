"""
routes.py — Definición de los endpoints de la API REST.

Implementa la lógica principal de predicción, feedback médico, y logging.
Incluye manejo de rate limiting y validación de tipos MIME.

Universidad Santo Tomás · Tunja, Boyacá
"""

import logging
import os
import shutil
import tempfile
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from src.api.database import PredictionLog, get_db
from src.api.schemas import FeedbackRequest, HealthResponse, ModelInfoResponse, PredictionResponse, PredictionsListResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Configuración de almacenamiento local ---
HEATMAPS_DIR = Path("static/heatmaps")
HEATMAPS_DIR.mkdir(parents=True, exist_ok=True)

# --- Referencia global al predictor (se carga en main.py) ---
_predictor = None

def get_predictor():
    """Obtiene la instancia global del predictor."""
    global _predictor
    if _predictor is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Modelo no cargado. Verifique los logs del servidor."
        )
    return _predictor

# --- Rate Limiter (En memoria para dev/prototipo) ---
class RateLimiter:
    def __init__(self, requests_per_minute: int = 100):
        self.rate = requests_per_minute
        self.ip_records: Dict[str, list] = {}

    def __call__(self, request: Request):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        # Limpiar registros antiguos
        if client_ip in self.ip_records:
            self.ip_records[client_ip] = [t for t in self.ip_records[client_ip] if now - t < 60.0]
        else:
            self.ip_records[client_ip] = []
            
        if len(self.ip_records[client_ip]) >= self.rate:
            logger.warning("Rate limit excedido para IP: %s", client_ip)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Límite de peticiones excedido (100/min)."
            )
            
        self.ip_records[client_ip].append(now)

rate_limit = RateLimiter(requests_per_minute=100)


# ==============================================================================
# Endpoints
# ==============================================================================

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Verifica el estado del servicio y la carga del modelo."""
    global _predictor
    return HealthResponse(
        status="healthy",
        model_loaded=(_predictor is not None),
        device=_predictor.device if _predictor else "unknown",
        version="0.1.0"
    )


@router.get("/model/info", response_model=ModelInfoResponse)
async def model_info(predictor = Depends(get_predictor)):
    """Retorna información detallada sobre el modelo activo."""
    info = predictor.model.get_model_info()
    return ModelInfoResponse(
        architecture=info.get("backbone", "unknown"),
        num_classes=info.get("num_classes", 2),
        class_names=predictor.class_names,
        training_date=datetime.now().strftime("%Y-%m-%d"), # En un caso real vendría del registro MLflow
        metrics={"auc_roc_target": 0.85, "sensitivity_target": 0.80}
    )


@router.post("/predict", response_model=PredictionResponse, dependencies=[Depends(rate_limit)])
async def predict_image(
    request: Request,
    file: UploadFile = File(...),
    predictor = Depends(get_predictor),
    db: Session = Depends(get_db)
):
    """
    Analiza una imagen médica (DICOM, PNG, JPEG), detecta anomalías,
    genera un mapa de calor Grad-CAM y registra el resultado.
    """
    # Validar formato
    allowed_extensions = {".dcm", ".dicom", ".png", ".jpg", ".jpeg"}
    ext = os.path.splitext(file.filename)[1].lower()
    
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato no soportado: {ext}. Permitidos: {allowed_extensions}"
        )

    # Crear ID único
    pred_id = str(uuid.uuid4())
    start_time = time.time()
    
    # Guardar archivo temporalmente
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        # Inferencia con Grad-CAM
        result = predictor.predict(tmp_path, generate_heatmap=True)
        
        # Guardar heatmap si se generó
        heatmap_url = None
        heatmap_db_path = None
        if result["overlay"] is not None:
            heatmap_filename = f"{pred_id}.png"
            heatmap_path = HEATMAPS_DIR / heatmap_filename
            # Convertir a BGR para guardar con cv2
            cv2.imwrite(str(heatmap_path), cv2.cvtColor(result["overlay"], cv2.COLOR_RGB2BGR))
            heatmap_url = str(request.url_for("static", path=f"heatmaps/{heatmap_filename}"))
            heatmap_db_path = heatmap_url
            
        inference_time = (time.time() - start_time) * 1000

        # Loggear en PostgreSQL
        if db is not None:
            try:
                log_entry = PredictionLog(
                    id=pred_id,
                    predicted_class=result["prediction"],
                    confidence=result["confidence"],
                    inference_time_ms=inference_time,
                    heatmap_path=heatmap_db_path
                )
                db.add(log_entry)
                db.commit()
            except Exception as e:
                logger.error("Error guardando log en BD: %s", e)
                db.rollback()

        return PredictionResponse(
            prediction_id=pred_id,
            prediction=result["prediction"],
            class_detected=result["class_name"],
            confidence=result["confidence"],
            gradcam_url=heatmap_url,
            inference_time_ms=inference_time,
            metadata=result["metadata"]
        )

    except Exception as e:
        logger.error("Error durante la predicción: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando la imagen: {str(e)}"
        )
    finally:
        # Limpiar archivo temporal
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.post("/feedback", status_code=status.HTTP_200_OK, dependencies=[Depends(rate_limit)])
async def submit_feedback(
    feedback: FeedbackRequest,
    db: Session = Depends(get_db)
):
    """
    Recibe la corrección del especialista médico sobre una predicción.
    Este feedback se almacena para futuros ciclos de re-entrenamiento (Active Learning).
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Base de datos no disponible para guardar feedback."
        )
        
    log_entry = db.query(PredictionLog).filter(PredictionLog.id == feedback.prediction_id).first()
    if not log_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ID de predicción no encontrado."
        )
        
    try:
        log_entry.corrected_class = feedback.correct_label
        log_entry.clinical_notes = feedback.clinical_notes
        log_entry.feedback_timestamp = datetime.utcnow()
        db.commit()
        return {"message": "Feedback registrado correctamente", "prediction_id": feedback.prediction_id}
    except Exception as e:
        db.rollback()
        logger.error("Error guardando feedback: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al registrar el feedback."
        )


@router.get("/predictions", response_model=PredictionsListResponse, dependencies=[Depends(rate_limit)])
async def get_predictions(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Obtiene el historial de predicciones y feedback almacenado en la base de datos PostgreSQL.
    Útil para alimentar dashboards analíticos del frontend.
    """
    if db is None:
        # En caso de dev sin DB local, devolvemos lista vacía en vez de explotar para que el Dashboard cargue
        logger.warning("Base de datos no disponible. Devolviendo historial vacío.")
        return PredictionsListResponse(total=0, predictions=[])
        
    try:
        total = db.query(PredictionLog).count()
        logs = db.query(PredictionLog).order_by(PredictionLog.timestamp.desc()).offset(offset).limit(limit).all()
        return PredictionsListResponse(total=total, predictions=logs)
    except Exception as e:
        logger.error("Error consultando logs de predicción: %s", e)
        # Fallback sutil si falla la tabla o query
        return PredictionsListResponse(total=0, predictions=[])
