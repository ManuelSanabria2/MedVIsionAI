"""
schemas.py — Modelos Pydantic para la API REST.

Define los esquemas de request/response para los endpoints
de predicción, explicabilidad y estado del sistema.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Respuesta del endpoint de salud."""
    status: str = "healthy"
    model_loaded: bool
    device: str
    version: str = "0.1.0"


class ModelInfoResponse(BaseModel):
    """Información del modelo activo."""
    architecture: str
    num_classes: int
    class_names: Dict[int, str]
    checkpoint_epoch: Optional[int] = None
    confidence_threshold: float


class PredictionResponse(BaseModel):
    """Respuesta de predicción."""
    prediction: int
    class_name: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    probabilities: Dict[str, float]
    metadata: Dict[str, str] = {}
    heatmap_url: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "prediction": 1,
                "class_name": "anomalía",
                "confidence": 0.92,
                "probabilities": {"normal": 0.08, "anomalía": 0.92},
                "metadata": {"Modality": "CR", "BodyPartExamined": "CHEST"},
                "heatmap_url": "/static/heatmaps/result_001.png",
            }
        }


class BatchPredictionResponse(BaseModel):
    """Respuesta de predicción por lote."""
    results: List[PredictionResponse]
    total: int


class ErrorResponse(BaseModel):
    """Respuesta de error."""
    error: str
    detail: Optional[str] = None
