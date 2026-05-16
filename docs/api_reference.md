# API Reference — MedVision AI

> Documentación interactiva completa disponible en Swagger UI: `http://localhost:8000/docs`

## Base URL

```
http://localhost:8000
```

---

## Endpoints

### `GET /` — Información del Proyecto

```bash
curl http://localhost:8000/
```

**Response 200:**
```json
{
  "project": "MedVision AI",
  "description": "Detección de Anomalías y Tumores en Imágenes Médicas",
  "institution": "Universidad Santo Tomás · Tunja, Boyacá",
  "version": "0.1.0",
  "docs": "/docs"
}
```

---

### `GET /health` — Estado del Servicio

```bash
curl http://localhost:8000/health
```

**Response 200:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "device": "cuda",
  "version": "0.1.0"
}
```

---

### `POST /predict` — Predicción de Imagen

Analiza una imagen médica y retorna la clasificación.

```bash
curl -X POST http://localhost:8000/predict \
  -F "file=@chest_xray.png"
```

**Formatos aceptados:** `.dcm`, `.png`, `.jpg`, `.jpeg`

**Response 200:**
```json
{
  "prediction": 1,
  "class_name": "anomalía",
  "confidence": 0.92,
  "probabilities": {
    "normal": 0.08,
    "anomalía": 0.92
  },
  "metadata": {
    "Modality": "CR",
    "BodyPartExamined": "CHEST",
    "_anonymized": "true"
  },
  "heatmap_url": null
}
```

**Python:**
```python
import requests

with open("chest_xray.png", "rb") as f:
    response = requests.post(
        "http://localhost:8000/predict",
        files={"file": f}
    )
print(response.json())
```

---

### `POST /explain` — Predicción + Grad-CAM

Igual que `/predict` pero genera mapa de calor Grad-CAM.

```bash
curl -X POST http://localhost:8000/explain \
  -F "file=@chest_xray.dcm"
```

**Response 200:**
```json
{
  "prediction": 1,
  "class_name": "anomalía",
  "confidence": 0.87,
  "probabilities": {"normal": 0.13, "anomalía": 0.87},
  "metadata": {"Modality": "CR"},
  "heatmap_url": "/static/heatmaps/heatmap_chest_xray.png"
}
```

---

### `GET /model/info` — Información del Modelo

```bash
curl http://localhost:8000/model/info
```

**Response 200:**
```json
{
  "architecture": "efficientnet_b4",
  "num_classes": 2,
  "class_names": {"0": "normal", "1": "anomalía"},
  "confidence_threshold": 0.5
}
```

---

## Códigos de Error

| Código | Significado |
|--------|------------|
| 400 | Formato de archivo no soportado |
| 422 | Parámetros faltantes o inválidos |
| 500 | Error interno del servidor |
| 503 | Modelo no cargado |
