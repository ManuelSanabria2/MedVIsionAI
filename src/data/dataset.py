"""
dataset.py — PyTorch Dataset para imágenes médicas (DICOM + estándar).

Soporta:
- Carga de DICOM y PNG/JPEG con preprocesamiento integrado
- Splits estratificados train/val/test (70/15/15)
- Balanceo de clases con WeightedRandomSampler
- Caché en memoria opcional para datasets pequeños
- Seeds fijas (42) para reproducibilidad total
- Manejo robusto de archivos corruptos (skip + log)

Universidad Santo Tomás · Tunja, Boyacá
"""

import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from sklearn.model_selection import train_test_split

from src.data.preprocessor import DICOMPreprocessor

logger = logging.getLogger(__name__)

RANDOM_SEED = 42
DICOM_EXTENSIONS = {".dcm", ".dicom", ".DCM"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif"}


class MedicalImageDataset(Dataset):
    """Dataset de imágenes médicas para detección de anomalías.

    Soporta carga de DICOM y formatos estándar con preprocesamiento
    automático, augmentation configurable y caché opcional.

    Args:
        image_paths: Lista de rutas a las imágenes.
        labels: Lista de etiquetas enteras (0=normal, 1=anomalía, ...).
        preprocessor: Instancia de DICOMPreprocessor. Si None, crea uno por defecto.
        class_names: Mapeo índice → nombre de clase.
        cache: Si True, cachea imágenes en memoria tras primera carga.

    Example:
        >>> ds = MedicalImageDataset(paths, labels, preprocessor=DICOMPreprocessor.for_training())
        >>> image, label = ds[0]
        >>> print(image.shape)  # torch.Size([1, 224, 224])
    """

    def __init__(
        self,
        image_paths: List[Union[str, Path]],
        labels: List[int],
        preprocessor: Optional[DICOMPreprocessor] = None,
        class_names: Optional[Dict[int, str]] = None,
        cache: bool = False,
    ) -> None:
        if len(image_paths) != len(labels):
            raise ValueError(
                f"Longitudes no coinciden: {len(image_paths)} paths vs {len(labels)} labels"
            )

        self.image_paths = [Path(p) for p in image_paths]
        self.labels = list(labels)
        self.preprocessor = preprocessor or DICOMPreprocessor.for_inference()
        self.class_names = class_names or {0: "normal", 1: "anomalía"}
        self.cache = cache
        self._cache: Dict[int, torch.Tensor] = {}

        logger.info(
            "Dataset creado: %d imágenes, %d clases, cache=%s",
            len(self), len(set(labels)), cache,
        )

    def __len__(self) -> int:
        """Retorna el número total de muestras."""
        return len(self.image_paths)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        """Retorna (imagen_tensor, etiqueta) para el índice dado.

        Args:
            idx: Índice de la muestra.

        Returns:
            Tupla (tensor float32 shape (1,H,W), label int).
            En caso de error, retorna tensor de ceros.
        """
        # Check caché
        if self.cache and idx in self._cache:
            return self._cache[idx], self.labels[idx]

        path = self.image_paths[idx]
        label = self.labels[idx]

        try:
            tensor = self._load_image(path)
        except Exception as e:
            logger.warning("Error cargando %s (idx=%d): %s. Usando tensor cero.", path.name, idx, e)
            tensor = torch.zeros(1, *self.preprocessor.target_size, dtype=torch.float32)

        # Guardar en caché si aplica
        if self.cache:
            self._cache[idx] = tensor

        return tensor, label

    def _load_image(self, path: Path) -> torch.Tensor:
        """Carga y preprocesa una imagen según su formato."""
        suffix = path.suffix.lower()

        if suffix in DICOM_EXTENSIONS:
            tensor, _ = self.preprocessor.process(path)
        elif suffix in IMAGE_EXTENSIONS:
            tensor = self.preprocessor.process_standard_image(path)
        else:
            raise ValueError(f"Formato no soportado: {suffix}")

        return tensor

    def get_class_distribution(self) -> Dict[str, int]:
        """Retorna conteo de muestras por clase.

        Returns:
            Dict con nombre_clase → conteo.
        """
        dist: Dict[str, int] = {}
        for label in self.labels:
            name = self.class_names.get(label, f"clase_{label}")
            dist[name] = dist.get(name, 0) + 1
        return dist

    def get_class_weights(self) -> torch.Tensor:
        """Calcula pesos inversamente proporcionales a frecuencia de clase.

        Útil para Focal Loss o WeightedCrossEntropy.

        Returns:
            Tensor con peso por clase.
        """
        counts = np.bincount(self.labels)
        weights = 1.0 / (counts + 1e-8)
        weights = weights / weights.sum() * len(counts)
        return torch.tensor(weights, dtype=torch.float32)

    def get_weighted_sampler(self) -> WeightedRandomSampler:
        """Crea sampler ponderado para balancear clases en el DataLoader.

        Returns:
            WeightedRandomSampler configurado.
        """
        counts = np.bincount(self.labels)
        class_weights = 1.0 / counts
        sample_weights = np.array([class_weights[l] for l in self.labels])
        return WeightedRandomSampler(
            weights=torch.from_numpy(sample_weights).double(),
            num_samples=len(self),
            replacement=True,
        )


def create_splits(
    image_paths: List[Union[str, Path]],
    labels: List[int],
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = RANDOM_SEED,
) -> Tuple[Dict[str, list], Dict[str, list], Dict[str, list]]:
    """Divide dataset en train/val/test estratificados.

    Args:
        image_paths: Rutas de imágenes.
        labels: Etiquetas correspondientes.
        train_ratio: Proporción de entrenamiento (default 0.70).
        val_ratio: Proporción de validación (default 0.15).
        test_ratio: Proporción de test (default 0.15).
        seed: Seed para reproducibilidad.

    Returns:
        Tupla (train_split, val_split, test_split).
        Cada split es dict con keys "paths" y "labels".

    Raises:
        ValueError: Si las proporciones no suman ~1.0.
    """
    if abs(train_ratio + val_ratio + test_ratio - 1.0) > 0.01:
        raise ValueError(f"Proporciones deben sumar 1.0, suman {train_ratio+val_ratio+test_ratio}")

    X_train, X_temp, y_train, y_temp = train_test_split(
        image_paths, labels,
        test_size=(val_ratio + test_ratio),
        random_state=seed,
        stratify=labels,
    )

    relative_test = test_ratio / (val_ratio + test_ratio)
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp,
        test_size=relative_test,
        random_state=seed,
        stratify=y_temp,
    )

    logger.info("Split: train=%d, val=%d, test=%d (seed=%d)", len(X_train), len(X_val), len(X_test), seed)

    return (
        {"paths": X_train, "labels": y_train},
        {"paths": X_val, "labels": y_val},
        {"paths": X_test, "labels": y_test},
    )


