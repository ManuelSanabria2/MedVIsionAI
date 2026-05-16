"""
Módulo de datos — Carga, preprocesamiento y gestión de datasets médicos.

Incluye soporte para imágenes DICOM, PNG y JPEG con pipelines
de normalización y data augmentation configurables.
"""

from src.data.loader import DICOMLoader, ImageLoader
from src.data.preprocessor import MedicalImagePreprocessor
from src.data.dataset import MedicalImageDataset

__all__ = [
    "DICOMLoader",
    "ImageLoader",
    "MedicalImagePreprocessor",
    "MedicalImageDataset",
]
