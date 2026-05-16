# MedVision AI 🏥🔬

### Detección de Anomalías y Tumores en Imágenes Médicas

**Universidad Santo Tomás · Tunja, Boyacá · Ingeniería de Datos e Inteligencia Artificial**

---

> ⚠️ **Disclaimer:** Este es un **prototipo de investigación académica**. NO es un dispositivo médico certificado ni ha sido evaluado por INVIMA. No debe usarse como único criterio diagnóstico.

## 📋 Descripción

MedVision AI es un sistema de visión por computadora orientado al análisis automatizado de imágenes médicas, con foco en la **detección temprana de anomalías y tumores**. El sistema busca apoyar el diagnóstico clínico mediante modelos de inteligencia artificial, reduciendo tiempos de revisión y mejorando la precisión diagnóstica.

### Características Principales

- 🔍 **Detección automatizada** de anomalías en imágenes médicas (DICOM, PNG, JPEG)
- 🧠 **Deep Learning** con EfficientNet-B4 + transfer learning (PyTorch / MONAI)
- 🗺️ **Explicabilidad** mediante Grad-CAM (mapas de calor sobre regiones relevantes)
- 🌐 **API REST** con FastAPI para integración con sistemas clínicos
- 🎛️ **Demo interactivo** con Gradio para validación rápida
- 📊 **Tracking de experimentos** con MLflow
- 🔒 **Cumplimiento normativo** colombiano (Ley 1581, consideraciones INVIMA)

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Lenguaje | Python 3.10+ |
| Framework ML | PyTorch + MONAI |
| API Backend | FastAPI |
| Imágenes DICOM | pydicom + SimpleITK |
| Visualización | Gradio (demo) |
| Base de datos | PostgreSQL + MinIO |
| Contenedores | Docker + Docker Compose |
| Tracking ML | MLflow |

## 🚀 Instalación

### Requisitos Previos

- Python 3.10 o superior
- Docker y Docker Compose (opcional, recomendado)
- GPU NVIDIA con CUDA (opcional, mejora rendimiento)

### Opción 1: Instalación Local

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/medvision-ai.git
cd medvision-ai

# Crear entorno virtual
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate   # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores
```

### Opción 2: Docker (Recomendado)

```bash
# Clonar y configurar
git clone https://github.com/tu-usuario/medvision-ai.git
cd medvision-ai
cp .env.example .env

# Levantar todos los servicios
docker-compose up -d

# Verificar servicios
docker-compose ps
```

**Servicios disponibles:**

| Servicio | URL |
|----------|-----|
| API FastAPI | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| Gradio Demo | http://localhost:7860 |
| MLflow UI | http://localhost:5000 |
| MinIO Console | http://localhost:9001 |

## 📁 Estructura del Proyecto

```
medvision-ai/
├── data/
│   ├── raw/                  # Imágenes originales (DICOM / PNG)
│   ├── processed/            # Imágenes normalizadas
│   └── annotations/          # Etiquetas y masks
├── notebooks/
│   ├── 01_eda.ipynb          # Análisis exploratorio
│   ├── 02_preprocessing.ipynb
│   └── 03_model_training.ipynb
├── src/
│   ├── data/                 # Carga y preprocesamiento
│   ├── models/               # Arquitecturas de red neuronal
│   ├── training/             # Entrenamiento y métricas
│   ├── inference/            # Predicción y explicabilidad
│   └── api/                  # Backend FastAPI
├── tests/                    # Suite de tests
├── docs/                     # Documentación técnica
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── README.md
```

## 🧪 Uso

### Ejecutar la API

```bash
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

### Ejecutar el Demo Gradio

```bash
python gradio_demo.py
```

### Ejecutar Tests

```bash
pytest tests/ -v --cov=src --cov-report=term-missing
```

### Entrenar Modelo

```bash
python -m src.training.trainer --config config.yaml
```

## 📊 Métricas Objetivo

| Métrica | Meta Mínima |
|---------|-------------|
| AUC-ROC | ≥ 0.85 |
| Sensibilidad (Recall) | ≥ 0.80 |
| F1-Score | ≥ 0.80 |

## ⚖️ Consideraciones Éticas y Normativas

- **Ley 1581 de 2012:** Datos médicos son datos sensibles. Requieren autorización del paciente y deben anonimizarse antes del entrenamiento.
- **INVIMA:** En fase académica, el sistema se documenta como prototipo de investigación.
- **Uso responsable:** El sistema es una herramienta de **apoyo al diagnóstico**, nunca un reemplazo del criterio médico profesional.

## 📚 Referencias

- [MONAI Framework](https://monai.io/)
- Wang et al., 2017 — ChestX-ray8
- Tan & Le, 2019 — EfficientNet
- Selvaraju et al., 2017 — Grad-CAM
- Lin et al., 2017 — Focal Loss

## 📝 Licencia

Proyecto académico — Universidad Santo Tomás, Tunja, Boyacá.
