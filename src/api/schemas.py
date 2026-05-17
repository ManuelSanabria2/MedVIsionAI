"""
schemas.py — Esquemas de validación de datos para la API (Pydantic).

Define los contratos de entrada y salida para los endpoints de la API,
asegurando tipos correctos y validación automática, integrándose
con Swagger/OpenAPI.

Universidad Santo Tomás · Tunja, Boyacá
"""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field, ConfigDict


class HealthResponse(BaseModel):
    """Esquema para el endpoint de estado (Healthcheck)."""
    status: str = Field(..., description="Estado general del servicio", examples=["healthy", "degraded"])
    model_loaded: bool = Field(..., description="Indica si el modelo de ML está en memoria")
    device: str = Field(..., description="Dispositivo de cómputo actual", examples=["cuda", "cpu"])
    version: str = Field(..., description="Versión de la API")


class ModelInfoResponse(BaseModel):
    """Esquema para información del modelo activo."""
    architecture: str = Field(..., description="Arquitectura del backbone", examples=["efficientnet_b4"])
    num_classes: int = Field(..., description="Número de clases de salida")
    class_names: Dict[int, str] = Field(..., description="Mapeo de índices a nombres de clase")
    training_date: str = Field(..., description="Fecha de último entrenamiento")
    metrics: Dict[str, float] = Field(..., description="Métricas de validación (AUC-ROC, F1, etc.)")


class PredictionResponse(BaseModel):
    """Esquema de respuesta para el endpoint de predicción."""
    prediction_id: str = Field(..., description="UUID único de la predicción (para feedback)")
    prediction: int = Field(..., description="Índice de la clase predicha", examples=[1])
    class_detected: str = Field(..., description="Nombre de la clase predicha", examples=["anomalía"])
    confidence: float = Field(..., ge=0.0, le=1.0, description="Nivel de confianza de la predicción")
    gradcam_url: Optional[str] = Field(None, description="URL relativa para acceder al mapa de calor generado")
    inference_time_ms: float = Field(..., description="Tiempo total de inferencia en milisegundos")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Metadatos DICOM extraídos (anonimizados)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "prediction_id": "123e4567-e89b-12d3-a456-426614174000",
                "prediction": 1,
                "class_detected": "anomalía",
                "confidence": 0.945,
                "gradcam_url": "/static/heatmaps/123e4567.png",
                "inference_time_ms": 145.2,
                "metadata": {"Modality": "CR", "BodyPartExamined": "CHEST", "_anonymized": "true"}
            }
        }
    )


class FeedbackRequest(BaseModel):
    """Esquema para enviar feedback/correcciones clínicas."""
    prediction_id: str = Field(..., description="UUID de la predicción original")
    correct_label: int = Field(..., description="Índice de la clase correcta según criterio médico")
    clinical_notes: Optional[str] = Field(None, description="Notas opcionales del especialista")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "prediction_id": "123e4567-e89b-12d3-a456-426614174000",
                "correct_label": 0,
                "clinical_notes": "Falsa alarma por artefacto en la imagen."
            }
        }
    )
