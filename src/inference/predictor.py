"""
predictor.py — Pipeline de inferencia para imágenes médicas.

Carga modelo → preprocesa imagen → genera predicción + confianza + Grad-CAM.
Retorna JSON con predicción, confianza y URL de imagen procesada.
"""

import logging
from pathlib import Path
from typing import Dict, Optional, Union

import numpy as np
import torch

from src.data.loader import DICOMLoader, ImageLoader
from src.data.preprocessor import MedicalImagePreprocessor
from src.inference.explainability import GradCAM

logger = logging.getLogger(__name__)


class MedicalPredictor:
    """Pipeline completo de inferencia para imágenes médicas.

    Uso:
        >>> predictor = MedicalPredictor.from_checkpoint("checkpoints/best_model.pth")
        >>> result = predictor.predict("patient_xray.dcm")
        >>> print(result["prediction"], result["confidence"])
    """

    CLASS_NAMES = {0: "normal", 1: "anomalía"}

    def __init__(
        self,
        model: torch.nn.Module,
        preprocessor: Optional[MedicalImagePreprocessor] = None,
        device: Optional[str] = None,
        confidence_threshold: float = 0.5,
        class_names: Optional[Dict[int, str]] = None,
    ):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = model.to(self.device)
        self.model.eval()
        self.preprocessor = preprocessor or MedicalImagePreprocessor.get_eval_preprocessor()
        self.threshold = confidence_threshold
        self.class_names = class_names or self.CLASS_NAMES
        self.gradcam = GradCAM(model)

    @classmethod
    def from_checkpoint(
        cls,
        checkpoint_path: str,
        architecture: str = "efficientnet_b4",
        num_classes: int = 2,
        **kwargs,
    ) -> "MedicalPredictor":
        """Carga predictor desde un checkpoint guardado."""
        from src.models.detector import MedicalDetector

        model = MedicalDetector(architecture=architecture, num_classes=num_classes)
        checkpoint = torch.load(checkpoint_path, map_location="cpu")
        model.load_state_dict(checkpoint["model_state_dict"])
        logger.info("Modelo cargado: %s (epoch %d)", checkpoint_path, checkpoint.get("epoch", -1))
        return cls(model=model, **kwargs)

    def predict(
        self,
        image_path: Union[str, Path],
        generate_heatmap: bool = True,
    ) -> Dict:
        """Ejecuta predicción completa sobre una imagen.

        Args:
            image_path: Ruta a la imagen (DICOM, PNG, JPEG).
            generate_heatmap: Si True, genera mapa Grad-CAM.

        Returns:
            Dict con: prediction, confidence, class_name, probabilities,
                      heatmap (si solicitado), metadata (si DICOM).
        """
        image_path = Path(image_path)

        # Cargar imagen según formato
        metadata = {}
        if image_path.suffix.lower() in (".dcm",):
            loader = DICOMLoader(anonymize=True)
            raw_image, metadata = loader.load(image_path)
        else:
            loader = ImageLoader(grayscale=True)
            raw_image = loader.load(image_path)

        # Preprocesar
        tensor = self.preprocessor(raw_image).unsqueeze(0).to(self.device)

        # Inferencia
        with torch.no_grad():
            logits = self.model(tensor)
            proba = torch.softmax(logits, dim=1).squeeze().cpu().numpy()

        pred_class = int(proba.argmax())
        confidence = float(proba[pred_class])

        result = {
            "prediction": pred_class,
            "class_name": self.class_names.get(pred_class, str(pred_class)),
            "confidence": confidence,
            "probabilities": {self.class_names.get(i, str(i)): float(p) for i, p in enumerate(proba)},
            "metadata": metadata,
            "image_path": str(image_path),
        }

        # Grad-CAM
        if generate_heatmap:
            tensor_grad = self.preprocessor(raw_image).unsqueeze(0).to(self.device)
            heatmap = self.gradcam.generate(tensor_grad, target_class=pred_class)
            overlay = self.gradcam.overlay(raw_image, heatmap)
            result["heatmap"] = heatmap
            result["overlay"] = overlay

        logger.info(
            "Predicción: %s (%.1f%%) — %s",
            result["class_name"], confidence * 100, image_path.name,
        )
        return result

    def predict_batch(self, image_paths: list, generate_heatmap: bool = False) -> list:
        """Ejecuta predicción sobre múltiples imágenes."""
        return [self.predict(p, generate_heatmap=generate_heatmap) for p in image_paths]
