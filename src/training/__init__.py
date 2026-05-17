"""
Módulo de entrenamiento — Loop de optimización y evaluación.

Incluye el MedVisionTrainer con integración a MLflow, early stopping,
y callbacks automáticos. También expone funciones de evaluación de
métricas clínicas (AUC-ROC, Sensibilidad, etc.).
"""

from src.training.trainer import MedVisionTrainer
from src.training.metrics import compute_metrics, format_metrics_report, MetricResults

__all__ = [
    "MedVisionTrainer",
    "compute_metrics",
    "format_metrics_report",
    "MetricResults",
]
