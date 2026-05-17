"""
test_model.py — Suite de pruebas para el modelo de predicción (EfficientNet).

Valida el forward pass, las dimensiones de los tensores de salida,
extracción de la última capa convolucional para Grad-CAM y
la serialización/deserialización de pesos (checkpoints).
"""

import os
import tempfile

import pytest
import torch
import torch.nn as nn

from src.models.detector import AnomalyDetector


@pytest.fixture
def detector():
    """Fixture que retorna el modelo base (con pesos aleatorios para tests rápidos)."""
    return AnomalyDetector(pretrained=False, in_channels=1)


def test_forward_pass_dimensions(detector):
    """Prueba que el forward pass retorne las dimensiones correctas (B, 2)."""
    batch_size = 4
    # Tensor sintético: Batch=4, Channels=1, Height=224, Width=224
    dummy_input = torch.randn(batch_size, 1, 224, 224)
    
    detector.eval()
    with torch.no_grad():
        output = detector(dummy_input)
        
    assert output.dim() == 2
    assert output.size(0) == batch_size
    assert output.size(1) == 2


def test_gradcam_layer_access(detector):
    """Verifica que el modelo exponga la última capa convolucional."""
    last_conv = detector.get_last_conv_layer()
    assert last_conv is not None
    assert isinstance(last_conv, nn.Module)


def test_checkpoint_save_load(detector):
    """Prueba la serialización (guardado) y deserialización (carga)."""
    fd, path = tempfile.mkstemp(suffix=".pth")
    os.close(fd)
    
    try:
        # 1. Modificar un peso ligeramente para comparar
        with torch.no_grad():
            detector.classifier[3].weight[0, 0] = 9.99
            
        # 2. Guardar estado
        torch.save(detector.state_dict(), path)
        
        # 3. Crear modelo nuevo
        new_detector = AnomalyDetector(pretrained=False, in_channels=1)
        
        # Asegurar que el nuevo es diferente
        assert new_detector.classifier[3].weight[0, 0].item() != 9.99
        
        # 4. Cargar estado
        new_detector.load_state_dict(torch.load(path))
        
        # 5. Verificar igualdad
        assert new_detector.classifier[3].weight[0, 0].item() == pytest.approx(9.99)
        
    finally:
        os.remove(path)
