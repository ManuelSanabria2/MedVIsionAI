# Arquitectura del Sistema — MedVision AI

## Diagrama General

```
[Fuente de imagen]          [Backend ML]              [Cliente]
  DICOM / PNG   ──────►  Preprocesamiento  ──────►  API FastAPI
  Escáner       ──────►  Modelo PyTorch    ──────►  Dashboard
  Base de datos ──────►  Grad-CAM          ──────►  Reporte PDF
                          │
                          ▼
                       MLflow (registro)
                       PostgreSQL (metadatos)
                       MinIO (imágenes)
```

## Flujo de Datos

1. **Ingesta** — La imagen llega vía API REST (`POST /predict`) o carga manual en Gradio. Soporta DICOM y formatos estándar (PNG, JPEG).

2. **Preprocesamiento** — Pipeline MONAI configurable:
   - Normalización de intensidad (z-score o min-max)
   - Redimensión a 224×224 (configurable a 512×512)
   - Data augmentation: rotaciones (±15°), flip horizontal, ruido gaussiano, transformaciones afines
   - Anonimización de metadatos DICOM (Ley 1581)

3. **Inferencia** — EfficientNet-B4 con transfer learning produce:
   - Predicción de clase: normal / anomalía (/ tumor en modo multiclase)
   - Probabilidad de confianza por clase
   - Threshold configurable (default: 0.5)

4. **Explicabilidad** — Grad-CAM genera mapa de calor superpuesto a la imagen original, indicando las regiones más relevantes para la predicción.

5. **Resultado** — JSON con predicción, confianza, probabilidades, metadatos DICOM (anonimizados) y URL del heatmap.

## Stack por Capa

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| Ingesta | pydicom + SimpleITK + Pillow | Carga multi-formato |
| Preprocesamiento | MONAI transforms | Pipeline médico especializado |
| Modelo | PyTorch + torchvision | EfficientNet-B4 backbone |
| Explicabilidad | Grad-CAM custom | Mapas de calor interpretables |
| API | FastAPI + Pydantic | REST con documentación Swagger |
| Demo | Gradio | Interfaz interactiva de validación |
| Tracking | MLflow | Registro de experimentos |
| Almacenamiento | PostgreSQL + MinIO | Metadatos + imágenes |
| Contenedores | Docker + Docker Compose | Portabilidad |

## Decisiones de Diseño

- **EfficientNet-B4 como baseline**: Mejor trade-off parámetros/precisión según Tan & Le, 2019. Factory pattern permite alternar con ResNet-50, DenseNet-121.
- **Focal Loss por defecto**: Datasets médicos típicamente desbalanceados (>90% normales). Focal Loss reduce peso de ejemplos fáciles.
- **Anonimización por defecto**: `DICOMLoader(anonymize=True)` elimina 20+ campos PII automáticamente.
- **Seeds fijas (42)**: Reproducibilidad total en entrenamiento, splits y augmentation.
- **Modo simulado en Gradio**: Permite demostrar la interfaz sin modelo entrenado.
