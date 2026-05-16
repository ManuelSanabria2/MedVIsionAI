"""
test_model.py — Tests del modelo de detección médica.

Verifica: creación de backbone, detector, forward pass, loss functions.
"""

import pytest
import torch
import numpy as np

from src.models.backbone import create_backbone, SUPPORTED_BACKBONES
from src.models.detector import MedicalDetector
from src.models.loss import FocalLoss, WeightedCrossEntropy, get_loss_function


class TestBackbone:
    """Tests para el módulo backbone."""

    def test_supported_backbones(self):
        assert "efficientnet_b4" in SUPPORTED_BACKBONES
        assert "resnet50" in SUPPORTED_BACKBONES
        assert "densenet121" in SUPPORTED_BACKBONES

    def test_unsupported_architecture(self):
        with pytest.raises(ValueError, match="no soportada"):
            create_backbone("invalid_arch")

    def test_efficientnet_creation(self):
        model = create_backbone("efficientnet_b4", pretrained=False, in_channels=1)
        assert hasattr(model, "num_features")
        assert model.num_features > 0

    def test_resnet50_creation(self):
        model = create_backbone("resnet50", pretrained=False, in_channels=1)
        assert hasattr(model, "num_features")

    def test_grayscale_adaptation(self):
        model = create_backbone("efficientnet_b4", pretrained=False, in_channels=1)
        x = torch.randn(2, 1, 224, 224)
        out = model(x)
        assert out.shape[0] == 2


class TestMedicalDetector:
    """Tests para MedicalDetector."""

    def test_binary_classification(self):
        model = MedicalDetector(
            architecture="efficientnet_b4", num_classes=2,
            pretrained=False, in_channels=1,
        )
        x = torch.randn(2, 1, 224, 224)
        out = model(x)
        assert out.shape == (2, 2)

    def test_multiclass(self):
        model = MedicalDetector(
            architecture="efficientnet_b4", num_classes=3,
            pretrained=False, in_channels=1,
        )
        x = torch.randn(2, 1, 224, 224)
        out = model(x)
        assert out.shape == (2, 3)

    def test_predict_proba(self):
        model = MedicalDetector(pretrained=False, in_channels=1)
        x = torch.randn(1, 1, 224, 224)
        proba = model.predict_proba(x)
        assert proba.shape == (1, 2)
        assert abs(proba.sum().item() - 1.0) < 1e-5  # Probabilities sum to 1

    def test_get_feature_layer(self):
        model = MedicalDetector(pretrained=False)
        layer = model.get_feature_layer()
        assert layer is not None


class TestLossFunctions:
    """Tests para funciones de pérdida."""

    def test_focal_loss_shape(self):
        loss_fn = FocalLoss(gamma=2.0)
        inputs = torch.randn(4, 2)
        targets = torch.tensor([0, 1, 0, 1])
        loss = loss_fn(inputs, targets)
        assert loss.dim() == 0  # Scalar

    def test_focal_loss_positive(self):
        loss_fn = FocalLoss()
        inputs = torch.randn(4, 2)
        targets = torch.tensor([0, 1, 0, 1])
        loss = loss_fn(inputs, targets)
        assert loss.item() > 0

    def test_weighted_ce(self):
        loss_fn = WeightedCrossEntropy(class_weights=[0.3, 0.7])
        inputs = torch.randn(4, 2)
        targets = torch.tensor([0, 1, 0, 1])
        loss = loss_fn(inputs, targets)
        assert loss.item() > 0

    def test_get_loss_function_factory(self):
        assert isinstance(get_loss_function("focal"), FocalLoss)
        assert isinstance(get_loss_function("ce"), torch.nn.CrossEntropyLoss)
        assert isinstance(get_loss_function("weighted_ce"), WeightedCrossEntropy)

    def test_get_loss_invalid(self):
        with pytest.raises(ValueError):
            get_loss_function("invalid")
