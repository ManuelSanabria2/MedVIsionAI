# Consideraciones Normativas — MedVision AI

## Disclaimer

> ⚠️ **Este sistema es un prototipo de investigación académica** desarrollado en la Universidad Santo Tomás (Tunja, Boyacá) como parte del programa de Ingeniería de Datos e Inteligencia Artificial. **NO es un dispositivo médico certificado** y no ha sido evaluado ni aprobado por INVIMA ni ninguna otra entidad reguladora.

---

## 1. Ley 1581 de 2012 — Protección de Datos Personales

### Aplicabilidad

Las imágenes médicas constituyen **datos sensibles** según la Ley 1581 de 2012. Su tratamiento está sujeto a:

- **Autorización explícita** del titular (paciente) para recolección y tratamiento.
- **Finalidad legítima** documentada (investigación académica).
- **Principio de necesidad**: solo recolectar datos estrictamente necesarios.

### Medidas Implementadas

| Medida | Implementación | Archivo |
|--------|---------------|---------|
| Anonimización DICOM | Eliminación automática de 20+ campos PII | `src/data/loader.py` |
| Cifrado en tránsito | HTTPS obligatorio en producción | `docker-compose.yml` |
| Variables de entorno | Credenciales sin hardcoding | `.env.example` |
| .gitignore | Datos crudos excluidos del repositorio | `.gitignore` |
| Acceso controlado | Autenticación de API (por implementar) | `src/api/main.py` |

### Campos DICOM Eliminados (PII)

```python
# Todos estos campos se eliminan automáticamente al cargar DICOM:
- PatientName, PatientID, PatientBirthDate
- PatientAddress, PatientTelephoneNumbers
- InstitutionName, InstitutionAddress
- ReferringPhysicianName, PerformingPhysicianName
- OtherPatientIDs, OtherPatientNames
- StudyID, AccessionNumber
```

---

## 2. INVIMA — Software como Dispositivo Médico (SaMD)

### Clasificación

Según lineamientos de INVIMA, el software que apoya decisiones clínicas puede clasificarse como **dispositivo médico** y requerir registro sanitario.

### Nuestra Posición

En la fase actual (académica/investigativa):

1. El sistema se documenta como **prototipo de investigación**, no como dispositivo médico.
2. Todos los endpoints de la API incluyen disclaimers claros.
3. El sistema es una herramienta de **apoyo al diagnóstico**, nunca reemplazo del criterio médico.
4. Se mantiene trazabilidad completa de datos, modelos y predicciones via MLflow.

### Si se escala a uso clínico

Se requeriría:
- Evaluación y registro ante INVIMA como SaMD
- Validación clínica con datos colombianos
- Plan de gestión de riesgos (ISO 14971)
- Sistema de calidad (ISO 13485)
- Documentación técnica completa

---

## 3. Consideraciones Éticas

- **Nunca** usar el sistema como único criterio diagnóstico.
- Documentar limitaciones del modelo: distribución de datos, sesgos, clases no cubiertas.
- Registrar versiones del modelo con métricas reproducibles en MLflow.
- Sesgo: validar rendimiento en subpoblaciones diversas.
- Transparencia: Grad-CAM proporciona explicabilidad de las predicciones.

---

## 4. Referencias Legales

- [Ley 1581 de 2012](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981) — Protección de Datos Personales
- [INVIMA — Dispositivos Médicos](https://www.invima.gov.co/) — Regulación SaMD
- Decreto 1377 de 2013 — Reglamentación de Ley 1581
- Resolución 2154 de 2012 — Condiciones de procesamiento de datos de salud
