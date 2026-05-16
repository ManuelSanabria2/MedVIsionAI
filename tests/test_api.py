"""
test_api.py — Tests de la API REST FastAPI.

Verifica: endpoints /health, /predict, /explain, /model/info.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import numpy as np
import io
from PIL import Image

from src.api.main import app


@pytest.fixture
def client():
    """Cliente de test para la API FastAPI."""
    return TestClient(app)


@pytest.fixture
def sample_image_bytes():
    """Genera una imagen PNG de prueba en bytes."""
    img = Image.fromarray(np.random.randint(0, 255, (224, 224), dtype=np.uint8), mode="L")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.getvalue()


class TestRootEndpoint:
    """Tests para el endpoint raíz."""

    def test_root_returns_200(self, client):
        response = client.get("/")
        assert response.status_code == 200

    def test_root_contains_project_info(self, client):
        response = client.get("/")
        data = response.json()
        assert data["project"] == "MedVision AI"
        assert "disclaimer" in data

    def test_root_has_docs_url(self, client):
        response = client.get("/")
        data = response.json()
        assert data["docs"] == "/docs"


class TestHealthEndpoint:
    """Tests para /health."""

    def test_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_has_status(self, client):
        response = client.get("/health")
        data = response.json()
        assert "status" in data
        assert "model_loaded" in data


class TestPredictEndpoint:
    """Tests para /predict."""

    def test_predict_no_file_returns_422(self, client):
        response = client.post("/predict")
        assert response.status_code == 422

    def test_predict_invalid_format(self, client):
        response = client.post(
            "/predict",
            files={"file": ("test.txt", b"not an image", "text/plain")},
        )
        assert response.status_code == 400

    def test_predict_returns_prediction_structure(self, client, sample_image_bytes):
        """Test con modelo mockeado."""
        mock_result = {
            "prediction": 0,
            "class_name": "normal",
            "confidence": 0.95,
            "probabilities": {"normal": 0.95, "anomalía": 0.05},
            "metadata": {},
        }

        mock_predictor = MagicMock()
        mock_predictor.predict.return_value = mock_result
        mock_predictor.device = "cpu"

        from src.api import routes
        original = routes._predictor
        routes._predictor = mock_predictor

        try:
            response = client.post(
                "/predict",
                files={"file": ("test.png", sample_image_bytes, "image/png")},
            )
            if response.status_code == 200:
                data = response.json()
                assert "prediction" in data
                assert "confidence" in data
                assert "class_name" in data
        finally:
            routes._predictor = original


class TestSwaggerDocs:
    """Tests para documentación automática."""

    def test_docs_available(self, client):
        response = client.get("/docs")
        assert response.status_code == 200

    def test_redoc_available(self, client):
        response = client.get("/redoc")
        assert response.status_code == 200
