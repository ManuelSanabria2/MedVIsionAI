"""
train.py — Script para entrenar el modelo de MedVision AI.

Permite generar un conjunto de datos sintéticos realistas de radiografías de tórax
(con y sin neumonía/consolidaciones pulmonares) si no se dispone de imágenes,
para luego entrenar el detector EfficientNet-B4 con nuestro pipeline clínico.
Al finalizar, guarda los pesos óptimos en checkpoints/best_model.pth.

Universidad Santo Tomás · Tunja, Boyacá
"""

import os
import shutil
import random
import logging
from pathlib import Path
from typing import List, Tuple
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

# Configurar logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("MedVisionTrainPipeline")

from src.models.detector import AnomalyDetector
from src.models.loss import FocalLoss
from src.data.preprocessor import DICOMPreprocessor
from src.data.dataset import MedicalImageDataset
from src.training.trainer import MedVisionTrainer

# Semilla aleatoria para reproducibilidad
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)
torch.manual_seed(RANDOM_SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(RANDOM_SEED)


def generate_synthetic_chest_xray(is_pneumonia: bool, width: int = 256, height: int = 256) -> Image.Image:
    """Genera una imagen sintética realista de una radiografía de tórax.
    
    Para los casos de neumonía, añade un parche o infiltrado radiopaco (blanco/gris claro)
    en la cavidad pulmonar derecha.
    """
    img_arr = np.zeros((height, width), dtype=np.uint8)
    
    # Parámetros aleatorios sutiles para evitar sobreajuste directo
    heart_shift = random.uniform(-0.02, 0.02)
    lung_scale = random.uniform(0.9, 1.1)
    
    for y in range(height):
        for x in range(width):
            dx = (x - width / 2) / (width / 2)
            dy = (y - height / 2) / (height / 2)
            
            # 1. Atenuación base del cuerpo
            val = 145 - int(35 * (dx**2 + dy**2))
            
            # 2. Silueta de los pulmones (zonas más oscuras)
            lung_left = np.exp(-((dx + 0.32)**2 / (0.07 * lung_scale) + dy**2 / (0.33 * lung_scale)))
            lung_right = np.exp(-((dx - 0.32)**2 / (0.07 * lung_scale) + dy**2 / (0.33 * lung_scale)))
            val -= int(75 * (lung_left + lung_right))
            
            # 3. Corazón/Mediastino (blanco en el centro)
            heart = np.exp(-((dx - 0.05 + heart_shift)**2 / 0.025 + (dy - 0.08)**2 / 0.11))
            val += int(65 * heart)
            
            # 4. Costillas
            ribs = 0.06 * np.sin(y / 6.0) * (1.0 - abs(dx))
            val += int(140 * max(0.0, ribs))
            
            # 5. Neumonía / Infiltración alveolar (parche blanco/grisáceo asimétrico)
            if is_pneumonia:
                # Añadir parche de consolidación en el pulmón derecho (dx positivo)
                pneumonia_patch = np.exp(-((dx - 0.28)**2 / 0.02 + (dy - 0.12)**2 / 0.015))
                val += int(95 * pneumonia_patch)
            
            # Limitar rango píxeles
            img_arr[y, x] = max(10, min(245, val))
            
    # Agregar algo de ruido gaussiano para simular grano de rayos X
    noise = np.random.normal(0, 3, (height, width)).astype(np.float32)
    img_arr = np.clip(img_arr.astype(np.float32) + noise, 0, 255).astype(np.uint8)
            
    return Image.fromarray(img_arr, mode="L")


def prepare_synthetic_dataset(num_samples: int = 80) -> Tuple[List[Path], List[int]]:
    """Genera imágenes sintéticas si el dataset no tiene imágenes reales y las guarda en data/raw/."""
    raw_dir = Path("data/raw")
    raw_dir.mkdir(parents=True, exist_ok=True)
    
    # Subcarpetas
    normal_dir = raw_dir / "normal"
    pneumonia_dir = raw_dir / "pneumonia"
    normal_dir.mkdir(exist_ok=True)
    pneumonia_dir.mkdir(exist_ok=True)
    
    paths = []
    labels = []
    
    logger.info("Generando dataset sintético de radiografías (normales y con neumonía)...")
    
    # 50% sanos (label=0), 50% neumonía (label=1)
    half = num_samples // 2
    for i in range(half):
        # 1. Normal
        normal_path = normal_dir / f"normal_{i:03d}.png"
        img_normal = generate_synthetic_chest_xray(is_pneumonia=False)
        img_normal.save(normal_path)
        paths.append(normal_path)
        labels.append(0)
        
        # 2. Neumonía
        pneumonia_path = pneumonia_dir / f"pneumonia_{i:03d}.png"
        img_pneumo = generate_synthetic_chest_xray(is_pneumonia=True)
        img_pneumo.save(pneumonia_path)
        paths.append(pneumonia_path)
        labels.append(1)
        
    logger.info("¡Dataset sintético generado con éxito!")
    logger.info(f" -> Guardadas {half} imágenes en: {normal_dir}")
    logger.info(f" -> Guardadas {half} imágenes en: {pneumonia_dir}")
    
    return paths, labels


def main():
    # 1. Preparar datos
    paths, labels = prepare_synthetic_dataset(num_samples=100)
    
    # 2. Dividir en conjuntos (Train 70%, Val 30%)
    combined = list(zip(paths, labels))
    random.shuffle(combined)
    
    split_idx = int(len(combined) * 0.7)
    train_data = combined[:split_idx]
    val_data = combined[split_idx:]
    
    train_paths, train_labels = zip(*train_data)
    val_paths, val_labels = zip(*val_data)
    
    # Preprocesador
    preprocessor = DICOMPreprocessor.for_training(target_size=(224, 224))
    
    # Crear datasets de PyTorch
    train_dataset = MedicalImageDataset(
        image_paths=list(train_paths),
        labels=list(train_labels),
        preprocessor=preprocessor,
        cache=True
    )
    
    val_dataset = MedicalImageDataset(
        image_paths=list(val_paths),
        labels=list(val_labels),
        preprocessor=DICOMPreprocessor.for_inference(target_size=(224, 224)),
        cache=True
    )
    
    # DataLoaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=8,
        shuffle=True,
        drop_last=True
    )
    
    val_loader = DataLoader(
        val_dataset,
        batch_size=8,
        shuffle=False
    )
    
    logger.info(f"Conjunto de entrenamiento: {len(train_dataset)} muestras")
    logger.info(f"Conjunto de validación: {len(val_dataset)} muestras")
    
    # 3. Inicializar el Modelo
    logger.info("Instanciando modelo EfficientNet-B4 para entrenamiento...")
    # Usamos pretrained=False para desarrollo rápido sin depender de la descarga lenta
    # o pretrained=True si la red está disponible en torchvision
    model = AnomalyDetector(
        backbone_name="efficientnet_b4",
        num_classes=2,
        pretrained=True,
        in_channels=1
    )
    
    # 4. Función de pérdida y optimizador
    criterion = FocalLoss(alpha=[0.4, 0.6], gamma=2.0)
    
    # 5. Entrenador MedVisionTrainer
    trainer = MedVisionTrainer(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        criterion=criterion,
        learning_rate=2e-4,
        num_epochs=12,
        checkpoint_dir="checkpoints",
        experiment_name="medvision-synthetic"
    )
    
    # Deshabilitar MLflow tracking si no está levantado el server local
    # para evitar fallos de conexión
    import mlflow
    mlflow.set_tracking_uri("") # Local/mock
    
    logger.info("Iniciando bucle de entrenamiento...")
    # Entrenar el modelo
    trainer.train()
    
    logger.info("¡Entrenamiento finalizado exitosamente!")
    logger.info(f"El mejor modelo se ha guardado en: {trainer.best_model_path}")
    
    # Proporcionar una radiografía de neumonía y una sana de prueba en la raíz para pruebas rápidas
    generate_synthetic_chest_xray(is_pneumonia=False).save("radiografia_sana_prueba.png")
    generate_synthetic_chest_xray(is_pneumonia=True).save("radiografia_neumonia_prueba.png")
    logger.info("Generadas imágenes de prueba en la raíz del proyecto:")
    logger.info(" -> radiografia_sana_prueba.png")
    logger.info(" -> radiografia_neumonia_prueba.png")


if __name__ == "__main__":
    main()
