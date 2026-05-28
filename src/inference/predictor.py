"""
predictor.py — Pipeline de inferencia para MedVision AI.

Encapsula la carga del modelo (MLflow o checkpoint local), preprocesamiento
de imágenes, inferencia con probabilidades de confianza, y explicabilidad
visual usando Grad-CAM en una única interfaz simple de usar.

Universidad Santo Tomás · Tunja, Boyacá
"""

import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional, Union

import cv2
import numpy as np
import torch
from PIL import Image

from src.data.preprocessor import DICOMPreprocessor
from src.inference.explainability import GradCAM
from src.models.detector import AnomalyDetector

logger = logging.getLogger(__name__)


class MedVisionPredictor:
    """Clase principal para inferencia y explicabilidad en producción.

    Maneja el pipeline completo: carga de imagen (DICOM/PNG) -> preprocesamiento ->
    predicción del modelo -> cálculo de confianza -> mapa de calor Grad-CAM.

    Args:
        model: Instancia de modelo (ej. AnomalyDetector) cargado.
        preprocessor: Preprocesador configurado. Si None, usa el default de inferencia.
        class_names: Mapeo de índices a nombres.
        device: Dispositivo ('cuda' o 'cpu').
    """

    def __init__(
        self,
        model: torch.nn.Module,
        preprocessor: Optional[DICOMPreprocessor] = None,
        class_names: Optional[Dict[int, str]] = None,
        device: Optional[str] = None,
    ) -> None:
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = model.to(self.device)
        self.model.eval()

        self.preprocessor = preprocessor or DICOMPreprocessor.for_inference()
        self.class_names = class_names or {0: "normal", 1: "anomalía"}
        self.use_low_confidence_calibration = (
            os.getenv("USE_LOW_CONFIDENCE_CALIBRATION", "true").lower() == "true"
        )
        self.calibration_confidence_cutoff = float(
            os.getenv("CALIBRATION_CONFIDENCE_CUTOFF", "0.75")
        )

        # Instanciar Grad-CAM
        try:
            self.grad_cam = GradCAM(self.model)
        except Exception as e:
            logger.warning("No se pudo inicializar Grad-CAM: %s", e)
            self.grad_cam = None

        logger.info("Predictor inicializado en %s", self.device)

    @classmethod
    def from_checkpoint(
        cls,
        checkpoint_path: Union[str, Path],
        architecture: str = "efficientnet_b4",
        num_classes: int = 2,
        device: Optional[str] = None,
    ) -> "MedVisionPredictor":
        """Carga el predictor desde un checkpoint local.

        Args:
            checkpoint_path: Ruta al archivo .pth
            architecture: Nombre del backbone.
            num_classes: Número de clases (normal/anomalía = 2).
            device: Dispositivo objetivo.

        Returns:
            Instancia configurada de MedVisionPredictor.
        """
        device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        path = Path(checkpoint_path)

        if not path.exists():
            raise FileNotFoundError(f"Checkpoint no encontrado: {path}")

        # Instanciar modelo base
        model = AnomalyDetector(
            backbone_name=architecture,
            num_classes=num_classes,
            pretrained=False,
            in_channels=1,
        )

        # Cargar pesos
        checkpoint = torch.load(path, map_location=device)
        if "model_state_dict" in checkpoint:
            model.load_state_dict(checkpoint["model_state_dict"])
            logger.info(
                "Pesos cargados desde %s (epoch %d, AUC: %.4f)",
                path.name, checkpoint.get("epoch", 0), checkpoint.get("best_auc_roc", 0.0)
            )
        else:
            model.load_state_dict(checkpoint)
            logger.info("Pesos brutos cargados desde %s", path.name)

        return cls(model=model, device=device)

    @classmethod
    def from_mlflow(
        cls,
        model_name: str,
        stage: str = "Production",
        device: Optional[str] = None,
    ) -> "MedVisionPredictor":
        """Carga el predictor desde MLflow Model Registry.

        Args:
            model_name: Nombre del modelo registrado.
            stage: 'Production', 'Staging' o 'None'.
            device: Dispositivo objetivo.
        """
        import mlflow.pytorch

        device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        model_uri = f"models:/{model_name}/{stage}"

        logger.info("Cargando modelo desde MLflow URI: %s", model_uri)
        try:
            model = mlflow.pytorch.load_model(model_uri, map_location=device)
            return cls(model=model, device=device)
        except Exception as e:
            raise RuntimeError(f"Error cargando modelo desde MLflow: {e}")

    def predict(
        self,
        image_path: Union[str, Path],
        generate_heatmap: bool = False,
    ) -> Dict[str, Any]:
        """Realiza inferencia completa sobre una imagen médica.

        Args:
            image_path: Ruta a la imagen (DICOM o estándar).
            generate_heatmap: Si es True, calcula y retorna Grad-CAM.

        Returns:
            Dict con:
                - prediction (int): Clase predicha.
                - class_name (str): Nombre de la clase.
                - confidence (float): Confianza [0, 1].
                - probabilities (Dict): Probs por clase.
                - metadata (Dict): Metadatos DICOM extraídos.
                - overlay (np.ndarray): Imagen PIL con heatmap (opcional).
        """
        path = Path(image_path)
        
        # 1. Carga y preprocesamiento
        try:
            if path.suffix.lower() in {".dcm", ".dicom"}:
                tensor, metadata = self.preprocessor.process(path)
            else:
                tensor = self.preprocessor.process_standard_image(path)
                metadata = {"Format": path.suffix}
        except Exception as e:
            raise ValueError(f"Error procesando {path}: {e}")

        # Añadir batch dimension temporal
        # (El preprocesador actual devuelve shape 1,H,W - necesitamos 1,1,H,W)
        if tensor.dim() == 3:
            input_tensor = tensor.unsqueeze(0).to(self.device)
        else:
            input_tensor = tensor.to(self.device)

        # Habilitar gradientes si generamos heatmap
        input_tensor.requires_grad = generate_heatmap

        # 2. Inferencia
        self.model.eval()
        with torch.set_grad_enabled(generate_heatmap):
            logits = self.model(input_tensor)
            probs = torch.softmax(logits, dim=1).squeeze(0)

            confidence, pred_idx = torch.max(probs, dim=0)
            pred_idx = pred_idx.item()
            confidence = confidence.item()
            raw_pred_idx = pred_idx
            raw_confidence = confidence

            probs_dict = {
                self.class_names.get(i, f"clase_{i}"): p.item()
                for i, p in enumerate(probs)
            }

        calibration = None
        if (
            self.use_low_confidence_calibration
            and raw_confidence < self.calibration_confidence_cutoff
            and probs.numel() == 2
        ):
            calibration = self._calibrate_low_confidence_prediction(tensor, probs)
            if calibration is not None:
                pred_idx = calibration["prediction"]
                confidence = calibration["confidence"]
                probs_dict = {
                    self.class_names.get(0, "normal"): calibration["normal_probability"],
                    self.class_names.get(1, "anomalía"): calibration["anomaly_probability"],
                }

        # 3. Explicabilidad (Opcional)
        overlay_img = None
        if generate_heatmap and pred_idx == 1:
            try:
                # Rescatar la imagen base (del tensor original preprocesado, normalizada 0-1)
                base_img = tensor.squeeze().numpy()
                if base_img.ndim == 2:
                    base_img = (base_img - base_img.min()) / (base_img.max() - base_img.min() + 1e-8)

                heatmap = self._generate_opacity_heatmap(tensor)
                if heatmap is None and self.grad_cam is not None:
                    heatmap = self.grad_cam.generate_heatmap(input_tensor, target_class=pred_idx)

                if heatmap is not None:
                    overlay, _ = GradCAM.overlay_heatmap(base_img, heatmap)
                    overlay_img = np.array(overlay)
            except Exception as e:
                logger.error("Error generando heatmap: %s", e)

        return {
            "prediction": pred_idx,
            "class_name": self.class_names.get(pred_idx, "desconocida"),
            "confidence": confidence,
            "probabilities": probs_dict,
            "metadata": self._append_inference_metadata(
                metadata,
                raw_pred_idx=raw_pred_idx,
                raw_confidence=raw_confidence,
                calibration=calibration,
            ),
            "overlay": overlay_img,
        }

    def _calibrate_low_confidence_prediction(
        self,
        tensor: torch.Tensor,
        probs: torch.Tensor,
    ) -> Optional[Dict[str, Any]]:
        """Corrige predicciones débiles con una señal focal de opacidad pulmonar."""
        opacity = self._estimate_lung_opacity_score(tensor)
        if opacity is None:
            return None

        anomaly_probability = float(probs[1].detach().cpu().item())
        is_anomaly = opacity["score"] >= 1.0

        if is_anomaly:
            calibrated_anomaly = max(
                anomaly_probability,
                0.68 + min(opacity["score"] - 1.0, 1.0) * 0.12,
            )
        else:
            calibrated_anomaly = min(
                anomaly_probability,
                0.30 + max(opacity["score"], 0.0) * 0.18,
            )

        calibrated_anomaly = float(np.clip(calibrated_anomaly, 0.05, 0.95))
        calibrated_normal = 1.0 - calibrated_anomaly
        prediction = int(calibrated_anomaly >= 0.5)
        confidence = calibrated_anomaly if prediction == 1 else calibrated_normal

        return {
            "method": "low_confidence_opacity_calibration",
            "prediction": prediction,
            "confidence": confidence,
            "normal_probability": calibrated_normal,
            "anomaly_probability": calibrated_anomaly,
            **opacity,
        }

    @staticmethod
    def _estimate_lung_opacity_score(tensor: torch.Tensor) -> Optional[Dict[str, Any]]:
        """Calcula una señal conservadora de opacidad focal entre ambos pulmones."""
        arr = MedVisionPredictor._tensor_to_2d_array(tensor)
        if arr is None:
            return None

        h, w = arr.shape
        y0, y1 = int(0.20 * h), int(0.78 * h)
        left = arr[y0:y1, int(0.15 * w):int(0.47 * w)]
        right = arr[y0:y1, int(0.53 * w):int(0.85 * w)]
        if left.size == 0 or right.size == 0:
            return None

        mean_asymmetry = abs(float(right.mean() - left.mean()))
        p90_asymmetry = abs(float(np.percentile(right, 90) - np.percentile(left, 90)))
        p95_asymmetry = abs(float(np.percentile(right, 95) - np.percentile(left, 95)))
        left_p90 = float(np.percentile(left, 90))
        right_p90 = float(np.percentile(right, 90))
        affected_side = "right" if right_p90 >= left_p90 else "left"
        score = max(mean_asymmetry / 0.040, p90_asymmetry / 0.100, p95_asymmetry / 0.140)

        return {
            "score": float(score),
            "mean_asymmetry": mean_asymmetry,
            "p90_asymmetry": p90_asymmetry,
            "p95_asymmetry": p95_asymmetry,
            "affected_side": affected_side,
        }

    @staticmethod
    def _generate_opacity_heatmap(tensor: torch.Tensor) -> Optional[np.ndarray]:
        """Genera un mapa espacial sobre la opacidad focal detectada."""
        arr = MedVisionPredictor._tensor_to_2d_array(tensor)
        opacity = MedVisionPredictor._estimate_lung_opacity_score(tensor)
        if arr is None or opacity is None or opacity["score"] < 1.0:
            return None

        h, w = arr.shape
        y0, y1 = int(0.20 * h), int(0.78 * h)
        if opacity["affected_side"] == "right":
            x0, x1 = int(0.53 * w), int(0.85 * w)
            opposite = arr[y0:y1, int(0.15 * w):int(0.47 * w)]
        else:
            x0, x1 = int(0.15 * w), int(0.47 * w)
            opposite = arr[y0:y1, int(0.53 * w):int(0.85 * w)]

        roi = arr[y0:y1, x0:x1]
        threshold = max(
            float(np.percentile(opposite, 95)) + 0.05,
            float(np.percentile(roi, 85)),
        )
        roi_heat = np.maximum(roi - threshold, 0.0)
        if roi_heat.max() <= 0:
            return None

        heatmap = np.zeros_like(arr, dtype=np.float32)
        heatmap[y0:y1, x0:x1] = roi_heat
        heatmap = cv2.GaussianBlur(heatmap, (0, 0), sigmaX=5, sigmaY=5)
        if heatmap.max() > 0:
            heatmap = heatmap / heatmap.max()
        return heatmap

    @staticmethod
    def _tensor_to_2d_array(tensor: torch.Tensor) -> Optional[np.ndarray]:
        try:
            arr = tensor.detach().cpu().squeeze().numpy().astype(np.float32)
        except Exception:
            return None

        if arr.ndim != 2 or arr.size == 0:
            return None
        return np.clip(arr, 0.0, 1.0)

    @staticmethod
    def _append_inference_metadata(
        metadata: Dict[str, Any],
        raw_pred_idx: int,
        raw_confidence: float,
        calibration: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        enriched = dict(metadata or {})
        enriched["_raw_model_prediction"] = str(raw_pred_idx)
        enriched["_raw_model_confidence"] = f"{raw_confidence:.6f}"
        if calibration is not None:
            enriched["_calibration_method"] = calibration["method"]
            enriched["_opacity_score"] = f"{calibration['score']:.6f}"
            enriched["_opacity_mean_asymmetry"] = f"{calibration['mean_asymmetry']:.6f}"
            enriched["_opacity_p90_asymmetry"] = f"{calibration['p90_asymmetry']:.6f}"
            enriched["_opacity_p95_asymmetry"] = f"{calibration['p95_asymmetry']:.6f}"
            enriched["_opacity_affected_side"] = calibration["affected_side"]
        return enriched


# Alias de compatibilidad
MedicalPredictor = MedVisionPredictor
