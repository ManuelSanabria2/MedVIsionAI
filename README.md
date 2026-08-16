# MedVision AI

![Status](https://img.shields.io/badge/Estado-Desarrollo-orange)
![Tests](https://img.shields.io/badge/Tests-Pasando-brightgreen)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![PyTorch](https://img.shields.io/badge/PyTorch-2.1-ee4c2c)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-00a680)
![React](https://img.shields.io/badge/React-18-61dafb)

**Detección de anomalías en imágenes médicas mediante Deep Learning, con explicabilidad visual.**

> **Aviso Académico/Clínico:** Proyecto desarrollado con fines de investigación académica en la **Universidad Santo Tomás (Tunja, Boyacá)**. NO es un dispositivo médico certificado y NO debe utilizarse como único criterio diagnóstico.

---

## 1. Problema

En radiología, el cuello de botella no es la captura de la imagen sino su lectura. Tres factores lo agravan:

- **Volumen contra tiempo de lectura.** Un servicio de imagenología produce más estudios de los que la plantilla de radiólogos puede priorizar; los casos urgentes esperan en la misma cola que los rutinarios.
- **Desbalance clínico extremo.** En la práctica, la gran mayoría de los estudios son normales. Un clasificador entrenado con pérdida estándar aprende el atajo de predecir "normal" y obtiene buena exactitud fallando justo en los casos que importan: los falsos negativos patológicos.
- **Rechazo a la caja negra.** Un modelo que solo devuelve una etiqueta y una probabilidad no es verificable por el médico, no es defendible ante una auditoría y, por lo tanto, no se adopta.

A esto se suma el marco legal: los datos de salud son datos sensibles bajo la **Ley 1581 de 2012** (Colombia), lo que obliga a anonimizar los metadatos DICOM antes de cualquier procesamiento o registro.

## 2. Solución

MedVision AI es un sistema de **apoyo** diagnóstico —no de reemplazo— que ataca cada punto anterior con una decisión de diseño explícita:

| Problema | Respuesta del sistema |
|---|---|
| Volumen de lectura | API REST de inferencia (`POST /predict`) que clasifica el estudio como *normal* o *con anomalía* y devuelve confianza, para priorizar la cola de lectura. |
| Desbalance de clases | **Focal Loss** (γ=2.0) en lugar de BCE: reduce el peso de los ejemplos fáciles y fuerza al optimizador hacia los casos difíciles. |
| Caja negra | **Grad-CAM** superpuesto sobre la imagen original: el médico ve qué región disparó la alarma y la contrasta con su propio criterio. |
| Datos sensibles (Ley 1581) | Anonimización de metadatos DICOM en el preprocesamiento, antes de que la imagen llegue al modelo o al log. Detalle en [`docs/normativa.md`](docs/normativa.md). |
| Trazabilidad | Cada predicción se registra en PostgreSQL con UUID, confianza, latencia y ruta del heatmap; endpoint `/feedback` para retroalimentación médica. |

## 3. Arquitectura

```text
    [ Frontend React / Cliente REST ]
           │
           ▼ (HTTP/REST)
    ┌────────────────────────┐
    │     FastAPI Server     │──(Logs)──▶ [ PostgreSQL ]
    └──────────┬─────────────┘
               │
      ┌────────▼──────────┐
      │ MedVisionPredictor│◀──(Checkpoints)── [ MLflow Registry ]
      └────────┬──────────┘
               │
    ┌──────────▼───────────┐
    │  DICOM Preprocessor  │ (Anonimización + Normalización)
    └──────────┬───────────┘
               │
    ┌──────────▼───────────┐
    │   Backbone CNN/ViT   │ (Clasificación + Focal Loss)
    └──────────┬───────────┘
               │
    ┌──────────▼───────────┐
    │   Grad-CAM Module    │ (Mapas de calor explicativos)
    └──────────────────────┘
```

**Organización del código:**

```
src/
├── api/          FastAPI: rutas, esquemas Pydantic, capa de base de datos
├── data/         Carga de datos, dataset y preprocesador DICOM/PNG
├── models/       Backbones intercambiables, detector y Focal Loss
├── inference/    Predictor de producción y explicabilidad (Grad-CAM)
└── training/     Trainer, callbacks y métricas clínicas
frontend/         SPA React (landing pública + panel clínico en /app)
demo/             Interfaz Gradio de demostración
tests/            Suite Pytest (API, modelo, predictor, preprocesamiento)
docs/             Arquitectura, referencia de API y cumplimiento normativo
```

El backbone es intercambiable vía `MODEL_ARCHITECTURE`: `efficientnet_b4` (por defecto), `efficientnet_b0`, `resnet50`, `resnet101`, `densenet121`, `convnext_tiny`, `vit_b_16` y `swin_t`. Los backbones de transformer incluyen adaptadores que convierten su salida a un mapa espacial `(B, C, H, W)`, de modo que el mismo *global average pooling* y el mismo Grad-CAM funcionan para todos.

Decisiones de diseño justificadas y limitaciones conocidas: [`docs/arquitectura.md`](docs/arquitectura.md).

## 4. Tecnologías

| Capa | Stack |
|---|---|
| Modelo | PyTorch 2.1, torchvision, EfficientNet / ResNet / DenseNet / ConvNeXt / ViT / Swin |
| Explicabilidad | Grad-CAM propio + OpenCV para el overlay |
| Imagen médica | SimpleITK, pydicom, Pillow, NumPy |
| API | FastAPI, Uvicorn, Pydantic, SQLAlchemy |
| Datos | PostgreSQL (logs de predicción), MinIO (almacenamiento de imágenes) |
| MLOps | MLflow (tracking y registro de modelos), Docker, Docker Compose |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router, Framer Motion, Recharts, Axios |
| Demo | Gradio |
| Calidad | Pytest, Vitest, GitHub Actions |

## 5. Resultados

**Estado actual: la arquitectura, el pipeline de entrenamiento y la evaluación están implementados y probados; el entrenamiento final sobre el dataset clínico está pendiente, por lo que este README no publica métricas de desempeño.**

*Criterios de aceptación* definidos en el código (`src/training/metrics.py`), que un checkpoint debe cumplir para considerarse apto:

| Métrica | Meta | Por qué |
|---|---|---|
| AUC-ROC | ≥ 0.85 | Discriminación global independiente del umbral. |
| Sensibilidad (recall) | ≥ 0.80 | El error costoso es el falso negativo: una patología que se declara normal. |
| Precisión y F1-Score | reportadas | Controlan el costo de las falsas alarmas sobre la carga de trabajo. |
| Especificidad | reportada | Mide el comportamiento sobre la clase mayoritaria (normales). |

El evaluador marca un checkpoint como aprobado solo si **AUC-ROC y sensibilidad superan simultáneamente** sus metas; la exactitud global no se usa como criterio, precisamente por el desbalance de clases.

*Verificación implementada:*

- **16 pruebas Pytest** sobre API, modelo, predictor y preprocesamiento.
- **Suite Vitest** para el frontend, ejecutada en CI (`.github/workflows/frontend.yml`).
- Registro de experimentos en MLflow (`medvision-detection`) para comparar backbones bajo el mismo protocolo.

Cuando exista un checkpoint entrenado, esta sección se reemplaza por la tabla de métricas medidas sobre el conjunto de prueba retenido.

## 6. Demo

**Interfaz Gradio** (la vía más rápida para probar el sistema end-to-end):

```bash
python -m src.api.main &   # API en http://localhost:8000
python demo/app.py         # Demo en http://localhost:7860
```

**Frontend clínico React** — landing pública en `/` y panel autenticado en `/app`:

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

**API directa:**

```bash
# Verificación de salud
curl -X GET "http://localhost:8000/health"

# Predicción de anomalía
curl -X POST "http://localhost:8000/predict" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/ruta/a/radiografia.dcm"
```

Respuesta:

```json
{
  "prediction_id": "8b3f4...2a1c",
  "prediction": 1,
  "class_detected": "anomalía",
  "confidence": 0.94,
  "gradcam_url": "/static/heatmaps/8b3f4.png",
  "inference_time_ms": 115.3
}
```

Documentación interactiva en `http://localhost:8000/docs`. Referencia completa de endpoints en [`docs/api_reference.md`](docs/api_reference.md).

> No hay una instancia pública desplegada en este momento. El repositorio incluye un blueprint de Render (`render.yaml`, `Dockerfile.render`) listo para levantar API y frontend cuando se publique.

## 7. Instalación

**Requisitos:** Python 3.10+, Node.js 18+ y (opcional) Docker con Docker Compose. GPU NVIDIA con CUDA para entrenar; la inferencia funciona en CPU.

### Opción A — Local

```bash
git clone https://github.com/ManuelSanabria2/MedVIsionAI.git
cd MedVIsionAI

./setup.sh --dev              # crea .env, directorios y valida dependencias
pip install -r requirements.txt

python -m src.api.main        # API en http://localhost:8000
```

Las variables de entorno se documentan en `.env.example`. Sin PostgreSQL disponible, se puede arrancar con `DISABLE_DATABASE=true` para omitir el registro de predicciones.

### Opción B — Docker Compose (stack completo)

Levanta API, PostgreSQL, MinIO y MLflow:

```bash
docker compose up -d                    # CPU
docker compose --profile gpu up -d      # con GPU
docker compose logs -f app
```

### Frontend

```bash
cd frontend
npm install
npm run dev       # desarrollo
npm run build     # build de producción en dist/
```

### Pruebas

```bash
pytest -v                       # backend
cd frontend && npm run test     # frontend
```

### Entrenamiento

```bash
python train.py                 # ver train.py para la configuración del run
```

---

## Créditos

Desarrollado en el marco del programa de Ingeniería de la **Universidad Santo Tomás · Tunja, Boyacá**.

* **Investigador/Desarrollador Principal:** Manuel José Sanabria Gil
* **Áreas:** Arquitectura de Software, MLOps e Inteligencia Artificial Médica.

Detalles técnicos avanzados en la carpeta [`docs/`](docs/).
