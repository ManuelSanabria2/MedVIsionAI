"""
Módulo de modelos — Arquitecturas de deep learning para detección médica.

Incluye AnomalyDetector (EfficientNet-B4 backbone), Focal Loss
para desbalance de clases, y factory functions.
"""

from src.models.detector import AnomalyDetector, MedicalDetector
from src.models.loss import FocalLoss, WeightedCrossEntropy, get_loss_function
from src.models.backbone import create_backbone, SUPPORTED_BACKBONES

__all__ = [
    "AnomalyDetector",
    "MedicalDetector",
    "FocalLoss",
    "WeightedCrossEntropy",
    "get_loss_function",
    "create_backbone",
    "SUPPORTED_BACKBONES",
]
