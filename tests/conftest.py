"""
conftest.py — Fixtures globales para la suite de testing (Pytest).

Contiene generadores de archivos DICOM simulados, imágenes sintéticas
y mocks de los modelos para acelerar las pruebas.
"""

import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock

import numpy as np
import pydicom
import pytest
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import UID
from PIL import Image

# Necesario para mockear la API
from fastapi.testclient import TestClient
from src.api.main import app
from src.api.routes import get_predictor


@pytest.fixture(scope="session")
def dummy_dicom_path():
    """Genera un archivo DICOM simulado temporal con metadatos PII."""
    suffix = ".dcm"
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = UID('1.2.840.10008.5.1.4.1.1.1') # CR Image Storage
    file_meta.MediaStorageSOPInstanceUID = UID('1.2.3')
    file_meta.ImplementationClassUID = UID('1.2.3.4')
    
    ds = FileDataset(path, {}, file_meta=file_meta, preamble=b"\0" * 128)
    
    # Metadatos PII simulados (deben ser anonimizados)
    ds.PatientName = "Test^Patient"
    ds.PatientID = "123456"
    ds.PatientBirthDate = "19900101"
    
    # Metadatos médicos
    ds.Modality = "CR"
    ds.BodyPartExamined = "CHEST"
    
    # Matriz de píxeles aleatoria
    pixel_array = np.random.randint(0, 4096, (512, 512), dtype=np.uint16)
    ds.PixelData = pixel_array.tobytes()
    ds.Rows = 512
    ds.Columns = 512
    ds.BitsAllocated = 16
    ds.BitsStored = 12
    ds.HighBit = 11
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    
    ds.is_little_endian = True
    ds.is_implicit_VR = True
    
    ds.save_as(path)
    
    yield path
    
    os.remove(path)


@pytest.fixture(scope="session")
def dummy_image_path():
    """Genera un archivo PNG sintético temporal."""
    fd, path = tempfile.mkstemp(suffix=".png")
    os.close(fd)
    
    img = Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))
    img.save(path)
    
    yield path
    
    os.remove(path)


@pytest.fixture
def mock_predictor():
    """Mock del MedVisionPredictor para pruebas rápidas de API."""
    mock = MagicMock()
    mock.device = "cpu"
    mock.class_names = {0: "normal", 1: "anomalía"}
    
    # Simular output del predict()
    mock.predict.return_value = {
        "prediction": 1,
        "class_name": "anomalía",
        "confidence": 0.95,
        "probabilities": {"normal": 0.05, "anomalía": 0.95},
        "metadata": {"Format": "test"},
        "overlay": np.zeros((224, 224, 3), dtype=np.uint8)
    }
    
    # Mockear el info del modelo
    mock.model.get_model_info.return_value = {
        "backbone": "mock_efficientnet",
        "num_classes": 2
    }
    
    return mock


@pytest.fixture
def api_client(mock_predictor):
    """Cliente de pruebas FastAPI con dependencias mockeadas."""
    app.dependency_overrides[get_predictor] = lambda: mock_predictor
    
    with TestClient(app) as client:
        yield client
        
    app.dependency_overrides.clear()
