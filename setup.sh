#!/usr/bin/env bash
# ============================================================
# MedVision AI — Script de Setup Inicial
# Universidad Santo Tomás · Tunja, Boyacá
# ============================================================
# Uso:
#   chmod +x setup.sh
#   ./setup.sh           → Setup completo (CPU)
#   ./setup.sh --gpu     → Setup con soporte GPU (CUDA 11.8)
#   ./setup.sh --dev     → Solo entorno local (sin Docker)
# ============================================================

set -euo pipefail

# ── Colores ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1" >&2; }
info()  { echo -e "${BLUE}[i]${NC} $1"; }

# ── Banner ──
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║          🏥  MedVision AI — Setup v0.1.0        ║"
echo "║    Detección de Anomalías en Imágenes Médicas   ║"
echo "║   Universidad Santo Tomás · Tunja, Boyacá       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Parsear argumentos ──
GPU_MODE=false
DEV_ONLY=false
for arg in "$@"; do
    case $arg in
        --gpu)  GPU_MODE=true ;;
        --dev)  DEV_ONLY=true ;;
        --help) echo "Uso: ./setup.sh [--gpu] [--dev]"; exit 0 ;;
    esac
done

# ── 1. Verificar requisitos ──
info "Verificando requisitos del sistema..."

# Python 3.10+
if command -v python3 &>/dev/null; then
    PY_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    if [[ $(echo "$PY_VERSION >= 3.10" | bc -l 2>/dev/null || echo 0) -eq 1 ]] || [[ "$PY_VERSION" == "3.10" ]] || [[ "$PY_VERSION" > "3.10" ]]; then
        log "Python $PY_VERSION encontrado"
    else
        error "Se requiere Python 3.10+. Encontrado: $PY_VERSION"
        exit 1
    fi
else
    error "Python 3 no encontrado. Instalar Python 3.10+"
    exit 1
fi

# Docker (si no es --dev)
if [ "$DEV_ONLY" = false ]; then
    if command -v docker &>/dev/null; then
        log "Docker encontrado: $(docker --version | cut -d' ' -f3 | tr -d ',')"
    else
        error "Docker no encontrado. Instalar Docker Desktop o usar --dev"
        exit 1
    fi

    if command -v docker compose &>/dev/null; then
        log "Docker Compose encontrado"
    elif command -v docker-compose &>/dev/null; then
        log "Docker Compose (legacy) encontrado"
    else
        error "Docker Compose no encontrado"
        exit 1
    fi
fi

# GPU check
if [ "$GPU_MODE" = true ]; then
    if command -v nvidia-smi &>/dev/null; then
        GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -1)
        log "GPU detectada: $GPU_NAME"
        nvidia-smi --query-gpu=driver_version,cuda_version --format=csv,noheader
    else
        warn "nvidia-smi no encontrado. Continuando sin verificación GPU."
    fi
fi

# ── 2. Crear entorno virtual ──
info "Configurando entorno virtual Python..."

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    log "Entorno virtual creado: .venv/"
else
    warn "Entorno virtual ya existe, reutilizando."
fi

# Activar venv
source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate 2>/dev/null
log "Entorno virtual activado"

# ── 3. Instalar dependencias ──
info "Instalando dependencias Python..."

pip install --upgrade pip setuptools wheel -q

if [ "$GPU_MODE" = true ]; then
    info "Instalando PyTorch con CUDA 11.8..."
    pip install -r requirements.txt \
        --extra-index-url https://download.pytorch.org/whl/cu118 \
        -q
else
    info "Instalando PyTorch (CPU)..."
    pip install -r requirements.txt \
        --extra-index-url https://download.pytorch.org/whl/cpu \
        -q
fi
log "Dependencias instaladas correctamente"

# Verificar instalación crítica
python -c "import torch; print(f'  PyTorch {torch.__version__} | CUDA: {torch.cuda.is_available()}')"
python -c "import monai; print(f'  MONAI {monai.__version__}')"
python -c "import fastapi; print(f'  FastAPI {fastapi.__version__}')"

# ── 4. Configurar variables de entorno ──
info "Configurando variables de entorno..."

if [ ! -f ".env" ]; then
    cp .env.example .env
    # Generar SECRET_KEY aleatorio
    SECRET=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
    sed -i "s/cambiar-por-clave-segura-aleatoria/$SECRET/" .env 2>/dev/null || true
    log ".env creado desde .env.example (editar credenciales)"
else
    warn ".env ya existe, no se sobrescribe"
fi

# ── 5. Crear directorios ──
info "Creando estructura de directorios..."

mkdir -p data/{raw,processed,annotations}
mkdir -p checkpoints
mkdir -p static/heatmaps
mkdir -p mlruns
mkdir -p notebooks

log "Directorios creados"

# ── 6. Docker (si aplica) ──
if [ "$DEV_ONLY" = false ]; then
    info "Construyendo y levantando servicios Docker..."

    if [ "$GPU_MODE" = true ]; then
        docker compose --profile gpu build
        docker compose --profile gpu up -d
        log "Servicios levantados con GPU"
    else
        docker compose build
        docker compose up -d
        log "Servicios levantados (CPU)"
    fi

    # Esperar a que los servicios estén listos
    info "Esperando servicios (30s)..."
    sleep 15

    # Verificar servicios
    echo ""
    info "Estado de servicios:"
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
    echo ""
fi

# ── 7. Verificación final ──
info "Ejecutando verificación rápida..."

python -c "
from src.models.backbone import SUPPORTED_BACKBONES
from src.models.loss import get_loss_function
from src.data.preprocessor import MedicalImagePreprocessor

print('  Backbones:', SUPPORTED_BACKBONES)
print('  Focal Loss: OK')
print('  Preprocessor: OK')
print('  Verificación exitosa ✓')
"

# ── Resumen ──
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║            🎉  Setup Completado                 ║"
echo "╠══════════════════════════════════════════════════╣"
if [ "$DEV_ONLY" = false ]; then
echo "║  API FastAPI:    http://localhost:8000           ║"
echo "║  Swagger UI:     http://localhost:8000/docs      ║"
echo "║  MLflow:         http://localhost:5000           ║"
echo "║  MinIO Console:  http://localhost:9001           ║"
fi
echo "║  Gradio Demo:    python gradio_demo.py          ║"
echo "║  Tests:          pytest tests/ -v               ║"
echo "║  GPU:            $([ "$GPU_MODE" = true ] && echo "Habilitada ✓" || echo "No (usar --gpu)")              ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
warn "Recuerda: Editar .env con credenciales seguras antes de producción"
info "Siguiente paso: Descargar dataset → python -m src.data.loader"
echo ""
