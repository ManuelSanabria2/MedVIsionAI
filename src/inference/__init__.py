"""
Módulo de Inferencia — Predicción y Explicabilidad (XAI).

Incluye el MedVisionPredictor para ejecutar el pipeline completo de
inferencia desde la imagen raw hasta la predicción, y GradCAM para
generar mapas de calor visuales explicativos.
"""

from src.inference.predictor import MedVisionPredictor, MedicalPredictor
from src.inference.explainability import GradCAM, MedicalExplainability

__all__ = [
    "MedVisionPredictor",
    "MedicalPredictor",
    "GradCAM",
    "MedicalExplainability",
]
