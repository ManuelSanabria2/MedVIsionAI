"""
routes.py — Endpoints REST de la API MedVision AI.

Endpoints:
    POST /predict — Subir imagen, retornar predicción + confianza
    POST /explain — Predicción + mapa Grad-CAM
    GET  /health  — Estado del servicio
    GET  /model/info — Versión del modelo y métricas
"""

import io
import logging
import tempfile
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile

from src.api.schemas import (
    ErrorResponse, HealthResponse, ModelInfoResponse, PredictionResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Referencia global al predictor (inyectada desde main.py)
_predictor = None


def set_predictor(predictor):
    """Inyecta la instancia del predictor en las rutas."""
    global _predictor
    _predictor = predictor


@router.get("/health", response_model=HealthResponse, tags=["Sistema"])
async def health_check():
    """Verifica el estado del servicio y modelo."""
    return HealthResponse(
        status="healthy",
        model_loaded=_predictor is not None,
        device=_predictor.device if _predictor else "N/A",
    )


@router.get("/model/info", response_model=ModelInfoResponse, tags=["Modelo"])
async def model_info():
    """Retorna información del modelo activo."""
    if _predictor is None:
        raise HTTPException(status_code=503, detail="Modelo no cargado")

    return ModelInfoResponse(
        architecture=_predictor.model.architecture,
        num_classes=_predictor.model.num_classes,
        class_names=_predictor.class_names,
        confidence_threshold=_predictor.threshold,
    )


@router.post("/predict", response_model=PredictionResponse, tags=["Predicción"])
async def predict(file: UploadFile = File(...)):
    """Analiza una imagen médica y retorna la predicción.

    Soporta formatos: DICOM (.dcm), PNG, JPEG.

    Retorna: clase predicha, confianza, probabilidades por clase
    y metadatos DICOM (si aplica, anonimizados).
    """
    if _predictor is None:
        raise HTTPException(status_code=503, detail="Modelo no cargado")

    # Validar tipo de archivo
    allowed = {".dcm", ".png", ".jpg", ".jpeg"}
    suffix = Path(file.filename or "upload.png").suffix.lower()
    if suffix not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Formato no soportado: {suffix}. Permitidos: {allowed}",
        )

    # Guardar archivo temporal
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = _predictor.predict(tmp_path, generate_heatmap=False)
        return PredictionResponse(
            prediction=result["prediction"],
            class_name=result["class_name"],
            confidence=result["confidence"],
            probabilities=result["probabilities"],
            metadata=result.get("metadata", {}),
        )
    except Exception as e:
        logger.error("Error en predicción: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        Path(tmp_path).unlink(missing_ok=True)


@router.post("/explain", response_model=PredictionResponse, tags=["Explicabilidad"])
async def explain(file: UploadFile = File(...)):
    """Analiza imagen + genera mapa de calor Grad-CAM.

    Retorna predicción con URL del heatmap superpuesto.
    """
    if _predictor is None:
        raise HTTPException(status_code=503, detail="Modelo no cargado")

    suffix = Path(file.filename or "upload.png").suffix.lower()

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = _predictor.predict(tmp_path, generate_heatmap=True)

        # Guardar heatmap overlay
        heatmap_url = None
        if "overlay" in result:
            from PIL import Image
            overlay = (result["overlay"] * 255).astype(np.uint8)
            heatmap_img = Image.fromarray(overlay)
            heatmap_path = Path("static/heatmaps") / f"heatmap_{Path(file.filename).stem}.png"
            heatmap_path.parent.mkdir(parents=True, exist_ok=True)
            heatmap_img.save(str(heatmap_path))
            heatmap_url = f"/static/heatmaps/{heatmap_path.name}"

        return PredictionResponse(
            prediction=result["prediction"],
            class_name=result["class_name"],
            confidence=result["confidence"],
            probabilities=result["probabilities"],
            metadata=result.get("metadata", {}),
            heatmap_url=heatmap_url,
        )
    except Exception as e:
        logger.error("Error en explicabilidad: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        Path(tmp_path).unlink(missing_ok=True)
