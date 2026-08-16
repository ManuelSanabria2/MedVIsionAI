"""
detector.py — Modelo de detección de anomalías en imágenes médicas.

Arquitectura:
    EfficientNet-B4 (backbone, ImageNet) → GAP → Dropout(0.3) →
    Linear(1792, 512) → ReLU → BN → Dropout(0.2) → Linear(512, 2)

Tarea: Clasificación binaria (normal=0, anomalía=1).
Soporta: congelamiento de backbone, retorno de features para Grad-CAM,
         inicialización Kaiming de la cabeza de clasificación.

Referencia: Tan & Le, 2019 — EfficientNet: Rethinking Model Scaling for CNNs
Universidad Santo Tomás · Tunja, Boyacá
"""

import logging
from typing import Dict, Optional, Tuple, Union

import torch
import torch.nn as nn
import torch.nn.init as init
from torchvision import models
from torchvision.models import EfficientNet_B4_Weights

logger = logging.getLogger(__name__)

# Dimensiones de features por backbone
BACKBONE_FEATURES = {
    "efficientnet_b4": 1792,
    "efficientnet_b0": 1280,
    "resnet50": 2048,
    "densenet121": 1024,
    "convnext_tiny": 768,
    "vit_b_16": 768,
    "swin_t": 768,
}


class _SwinFeatureMap(nn.Module):
    """Adaptador para Swin Transformer.

    `torchvision.swin_t(...).features` entrega el mapa en formato channels-last
    (B, H, W, C). El detector (GAP + Grad-CAM) espera (B, C, H, W), así que
    permutamos. Además expone el tensor espacial como salida directa para que
    Grad-CAM pueda engancharse a este módulo.
    """

    def __init__(self, features: nn.Module) -> None:
        super().__init__()
        self.features = features

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)  # (B, H, W, C)
        return x.permute(0, 3, 1, 2).contiguous()  # (B, C, H, W)


class _ViTFeatureMap(nn.Module):
    """Adaptador para Vision Transformer (ViT-B/16).

    ViT produce una secuencia de tokens, no un mapa espacial. Replicamos el
    pipeline de torchvision (conv_proj → tokens → class token → encoder),
    descartamos el class token y re-formamos la secuencia de parches a una
    rejilla (B, C, H', W'). Esto permite reutilizar el mismo GAP + Grad-CAM que
    los backbones convolucionales.
    """

    def __init__(self, vit: nn.Module) -> None:
        super().__init__()
        self.vit = vit

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        n = x.shape[0]
        # _process_input: conv_proj + flatten a (B, seq, hidden)
        tokens = self.vit._process_input(x)
        class_token = self.vit.class_token.expand(n, -1, -1)
        tokens = torch.cat([class_token, tokens], dim=1)
        encoded = self.vit.encoder(tokens)  # (B, 1 + seq, hidden)
        patches = encoded[:, 1:, :]  # descartar class token → (B, seq, hidden)
        hidden = patches.shape[2]
        grid = int(round(patches.shape[1] ** 0.5))  # 196 → 14
        # (B, seq, hidden) → (B, hidden, grid, grid)
        return patches.permute(0, 2, 1).reshape(n, hidden, grid, grid).contiguous()


