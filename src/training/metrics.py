"""
metrics.py — Métricas de evaluación para detección médica.

Implementa las métricas definidas en INSTRUCCIONS.MD:
- Sensibilidad (Recall) — Meta: ≥ 0.80
- Especificidad
- AUC-ROC — Meta: ≥ 0.85
- F1-Score
- Exactitud (Accuracy)
- Matriz de confusión
"""

import logging
from typing import Dict, List, Optional, Tuple

import numpy as np
from sklearn.metrics import (
    accuracy_score, f1_score, recall_score, precision_score,
    roc_auc_score, confusion_matrix, classification_report,
    roc_curve,
)

logger = logging.getLogger(__name__)

# Metas mínimas del documento
TARGET_AUC_ROC = 0.85
TARGET_SENSITIVITY = 0.80


class MetricsCalculator:
    """Calcula y almacena métricas de evaluación médica.

    Uso:
        >>> calc = MetricsCalculator(class_names=["normal", "anomalía"])
        >>> metrics = calc.compute(y_true, y_pred, y_proba)
        >>> calc.print_report()
    """

    def __init__(self, class_names: Optional[List[str]] = None):
        self.class_names = class_names or ["normal", "anomalía"]
        self.last_metrics = {}

    def compute(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        y_proba: Optional[np.ndarray] = None,
    ) -> Dict[str, float]:
        """Calcula todas las métricas.

        Args:
            y_true: Etiquetas reales (N,).
            y_pred: Predicciones del modelo (N,).
            y_proba: Probabilidades por clase (N, C) para AUC-ROC.

        Returns:
            Dict con todas las métricas calculadas.
        """
        metrics = {
            "accuracy": accuracy_score(y_true, y_pred),
            "sensitivity": recall_score(y_true, y_pred, average="binary", zero_division=0),
            "precision": precision_score(y_true, y_pred, average="binary", zero_division=0),
            "f1_score": f1_score(y_true, y_pred, average="binary", zero_division=0),
            "specificity": self._specificity(y_true, y_pred),
        }

        # AUC-ROC (requiere probabilidades)
        if y_proba is not None:
            try:
                if y_proba.ndim == 2:
                    auc = roc_auc_score(y_true, y_proba[:, 1])
                else:
                    auc = roc_auc_score(y_true, y_proba)
                metrics["auc_roc"] = auc
            except ValueError as e:
                logger.warning("No se pudo calcular AUC-ROC: %s", e)
                metrics["auc_roc"] = 0.0

        # Matriz de confusión
        metrics["confusion_matrix"] = confusion_matrix(y_true, y_pred).tolist()

        # Verificar metas mínimas
        metrics["meets_auc_target"] = metrics.get("auc_roc", 0) >= TARGET_AUC_ROC
        metrics["meets_sensitivity_target"] = metrics["sensitivity"] >= TARGET_SENSITIVITY

        self.last_metrics = metrics
        return metrics

    def _specificity(self, y_true: np.ndarray, y_pred: np.ndarray) -> float:
        """Calcula especificidad: TN / (TN + FP)."""
        cm = confusion_matrix(y_true, y_pred)
        if cm.shape == (2, 2):
            tn, fp = cm[0, 0], cm[0, 1]
            return tn / (tn + fp) if (tn + fp) > 0 else 0.0
        return 0.0

    def print_report(self):
        """Imprime reporte formateado de métricas."""
        m = self.last_metrics
        if not m:
            logger.warning("No hay métricas. Ejecutar compute() primero.")
            return

        print("\n" + "=" * 50)
        print("  REPORTE DE MÉTRICAS — MedVision AI")
        print("=" * 50)
        print(f"  Accuracy:      {m['accuracy']:.4f}")
        print(f"  Sensibilidad:  {m['sensitivity']:.4f}  (meta: ≥{TARGET_SENSITIVITY})")
        print(f"  Especificidad: {m['specificity']:.4f}")
        print(f"  F1-Score:      {m['f1_score']:.4f}")
        print(f"  Precisión:     {m['precision']:.4f}")
        if "auc_roc" in m:
            print(f"  AUC-ROC:       {m['auc_roc']:.4f}  (meta: ≥{TARGET_AUC_ROC})")
        print("-" * 50)
        status = "✅ CUMPLE" if m.get("meets_auc_target") and m.get("meets_sensitivity_target") else "❌ NO CUMPLE"
        print(f"  Estado: {status} metas mínimas")
        print("=" * 50 + "\n")
