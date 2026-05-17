# 🏥 MedVision AI

![Status](https://img.shields.io/badge/Estado-Desarrollo-orange)
![Tests](https://img.shields.io/badge/Tests-Pasando-brightgreen)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![PyTorch](https://img.shields.io/badge/PyTorch-2.1-ee4c2c)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-00a680)

**Detección de Anomalías en Imágenes Médicas mediante Deep Learning**

MedVision AI es un sistema de apoyo diagnóstico basado en Visión Artificial (EfficientNet-B4) diseñado para identificar patologías en imágenes radiográficas y archivos DICOM. El proyecto integra explicabilidad visual (Grad-CAM) para facilitar la adopción médica clínica, manteniendo estricto cumplimiento de privacidad de datos (Ley 1581).

> **Aviso Académico/Clínico:** Este proyecto fue desarrollado con fines de investigación académica en la **Universidad Santo Tomás (Tunja, Boyacá)**. NO es un dispositivo médico certificado y NO debe utilizarse como único criterio diagnóstico.

---

## 🎯 Objetivos del Sistema
1. **Detección Precisa:** Clasificar imágenes médicas como "Normales" o "Con Anomalía" gestionando el desbalance de clases clínico.
2. **Explicabilidad (XAI):** Ofrecer mapas de calor Grad-CAM que resalten la región de interés para el médico.
3. **Producción MLOps:** Despliegue modular, empaquetado vía Docker, registro en PostgreSQL y monitoreo con MLflow.

---

## 🚀 Inicio Rápido (Quickstart)

Inicia el entorno de pruebas local en 3 comandos:

```bash
# 1. Ejecutar script de configuración inicial (crea .env, directorios y valida deps)
./setup.sh --dev

# 2. Levantar la API en segundo plano
python -m src.api.main &

# 3. Lanzar la interfaz interactiva web
python demo/app.py
```
*Gradio se ejecutará en `http://localhost:7860` y la API en `http://localhost:8000/docs`.*

---

## 🏗 Arquitectura del Sistema

```text
    [ Frontend / Cliente ]
           │
           ▼ (HTTP/REST)
    ┌────────────────────────┐
    │     FastAPI Server     │──(Logs)──▶ [ PostgreSQL ]
    └──────────┬─────────────┘
               │
      ┌────────▼────────┐
      │ MedVisionPredictor│◀──(Checkpoints)── [ MLflow Registry ]
      └────────┬────────┘
               │
    ┌──────────▼───────────┐
    │  DICOM Preprocessor  │ (Anonimización + Normalización)
    └──────────┬───────────┘
               │
    ┌──────────▼───────────┐
    │  EfficientNet-B4 CNN │ (Clasificación + Focal Loss)
    └──────────┬───────────┘
               │
    ┌──────────▼───────────┐
    │   Grad-CAM Module    │ (Mapas de calor explicativos)
    └──────────────────────┘
```

---

## 💻 Ejemplos de Uso (API REST)

**1. Verificación de Salud:**
```bash
curl -X GET "http://localhost:8000/health"
```

**2. Predicción de Anomalía:**
```bash
curl -X POST "http://localhost:8000/predict" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/ruta/a/radiografia.dcm"
```

**Respuesta de Ejemplo:**
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

---

## 👥 Créditos
Desarrollado en el marco del programa de Ingeniería de la **Universidad Santo Tomás · Tunja, Boyacá**.
* **Investigador/Desarrollador Principal:** Manuel José Sanabria Gil
* **Perfil:** Arquitectura de Software, MLOps e Inteligencia Artificial Médica.

Para consultar detalles técnicos avanzados, visita la carpeta `docs/`.
