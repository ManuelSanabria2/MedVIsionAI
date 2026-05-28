"""
main.py — Punto de entrada para la API REST de MedVision AI.

Configura la aplicación FastAPI, inicializa el CORS, monta recursos
estáticos y carga el modelo en memoria durante el evento de inicio (startup).

Universidad Santo Tomás · Tunja, Boyacá
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.api.routes import router
import src.api.routes as routes_module

# --- Configuración de Logging ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# --- Configuración del Modelo ---
MODEL_PATH = os.getenv("MODEL_PATH", "checkpoints/best_model.pth")
USE_MLFLOW = os.getenv("USE_MLFLOW_MODEL", "false").lower() == "true"
MLFLOW_MODEL_NAME = os.getenv("MLFLOW_MODEL_NAME", "medvision-detector")
MLFLOW_STAGE = os.getenv("MLFLOW_STAGE", "Production")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Maneja el ciclo de vida de la aplicación (startup/shutdown)."""
    logger.info("Iniciando API MedVision AI...")
    
    # 1. Cargar el predictor globalmente
    from src.inference.predictor import MedVisionPredictor
    
    try:
        if USE_MLFLOW:
            logger.info("Intentando cargar modelo desde MLflow Registry: %s (Stage: %s)", MLFLOW_MODEL_NAME, MLFLOW_STAGE)
            predictor = MedVisionPredictor.from_mlflow(model_name=MLFLOW_MODEL_NAME, stage=MLFLOW_STAGE)
        else:
            logger.info("Cargando modelo desde checkpoint local: %s", MODEL_PATH)
            # Para evitar errores en desarrollo si no existe el archivo aún, lo ignoramos temporalmente 
            # en un escenario real se detendría o se cargaría un fallback
            if os.path.exists(MODEL_PATH):
                predictor = MedVisionPredictor.from_checkpoint(MODEL_PATH)
            else:
                logger.warning("Checkpoint no encontrado en %s. Inicializando modelo aleatorio para debug.", MODEL_PATH)
                from src.models.detector import AnomalyDetector
                model = AnomalyDetector(pretrained=False, in_channels=1)
                predictor = MedVisionPredictor(model=model)
                
        # Inyectar al módulo de rutas
        routes_module._predictor = predictor
        logger.info("Modelo cargado exitosamente. Dispositivo: %s", predictor.device)
        
    except Exception as e:
        logger.error("Fallo crítico al cargar el modelo: %s", e)
        # No matamos la app para que /health pueda reportar el estado degradado
        routes_module._predictor = None

    # Continuar ejecución
    yield

    # Shutdown
    logger.info("Apagando API y liberando recursos...")
    routes_module._predictor = None


# --- Definición de la Aplicación (Swagger) ---
app = FastAPI(
    title="MedVision AI API",
    description=(
        "API REST para la detección de anomalías en imágenes médicas (DICOM/PNG).\n\n"
        "### Funcionalidades:\n"
        "- **Inferencia**: Clasificación binaria (Normal/Anomalía)\n"
        "- **XAI**: Mapas de calor (Grad-CAM) para interpretabilidad clínica\n"
        "- **Feedback**: Sistema de recolección de correcciones médicas (Active Learning)\n\n"
        "> ⚠️ **Aviso Clínico**: Este sistema es un prototipo de investigación académica "
        "desarrollado en la Universidad Santo Tomás. **NO es un dispositivo médico certificado** "
        "y no debe usarse como único criterio diagnóstico."
    ),
    version="0.1.0",
    lifespan=lifespan,
    contact={
        "name": "Ingeniería de Datos e IA - Universidad Santo Tomás",
        "url": "https://github.com/manue-usta/MedVisionAI",
    }
)

# --- CORS (Seguridad Ley 1581 / HIPAA) ---
_cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000")
CORS_ORIGINS = [o.strip() for o in _cors_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)
logger.info("CORS configurado para orígenes: %s", CORS_ORIGINS)

# --- Montar estáticos (para los mapas de calor Grad-CAM) ---
HEATMAP_DIR = os.path.join("static", "heatmaps")
HEATMAP_MAX_AGE_HOURS = int(os.getenv("HEATMAP_MAX_AGE_HOURS", "72"))
os.makedirs(HEATMAP_DIR, exist_ok=True)


def _purge_old_heatmaps():
    """Elimina mapas de calor con antigüedad superior a HEATMAP_MAX_AGE_HOURS."""
    import time
    now = time.time()
    max_age_seconds = HEATMAP_MAX_AGE_HOURS * 3600
    purged = 0
    for fname in os.listdir(HEATMAP_DIR):
        fpath = os.path.join(HEATMAP_DIR, fname)
        if os.path.isfile(fpath) and (now - os.path.getmtime(fpath)) > max_age_seconds:
            try:
                os.remove(fpath)
                purged += 1
            except OSError:
                pass
    if purged:
        logger.info("Heatmap purge: eliminados %d archivos con antigüedad >%dh.", purged, HEATMAP_MAX_AGE_HOURS)


_purge_old_heatmaps()
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- Registrar Router ---
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("API_PORT", 8000))
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=port, reload=True)
