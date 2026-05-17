# Cumplimiento Regulatorio y Normativo (MedVision AI)

El desarrollo e implementación de Inteligencia Artificial en el sector salud exige el cumplimiento de marcos legales estrictos relacionados con la privacidad del paciente y la seguridad de los dispositivos médicos.

## 1. Cumplimiento de la Ley 1581 de 2012 (Colombia)

La Ley 1581 de 2012 dicta las disposiciones generales para la protección de datos personales. Las imágenes médicas y sus historiales clínicos asociados constituyen **Datos Sensibles**, cuyo tratamiento está sumamente restringido (Art. 5 y 6).

**Implementación en MedVision AI:**
El sistema cumple estrictamente con el principio de minimizar la circulación de datos sensibles a través del componente `DICOMPreprocessor`:
- Al momento en que un estudio (`.dcm`) toca el servidor, se activa un protocolo de sanitización "In-Memory".
- Antes de que el tensor sea ingresado al modelo, o cualquier log sea guardado en la base de datos PostgreSQL, se ejecuta la limpieza obligatoria (Anonimización de Nivel de Campos).
- Ningún dato con Información de Identificación Personal (PII) sale de la memoria volátil del servidor.

## 2. Protocolo de Anonimización de Datos

Para cumplir con la legislación, se eliminan permanentemente del header del DICOM las siguientes etiquetas principales antes del procesamiento:

- `(0010, 0010)` **PatientName**: Nombre completo del paciente.
- `(0010, 0020)` **PatientID**: Documento de identidad del paciente.
- `(0010, 0030)` **PatientBirthDate**: Fecha de nacimiento.
- `(0008, 0080)` **InstitutionName**: Nombre del hospital o clínica.
- `(0008, 0090)` **ReferringPhysicianName**: Médico remitente.
- Toda información en los metadatos resultante que es almacenada en el JSON de la API está confirmada por el flag `{"_anonymized": true}`.

## 3. Posición frente a Regulación INVIMA (SaMD)

El Software como Dispositivo Médico (SaMD - *Software as a Medical Device*) agrupa a todo software concebido para propósitos médicos que cumpla sus tareas sin formar parte de un dispositivo médico de hardware (IMDRF, 2013). 

Según los marcos regulatorios internacionales (FDA en EE.UU., MDR en Europa) y las directrices locales del **INVIMA** (Instituto Nacional de Vigilancia de Medicamentos y Alimentos de Colombia):

> *Cualquier software que ayude al diagnóstico, cura, mitigación, tratamiento o prevención de enfermedades, entra en la categoría de Dispositivo Médico.*

**Posición de MedVision AI:**
1. El proyecto actual es un **Prototipo Académico Universitario** sin autorización sanitaria.
2. **NO cuenta con Registro Sanitario del INVIMA.**
3. Por lo tanto, legal y funcionalmente, **no se permite su comercialización ni su uso clínico autónomo** para dictar conductas terapéuticas sobre humanos vivos o cadáveres.

## 4. Declaración de Limitaciones Clínicas

Para salvaguardar la integridad de las prácticas de salud, MedVision AI expone de forma visible en todos sus componentes (Swagger de la API REST y frontend Gradio) la siguiente declaración clínica vinculante:

> ⚠️ **SISTEMA DE APOYO DIAGNÓSTICO (CADx)**: Esta herramienta está diseñada **únicamente para propósitos de demostración, educación e investigación en ingeniería**. Los resultados (mapas de calor y clases inferidas) operan como una "Segunda Opinión Sistémica" o un sistema de triaje inicial.
> 
> **NO REEMPLAZA EL CRITERIO CLÍNICO, RADIOLÓGICO O PATOLÓGICO DE UN PROFESIONAL HUMANO CERTIFICADO.** Toda anomalía detectada por este software exige verificación humana.
