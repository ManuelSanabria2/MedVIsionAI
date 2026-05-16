"""
trainer.py — Loop de entrenamiento con MLflow tracking.

Gestiona entrenamiento, validación, logging de métricas,
y soporte para k-fold cross-validation.
Seed fija (42) para reproducibilidad.
"""

import logging
import os
import time
from typing import Dict, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from tqdm import tqdm

from src.training.metrics import MetricsCalculator
from src.training.callbacks import EarlyStopping, ModelCheckpoint, LearningRateScheduler

logger = logging.getLogger(__name__)

RANDOM_SEED = 42


def set_seed(seed: int = RANDOM_SEED):
    """Fija seeds para reproducibilidad total."""
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    np.random.seed(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


class Trainer:
    """Entrenador para modelos de detección médica.

    Integra: loop de entrenamiento, validación por época, early stopping,
    checkpointing, LR scheduling y logging a MLflow.

    Args:
        model: Modelo a entrenar (MedicalDetector).
        criterion: Función de pérdida.
        optimizer: Optimizador PyTorch.
        device: 'cuda' o 'cpu'.
        experiment_name: Nombre del experimento MLflow.
    """

    def __init__(
        self,
        model: nn.Module,
        criterion: nn.Module,
        optimizer: torch.optim.Optimizer,
        device: Optional[str] = None,
        experiment_name: str = "medvision-detection",
    ):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = model.to(self.device)
        self.criterion = criterion
        self.optimizer = optimizer
        self.experiment_name = experiment_name
        self.metrics_calc = MetricsCalculator()

        # Intentar inicializar MLflow
        try:
            import mlflow
            mlflow.set_experiment(experiment_name)
            self.mlflow = mlflow
            logger.info("MLflow configurado: %s", experiment_name)
        except ImportError:
            self.mlflow = None
            logger.warning("MLflow no disponible. Métricas solo en consola.")

        set_seed()

    def fit(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        epochs: int = 50,
        patience: int = 10,
        checkpoint_dir: str = "checkpoints",
    ) -> Dict:
        """Ejecuta el loop de entrenamiento completo.

        Args:
            train_loader: DataLoader de entrenamiento.
            val_loader: DataLoader de validación.
            epochs: Número máximo de épocas.
            patience: Épocas para early stopping.
            checkpoint_dir: Directorio para guardar modelos.

        Returns:
            Dict con historial de entrenamiento.
        """
        early_stop = EarlyStopping(patience=patience, mode="min")
        checkpoint = ModelCheckpoint(save_dir=checkpoint_dir, mode="min")
        lr_sched = LearningRateScheduler(self.optimizer, scheduler_type="plateau")

        history = {"train_loss": [], "val_loss": [], "val_metrics": []}

        run_ctx = self.mlflow.start_run() if self.mlflow else _NullContext()

        with run_ctx:
            if self.mlflow:
                self.mlflow.log_params({
                    "epochs": epochs, "patience": patience,
                    "optimizer": type(self.optimizer).__name__,
                    "lr": self.optimizer.param_groups[0]["lr"],
                    "device": self.device,
                })

            for epoch in range(1, epochs + 1):
                # --- Entrenamiento ---
                train_loss = self._train_epoch(train_loader, epoch)
                history["train_loss"].append(train_loss)

                # --- Validación ---
                val_loss, val_metrics = self._validate_epoch(val_loader)
                history["val_loss"].append(val_loss)
                history["val_metrics"].append(val_metrics)

                # Log
                lr = lr_sched.get_lr()
                logger.info(
                    "Epoch %d/%d | train_loss=%.4f | val_loss=%.4f | AUC=%.4f | Sens=%.4f | lr=%.2e",
                    epoch, epochs, train_loss, val_loss,
                    val_metrics.get("auc_roc", 0), val_metrics.get("sensitivity", 0), lr,
                )

                if self.mlflow:
                    self.mlflow.log_metrics({
                        "train_loss": train_loss, "val_loss": val_loss,
                        "val_auc_roc": val_metrics.get("auc_roc", 0),
                        "val_sensitivity": val_metrics.get("sensitivity", 0),
                        "val_f1": val_metrics.get("f1_score", 0),
                        "learning_rate": lr,
                    }, step=epoch)

                # Checkpoint
                checkpoint(val_loss, self.model, epoch, self.optimizer)

                # LR scheduling
                lr_sched.step(val_loss)

                # Early stopping
                if early_stop(val_loss):
                    logger.info("Entrenamiento detenido en epoch %d", epoch)
                    break

            # Cargar mejor modelo
            checkpoint.load_best(self.model, self.device)

        return history

    def _train_epoch(self, loader: DataLoader, epoch: int) -> float:
        """Ejecuta una época de entrenamiento."""
        self.model.train()
        total_loss = 0.0
        n_batches = 0

        for images, labels in tqdm(loader, desc=f"Train Epoch {epoch}", leave=False):
            images = images.to(self.device)
            labels = labels.to(self.device)

            self.optimizer.zero_grad()
            outputs = self.model(images)
            loss = self.criterion(outputs, labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            self.optimizer.step()

            total_loss += loss.item()
            n_batches += 1

        return total_loss / max(n_batches, 1)

    @torch.no_grad()
    def _validate_epoch(self, loader: DataLoader) -> Tuple[float, Dict]:
        """Ejecuta validación y calcula métricas."""
        self.model.eval()
        total_loss = 0.0
        all_preds, all_labels, all_proba = [], [], []

        for images, labels in loader:
            images = images.to(self.device)
            labels = labels.to(self.device)

            outputs = self.model(images)
            loss = self.criterion(outputs, labels)
            total_loss += loss.item()

            proba = torch.softmax(outputs, dim=1)
            preds = proba.argmax(dim=1)

            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            all_proba.extend(proba.cpu().numpy())

        avg_loss = total_loss / max(len(loader), 1)
        metrics = self.metrics_calc.compute(
            np.array(all_labels), np.array(all_preds), np.array(all_proba),
        )
        return avg_loss, metrics

    @torch.no_grad()
    def evaluate(self, test_loader: DataLoader) -> Dict:
        """Evalúa el modelo en el set de test. Imprime reporte completo."""
        _, metrics = self._validate_epoch(test_loader)
        self.metrics_calc.print_report()
        return metrics


class _NullContext:
    """Context manager nulo para cuando MLflow no está disponible."""
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass
