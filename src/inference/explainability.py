"""
explainability.py — Módulo de Explicabilidad (XAI) para imágenes médicas.

Implementa Grad-CAM (Gradient-weighted Class Activation Mapping) para visualizar
las regiones de la imagen que más contribuyeron a la decisión del modelo.
Crucial para la validación clínica y generación de confianza médica.

Referencia: Selvaraju et al., 2017 (ICCV)
Universidad Santo Tomás · Tunja, Boyacá
"""

import logging
from typing import Optional, Tuple

import cv2
import numpy as np
import torch
import torch.nn as nn
from PIL import Image

logger = logging.getLogger(__name__)


class GradCAM:
    """Implementación de Grad-CAM para interpretabilidad médica.

    Extrae activaciones y gradientes de la capa final convolucional
    del modelo para generar mapas de calor explicativos.

    Args:
        model: Modelo PyTorch (ej. AnomalyDetector).
        target_layer: Capa convolucional objetivo. Si es None,
                      intenta usar model.get_last_conv_layer().
    """

    def __init__(self, model: nn.Module, target_layer: Optional[nn.Module] = None) -> None:
        self.model = model
        self.model.eval()
        
        self.target_layer = target_layer
        if self.target_layer is None and hasattr(self.model, "get_last_conv_layer"):
            self.target_layer = self.model.get_last_conv_layer()
            
        if self.target_layer is None:
            raise ValueError("Debe proporcionar target_layer o modelo con get_last_conv_layer()")

        self.activations: Optional[torch.Tensor] = None
        self.gradients: Optional[torch.Tensor] = None
        self._register_hooks()
        logger.debug("Grad-CAM inicializado sobre capa: %s", self.target_layer.__class__.__name__)

    def _register_hooks(self) -> None:
        """Registra forward y backward hooks para capturar features y gradientes."""
        def forward_hook(module: nn.Module, input: tuple, output: torch.Tensor) -> None:
            self.activations = output

        def backward_hook(module: nn.Module, grad_input: tuple, grad_output: tuple) -> None:
            self.gradients = grad_output[0]

        self.target_layer.register_forward_hook(forward_hook)
        # register_full_backward_hook es preferible en PyTorch moderno
        self.target_layer.register_full_backward_hook(backward_hook)

    def generate_heatmap(self, input_tensor: torch.Tensor, target_class: int) -> np.ndarray:
        """Genera el mapa de calor (activaciones) crudo.

        Args:
            input_tensor: Tensor de entrada (1, C, H, W).
            target_class: Índice de clase a explicar.

        Returns:
            Numpy array 2D con los valores de activación espacial [0, 1].
            
        Raises:
            RuntimeError: Si el modelo no puede procesar el tensor o generar gradientes.
        """
        if input_tensor.dim() != 4 or input_tensor.size(0) != 1:
            raise ValueError(f"Grad-CAM espera un batch de tamaño 1 (1, C, H, W). Recibió {input_tensor.shape}")

        self.model.zero_grad()
        
        # Forward pass
        logits = self.model(input_tensor)
        if logits.dim() == 2:
            score = logits[0, target_class]
        else:
            score = logits[target_class]

        # Backward pass para calcular gradientes respecto a la clase objetivo
        try:
            score.backward(retain_graph=True)
        except Exception as e:
            raise RuntimeError(f"Error en backward pass. Asegúrese de que input_tensor requires_grad=True si es necesario. {e}")

        if self.activations is None or self.gradients is None:
            raise RuntimeError("Los hooks no capturaron activaciones o gradientes.")

        # Obtener gradientes y activaciones del tensor
        gradients = self.gradients.cpu().data.numpy()[0]
        activations = self.activations.cpu().data.numpy()[0]

        # Global Average Pooling a los gradientes para obtener pesos
        weights = np.mean(gradients, axis=(1, 2))

        # Combinación lineal ponderada de los mapas de activación
        cam = np.zeros(activations.shape[1:], dtype=np.float32)
        for i, w in enumerate(weights):
            cam += w * activations[i]

        # ReLU para descartar influencia negativa y normalización min-max
        cam = np.maximum(cam, 0)
        
        if cam.max() > 0:
            cam = cam / cam.max()
            
        return cam

    @staticmethod
    def overlay_heatmap(
        original_img: Union[np.ndarray, Image.Image],
        heatmap: np.ndarray,
        alpha: float = 0.5,
        colormap: int = cv2.COLORMAP_JET
    ) -> Tuple[Image.Image, np.ndarray]:
        """Superpone el heatmap a la imagen original.

        Args:
            original_img: Imagen original PIL o Numpy array (H, W) o (H, W, 3).
            heatmap: Array 2D (activaciones Grad-CAM).
            alpha: Opacidad del overlay de calor.
            colormap: Colormap de OpenCV (default: JET).

        Returns:
            Tupla (Imagen compuesta PIL, heatmap_colorizado_numpy).
        """
        # Preparar imagen base a numpy BGR o RGB (para cv2)
        if isinstance(original_img, Image.Image):
            original_img = np.array(original_img.convert("RGB"))
        elif original_img.ndim == 2:
            original_img = cv2.cvtColor((original_img * 255).astype(np.uint8), cv2.COLOR_GRAY2RGB)
        elif original_img.ndim == 3 and original_img.shape[2] == 1:
            original_img = cv2.cvtColor((original_img * 255).astype(np.uint8), cv2.COLOR_GRAY2RGB)
            
        if original_img.dtype != np.uint8:
            original_img = (np.clip(original_img, 0, 1) * 255).astype(np.uint8)

        h, w = original_img.shape[:2]

        # Redimensionar heatmap al tamaño de la imagen original
        heatmap_resized = cv2.resize(heatmap, (w, h))

        # Aplicar colormap (cv2 devuelve BGR)
        heatmap_color = cv2.applyColorMap(np.uint8(255 * heatmap_resized), colormap)
        # Convertir a RGB
        heatmap_color = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)

        # Superponer (alpha blending)
        overlay = cv2.addWeighted(original_img, 1 - alpha, heatmap_color, alpha, 0)

        return Image.fromarray(overlay), heatmap_resized


# Alias para compatibilidad con código existente
MedicalExplainability = GradCAM
