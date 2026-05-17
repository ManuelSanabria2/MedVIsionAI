"""
trainer.py — Loop de entrenamiento con integración MLflow.

Implementa `MedVisionTrainer` con:
- Optimizador AdamW y scheduler CosineAnnealingLR
- Entrenamiento GPU/CPU automático
- Early Stopping basado en métricas
- Logging automático de métricas e hiperparámetros a MLflow
- Guardado de checkpoints
- Registro del modelo final en MLflow Model Registry

Universidad Santo Tomás · Tunja, Boyacá
"""

import logging
import os
import time
from pathlib import Path
from typing import Dict, Optional, Tuple

import mlflow
import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch.utils.data import DataLoader
from tqdm import tqdm

from src.training.metrics import compute_metrics, format_metrics_report

logger = logging.getLogger(__name__)


class MedVisionTrainer:
    """Entrenador principal para modelos de detección médica.

    Gestiona el ciclo de vida completo del entrenamiento, incluyendo
    optimización, evaluación, logging con MLflow y early stopping.

    Args:
        model: Modelo PyTorch (ej. AnomalyDetector).
        train_loader: DataLoader de entrenamiento.
        val_loader: DataLoader de validación.
        criterion: Función de pérdida (ej. FocalLoss).
        learning_rate: Tasa de aprendizaje inicial.
        weight_decay: Weight decay para AdamW (default 1e-4).
        num_epochs: Número máximo de épocas.
        patience: Épocas sin mejora antes de early stopping (default 10).
        device: Dispositivo ('cuda' o 'cpu'). Si es None, autodetecta.
        checkpoint_dir: Directorio para guardar el mejor modelo.
        experiment_name: Nombre del experimento en MLflow.
    """

    def __init__(
        self,
        model: nn.Module,
        train_loader: DataLoader,
        val_loader: DataLoader,
        criterion: nn.Module,
        learning_rate: float = 1e-4,
        weight_decay: float = 1e-4,
        num_epochs: int = 50,
        patience: int = 10,
        device: Optional[str] = None,
        checkpoint_dir: str = "checkpoints",
        experiment_name: str = "medvision-detection",
    ) -> None:
        # Configuración de dispositivo
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = model.to(self.device)
        logger.info("Entrenando en dispositivo: %s", self.device)

        # Componentes del loop
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.criterion = criterion.to(self.device)
        self.num_epochs = num_epochs

        # Optimizador y Scheduler
        self.optimizer = AdamW(
            self.model.parameters(),
            lr=learning_rate,
            weight_decay=weight_decay,
        )
        self.scheduler = CosineAnnealingLR(
            self.optimizer,
            T_max=num_epochs,
            eta_min=learning_rate / 100,
        )

        # Early Stopping y Checkpoints
        self.patience = patience
        self.best_auc_roc = 0.0
        self.epochs_without_improvement = 0
        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        self.best_model_path = self.checkpoint_dir / "best_model.pth"

        # MLflow
        self.experiment_name = experiment_name
        mlflow.set_experiment(self.experiment_name)

    def train_epoch(self, epoch: int) -> float:
        """Ejecuta una época de entrenamiento.

        Returns:
            Pérdida media de la época.
        """
        self.model.train()
        running_loss = 0.0
        num_batches = len(self.train_loader)

        pbar = tqdm(self.train_loader, desc=f"Train Epoch {epoch}/{self.num_epochs}")
        for inputs, targets in pbar:
            inputs = inputs.to(self.device)
            targets = targets.to(self.device)

            self.optimizer.zero_grad()

            logits = self.model(inputs)
            loss = self.criterion(logits, targets)

            loss.backward()
            self.optimizer.step()

            running_loss += loss.item()
            pbar.set_postfix({"loss": loss.item()})

        avg_loss = running_loss / num_batches
        return avg_loss

    def validate(self, epoch: int) -> Tuple[float, Dict[str, float]]:
        """Ejecuta validación y calcula métricas.

        Returns:
            Tupla (val_loss_media, metric_results_dict).
        """
        self.model.eval()
        running_loss = 0.0
        all_targets = []
        all_preds = []
        all_probs = []

        with torch.no_grad():
            for inputs, targets in tqdm(self.val_loader, desc="Validating", leave=False):
                inputs = inputs.to(self.device)
                targets = targets.to(self.device)

                logits = self.model(inputs)
                loss = self.criterion(logits, targets)
                running_loss += loss.item()

                probs = torch.softmax(logits, dim=1)
                preds = torch.argmax(probs, dim=1)

                all_targets.extend(targets.cpu().numpy())
                all_preds.extend(preds.cpu().numpy())
                all_probs.extend(probs[:, 1].cpu().numpy())

        avg_loss = running_loss / len(self.val_loader)
        
        # Calcular métricas clínicas
        metrics = compute_metrics(
            y_true=torch.tensor(all_targets).numpy(),
            y_pred=torch.tensor(all_preds).numpy(),
            y_proba=torch.tensor(all_probs).numpy(),
        )

        # Mostrar reporte formateado
        print("\n" + format_metrics_report(metrics, epoch))

        return avg_loss, metrics.to_dict()

    def train(self) -> None:
        """Ciclo de entrenamiento completo con MLflow tracking."""
        logger.info("Iniciando entrenamiento por %d épocas", self.num_epochs)

        with mlflow.start_run() as run:
            # 1. Log hiperparámetros
            mlflow.log_params({
                "model": self.model.__class__.__name__,
                "epochs": self.num_epochs,
                "learning_rate": self.optimizer.param_groups[0]["lr"],
                "weight_decay": self.optimizer.param_groups[0]["weight_decay"],
                "batch_size": self.train_loader.batch_size,
                "optimizer": "AdamW",
                "scheduler": "CosineAnnealingLR",
                "loss": self.criterion.__class__.__name__,
                "patience": self.patience,
                "device": self.device,
            })

            start_time = time.time()

            # 2. Loop principal
            for epoch in range(1, self.num_epochs + 1):
                # Entrenamiento
                train_loss = self.train_epoch(epoch)
                
                # Validación
                val_loss, val_metrics = self.validate(epoch)

                # Scheduler step
                self.scheduler.step()

                # MLflow metrics logging
                mlflow.log_metrics({
                    "train_loss": train_loss,
                    "val_loss": val_loss,
                    "val_auc_roc": val_metrics["auc_roc"],
                    "val_sensitivity": val_metrics["sensitivity"],
                    "val_specificity": val_metrics["specificity"],
                    "val_f1": val_metrics["f1"],
                    "lr": self.optimizer.param_groups[0]["lr"],
                }, step=epoch)

                # 3. Early Stopping y Guardado del mejor modelo
                current_auc = val_metrics["auc_roc"]
                if current_auc > self.best_auc_roc:
                    logger.info(
                        "Mejora en AUC-ROC: %.4f -> %.4f. Guardando checkpoint.",
                        self.best_auc_roc, current_auc
                    )
                    self.best_auc_roc = current_auc
                    self.epochs_without_improvement = 0
                    self._save_checkpoint(epoch, val_metrics)
                else:
                    self.epochs_without_improvement += 1
                    logger.info(
                        "Sin mejora. Patience: %d/%d",
                        self.epochs_without_improvement, self.patience
                    )

                if self.epochs_without_improvement >= self.patience:
                    logger.warning("Early stopping disparado en época %d", epoch)
                    break

            # 4. Finalización y Registro del modelo
            total_time = (time.time() - start_time) / 60
            logger.info("Entrenamiento finalizado en %.1f min.", total_time)
            
            # Registrar el modelo final en MLflow Registry
            self._register_model(run.info.run_id)

    def _save_checkpoint(self, epoch: int, metrics: Dict[str, float]) -> None:
        """Guarda el estado del modelo y optimizador."""
        checkpoint = {
            "epoch": epoch,
            "model_state_dict": self.model.state_dict(),
            "optimizer_state_dict": self.optimizer.state_dict(),
            "scheduler_state_dict": self.scheduler.state_dict(),
            "best_auc_roc": self.best_auc_roc,
            "metrics": metrics,
        }
        torch.save(checkpoint, self.best_model_path)
        logger.debug("Checkpoint guardado en: %s", self.best_model_path)

    def _register_model(self, run_id: str, model_name: str = "medvision-detector") -> None:
        """Registra el modelo en MLflow Model Registry."""
        try:
            # Primero cargamos los mejores pesos
            if self.best_model_path.exists():
                checkpoint = torch.load(self.best_model_path, map_location=self.device)
                self.model.load_state_dict(checkpoint["model_state_dict"])
                logger.info("Mejores pesos cargados (AUC-ROC: %.4f)", checkpoint["best_auc_roc"])

            # Definir input signature para MLflow
            from mlflow.models.signature import infer_signature
            
            # Crear un ejemplo de entrada dummy (1, C, H, W)
            # Asumimos in_channels de la conv inicial
            in_channels = getattr(self.model, "in_channels", 1) 
            dummy_input = torch.randn(1, in_channels, 224, 224).to(self.device)
            dummy_output = self.model(dummy_input)
            
            signature = infer_signature(dummy_input.cpu().numpy(), dummy_output.cpu().detach().numpy())

            # Loggear y registrar
            mlflow.pytorch.log_model(
                pytorch_model=self.model,
                artifact_path="model",
                signature=signature,
                registered_model_name=model_name,
            )
            logger.info("Modelo registrado en MLflow Model Registry como '%s'", model_name)
            
        except Exception as e:
            logger.error("Error registrando modelo en MLflow: %s", e)
