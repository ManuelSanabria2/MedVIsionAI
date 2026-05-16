"""
gradio_demo.py — Demo interactivo con Gradio para MedVision AI.

Interfaz web para subir imágenes médicas y obtener predicciones
con visualización de Grad-CAM en tiempo real.

Ejecutar: python gradio_demo.py
Acceder: http://localhost:7860
"""

import logging
import os
from pathlib import Path

import numpy as np

try:
    import gradio as gr
except ImportError:
    raise ImportError("Gradio requerido: pip install gradio")

from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Predictor global
_predictor = None


def load_model():
    """Carga el modelo si existe un checkpoint."""
    global _predictor
    model_path = os.getenv("MODEL_PATH", "checkpoints/best_model.pth")

    if Path(model_path).exists():
        from src.inference.predictor import MedicalPredictor
        _predictor = MedicalPredictor.from_checkpoint(model_path)
        logger.info("Modelo cargado: %s", model_path)
    else:
        logger.warning("No se encontró modelo en %s. Demo en modo simulado.", model_path)


def predict_image(image):
    """Función de predicción para Gradio.

    Args:
        image: Imagen subida por el usuario (numpy array RGB).

    Returns:
        Tupla (etiquetas_con_confianza, imagen_heatmap).
    """
    if image is None:
        return {"Error": 1.0}, None

    # Modo simulado si no hay modelo cargado
    if _predictor is None:
        return _simulate_prediction(image)

    # Guardar imagen temporal
    import tempfile
    from PIL import Image

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        Image.fromarray(image).save(tmp.name)
        tmp_path = tmp.name

    try:
        result = _predictor.predict(tmp_path, generate_heatmap=True)

        labels = result["probabilities"]
        overlay = result.get("overlay")

        if overlay is not None:
            overlay = (overlay * 255).astype(np.uint8)

        return labels, overlay
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def _simulate_prediction(image):
    """Predicción simulada para demo sin modelo entrenado."""
    probs = {"normal": 0.73, "anomalía": 0.27}

    # Generar heatmap simulado
    h, w = image.shape[:2]
    y, x = np.ogrid[:h, :w]
    cx, cy = w // 2, h // 2
    heatmap = np.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * (min(h, w) / 4) ** 2))

    import matplotlib.cm as cm
    colored = (cm.jet(heatmap)[:, :, :3] * 255).astype(np.uint8)

    img_float = image.astype(np.float32) / 255.0
    if img_float.ndim == 2:
        img_float = np.stack([img_float] * 3, axis=-1)
    colored_float = colored.astype(np.float32) / 255.0

    overlay = (0.6 * img_float + 0.4 * colored_float)
    overlay = (np.clip(overlay, 0, 1) * 255).astype(np.uint8)

    return probs, overlay


# --- Interfaz Gradio ---
def create_interface():
    """Construye la interfaz Gradio."""

    with gr.Blocks(
        title="MedVision AI — Detección Médica",
        theme=gr.themes.Soft(),
    ) as demo:

        gr.Markdown(
            """
            # 🏥 MedVision AI
            ### Detección de Anomalías y Tumores en Imágenes Médicas

            **Universidad Santo Tomás · Tunja, Boyacá · Ingeniería de Datos e IA**

            > ⚠️ **Prototipo de investigación académica.** No es dispositivo médico certificado.
            > No usar como único criterio diagnóstico.
            """
        )

        with gr.Row():
            with gr.Column(scale=1):
                input_image = gr.Image(
                    label="📤 Subir Imagen Médica",
                    type="numpy",
                    sources=["upload", "clipboard"],
                )
                predict_btn = gr.Button(
                    "🔍 Analizar Imagen",
                    variant="primary",
                    size="lg",
                )

                gr.Markdown(
                    """
                    **Formatos soportados:** PNG, JPEG, BMP
                    **Modalidades:** Radiografía, CT, MRI
                    """
                )

            with gr.Column(scale=1):
                output_labels = gr.Label(
                    label="📊 Resultado de Clasificación",
                    num_top_classes=3,
                )
                output_heatmap = gr.Image(
                    label="🗺️ Mapa de Calor (Grad-CAM)",
                    type="numpy",
                )

        predict_btn.click(
            fn=predict_image,
            inputs=[input_image],
            outputs=[output_labels, output_heatmap],
        )

        gr.Markdown(
            """
            ---
            **Métricas objetivo:** AUC-ROC ≥ 0.85 | Sensibilidad ≥ 0.80

            *Desarrollado con PyTorch + MONAI + EfficientNet-B4*
            """
        )

    return demo


if __name__ == "__main__":
    load_model()
    demo = create_interface()
    demo.launch(
        server_port=int(os.getenv("GRADIO_SERVER_PORT", "7860")),
        share=os.getenv("GRADIO_SHARE", "false").lower() == "true",
    )
