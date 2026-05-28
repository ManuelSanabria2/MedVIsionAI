"""
loss.py — Funciones de pérdida para detección de anomalías médicas.

Implementa Focal Loss (Lin et al., 2017) optimizado para el desbalance
severo típico de datasets médicos (>90% normales, <10% anomalías).

Referencia: Lin et al., 2017 — "Focal Loss for Dense Object Detection"
Universidad Santo Tomás · Tunja, Boyacá
"""

import logging
from typing import List, Optional, Union

import torch
import torch.nn as nn
import torch.nn.functional as F

logger = logging.getLogger(__name__)


class FocalLoss(nn.Module):
    """Focal Loss para clasificación con clases severamente desbalanceadas.

    Modifica la cross-entropy estándar añadiendo un factor modulador
    (1 - p_t)^gamma que reduce la contribución de ejemplos fáciles
    y enfoca el entrenamiento en los difíciles.

    FL(p_t) = -alpha_t * (1 - p_t)^gamma * log(p_t)

    Para datasets médicos donde anomalías son <10% del total,
    se recomienda alpha=[0.25, 0.75] y gamma=2.0.

    Args:
        alpha: Factor de balanceo por clase.
            - float: alpha para clase positiva, (1-alpha) para negativa.
            - list/tensor: peso por clase [alpha_0, alpha_1, ...].
            - None: sin balanceo por clase.
        gamma: Factor de enfoque (default 2.0).
            - gamma=0 equivale a cross-entropy estándar.
            - Valores altos (>2) enfocan más en ejemplos difíciles.
        reduction: Método de reducción ('mean', 'sum', 'none').
        label_smoothing: Suavizado de etiquetas (default 0.0, sin suavizado).

    Example:
        >>> criterion = FocalLoss(alpha=[0.25, 0.75], gamma=2.0)
        >>> logits = torch.randn(8, 2)
        >>> targets = torch.tensor([0, 1, 0, 0, 1, 0, 0, 1])
        >>> loss = criterion(logits, targets)
    """

    def __init__(
        self,
        alpha: Optional[Union[float, List[float], torch.Tensor]] = None,
        gamma: float = 2.0,
        reduction: str = "mean",
        label_smoothing: float = 0.0,
    ) -> None:
        super().__init__()

        self.gamma = gamma
        self.reduction = reduction
        self.label_smoothing = label_smoothing

        # Procesar alpha
        if alpha is not None:
            if isinstance(alpha, (list, tuple)):
                self.register_buffer("alpha", torch.tensor(alpha, dtype=torch.float32))
            elif isinstance(alpha, torch.Tensor):
                self.register_buffer("alpha", alpha.float())
            elif isinstance(alpha, (int, float)):
                # Scalar: alpha para clase 1, (1-alpha) para clase 0
                self.register_buffer(
                    "alpha", torch.tensor([1.0 - alpha, alpha], dtype=torch.float32)
                )
        else:
            self.alpha = None

        logger.info(
            "FocalLoss: gamma=%.1f, alpha=%s, smoothing=%.2f",
            gamma, self.alpha, label_smoothing,
        )

    def forward(self, inputs: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        """Calcula Focal Loss.

        Args:
            inputs: Logits del modelo (B, C) — NO softmax.
            targets: Etiquetas ground truth (B,) — índices enteros.

        Returns:
            Loss escalar (si reduction='mean'|'sum') o por muestra (B,).
        """
        num_classes = inputs.shape[1]

        # Cross-entropy por muestra (sin reducción)
        ce_loss = F.cross_entropy(
            inputs, targets,
            reduction="none",
            label_smoothing=self.label_smoothing,
        )

        # p_t: probabilidad de la clase correcta
        log_probs = F.log_softmax(inputs, dim=1)
        probs = torch.exp(log_probs)
        p_t = probs.gather(1, targets.unsqueeze(1)).squeeze(1)

        # Factor modulador: (1 - p_t)^gamma
        focal_weight = (1.0 - p_t) ** self.gamma

        # Factor de balanceo alpha
        if self.alpha is not None:
            alpha_device = self.alpha.to(inputs.device)
            alpha_t = alpha_device.gather(0, targets)
            focal_weight = focal_weight * alpha_t

        # Focal loss = weight * CE
        loss = focal_weight * ce_loss

        # Reducción
        if self.reduction == "mean":
            return loss.mean()
        elif self.reduction == "sum":
            return loss.sum()
        return loss


class WeightedCrossEntropy(nn.Module):
    """Cross-Entropy ponderada como alternativa más simple a Focal Loss.

    Asigna pesos inversamente proporcionales a la frecuencia de cada clase.

    Args:
        class_weights: Pesos por clase. Si None, calcula automáticamente.
        label_smoothing: Suavizado de etiquetas.
    """

    def __init__(
        self,
        class_weights: Optional[Union[List[float], torch.Tensor]] = None,
        label_smoothing: float = 0.0,
    ) -> None:
        super().__init__()
        self.label_smoothing = label_smoothing

        if class_weights is not None:
            if isinstance(class_weights, (list, tuple)):
                self.register_buffer("weight", torch.tensor(class_weights, dtype=torch.float32))
            else:
                self.register_buffer("weight", class_weights.float())
        else:
            self.weight = None

    def forward(self, inputs: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        """Calcula weighted cross-entropy loss."""
        w = self.weight.to(inputs.device) if self.weight is not None else None
        return F.cross_entropy(
            inputs, targets, weight=w, label_smoothing=self.label_smoothing,
        )


def get_loss_function(
    name: str = "focal",
    num_classes: int = 2,
    class_weights: Optional[List[float]] = None,
    gamma: float = 2.0,
    label_smoothing: float = 0.0,
) -> nn.Module:
    """Factory para seleccionar función de pérdida.

    Args:
        name: 'focal', 'ce' (cross-entropy), o 'weighted_ce'.
        num_classes: Número de clases (para defaults de alpha).
        class_weights: Pesos por clase.
        gamma: Parámetro gamma para Focal Loss.
        label_smoothing: Suavizado de etiquetas.

    Returns:
        Módulo de pérdida configurado.

    Raises:
        ValueError: Si el nombre no es válido.
    """
    if name == "focal":
        alpha = class_weights or ([0.25, 0.75] if num_classes == 2 else None)
        return FocalLoss(alpha=alpha, gamma=gamma, label_smoothing=label_smoothing)
    elif name == "weighted_ce":
        return WeightedCrossEntropy(class_weights=class_weights, label_smoothing=label_smoothing)
    elif name == "ce":
        return nn.CrossEntropyLoss(label_smoothing=label_smoothing)
    else:
        raise ValueError(f"Loss '{name}' no soportada. Opciones: focal, ce, weighted_ce")


# ══════════════════════════════════════════════════
# Test rápido
# ══════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 50)
    print("  FocalLoss — Test Rápido")
    print("=" * 50)

    batch_size = 8
    num_classes = 2

    logits = torch.randn(batch_size, num_classes)
    # Simular desbalance: 6 normales, 2 anomalías
    targets = torch.tensor([0, 0, 0, 0, 0, 0, 1, 1])

    # 1. Focal Loss con alpha
    fl = FocalLoss(alpha=[0.25, 0.75], gamma=2.0)
    loss_focal = fl(logits, targets)
    print(f"Focal Loss (α=[0.25,0.75], γ=2.0): {loss_focal.item():.4f}")

    # 2. Focal Loss sin alpha
    fl_no_alpha = FocalLoss(alpha=None, gamma=2.0)
    loss_no_alpha = fl_no_alpha(logits, targets)
    print(f"Focal Loss (sin α, γ=2.0):         {loss_no_alpha.item():.4f}")

    # 3. γ=0 ≈ Cross-Entropy
    fl_gamma0 = FocalLoss(alpha=None, gamma=0.0)
    ce = nn.CrossEntropyLoss()
    loss_g0 = fl_gamma0(logits, targets)
    loss_ce = ce(logits, targets)
    print(f"Focal (γ=0): {loss_g0.item():.4f} vs CE: {loss_ce.item():.4f} (deben ser ≈iguales)")

    # 4. Factory
    for name in ["focal", "ce", "weighted_ce"]:
        fn = get_loss_function(name)
        val = fn(logits, targets)
        print(f"Factory '{name}': {val.item():.4f}")

    # 5. Gradientes
    logits_grad = torch.randn(4, 2, requires_grad=True)
    loss = fl(logits_grad, torch.tensor([0, 1, 0, 1]))
    loss.backward()
    assert logits_grad.grad is not None
    print(f"\nGradientes: shape={logits_grad.grad.shape}, norm={logits_grad.grad.norm():.4f}")

    print("\n✅ Todos los tests pasaron")
    print("=" * 50)
