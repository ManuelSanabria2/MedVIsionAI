# ============================================================
# MedVision AI — Dockerfile Optimizado
# Base: NVIDIA CUDA 11.8 + Python 3.10 (multi-stage build)
# ============================================================

# ---- Stage 1: Builder ----
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Python 3.10 + dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    python3.10-venv \
    python3.10-dev \
    python3-pip \
    gcc \
    g++ \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    curl \
    && ln -sf /usr/bin/python3.10 /usr/bin/python \
    && ln -sf /usr/bin/pip3 /usr/bin/pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Instalar dependencias Python (cacheado por Docker layers)
COPY requirements.txt .
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cu118 \
    -r requirements.txt

# ---- Stage 2: Runtime ----
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility

# Python runtime mínimo
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    python3-pip \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    curl \
    && ln -sf /usr/bin/python3.10 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

# Copiar paquetes Python instalados desde builder
COPY --from=builder /usr/local/lib/python3.10/dist-packages /usr/local/lib/python3.10/dist-packages
COPY --from=builder /usr/lib/python3/dist-packages /usr/lib/python3/dist-packages
COPY --from=builder /usr/local/bin /usr/local/bin

WORKDIR /app

# Metadatos
LABEL maintainer="Universidad Santo Tomás - Ingeniería de Datos e IA" \
      description="MedVision AI - Detección de Anomalías en Imágenes Médicas" \
      version="0.1.0" \
      cuda="11.8" \
      python="3.10"

# Copiar código fuente
COPY src/ ./src/
COPY tests/ ./tests/
COPY gradio_demo.py .
COPY requirements.txt .

# Crear directorios necesarios
RUN mkdir -p data/raw data/processed data/annotations \
    checkpoints static/heatmaps mlruns

# Crear usuario no-root (seguridad)
RUN groupadd -r medvision && useradd -r -g medvision -d /app medvision \
    && chown -R medvision:medvision /app
USER medvision

# Puertos: FastAPI + Gradio
EXPOSE 8000 7860

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
    CMD curl -f http://localhost:8000/health || exit 1

# Entrypoint configurable
ENTRYPOINT ["python", "-m"]
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