def create_dataloaders(
    train_split: Dict[str, list],
    val_split: Dict[str, list],
    test_split: Dict[str, list],
    batch_size: int = 32,
    num_workers: int = 4,
    target_size: Tuple[int, int] = (224, 224),
    window_preset: str = "chest_xray",
    balance_classes: bool = True,
    pin_memory: bool = True,
) -> Tuple[DataLoader, DataLoader, DataLoader]:
    """Crea DataLoaders listos para entrenamiento.

    Args:
        train/val/test_split: Dicts con keys "paths" y "labels".
        batch_size: Tamaño de batch.
        num_workers: Workers para carga paralela.
        target_size: Tamaño de imagen objetivo.
        window_preset: Preset de window/level.
        balance_classes: Usar WeightedRandomSampler en train.
        pin_memory: Pin memory para GPU.

    Returns:
        Tupla (train_loader, val_loader, test_loader).
    """
    train_ds = MedicalImageDataset(
        train_split["paths"], train_split["labels"],
        preprocessor=DICOMPreprocessor.for_training(target_size, window_preset),
    )
    val_ds = MedicalImageDataset(
        val_split["paths"], val_split["labels"],
        preprocessor=DICOMPreprocessor.for_inference(target_size, window_preset),
    )
    test_ds = MedicalImageDataset(
        test_split["paths"], test_split["labels"],
        preprocessor=DICOMPreprocessor.for_inference(target_size, window_preset),
    )

    sampler = train_ds.get_weighted_sampler() if balance_classes else None

    train_loader = DataLoader(
        train_ds, batch_size=batch_size, sampler=sampler,
        num_workers=num_workers, pin_memory=pin_memory,
        shuffle=(sampler is None), drop_last=True,
    )
    val_loader = DataLoader(
        val_ds, batch_size=batch_size, shuffle=False,
        num_workers=num_workers, pin_memory=pin_memory,
    )
    test_loader = DataLoader(
        test_ds, batch_size=batch_size, shuffle=False,
        num_workers=num_workers, pin_memory=pin_memory,
    )

    logger.info(
        "DataLoaders: train=%d batches, val=%d, test=%d (bs=%d)",
        len(train_loader), len(val_loader), len(test_loader), batch_size,
    )
    return train_loader, val_loader, test_loader
