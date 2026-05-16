"""
Módulo de inferencia — Predicción y explicabilidad.

Incluye el predictor para nuevas imágenes y generación
de mapas de calor Grad-CAM para explicabilidad del modelo.
"""

from src.inference.predictor import MedicalPredictor
from src.inference.explainability import GradCAM

__all__ = [
    "MedicalPredictor",
    "GradCAM",
]
