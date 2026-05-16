"""
loader.py — Carga de imágenes médicas (DICOM, PNG, JPEG).

Soporte para extracción y anonimización de metadatos DICOM
según Ley 1581 de 2012 (Protección de Datos Personales).
"""

import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
from PIL import Image

try:
    import pydicom
    from pydicom.pixel_data_handlers.util import apply_voi_lut
    HAS_PYDICOM = True
except ImportError:
    HAS_PYDICOM = False

logger = logging.getLogger(__name__)

# Campos DICOM con información personal identificable (PII)
# DEBEN eliminarse para cumplir Ley 1581 de 2012
DICOM_PII_TAGS = [
    "PatientName", "PatientID", "PatientBirthDate", "PatientAddress",
    "PatientTelephoneNumbers", "InstitutionName", "InstitutionAddress",
    "ReferringPhysicianName", "PerformingPhysicianName", "OperatorsName",
    "OtherPatientIDs", "OtherPatientNames", "StudyID", "AccessionNumber",
]

# Campos DICOM seguros para el pipeline ML
DICOM_SAFE_FIELDS = [
    "Modality", "BodyPartExamined", "ViewPosition", "Rows", "Columns",
    "BitsAllocated", "PhotometricInterpretation", "SamplesPerPixel",
    "WindowCenter", "WindowWidth", "RescaleIntercept", "RescaleSlope",
    "Manufacturer", "StudyDescription", "PatientAge", "PatientSex",
]


class DICOMLoader:
    """Cargador de imágenes DICOM con anonimización de metadatos."""

    def __init__(self, anonymize: bool = True):
        if not HAS_PYDICOM:
            raise ImportError("pydicom requerido: pip install pydicom")
        self.anonymize = anonymize

    def load(self, path: Union[str, Path]) -> Tuple[np.ndarray, Dict]:
        """Carga imagen DICOM. Retorna (array float32 [0,1], metadatos)."""
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"DICOM no encontrado: {path}")

        ds = pydicom.dcmread(str(path))
        pixels = self._extract_pixels(ds)
        metadata = self._extract_metadata(ds)
        logger.info("DICOM: %s | %s | %s", path.name, pixels.shape, metadata.get("Modality"))
        return pixels, metadata

    def load_directory(self, directory: Union[str, Path]) -> List[Tuple[np.ndarray, Dict]]:
        """Carga todos los DICOM de un directorio."""
        directory = Path(directory)
        results = []
        for f in sorted(directory.glob("*.dcm")):
            try:
                results.append(self.load(f))
            except Exception as e:
                logger.warning("Error %s: %s", f.name, e)
        return results

    def _extract_pixels(self, ds) -> np.ndarray:
        """Extrae píxeles con VOI LUT, normaliza a [0,1] float32."""
        try:
            arr = apply_voi_lut(ds.pixel_array, ds).astype(np.float32)
        except Exception:
            arr = ds.pixel_array.astype(np.float32)

        lo, hi = arr.min(), arr.max()
        arr = (arr - lo) / (hi - lo) if hi > lo else np.zeros_like(arr)

        if getattr(ds, "PhotometricInterpretation", "") == "MONOCHROME1":
            arr = 1.0 - arr
        return arr

    def _extract_metadata(self, ds) -> Dict[str, str]:
        """Extrae metadatos seguros, elimina PII si anonymize=True."""
        meta = {}
        for field in DICOM_SAFE_FIELDS:
            if hasattr(ds, field):
                meta[field] = str(getattr(ds, field))
        if self.anonymize:
            for tag in DICOM_PII_TAGS:
                meta.pop(tag, None)
            meta["_anonymized"] = "true"
        return meta


class ImageLoader:
    """Cargador de imágenes estándar (PNG, JPEG, BMP, TIFF)."""

    SUPPORTED = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif"}

    def __init__(self, grayscale: bool = True):
        self.grayscale = grayscale

    def load(self, path: Union[str, Path]) -> np.ndarray:
        """Carga imagen, retorna array float32 [0,1]."""
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"No encontrado: {path}")
        if path.suffix.lower() not in self.SUPPORTED:
            raise ValueError(f"Extensión no soportada: {path.suffix}")

        img = Image.open(path)
        img = img.convert("L") if self.grayscale else img.convert("RGB")
        arr = np.array(img, dtype=np.float32) / 255.0
        logger.info("Imagen: %s | %s", path.name, arr.shape)
        return arr

    def load_directory(self, directory: Union[str, Path]) -> List[Tuple[str, np.ndarray]]:
        """Carga todas las imágenes de un directorio."""
        directory = Path(directory)
        results = []
        for f in sorted(directory.iterdir()):
            if f.suffix.lower() in self.SUPPORTED:
                try:
                    results.append((f.name, self.load(f)))
                except Exception as e:
                    logger.warning("Error %s: %s", f.name, e)
        return results