class AnomalyDetector(nn.Module):
    """Detector de anomalías médicas basado en EfficientNet-B4.

    Combina un backbone pre-entrenado en ImageNet con una cabeza de
    clasificación binaria diseñada para imágenes médicas.

    Args:
        backbone_name: Nombre del backbone ('efficientnet_b4', 'resnet50', 'densenet121').
        num_classes: Clases de salida (default 2: normal/anomalía).
        pretrained: Cargar pesos ImageNet para el backbone.
        in_channels: Canales de entrada (1=grayscale DICOM, 3=RGB).
        dropout_head: Dropout de la primera capa de la cabeza (default 0.3).
        dropout_final: Dropout antes de la capa final (default 0.2).
        freeze_backbone: Congelar backbone al inicializar (transfer learning).

    Example:
        >>> model = AnomalyDetector(freeze_backbone=True)
        >>> x = torch.randn(4, 1, 224, 224)
        >>> logits = model(x)
        >>> print(logits.shape)  # torch.Size([4, 2])

        >>> # Con features para Grad-CAM
        >>> logits, features = model(x, return_features=True)
    """

    def __init__(
        self,
        backbone_name: str = "efficientnet_b4",
        num_classes: int = 2,
        pretrained: bool = True,
        in_channels: int = 1,
        dropout_head: float = 0.3,
        dropout_final: float = 0.2,
        freeze_backbone: bool = False,
    ) -> None:
        super().__init__()

        self.backbone_name = backbone_name
        self.num_classes = num_classes
        self.in_channels = in_channels

        # ── 1. Backbone ──
        self.backbone, self.num_features = self._build_backbone(
            backbone_name, pretrained, in_channels
        )

        # ── 2. Global Average Pooling ──
        self.global_pool = nn.AdaptiveAvgPool2d(1)

        # ── 3. Cabeza de clasificación ──
        # GAP → Dropout(0.3) → Linear(1792,512) → ReLU → BN → Dropout(0.2) → Linear(512,2)
        self.classifier = nn.Sequential(
            nn.Dropout(p=dropout_head),
            nn.Linear(self.num_features, 512),
            nn.ReLU(inplace=True),
            nn.BatchNorm1d(512),
            nn.Dropout(p=dropout_final),
            nn.Linear(512, num_classes),
        )

        # ── 4. Inicializar pesos de la cabeza ──
        self._initialize_classifier_weights()

        # ── 5. Congelar backbone si solicitado ──
        if freeze_backbone:
            self.freeze_backbone()

        # Almacenar última feature map para Grad-CAM
        self._last_feature_map: Optional[torch.Tensor] = None
        self._gradients: Optional[torch.Tensor] = None

        total_params = sum(p.numel() for p in self.parameters())
        trainable = sum(p.numel() for p in self.parameters() if p.requires_grad)
        logger.info(
            "AnomalyDetector: %s | %d clases | %dM params (%dM trainable) | frozen=%s",
            backbone_name, num_classes,
            total_params // 1_000_000, trainable // 1_000_000,
            freeze_backbone,
        )

    # ══════════════════════════════════════════════════
    # Forward
    # ══════════════════════════════════════════════════

    def forward(
        self,
        x: torch.Tensor,
        return_features: bool = False,
    ) -> Union[torch.Tensor, Tuple[torch.Tensor, torch.Tensor]]:
        """Forward pass: imagen → logits de clasificación.

        Args:
            x: Tensor de entrada (B, C, H, W).
            return_features: Si True, retorna también la feature map
                             antes del GAP (para Grad-CAM).

        Returns:
            Si return_features=False: logits (B, num_classes).
            Si return_features=True: (logits, feature_map) donde
                feature_map tiene shape (B, F, H', W').
        """
        # Extraer features del backbone
        features = self._extract_features(x)

        # Almacenar para Grad-CAM
        self._last_feature_map = features

        # Global Average Pooling: (B, F, H', W') → (B, F)
        pooled = self.global_pool(features)
        pooled = pooled.flatten(1)

        # Clasificación
        logits = self.classifier(pooled)

        if return_features:
            return logits, features
        return logits

    def predict_proba(self, x: torch.Tensor) -> torch.Tensor:
        """Retorna probabilidades (softmax) en lugar de logits.

        Args:
            x: Tensor de entrada (B, C, H, W).

        Returns:
            Probabilidades por clase (B, num_classes), sumando 1.0.
        """
        self.eval()
        with torch.no_grad():
            logits = self.forward(x)
            return torch.softmax(logits, dim=1)

    # ══════════════════════════════════════════════════
    # Backbone
    # ══════════════════════════════════════════════════

    def _build_backbone(
        self, name: str, pretrained: bool, in_channels: int
    ) -> Tuple[nn.Module, int]:
        """Construye y adapta el backbone.

        Returns:
            Tupla (backbone_module, num_features).
        """
        if name == "efficientnet_b4":
            weights = EfficientNet_B4_Weights.IMAGENET1K_V1 if pretrained else None
            base = models.efficientnet_b4(weights=weights)

            # Adaptar a 1 canal (grayscale DICOM)
            if in_channels != 3:
                self._adapt_first_conv(base.features[0][0], in_channels)

            backbone = base.features  # Solo la parte convolucional
            num_features = BACKBONE_FEATURES[name]

        elif name == "resnet50":
            weights = "IMAGENET1K_V1" if pretrained else None
            base = models.resnet50(weights=weights)
            if in_channels != 3:
                self._adapt_first_conv(base.conv1, in_channels)
            backbone = nn.Sequential(
                base.conv1, base.bn1, base.relu, base.maxpool,
                base.layer1, base.layer2, base.layer3, base.layer4,
            )
            num_features = BACKBONE_FEATURES[name]

        elif name == "densenet121":
            weights = "IMAGENET1K_V1" if pretrained else None
            base = models.densenet121(weights=weights)
            if in_channels != 3:
                self._adapt_first_conv(base.features.conv0, in_channels)
            backbone = base.features
            num_features = BACKBONE_FEATURES[name]

        elif name == "convnext_tiny":
            weights = "IMAGENET1K_V1" if pretrained else None
            base = models.convnext_tiny(weights=weights)
            # Stem convolucional (patchify) = features[0][0]
            if in_channels != 3:
                self._adapt_first_conv(base.features[0][0], in_channels)
            backbone = base.features  # ya es 4D (B, 768, 7, 7)
            num_features = BACKBONE_FEATURES[name]

        elif name == "swin_t":
            weights = "IMAGENET1K_V1" if pretrained else None
            base = models.swin_t(weights=weights)
            # Patch-embed conv = features[0][0]
            if in_channels != 3:
                self._adapt_first_conv(base.features[0][0], in_channels)
            backbone = _SwinFeatureMap(base.features)  # permuta a (B, C, H, W)
            num_features = BACKBONE_FEATURES[name]

        elif name == "vit_b_16":
            weights = "IMAGENET1K_V1" if pretrained else None
            base = models.vit_b_16(weights=weights)
            # Proyección de parches = conv_proj (Conv2d 3→768)
            if in_channels != 3:
                self._adapt_first_conv(base.conv_proj, in_channels)
            backbone = _ViTFeatureMap(base)  # secuencia → mapa espacial
            num_features = BACKBONE_FEATURES[name]

        else:
            raise ValueError(
                f"Backbone '{name}' no soportado. "
                f"Opciones: {list(BACKBONE_FEATURES.keys())}"
            )

        return backbone, num_features

    @staticmethod
    def _adapt_first_conv(conv: nn.Conv2d, in_channels: int) -> None:
        """Adapta primera capa conv de 3ch (ImageNet) a in_channels.

        Promedia pesos de 3 canales → 1 canal, preservando información aprendida.
        """
        with torch.no_grad():
            old_weight = conv.weight.data
            new_weight = old_weight.mean(dim=1, keepdim=True)
            if in_channels > 1:
                new_weight = new_weight.repeat(1, in_channels, 1, 1)
            conv.in_channels = in_channels
            conv.weight = nn.Parameter(new_weight)

    # ══════════════════════════════════════════════════
    # Inicialización de pesos
    # ══════════════════════════════════════════════════

    def _initialize_classifier_weights(self) -> None:
        """Inicializa pesos de la cabeza de clasificación con Kaiming.

        Usa Kaiming He (2015) para capas con ReLU, y Xavier para la capa final.
        BatchNorm inicializado con weight=1, bias=0.
        """
        for module in self.classifier.modules():
            if isinstance(module, nn.Linear):
                if module.out_features == self.num_classes:
                    # Capa final: Xavier uniform
                    init.xavier_uniform_(module.weight)
                else:
                    # Capas intermedias: Kaiming para ReLU
                    init.kaiming_normal_(module.weight, mode="fan_out", nonlinearity="relu")
                if module.bias is not None:
                    init.zeros_(module.bias)
            elif isinstance(module, nn.BatchNorm1d):
                init.ones_(module.weight)
                init.zeros_(module.bias)

        logger.debug("Cabeza de clasificación inicializada (Kaiming + Xavier)")

    # ══════════════════════════════════════════════════
    # Freeze / Unfreeze
    # ══════════════════════════════════════════════════

    def freeze_backbone(self) -> None:
        """Congela todos los parámetros del backbone (solo entrena cabeza)."""
        for param in self.backbone.parameters():
            param.requires_grad = False
        trainable = sum(p.numel() for p in self.parameters() if p.requires_grad)
        logger.info("Backbone congelado. Parámetros entrenables: %dK", trainable // 1000)

    def unfreeze_backbone(self, layers: int = -1) -> None:
        """Descongela capas del backbone para fine-tuning progresivo.

        Args:
            layers: Número de bloques a descongelar desde el final.
                    -1 = descongelar todo.
        """
        params = list(self.backbone.parameters())
        if layers == -1:
            for p in params:
                p.requires_grad = True
        else:
            # Descongelar las últimas N capas
            total = len(params)
            for i, p in enumerate(params):
                p.requires_grad = (i >= total - layers)

        trainable = sum(p.numel() for p in self.parameters() if p.requires_grad)
        logger.info("Backbone descongelado (%d capas). Trainable: %dM", layers, trainable // 1_000_000)

    # ══════════════════════════════════════════════════
    # Grad-CAM support
    # ══════════════════════════════════════════════════

    def get_last_conv_layer(self) -> nn.Module:
        """Retorna la última capa convolucional del backbone para Grad-CAM.

        Returns:
            Módulo nn.Module correspondiente a la última capa conv.
        """
        if self.backbone_name == "efficientnet_b4":
            return self.backbone[-1]
        elif self.backbone_name == "resnet50":
            return self.backbone[-1]  # layer4
        elif self.backbone_name == "densenet121":
            return self.backbone.denseblock4
        elif self.backbone_name == "convnext_tiny":
            return self.backbone[-1]  # última etapa CNBlock
        elif self.backbone_name in ("swin_t", "vit_b_16"):
            # El backbone es el adaptador (_SwinFeatureMap / _ViTFeatureMap):
            # su salida ya es el mapa espacial (B, C, H', W') que Grad-CAM usa.
            return self.backbone
        raise ValueError(f"Grad-CAM no configurado para {self.backbone_name}")

    def get_last_feature_map(self) -> Optional[torch.Tensor]:
        """Retorna la última feature map calculada (requiere forward previo)."""
        return self._last_feature_map

    def _extract_features(self, x: torch.Tensor) -> torch.Tensor:
        """Extrae feature maps del backbone."""
        return self.backbone(x)

    # ══════════════════════════════════════════════════
    # Utilidades
    # ══════════════════════════════════════════════════

    def get_model_info(self) -> Dict[str, Union[str, int]]:
        """Retorna información del modelo como diccionario."""
        total = sum(p.numel() for p in self.parameters())
        trainable = sum(p.numel() for p in self.parameters() if p.requires_grad)
        return {
            "backbone": self.backbone_name,
            "num_classes": self.num_classes,
            "in_channels": self.in_channels,
            "num_features": self.num_features,
            "total_params": total,
            "trainable_params": trainable,
            "frozen_params": total - trainable,
        }


# Alias de compatibilidad con imports existentes
MedicalDetector = AnomalyDetector


# ══════════════════════════════════════════════════
# Test rápido
# ══════════════════════════════════════════════════

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    print("=" * 60)
    print("  AnomalyDetector — Test Rápido")
    print("=" * 60)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"\nDevice: {device}")

    # 1. Crear modelo con backbone congelado
    model = AnomalyDetector(
        backbone_name="efficientnet_b4",
        num_classes=2,
        pretrained=True,
        in_channels=1,
        freeze_backbone=True,
    ).to(device)

    info = model.get_model_info()
    print(f"Backbone: {info['backbone']}")
    print(f"Params totales: {info['total_params']:,}")
    print(f"Params entrenables: {info['trainable_params']:,}")
    print(f"Params congelados: {info['frozen_params']:,}")

    # 2. Forward pass
    x = torch.randn(4, 1, 224, 224).to(device)

    logits = model(x)
    print(f"\nForward pass: input={x.shape} → logits={logits.shape}")

    # 3. Forward con features (Grad-CAM)
    logits, features = model(x, return_features=True)
    print(f"Con features: logits={logits.shape}, features={features.shape}")

    # 4. Probabilidades
    proba = model.predict_proba(x)
    print(f"Probabilidades: {proba[0].cpu().numpy()} (suma={proba[0].sum():.4f})")

    # 5. Descongelar backbone
    model.unfreeze_backbone(layers=20)
    info2 = model.get_model_info()
    print(f"\nTras unfreeze(20): trainable={info2['trainable_params']:,}")

    # 6. Verificar última feature map
    assert model.get_last_feature_map() is not None
    print(f"Last feature map: {model.get_last_feature_map().shape}")

    # 7. Última capa conv (Grad-CAM)
    last_conv = model.get_last_conv_layer()
    print(f"Última capa conv: {type(last_conv).__name__}")

    print("\n✅ Todos los tests pasaron correctamente")
    print("=" * 60)
