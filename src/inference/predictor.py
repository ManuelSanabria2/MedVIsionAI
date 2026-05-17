"""
predictor.py — Pipeline de inferencia para MedVision AI.

Encapsula la carga del modelo (MLflow o checkpoint local), preprocesamiento
de imágenes, inferencia con probabilidades de confianza, y explicabilidad
visual usando Grad-CAM en una única interfaz simple de usar.

Universidad Santo Tomás · Tunja, Boyacá
"""

import logging
from pathlib import Path
from typing import Any, Dict, Optional, Union

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

            probs_dict = {
                self.class_names.get(i, f"clase_{i}"): p.item()
                for i, p in enumerate(probs)
            }

        # 3. Explicabilidad (Opcional)
        overlay_img = None
        if generate_heatmap and self.grad_cam is not None:
            try:
                heatmap = self.grad_cam.generate_heatmap(input_tensor, target_class=pred_idx)
                
                # Rescatar la imagen base (del tensor original preprocesado, normalizada 0-1)
                base_img = tensor.squeeze().numpy()
                if base_img.ndim == 2:
                    base_img = (base_img - base_img.min()) / (base_img.max() - base_img.min() + 1e-8)
                
                overlay, _ = self.grad_cam.overlay_heatmap(base_img, heatmap)
                overlay_img = np.array(overlay)
            except Exception as e:
                logger.error("Error generando heatmap: %s", e)

        return {
            "prediction": pred_idx,
            "class_name": self.class_names.get(pred_idx, "desconocida"),
            "confidence": confidence,
            "probabilities": probs_dict,
            "metadata": metadata,
            "overlay": overlay_img,
        }


# Alias de compatibilidad
MedicalPredictor = MedVisionPredictor
