"""
dataset.py — PyTorch Dataset para imágenes médicas.

Dataset personalizado con splits train/val/test (70/15/15),
soporte para balanceo de clases y seeds fijas para reproducibilidad.
"""

import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import numpy as np

try:
    import torch
    from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
except ImportError:
    raise ImportError("PyTorch requerido: pip install torch")

from sklearn.model_selection import train_test_split

from src.data.preprocessor import MedicalImagePreprocessor

logger = logging.getLogger(__name__)

# Seed fija para reproducibilidad (requisito del documento)
RANDOM_SEED = 42


class MedicalImageDataset(Dataset):
    """Dataset de imágenes médicas para entrenamiento y evaluación.

    Attributes:
        image_paths: Lista de rutas a las imágenes.
        labels: Lista de etiquetas (0=normal, 1=anomalía, 2=tumor).
        preprocessor: Instancia de MedicalImagePreprocessor.
        class_names: Mapeo de índice a nombre de clase.
    """

    def __init__(
        self,
        image_paths: List[Union[str, Path]],
        labels: List[int],
        preprocessor: Optional[MedicalImagePreprocessor] = None,
        class_names: Optional[Dict[int, str]] = None,
    ):
        assert len(image_paths) == len(labels), "Paths y labels deben tener igual longitud"
        self.image_paths = [Path(p) for p in image_paths]
        self.labels = labels
        self.preprocessor = preprocessor or MedicalImagePreprocessor.get_eval_preprocessor()
        self.class_names = class_names or {0: "normal", 1: "anomalía"}

    def __len__(self) -> int:
        return len(self.image_paths)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        """Retorna (imagen_tensor, etiqueta) para el índice dado."""
        from src.data.loader import ImageLoader
        loader = ImageLoader(grayscale=True)

        image = loader.load(self.image_paths[idx])
        image = self.preprocessor(image)
        label = self.labels[idx]
        return image, label

    def get_class_distribution(self) -> Dict[str, int]:
        """Retorna conteo de muestras por clase."""
        dist = {}
        for label in self.labels:
            name = self.class_names.get(label, str(label))
            dist[name] = dist.get(name, 0) + 1
        return dist

    def get_weighted_sampler(self) -> WeightedRandomSampler:
        """Crea sampler ponderado para balancear clases desbalanceadas."""
        class_counts = np.bincount(self.labels)
        weights = 1.0 / class_counts
        sample_weights = weights[self.labels]
        return WeightedRandomSampler(
            weights=sample_weights, num_samples=len(self), replacement=True,
        )


def create_splits(
    image_paths: List[Union[str, Path]],
    labels: List[int],
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = RANDOM_SEED,
) -> Tuple[Dict, Dict, Dict]:
    """Divide dataset en train/val/test (70/15/15 por defecto).

    Args:
        image_paths: Rutas de las imágenes.
        labels: Etiquetas correspondientes.
        train_ratio/val_ratio/test_ratio: Proporciones del split.
        seed: Seed para reproducibilidad.

    Returns:
        Tupla de 3 dicts con keys 'paths' y 'labels' para train, val, test.
    """
    assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 1e-6

    # Primer split: train vs (val+test)
    X_train, X_temp, y_train, y_temp = train_test_split(
        image_paths, labels,
        test_size=(val_ratio + test_ratio),
        random_state=seed, stratify=labels,
    )

    # Segundo split: val vs test
    relative_test = test_ratio / (val_ratio + test_ratio)
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp,
        test_size=relative_test,
        random_state=seed, stratify=y_temp,
    )

    logger.info(
        "Split: train=%d, val=%d, test=%d", len(X_train), len(X_val), len(X_test),
    )

    return (
        {"paths": X_train, "labels": y_train},
        {"paths": X_val, "labels": y_val},
        {"paths": X_test, "labels": y_test},
    )


def create_dataloaders(
    train_data: Dict, val_data: Dict, test_data: Dict,
    batch_size: int = 32,
    num_workers: int = 4,
    image_size: Tuple[int, int] = (224, 224),
    balance_classes: bool = True,
) -> Tuple[DataLoader, DataLoader, DataLoader]:
    """Crea DataLoaders para train/val/test con preprocesamiento apropiado.

    Returns:
        Tupla (train_loader, val_loader, test_loader).
    """
    train_ds = MedicalImageDataset(
        train_data["paths"], train_data["labels"],
        preprocessor=MedicalImagePreprocessor.get_train_preprocessor(image_size),
    )
    val_ds = MedicalImageDataset(
        val_data["paths"], val_data["labels"],
        preprocessor=MedicalImagePreprocessor.get_eval_preprocessor(image_size),
    )
    test_ds = MedicalImageDataset(
        test_data["paths"], test_data["labels"],
        preprocessor=MedicalImagePreprocessor.get_eval_preprocessor(image_size),
    )

    sampler = train_ds.get_weighted_sampler() if balance_classes else None

    train_loader = DataLoader(
        train_ds, batch_size=batch_size, sampler=sampler,
        num_workers=num_workers, pin_memory=True, shuffle=(sampler is None),
    )
    val_loader = DataLoader(
        val_ds, batch_size=batch_size, shuffle=False,
        num_workers=num_workers, pin_memory=True,
    )
    test_loader = DataLoader(
        test_ds, batch_size=batch_size, shuffle=False,
        num_workers=num_workers, pin_memory=True,
    )

    return train_loader, val_loader, test_loader
