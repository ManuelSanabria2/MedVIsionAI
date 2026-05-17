"""
app.py — Interfaz de Demostración (Gradio) para MedVision AI.

Conecta con la API backend (FastAPI) para realizar inferencia
sobre imágenes médicas, mostrando la predicción, nivel de confianza
y explicabilidad visual (Grad-CAM).

Universidad Santo Tomás · Tunja, Boyacá
"""

import io
import os
import requests
import gradio as gr
from PIL import Image
import pandas as pd

# Configuración
API_URL = os.getenv("API_URL", "http://localhost:8000/predict")
THEME_COLOR = "#0077B6"

# CSS Personalizado (Estética médica, limpio, responsivo)
css = f"""
.gradio-container {{
    font-family: 'Inter', 'Roboto', sans-serif;
}}
.medical-warning {{
    background-color: #FFF3CD;
    color: #856404;
    padding: 10px;
    border-radius: 5px;
    border-left: 5px solid #FFEBA8;
    margin-bottom: 20px;
    font-weight: 500;
}}
.dark .medical-warning {{
    background-color: #2D2712;
    color: #FFDF70;
    border-left: 5px solid #A68715;
}}
h1 {{
    color: {THEME_COLOR};
}}
.dark h1 {{
    color: #48CAE4;
}}
"""

def analyze_image(image_path: str, history: list):
    """
    Envía la imagen a la API y procesa la respuesta.
    Retorna:
      - string (Resultado textual)
      - dict (Para barra de confianza en Label)
      - PIL Image (Grad-CAM overlay)
      - list (Historial actualizado)
    """
    if not image_path:
        return "Por favor cargue una imagen.", None, None, history

    # Preparamos la petición
    try:
        with open(image_path, "rb") as f:
            files = {"file": (os.path.basename(image_path), f, "application/octet-stream")}
            response = requests.post(API_URL, files=files, timeout=15)
            
        if response.status_code == 200:
            data = response.json()
            
            # 1. Extraer resultados
            pred_class = data.get("class_detected", "Desconocido").capitalize()
            confidence = data.get("confidence", 0.0)
            gradcam_url = data.get("gradcam_url")
            
            # Formato de barra de confianza (Gradio Label format)
            conf_dict = {
                "Anomalía": confidence if pred_class.lower() == "anomalía" else 1 - confidence,
                "Normal": confidence if pred_class.lower() == "normal" else 1 - confidence
            }
            
            # Obtener el mapa de calor (Grad-CAM)
            heatmap_img = None
            if gradcam_url:
                # Construir la URL completa basada en la URL de la API
                base_url = API_URL.replace("/predict", "")
                full_heatmap_url = f"{base_url}{gradcam_url}"
                
                try:
                    hm_resp = requests.get(full_heatmap_url, timeout=10)
                    if hm_resp.status_code == 200:
                        heatmap_img = Image.open(io.BytesIO(hm_resp.content))
                except Exception as e:
                    print(f"Error descargando heatmap: {e}")
            
            # Mensaje principal
            result_text = f"### Diagnóstico Sugerido: **{pred_class}**\n*Tiempo de inferencia: {data.get('inference_time_ms', 0):.1f} ms*"
            
            # Actualizar historial
            new_record = [os.path.basename(image_path), pred_class, f"{confidence*100:.1f}%"]
            history.insert(0, new_record)
            if len(history) > 5:
                history = history[:5]
                
            return result_text, conf_dict, heatmap_img, history
            
        else:
            return f"❌ Error de la API ({response.status_code}): {response.text}", None, None, history
            
    except requests.exceptions.ConnectionError:
        return "❌ Error: No se pudo conectar a la API. ¿Está corriendo FastAPI en localhost:8000?", None, None, history
    except Exception as e:
        return f"❌ Error inesperado: {str(e)}", None, None, history


# ── Construcción de la Interfaz Gradio ──
with gr.Blocks(title="MedVision AI Demo", css=css, theme=gr.themes.Soft(primary_hue="blue")) as demo:
    
    # Historial (Estado interno)
    history_state = gr.State([])
    
    # Cabecera
    gr.Markdown("# 🏥 MedVision AI — Detección de Anomalías Médicas")
    
    gr.HTML("""
        <div class="medical-warning">
            ⚠️ <b>SISTEMA DE APOYO DIAGNÓSTICO:</b> Esta herramienta está diseñada únicamente para propósitos 
            de demostración académica e investigación. <b>NO REEMPLAZA EL CRITERIO CLÍNICO NI CONSTITUYE UN 
            DISPOSITIVO MÉDICO CERTIFICADO.</b>
        </div>
    """)
    
    with gr.Row():
        # Panel Izquierdo: Entrada
        with gr.Column(scale=1):
            gr.Markdown("### 1. Cargar Estudio")
            image_input = gr.File(
                label="Imagen médica (PNG, JPG, DICOM)",
                file_types=[".png", ".jpg", ".jpeg", ".dcm", ".dicom"],
                type="filepath"
            )
            analyze_btn = gr.Button("🔍 Analizar Imagen", variant="primary", size="lg")
            
            gr.Markdown("### Historial de Sesión (Últimas 5)")
            history_table = gr.Dataframe(
                headers=["Archivo", "Predicción", "Confianza"],
                datatype=["str", "str", "str"],
                interactive=False,
                row_count=5,
                col_count=(3, "fixed")
            )

        # Panel Derecho: Resultados
        with gr.Column(scale=1):
            gr.Markdown("### 2. Resultados del Análisis")
            result_markdown = gr.Markdown("Esperando imagen...")
            
            confidence_bar = gr.Label(label="Nivel de Confianza (Softmax)")
            
            gr.Markdown("### 3. Explicabilidad (Grad-CAM)")
            heatmap_output = gr.Image(label="Zonas de Atención del Modelo", type="pil")

    # Acciones
    analyze_btn.click(
        fn=analyze_image,
        inputs=[image_input, history_state],
        outputs=[result_markdown, confidence_bar, heatmap_output, history_state]
    ).then(
        fn=lambda h: pd.DataFrame(h, columns=["Archivo", "Predicción", "Confianza"]),
        inputs=[history_state],
        outputs=[history_table]
    )

if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0", 
        server_port=7860, 
        share=False,
        show_api=False,
        favicon_path=None
    )
