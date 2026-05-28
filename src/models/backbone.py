"""
backbone.py — Arquitecturas base para detección médica.

Soporta EfficientNet-B4 (recomendado), ResNet-50/101, DenseNet-121.
Todos con pesos pre-entrenados en ImageNet y adaptación a 1 canal (grayscale).
"""

import logging
from typing import Optional

import torch
import torch.nn as nn
from torchvision import models

logger = logging.getLogger(__name__)

# Arquitecturas soportadas según INSTRUCCIONS.MD
SUPPORTED_BACKBONES = {
    "efficientnet_b4",
    "resnet50",
    "resnet101",
    "densenet121",
}


def create_backbone(
    architecture: str = "efficientnet_b4",
    pretrained: bool = True,
    in_channels: int = 1,
    freeze_layers: bool = False,
) -> nn.Module:
    """Factory para crear backbones pre-entrenados.

    Args:
        architecture: Nombre de la arquitectura. Default 'efficientnet_b4'.
        pretrained: Si True, carga pesos ImageNet.
        in_channels: Canales de entrada (1 para grayscale DICOM, 3 para RGB).
        freeze_layers: Si True, congela pesos del backbone (feature extraction).

    Returns:
        Backbone nn.Module con la capa de clasificación removida.
    """
    if architecture not in SUPPORTED_BACKBONES:
        raise ValueError(
            f"Arquitectura '{architecture}' no soportada. "
            f"Opciones: {SUPPORTED_BACKBONES}"
        )

    weights = "IMAGENET1K_V1" if pretrained else None

    if architecture == "efficientnet_b4":
        model = models.efficientnet_b4(weights=weights)
        # Adaptar primera capa a 1 canal si necesario
        if in_channels != 3:
            _adapt_first_conv(model.features[0][0], in_channels)
        num_features = model.classifier[1].in_features
        model.classifier = nn.Identity()  # Remover cabeza original

    elif architecture.startswith("resnet"):
        model_fn = models.resnet50 if architecture == "resnet50" else models.resnet101
        model = model_fn(weights=weights)
        if in_channels != 3:
            _adapt_first_conv(model.conv1, in_channels)
        num_features = model.fc.in_features
        model.fc = nn.Identity()

    elif architecture == "densenet121":
        model = models.densenet121(weights=weights)
        if in_channels != 3:
            _adapt_first_conv(model.features.conv0, in_channels)
        num_features = model.classifier.in_features
        model.classifier = nn.Identity()

    # Congelar pesos si se solicita (transfer learning mode)
    if freeze_layers:
        for param in model.parameters():
            param.requires_grad = False

    # Almacenar num_features como atributo para el detector
    model.num_features = num_features

    logger.info(
        "Backbone: %s | pretrained=%s | in_ch=%d | features=%d | frozen=%s",
        architecture, pretrained, in_channels, num_features, freeze_layers,
    )
    return model


def _adapt_first_conv(conv_layer: nn.Conv2d, in_channels: int):
    """Adapta la primera capa convolucional a un número diferente de canales.

    Promedia los pesos pre-entrenados de 3 canales a `in_channels` canales,
    preservando la información aprendida.
    """
    old_weight = conv_layer.weight.data
    # Promediar pesos de 3 canales → 1 canal
    new_weight = old_weight.mean(dim=1, keepdim=True)
    if in_channels > 1:
        new_weight = new_weight.repeat(1, in_channels, 1, 1)

    conv_layer.in_channels = in_channels
    conv_layer.weight = nn.Parameter(new_weight)
