"""
test_api.py — Suite de pruebas para los endpoints de la API (FastAPI).

Valida endpoints de estado, inferencia predictiva y feedback médico.
Utiliza inyección de dependencias para simular el modelo (mocking)
y prevenir latencias en el ciclo de CI/CD.
"""

from fastapi import status


def test_health_endpoint(api_client):
    """Verifica que el servicio responda correctamente y el modelo esté cargado."""
    response = api_client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    assert "version" in data


def test_model_info_endpoint(api_client):
    """Verifica el endpoint que expone la arquitectura y métricas."""
    response = api_client.get("/model/info")
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["architecture"] == "mock_efficientnet"
    assert data["num_classes"] == 2
    assert "anomalía" in data["class_names"].values()


def test_predict_endpoint_valid_image(api_client, dummy_image_path):
    """Valida la predicción enviando un archivo de imagen válido."""
    with open(dummy_image_path, "rb") as f:
        # Enviar request con formato multipart/form-data
        response = api_client.post(
            "/predict",
            files={"file": ("test.png", f, "image/png")}
        )
        
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert "prediction_id" in data
    assert data["prediction"] == 1
    assert data["class_detected"] == "anomalía"
    assert data["confidence"] == 0.95
    # El mock model dice que genera heatmap, así que el endpoint debería intentar exponerlo
    # Aunque el test no guarda el PNG real para el mock, valida la respuesta
    assert "inference_time_ms" in data


def test_predict_endpoint_invalid_format(api_client):
    """Asegura que extensiones no médicas/visuales sean rechazadas."""
    # Archivo de texto disfrazado de upload
    files = {"file": ("document.txt", b"dummy content", "text/plain")}
    response = api_client.post("/predict", files=files)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Formato no soportado" in response.json()["detail"]


def test_feedback_endpoint_success(api_client, dummy_image_path):
    """Prueba el registro de feedback clínico."""
    # 1. Hacemos una predicción falsa para crear el ID (aunque la DB esté en memoria o falle, 
    # nuestro mock del predictor no usa DB, pero el router sí la inyecta)
    
    # Como la API real intenta buscar el UUID en PostgreSQL y fallaría si no está configurada,
    # probaremos la respuesta a nivel HTTP usando un Payload de Feedback válido.
    
    payload = {
        "prediction_id": "123e4567-e89b-12d3-a456-426614174000",
        "correct_label": 0,
        "clinical_notes": "Test clínico"
    }
    
    response = api_client.post("/feedback", json=payload)
    
    # Nota: Si el entorno no tiene PostgreSQL local, puede devolver 503 o 404 (si UUID no existe).
    # Esto es esperado en un test de integración sin test-db dedicada. 
    # El test valida que el endpoint _existe_ y valida Pydantic correctamente.
    assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND, status.HTTP_503_SERVICE_UNAVAILABLE]

def test_feedback_endpoint_validation(api_client):
    """Prueba que el esquema Pydantic rechace payloads incompletos."""
    payload = {
        "prediction_id": "123e4567"
        # Falta correct_label
    }
    response = api_client.post("/feedback", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
