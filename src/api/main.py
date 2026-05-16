"""
main.py — Aplicación FastAPI para MedVision AI.

Servidor de API REST para análisis de imágenes médicas.
Documentación automática Swagger en /docs.

NOTA: Este es un prototipo de investigación académica,
NO un dispositivo médico certificado por INVIMA.
"""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv()

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)

# Crear app FastAPI
app = FastAPI(
    title="MedVision AI",
    description=(
        "API REST para detección de anomalías y tumores en imágenes médicas. "
        "Universidad Santo Tomás · Tunja, Boyacá · Ingeniería de Datos e IA. "
        "\n\n⚠️ **Prototipo de investigación** — No es un dispositivo médico certificado."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir archivos estáticos (heatmaps)
static_dir = Path("static/heatmaps")
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.on_event("startup")
async def startup_event():
    """Carga el modelo al iniciar la aplicación."""
    from src.api.routes import router, set_predictor

    # Registrar rutas
    app.include_router(router, prefix="", tags=["API"])

    # Intentar cargar modelo si existe checkpoint
    model_path = os.getenv("MODEL_PATH", "checkpoints/best_model.pth")
    if Path(model_path).exists():
        try:
            from src.inference.predictor import MedicalPredictor
            predictor = MedicalPredictor.from_checkpoint(
                model_path,
                architecture=os.getenv("MODEL_ARCHITECTURE", "efficientnet_b4"),
                num_classes=int(os.getenv("NUM_CLASSES", "2")),
            )
            set_predictor(predictor)
            logger.info("✅ Modelo cargado desde %s", model_path)
        except Exception as e:
            logger.warning("⚠️ No se pudo cargar modelo: %s", e)
            logger.info("API disponible sin modelo. Entrena uno primero.")
    else:
        logger.info("⚠️ No se encontró checkpoint en %s. API sin modelo.", model_path)


@app.get("/", tags=["Root"])
async def root():
    """Endpoint raíz con información del proyecto."""
    return {
        "project": "MedVision AI",
        "description": "Detección de Anomalías y Tumores en Imágenes Médicas",
        "institution": "Universidad Santo Tomás · Tunja, Boyacá",
        "version": "0.1.0",
        "docs": "/docs",
        "disclaimer": "Prototipo de investigación académica. No es dispositivo médico certificado.",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.api.main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", "8000")),
        reload=True,
    )
