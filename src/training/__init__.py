"""
Módulo de entrenamiento — Loop de entrenamiento, métricas y callbacks.

Gestiona el ciclo completo de entrenamiento con validación,
registro en MLflow y checkpointing automático.
"""

from src.training.trainer import Trainer
from src.training.metrics import MetricsCalculator
from src.training.callbacks import EarlyStopping, ModelCheckpoint

__all__ = [
    "Trainer",
    "MetricsCalculator",
    "EarlyStopping",
    "ModelCheckpoint",
]
