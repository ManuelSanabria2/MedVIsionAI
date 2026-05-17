"""
test_preprocessing.py — Suite de pruebas para preprocesamiento médico.

Valida la carga DICOM, anonimización PII, normalización window/level,
manejo de excepciones y dimensiones de los tensores resultantes.
"""

import os
import tempfile
from pathlib import Path

import pytest
import torch

from src.data.preprocessor import DICOMPreprocessor

def test_dicom_loading_and_shape(dummy_dicom_path):
    """Prueba la carga correcta y el redimensionado del tensor."""
    preprocessor = DICOMPreprocessor.for_inference()
    tensor, metadata = preprocessor.process(dummy_dicom_path)
    
    # Verificar dimensiones esperadas (1, 224, 224) para grayscale
    assert tensor.dim() == 3
    assert tensor.shape == (1, 224, 224)
    assert isinstance(tensor, torch.Tensor)


def test_dicom_anonymization(dummy_dicom_path):
    """Asegura que los metadatos PII sean eliminados (Ley 1581)."""
    preprocessor = DICOMPreprocessor.for_inference()
    _, metadata = preprocessor.process(dummy_dicom_path)
    
    # Metadatos que pusimos en el mock
    assert metadata.get("Modality") == "CR"
    
    # PII debe estar ausente o filtrado
    assert "PatientName" not in metadata
    assert "PatientID" not in metadata
    assert "PatientBirthDate" not in metadata
    assert metadata.get("_anonymized") is True


def test_normalization_range(dummy_dicom_path):
    """Verifica que el tensor de salida esté en el rango [0, 1]."""
    preprocessor = DICOMPreprocessor.for_inference()
    tensor, _ = preprocessor.process(dummy_dicom_path)
    
    assert tensor.min() >= 0.0
    assert tensor.max() <= 1.0


def test_corrupt_dicom_handling():
    """Prueba que un archivo no DICOM lance una excepción controlada."""
    preprocessor = DICOMPreprocessor.for_inference()
    
    # Crear archivo corrupto temporal
    fd, path = tempfile.mkstemp(suffix=".dcm")
    with os.fdopen(fd, 'w') as f:
        f.write("Esto no es un DICOM válido")
        
    try:
        with pytest.raises(Exception):
            preprocessor.process(path)
    finally:
        os.remove(path)


def test_standard_image_processing(dummy_image_path):
    """Prueba la ruta de procesamiento para PNG/JPG estándar."""
    preprocessor = DICOMPreprocessor.for_inference()
    tensor = preprocessor.process_standard_image(dummy_image_path)
    
    assert tensor.dim() == 3
    assert tensor.shape == (1, 224, 224)
    assert tensor.min() >= 0.0
    assert tensor.max() <= 1.0
