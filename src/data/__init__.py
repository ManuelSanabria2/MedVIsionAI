"""
Módulo de datos — Carga, preprocesamiento y gestión de datasets médicos.

Incluye soporte para imágenes DICOM (pydicom + SimpleITK), PNG y JPEG
con pipelines de normalización window/level, aspect-preserving resize,
y data augmentation configurables.
"""

from src.data.preprocessor import DICOMPreprocessor, MedicalImagePreprocessor, WINDOW_LEVEL_PRESETS
from src.data.dataset import MedicalImageDataset, create_splits, create_dataloaders

__all__ = [
    "DICOMPreprocessor",
    "MedicalImagePreprocessor",
    "MedicalImageDataset",
    "create_splits",
    "create_dataloaders",
    "WINDOW_LEVEL_PRESETS",
]
