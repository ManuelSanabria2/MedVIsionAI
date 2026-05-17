"""
metrics.py — Métricas de evaluación para detección médica.

Calcula métricas clínicas estándar definidas en INSTRUCCIONS.MD:
- Sensibilidad (Recall) — Meta: ≥ 0.80 (minimizar falsos negativos)
- Especificidad — Reducir falsas alarmas
- AUC-ROC — Meta: ≥ 0.85 (rendimiento global)
- F1-Score — Balance precisión/recall
- Precisión, Accuracy, Matriz de confusión

Universidad Santo Tomás · Tunja, Boyacá
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    auc,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)

logger = logging.getLogger(__name__)

# Metas mínimas del documento INSTRUCCIONS.MD §6
TARGET_AUC_ROC = 0.85
TARGET_SENSITIVITY = 0.80


@dataclass
class MetricResults:
    """Contenedor tipado para resultados de métricas.

    Attributes:
        accuracy: Exactitud global.
        sensitivity: Sensibilidad / Recall (TP / (TP+FN)).
        specificity: Especificidad (TN / (TN+FP)).
        precision: Precisión (TP / (TP+FP)).
        f1: F1-Score (2·P·R / (P+R)).
        auc_roc: Área bajo la curva ROC.
        confusion_matrix: Matriz de confusión [[TN,FP],[FN,TP]].
        meets_targets: Si cumple metas mínimas del documento.
    """

    accuracy: float = 0.0
    sensitivity: float = 0.0
    specificity: float = 0.0
    precision: float = 0.0
    f1: float = 0.0
    auc_roc: float = 0.0
    confusion_matrix: List[List[int]] = field(default_factory=lambda: [[0, 0], [0, 0]])
    meets_targets: bool = False

    def to_dict(self) -> Dict[str, float]:
        """Convierte a dict plano (sin confusion_matrix) para MLflow logging."""
        return {
            "accuracy": self.accuracy,
            "sensitivity": self.sensitivity,
            "specificity": self.specificity,
            "precision": self.precision,
            "f1": self.f1,
            "auc_roc": self.auc_roc,
        }


def compute_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_proba: Optional[np.ndarray] = None,
) -> MetricResults:
    """Calcula todas las métricas médicas.

    Args:
        y_true: Etiquetas reales (N,).
        y_pred: Predicciones del modelo (N,).
        y_proba: Probabilidades por clase (N, C) o (N,) para clase positiva.

    Returns:
        MetricResults con todas las métricas calculadas.
    """
    results = MetricResults()

    results.accuracy = float(accuracy_score(y_true, y_pred))
    results.sensitivity = float(recall_score(y_true, y_pred, average="binary", zero_division=0))
    results.precision = float(precision_score(y_true, y_pred, average="binary", zero_division=0))
    results.f1 = float(f1_score(y_true, y_pred, average="binary", zero_division=0))

    # Especificidad: TN / (TN + FP)
    cm = confusion_matrix(y_true, y_pred)
    results.confusion_matrix = cm.tolist()
    if cm.shape == (2, 2):
        tn, fp, fn, tp = cm.ravel()
        results.specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    else:
        results.specificity = 0.0

    # AUC-ROC
    if y_proba is not None:
        try:
            if y_proba.ndim == 2:
                score = roc_auc_score(y_true, y_proba[:, 1])
            else:
                score = roc_auc_score(y_true, y_proba)
            results.auc_roc = float(score)
        except ValueError as e:
            logger.warning("AUC-ROC no calculable: %s", e)
            results.auc_roc = 0.0

    # Verificar metas
    results.meets_targets = (
        results.auc_roc >= TARGET_AUC_ROC and results.sensitivity >= TARGET_SENSITIVITY
    )

    return results


def format_metrics_report(results: MetricResults, epoch: Optional[int] = None) -> str:
    """Formatea métricas como string para logging.

    Args:
        results: MetricResults calculados.
        epoch: Número de época (opcional).

    Returns:
        String formateado con todas las métricas.
    """
    header = f"Epoch {epoch}" if epoch else "Evaluación"
    status = "✅ CUMPLE" if results.meets_targets else "❌ NO CUMPLE"

    lines = [
        f"{'═' * 52}",
        f"  {header} — Métricas MedVision AI",
        f"{'═' * 52}",
        f"  Accuracy:      {results.accuracy:.4f}",
        f"  Sensibilidad:  {results.sensitivity:.4f}  (meta: ≥{TARGET_SENSITIVITY})",
        f"  Especificidad: {results.specificity:.4f}",
        f"  Precisión:     {results.precision:.4f}",
        f"  F1-Score:      {results.f1:.4f}",
        f"  AUC-ROC:       {results.auc_roc:.4f}  (meta: ≥{TARGET_AUC_ROC})",
        f"{'─' * 52}",
        f"  Confusion Matrix: {results.confusion_matrix}",
        f"  Estado: {status}",
        f"{'═' * 52}",
    ]
    return "\n".join(lines)
