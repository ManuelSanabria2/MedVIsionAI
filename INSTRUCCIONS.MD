### Detección de Anomalías y Tumores en Imágenes Médicas

**Universidad Santo Tomás · Tunja, Boyacá · Ingeniería de Datos e Inteligencia Artificial**

---

## 1. Visión General del Proyecto

MedVision AI es un sistema de visión por computadora orientado al análisis automatizado de imágenes médicas, con foco en la **detección temprana de anomalías y tumores**. El sistema busca apoyar el diagnóstico clínico mediante modelos de inteligencia artificial, reduciendo tiempos de revisión y mejorando la precisión diagnóstica en contextos de salud colombianos.

### Objetivos Principales

- Desarrollar un pipeline de preprocesamiento y análisis de imágenes médicas (DICOM, PNG, JPEG).
- Entrenar y/o adaptar modelos de deep learning para detección de anomalías.
- Exponer el sistema a través de una API REST usable por personal clínico o investigadores.
- Garantizar cumplimiento normativo colombiano (INVIMA, Ley 1581 de 2012).

---

## 2. Stack Tecnológico Recomendado

> El stack fue seleccionado para maximizar capacidad científica, compatibilidad con estándares médicos y viabilidad en entornos universitarios con recursos limitados.

|Capa|Tecnología|Justificación|
|---|---|---|
|Lenguaje base|Python 3.10+|Ecosistema dominante en IA/ML médica|
|Framework ML|PyTorch + MONAI|MONAI especializado en imágenes médicas|
|API Backend|FastAPI|Alto rendimiento, documentación automática|
|Imágenes DICOM|pydicom + SimpleITK|Estándar médico internacional|
|Visualización|Gradio (demo) / React (producción)|Prototipado rápido para validación|
|Base de datos|PostgreSQL + MinIO|Metadatos estructurados + almacenamiento de imágenes|
|Contenedores|Docker + Docker Compose|Portabilidad y reproducibilidad|
|Seguimiento ML|MLflow|Registro de experimentos y modelos|
|Control de versiones|Git + GitHub|Colaboración del equipo|

