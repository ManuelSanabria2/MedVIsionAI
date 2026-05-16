"""
explainability.py — Grad-CAM para explicabilidad del modelo.

Genera mapas de calor que muestran las regiones de la imagen
que más influyeron en la predicción del modelo.
Referencia: Selvaraju et al., 2017.
"""

import logging
from typing import Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

logger = logging.getLogger(__name__)


class GradCAM:
    """Generador de mapas de calor Grad-CAM.

    Visualiza qué regiones de la imagen el modelo consideró más
    relevantes para su predicción. Esencial para validación clínica.

    Args:
        model: Modelo entrenado (MedicalDetector).
        target_layer: Capa convolucional objetivo. Si None, usa get_feature_layer().
    """

    def __init__(self, model: nn.Module, target_layer: Optional[nn.Module] = None):
        self.model = model
        self.model.eval()

        if target_layer is None and hasattr(model, "get_feature_layer"):
            target_layer = model.get_feature_layer()
        self.target_layer = target_layer

        self.gradients = None
        self.activations = None

        # Registrar hooks
        if self.target_layer is not None:
            self.target_layer.register_forward_hook(self._save_activation)
            self.target_layer.register_full_backward_hook(self._save_gradient)

    def _save_activation(self, module, input, output):
        self.activations = output.detach()

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate(
        self,
        image: torch.Tensor,
        target_class: Optional[int] = None,
    ) -> np.ndarray:
        """Genera mapa de calor Grad-CAM para una imagen.

        Args:
            image: Tensor de entrada (1, C, H, W) o (C, H, W).
            target_class: Clase objetivo. Si None, usa la predicción del modelo.

        Returns:
            Mapa de calor numpy (H, W) normalizado [0, 1].
        """
        if image.dim() == 3:
            image = image.unsqueeze(0)

        image.requires_grad_(True)
        output = self.model(image)

        if target_class is None:
            target_class = output.argmax(dim=1).item()

        # Backward pass
        self.model.zero_grad()
        target_score = output[0, target_class]
        target_score.backward()

        if self.gradients is None or self.activations is None:
            logger.warning("Grad-CAM: no se capturaron gradientes/activaciones")
            return np.zeros((image.shape[2], image.shape[3]))

        # Pesos = promedio global de gradientes
        weights = self.gradients.mean(dim=[2, 3], keepdim=True)

        # Combinación ponderada de activaciones
        cam = (weights * self.activations).sum(dim=1, keepdim=True)
        cam = F.relu(cam)  # Solo regiones positivas

        # Redimensionar al tamaño de la imagen original
        cam = F.interpolate(
            cam, size=(image.shape[2], image.shape[3]),
            mode="bilinear", align_corners=False,
        )
        cam = cam.squeeze().cpu().numpy()

        # Normalizar a [0, 1]
        if cam.max() > 0:
            cam = (cam - cam.min()) / (cam.max() - cam.min())

        return cam

    def overlay(
        self,
        image: np.ndarray,
        heatmap: np.ndarray,
        alpha: float = 0.4,
    ) -> np.ndarray:
        """Superpone mapa de calor sobre la imagen original.

        Args:
            image: Imagen original (H, W) o (H, W, 3), [0, 1].
            heatmap: Mapa Grad-CAM (H, W), [0, 1].
            alpha: Transparencia del heatmap (0=solo imagen, 1=solo heatmap).

        Returns:
            Imagen con heatmap superpuesto (H, W, 3), [0, 1].
        """
        import matplotlib.cm as cm

        # Aplicar colormap al heatmap
        colored = cm.jet(heatmap)[:, :, :3]  # RGB, sin alpha

        # Asegurar imagen en formato RGB
        if image.ndim == 2:
            image = np.stack([image] * 3, axis=-1)

        # Superposición
        overlay = (1 - alpha) * image + alpha * colored
        return np.clip(overlay, 0, 1)
