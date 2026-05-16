"""
callbacks.py — Callbacks de entrenamiento: Early Stopping y Checkpointing.
"""

import logging
from pathlib import Path
from typing import Optional

import torch

logger = logging.getLogger(__name__)


class EarlyStopping:
    """Detiene el entrenamiento si la métrica no mejora tras `patience` épocas.

    Args:
        patience: Épocas sin mejora antes de detener.
        min_delta: Mejora mínima para considerar progreso.
        mode: 'min' para loss, 'max' para accuracy/AUC.
    """

    def __init__(self, patience: int = 10, min_delta: float = 1e-4, mode: str = "min"):
        self.patience = patience
        self.min_delta = min_delta
        self.mode = mode
        self.counter = 0
        self.best_score = None
        self.should_stop = False

    def __call__(self, score: float) -> bool:
        """Evalúa si debe detenerse.

        Returns:
            True si debe detenerse el entrenamiento.
        """
        if self.best_score is None:
            self.best_score = score
            return False

        improved = (
            (score < self.best_score - self.min_delta) if self.mode == "min"
            else (score > self.best_score + self.min_delta)
        )

        if improved:
            self.best_score = score
            self.counter = 0
        else:
            self.counter += 1
            if self.counter >= self.patience:
                self.should_stop = True
                logger.info("Early stopping: %d épocas sin mejora", self.patience)
                return True

        return False


class ModelCheckpoint:
    """Guarda el mejor modelo durante el entrenamiento.

    Args:
        save_dir: Directorio para guardar checkpoints.
        filename: Nombre del archivo del checkpoint.
        mode: 'min' para loss, 'max' para accuracy/AUC.
    """

    def __init__(
        self,
        save_dir: str = "checkpoints",
        filename: str = "best_model.pth",
        mode: str = "min",
    ):
        self.save_dir = Path(save_dir)
        self.save_dir.mkdir(parents=True, exist_ok=True)
        self.filepath = self.save_dir / filename
        self.mode = mode
        self.best_score = None

    def __call__(
        self, score: float, model: torch.nn.Module, epoch: int,
        optimizer: Optional[torch.optim.Optimizer] = None,
        extra_info: Optional[dict] = None,
    ) -> bool:
        """Guarda modelo si es el mejor hasta ahora.

        Returns:
            True si el modelo fue guardado.
        """
        if self.best_score is None:
            improved = True
        else:
            improved = (
                (score < self.best_score) if self.mode == "min"
                else (score > self.best_score)
            )

        if improved:
            self.best_score = score
            checkpoint = {
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "best_score": score,
            }
            if optimizer:
                checkpoint["optimizer_state_dict"] = optimizer.state_dict()
            if extra_info:
                checkpoint.update(extra_info)

            torch.save(checkpoint, self.filepath)
            logger.info("Checkpoint guardado: epoch=%d, score=%.4f → %s", epoch, score, self.filepath)
            return True

        return False

    def load_best(self, model: torch.nn.Module, device: str = "cpu") -> dict:
        """Carga el mejor modelo guardado.

        Returns:
            Dict con información del checkpoint.
        """
        if not self.filepath.exists():
            raise FileNotFoundError(f"No se encontró checkpoint: {self.filepath}")

        checkpoint = torch.load(self.filepath, map_location=device)
        model.load_state_dict(checkpoint["model_state_dict"])
        logger.info("Checkpoint cargado: epoch=%d, score=%.4f", checkpoint["epoch"], checkpoint["best_score"])
        return checkpoint


class LearningRateScheduler:
    """Wrapper para learning rate scheduling con logging.

    Soporta ReduceLROnPlateau y CosineAnnealingLR.
    """

    def __init__(
        self,
        optimizer: torch.optim.Optimizer,
        scheduler_type: str = "plateau",
        **kwargs,
    ):
        if scheduler_type == "plateau":
            self.scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
                optimizer, mode=kwargs.get("mode", "min"),
                factor=kwargs.get("factor", 0.5),
                patience=kwargs.get("patience", 5),
            )
        elif scheduler_type == "cosine":
            self.scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
                optimizer, T_max=kwargs.get("T_max", 50),
            )
        self.scheduler_type = scheduler_type

    def step(self, metric: Optional[float] = None):
        """Ejecuta un paso del scheduler."""
        if self.scheduler_type == "plateau" and metric is not None:
            self.scheduler.step(metric)
        else:
            self.scheduler.step()

    def get_lr(self) -> float:
        """Retorna el learning rate actual."""
        return self.scheduler.optimizer.param_groups[0]["lr"]