### Estructura de Carpetas del Proyecto

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
│   ├── data/
│   │   ├── loader.py         # Carga de imágenes DICOM/PNG
│   │   ├── preprocessor.py   # Normalización, redimensión, augmentation
│   │   └── dataset.py        # PyTorch Dataset class
│   ├── models/
│   │   ├── backbone.py       # Arquitectura base (ResNet, EfficientNet, etc.)
│   │   ├── detector.py       # Cabeza de detección / clasificación
│   │   └── loss.py           # Funciones de pérdida personalizadas
│   ├── training/
│   │   ├── trainer.py        # Loop de entrenamiento
│   │   ├── metrics.py        # AUC-ROC, F1, sensibilidad, especificidad
│   │   └── callbacks.py      # Early stopping, checkpoints
│   ├── inference/
│   │   ├── predictor.py      # Inferencia sobre nuevas imágenes
│   │   └── explainability.py # Grad-CAM, mapas de calor
│   └── api/
│       ├── main.py           # FastAPI app
│       ├── routes.py         # Endpoints REST
│       └── schemas.py        # Modelos Pydantic
├── tests/
│   ├── test_preprocessing.py
│   ├── test_model.py
│   └── test_api.py
├── docs/
│   ├── arquitectura.md
│   ├── normativa.md          # INVIMA, Ley 1581
│   └── api_reference.md
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── MEDVISION_AI_GUIDE.md     # Este archivo
└── README.md
```

---

## 3. Arquitectura del Sistema

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

### Flujo de Datos

1. **Ingesta** → La imagen llega vía API o carga manual (DICOM o formatos estándar).
2. **Preprocesamiento** → Normalización de intensidad, redimensión a 224×224 o 512×512, data augmentation (rotaciones, flip, ruido gaussiano).
3. **Inferencia** → El modelo produce una predicción de clase (normal / anomalía / tumor) y una probabilidad de confianza.
4. **Explicabilidad** → Se genera un mapa de calor Grad-CAM superpuesto a la imagen original.
5. **Resultado** → Se retorna JSON con predicción, confianza y URL de la imagen procesada.

---

## 4. Modelos de Referencia para Detección de Anomalías

|Modelo|Uso recomendado|Observación|
|---|---|---|
|ResNet-50 / ResNet-101|Clasificación binaria (normal/anormal)|Baseline sólido y bien documentado|
|EfficientNet-B4|Clasificación con alto rendimiento|Mejor trade-off parámetros/precisión|
|DenseNet-121|Radiografías de tórax (CheXNet)|Pre-entrenado en CheXNet disponible|
|U-Net|Segmentación de tumores|Cuando se requiere localización pixel a pixel|
|MONAI Auto3DSeg|Imágenes 3D (MRI/CT volumétrico)|Para casos avanzados con volumen 3D|

**Recomendación inicial:** Comenzar con **EfficientNet-B4** con pesos pre-entrenados en ImageNet y aplicar fine-tuning sobre el dataset médico disponible.

---

## 5. Consideraciones Éticas y Normativas

### Ley 1581 de 2012 (Protección de Datos Personales — Colombia)

- Las imágenes médicas constituyen **datos sensibles**; su tratamiento requiere autorización explícita del paciente.
- Los datos deben anonimizarse antes de usarse en entrenamiento (eliminar metadatos DICOM identificables).
- Implementar cifrado en reposo y en tránsito (HTTPS, AES-256).

### INVIMA — Dispositivos Médicos con IA

- Cualquier herramienta de apoyo diagnóstico puede requerir registro sanitario si se usa en contexto clínico real.
- En fase académica/investigativa, documentar claramente que el sistema es un **prototipo de investigación**, no un dispositivo médico certificado.
- Mantener trazabilidad completa de datos, modelos y predicciones.

### Consideraciones Adicionales

- Nunca usar el sistema como único criterio diagnóstico (apoyo, no reemplazo del médico).
- Documentar las limitaciones del modelo (distribución de datos de entrenamiento, sesgos, clases no cubiertas).
- Registrar versiones del modelo en MLflow con métricas reproducibles.

---

## 6. Métricas de Evaluación

Para sistemas de detección médica, las métricas estándar son:

|Métrica|Fórmula|Importancia|
|---|---|---|
|Sensibilidad (Recall)|TP / (TP + FN)|Crítica: minimizar falsos negativos|
|Especificidad|TN / (TN + FP)|Reducir falsas alarmas|
|AUC-ROC|Área bajo la curva ROC|Rendimiento global del clasificador|
|F1-Score|2·(P·R)/(P+R)|Balance entre precisión y recall|
|Exactitud (Accuracy)|(TP+TN) / Total|Referencia general|

**Meta mínima para un prototipo académico viable:** AUC-ROC ≥ 0.85, Sensibilidad ≥ 0.80.

---

## 7. Datasets Públicos Recomendados

|Dataset|Modalidad|Tarea|Enlace|
|---|---|---|---|
|NIH ChestX-ray14|Radiografía de tórax|Clasificación 14 patologías|[NIH](https://nihcc.app.box.com/v/ChestXray-NIHCC)|
|RSNA Pneumonia Detection|Radiografía|Detección de neumonía|[Kaggle](https://www.kaggle.com/c/rsna-pneumonia-detection-challenge)|
|BraTS 2023|MRI cerebral|Segmentación de tumores cerebrales|[Synapse](https://www.synapse.org/brats2023)|
|ISIC Archive|Dermatoscopía|Detección de melanoma|[ISIC](https://www.isic-archive.com/)|
|CBIS-DDSM|Mamografía|Detección de masas/calcificaciones|[Kaggle](https://www.kaggle.com/datasets/awsaf49/cbis-ddsm-breast-cancer-image-dataset)|

> **Recomendación para inicio:** NIH ChestX-ray14 (clasificación) o RSNA Pneumonia Detection (detección) por su disponibilidad y comunidad activa.

---

## 8. Hoja de Ruta de Desarrollo 

### Fase 1 — Fundamentos 

- [ ] Definir modalidad de imagen y caso clínico objetivo
- [ ] Seleccionar y descargar dataset público
- [ ] Configurar entorno Docker + repositorio Git
- [ ] EDA: distribución de clases, calidad de imágenes, valores atípicos

### Fase 2 — Preprocesamiento 

- [ ] Pipeline de carga DICOM con pydicom
- [ ] Normalización de intensidad (z-score o min-max)
- [ ] Data augmentation para balancear clases
- [ ] Dividir dataset: 70% train / 15% val / 15% test

### Fase 3 — Modelado Baseline

- [ ] Implementar EfficientNet-B4 con transfer learning
- [ ] Entrenamiento inicial con métricas de validación
- [ ] Registrar experimento en MLflow
- [ ] Análisis de errores: matriz de confusión, casos fallidos

### Fase 4 — Mejora del Modelo 

- [ ] Ajuste de hiperparámetros (learning rate, batch size, epochs)
- [ ] Experimentar con arquitecturas alternativas (DenseNet, ResNet)
- [ ] Implementar Grad-CAM para explicabilidad
- [ ] Validación cruzada k-fold

### Fase 5 — API e Interfaz 

- [ ] Desarrollar API REST con FastAPI
- [ ] Crear demo con Gradio
- [ ] Integración con base de datos (PostgreSQL + MinIO)
- [ ] Pruebas de integración y carga

### Fase 6 — Documentación y Presentación 

- [ ] Documentar API (Swagger automático de FastAPI)
- [ ] Redactar informe técnico / paper académico
- [ ] Preparar presentación para asesores
- [ ] Revisión de cumplimiento normativo (Ley 1581, INVIMA)

---



---

## 10. Checklist de Entrega para Asesores

### Entregables Técnicos

- [ ] Repositorio Git organizado con estructura definida en esta guía
- [ ] README.md completo con instrucciones de instalación y uso
- [ ] Notebook de EDA con análisis del dataset seleccionado
- [ ] Modelo entrenado con métricas documentadas (AUC-ROC ≥ 0.85)
- [ ] API funcional con documentación Swagger
- [ ] Demo Gradio ejecutable localmente
- [ ] Suite de tests con cobertura ≥ 70%

### Entregables Académicos

- [ ] Informe técnico con metodología, resultados y conclusiones
- [ ] Análisis comparativo de arquitecturas evaluadas
- [ ] Sección de consideraciones éticas y normativas
- [ ] Referencias bibliográficas (IEEE o APA)
- [ ] Presentación ejecutiva para comité académico

### Consideraciones de Calidad

- [ ] Código documentado con docstrings en todas las funciones públicas
- [ ] Sin datos personales en el repositorio (DICOM anonimizados)
- [ ] Variables de entorno para credenciales (sin hardcoding)
- [ ] Reproducibilidad: seeds fijas, versiones de dependencias fijadas

---

## 11. Referencias Clave

- MONAI Framework: https://monai.io/
- NIH ChestX-ray14 Paper: Wang et al., 2017 — ChestX-ray8
- EfficientNet: Tan & Le, 2019 — EfficientNet: Rethinking Model Scaling for CNNs
- Grad-CAM: Selvaraju et al., 2017 — Visual Explanations from Deep Networks
- Focal Loss: Lin et al., 2017 — Focal Loss for Dense Object Detection
- Ley 1581 de 2012: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981
- INVIMA SaMD Guidance: https://www.invima.gov.co/

---

