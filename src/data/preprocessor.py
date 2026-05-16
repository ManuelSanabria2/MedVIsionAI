"""
preprocessor.py — Pipeline de preprocesamiento de imágenes médicas.

Normalización, redimensión y data augmentation con MONAI transforms.
Soporta z-score y min-max normalization, augmentation configurable.
"""

import logging
from typing import Dict, List, Optional, Tuple

import numpy as np

try:
    import torch
    from torchvision import transforms as T
except ImportError:
    raise ImportError("PyTorch requerido: pip install torch torchvision")

try:
    from monai.transforms import (
        Compose, EnsureChannelFirst, Resize, ScaleIntensity,
        RandRotate, RandFlip, RandGaussianNoise, RandAffine,
        NormalizeIntensity, ToTensor,
    )
    HAS_MONAI = True
except ImportError:
    HAS_MONAI = False

logger = logging.getLogger(__name__)


class MedicalImagePreprocessor:
    """Pipeline configurable de preprocesamiento para imágenes médicas.

    Attributes:
        image_size: Tamaño objetivo (alto, ancho). Default 224x224.
        normalization: Método de normalización ('zscore' o 'minmax').
        augment: Si True, aplica data augmentation en modo entrenamiento.
    """

    def __init__(
        self,
        image_size: Tuple[int, int] = (224, 224),
        normalization: str = "zscore",
        augment: bool = False,
    ):
        self.image_size = image_size
        self.normalization = normalization
        self.augment = augment

        if HAS_MONAI:
            self.transform = self._build_monai_pipeline()
        else:
            self.transform = self._build_torch_pipeline()
            logger.warning("MONAI no disponible, usando torchvision transforms")

    def __call__(self, image: np.ndarray) -> "torch.Tensor":
        """Procesa una imagen y retorna un tensor PyTorch.

        Args:
            image: Array numpy (H, W) o (H, W, C), float32 [0,1].

        Returns:
            Tensor PyTorch (C, H, W) normalizado y preprocesado.
        """
        # Asegurar dimensión de canal: (H, W) -> (1, H, W)
        if image.ndim == 2:
            image = image[np.newaxis, ...]
        elif image.ndim == 3 and image.shape[-1] in (1, 3):
            image = np.transpose(image, (2, 0, 1))

        if HAS_MONAI:
            return self.transform(image)
        else:
            tensor = torch.from_numpy(image).float()
            return self.transform(tensor)

    def _build_monai_pipeline(self) -> "Compose":
        """Construye pipeline MONAI con transforms médicas especializadas."""
        ops = [
            Resize(spatial_size=self.image_size, mode="bilinear"),
        ]

        # Normalización
        if self.normalization == "zscore":
            ops.append(NormalizeIntensity(nonzero=True))
        else:
            ops.append(ScaleIntensity(minv=0.0, maxv=1.0))

        # Data augmentation (solo entrenamiento)
        if self.augment:
            ops.extend([
                RandRotate(range_x=0.26, prob=0.5),  # ±15°
                RandFlip(spatial_axis=1, prob=0.5),   # Flip horizontal
                RandGaussianNoise(prob=0.3, mean=0.0, std=0.05),
                RandAffine(
                    prob=0.3,
                    translate_range=(10, 10),
                    scale_range=(0.1, 0.1),
                ),
            ])

        ops.append(ToTensor(dtype=torch.float32))
        logger.info(
            "Pipeline MONAI: size=%s, norm=%s, augment=%s",
            self.image_size, self.normalization, self.augment,
        )
        return Compose(ops)

    def _build_torch_pipeline(self) -> "T.Compose":
        """Pipeline fallback con torchvision (sin MONAI)."""
        ops = [
            T.Resize(self.image_size),
        ]

        if self.augment:
            ops.extend([
                T.RandomHorizontalFlip(p=0.5),
                T.RandomRotation(15),
            ])

        if self.normalization == "zscore":
            ops.append(T.Normalize(mean=[0.5], std=[0.5]))

        return T.Compose(ops)

    @staticmethod
    def get_train_preprocessor(image_size: Tuple[int, int] = (224, 224)) -> "MedicalImagePreprocessor":
        """Factory para preprocessor de entrenamiento con augmentation."""
        return MedicalImagePreprocessor(
            image_size=image_size, normalization="zscore", augment=True,
        )

    @staticmethod
    def get_eval_preprocessor(image_size: Tuple[int, int] = (224, 224)) -> "MedicalImagePreprocessor":
        """Factory para preprocessor de evaluación/inferencia sin augmentation."""
        return MedicalImagePreprocessor(
            image_size=image_size, normalization="zscore", augment=False,
        )
