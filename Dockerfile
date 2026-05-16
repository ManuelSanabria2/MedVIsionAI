# ============================================================
# MedVision AI - Dockerfile
# Imagen base para el sistema de detección médica
# ============================================================

FROM python:3.10-slim

# Metadatos
LABEL maintainer="Universidad Santo Tomás - Ingeniería de Datos e IA"
LABEL description="MedVision AI - Detección de Anomalías en Imágenes Médicas"
LABEL version="0.1.0"

# Variables de entorno
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Directorio de trabajo
WORKDIR /app

# Dependencias del sistema para procesamiento de imágenes
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY src/ ./src/
COPY tests/ ./tests/
COPY gradio_demo.py .

# Crear directorios necesarios
RUN mkdir -p data/raw data/processed data/annotations checkpoints

# Puerto de la API FastAPI
EXPOSE 8000

# Puerto del demo Gradio
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Comando por defecto: iniciar API
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
