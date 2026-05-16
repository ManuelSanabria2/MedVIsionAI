"""
preprocessor.py — Preprocesamiento avanzado de imágenes médicas DICOM.

Funcionalidades:
- Carga DICOM con pydicom + SimpleITK
- Anonimización de headers sensibles (Ley 1581 de 2012)
- Normalización window/level para radiografías
- Resize 224x224 con preservación de aspecto + padding
- Data augmentation: flip, rotación ±15°, brillo/contraste
- Retorna tensores PyTorch listos para modelo
- Manejo robusto de archivos corruptos

Universidad Santo Tomás · Tunja, Boyacá
"""

import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
import torch

try:
    import pydicom
    from pydicom.pixel_data_handlers.util import apply_voi_lut
except ImportError:
    pydicom = None

try:
    import SimpleITK as sitk
except ImportError:
    sitk = None

from PIL import Image, ImageEnhance

logger = logging.getLogger(__name__)

# ── Campos DICOM con información personal identificable (PII) ──
# DEBEN eliminarse para cumplir Ley 1581 de 2012
DICOM_PII_TAGS = {
    (0x0010, 0x0010): "PatientName",
    (0x0010, 0x0020): "PatientID",
    (0x0010, 0x0030): "PatientBirthDate",
    (0x0010, 0x0040): "PatientSex",
    (0x0010, 0x1000): "OtherPatientIDs",
    (0x0010, 0x1001): "OtherPatientNames",
    (0x0010, 0x1040): "PatientAddress",
    (0x0010, 0x2154): "PatientTelephoneNumbers",
    (0x0008, 0x0080): "InstitutionName",
    (0x0008, 0x0081): "InstitutionAddress",
    (0x0008, 0x0090): "ReferringPhysicianName",
    (0x0008, 0x1050): "PerformingPhysicianName",
    (0x0008, 0x1070): "OperatorsName",
    (0x0008, 0x0050): "AccessionNumber",
    (0x0020, 0x0010): "StudyID",
}

# ── Presets de window/level para modalidades comunes ──
WINDOW_LEVEL_PRESETS: Dict[str, Tuple[float, float]] = {
    "chest_xray": (1500.0, -600.0),      # Ventana pulmonar
    "bone": (2500.0, 480.0),              # Ventana ósea
    "soft_tissue": (400.0, 50.0),         # Tejidos blandos
    "brain": (80.0, 40.0),               # Ventana cerebral
    "abdomen": (350.0, 50.0),            # Abdominal
    "default": (2048.0, 1024.0),         # Fallback genérico
}


class DICOMPreprocessor:
    """Pipeline completo de preprocesamiento para imágenes DICOM.

    Args:
        target_size: Tamaño de salida (H, W). Default (224, 224).
        window_preset: Preset de window/level ('chest_xray', 'bone', etc.).
        anonymize: Eliminar campos PII del header DICOM.
        augment: Aplicar data augmentation (solo entrenamiento).
        padding_value: Valor de padding al redimensionar (0.0 = negro).

    Example:
        >>> proc = DICOMPreprocessor(augment=True, window_preset="chest_xray")
        >>> tensor, meta = proc.process("path/to/image.dcm")
        >>> print(tensor.shape)  # torch.Size([1, 224, 224])
    """

    def __init__(
        self,
        target_size: Tuple[int, int] = (224, 224),
        window_preset: str = "default",
        anonymize: bool = True,
        augment: bool = False,
        padding_value: float = 0.0,
    ) -> None:
        self.target_size = target_size
        self.anonymize = anonymize
        self.augment = augment
        self.padding_value = padding_value

        if window_preset in WINDOW_LEVEL_PRESETS:
            self.window_width, self.window_center = WINDOW_LEVEL_PRESETS[window_preset]
        else:
            self.window_width, self.window_center = WINDOW_LEVEL_PRESETS["default"]
            logger.warning("Preset '%s' no encontrado, usando 'default'", window_preset)

    def process(
        self, path: Union[str, Path]
    ) -> Tuple[torch.Tensor, Dict[str, str]]:
        """Procesa una imagen DICOM completa: carga → anonimiza → normaliza → resize → tensor.

        Args:
            path: Ruta al archivo DICOM.

        Returns:
            Tupla (tensor, metadata):
                - tensor: PyTorch tensor float32, shape (1, H, W).
                - metadata: Dict con campos DICOM seguros.

        Raises:
            FileNotFoundError: Archivo no existe.
            ValueError: Archivo corrupto o formato inválido.
        """
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"DICOM no encontrado: {path}")

        # 1. Cargar píxeles y metadata
        pixels, metadata = self._load_dicom(path)

        # 2. Anonimizar
        if self.anonymize:
            metadata = self._anonymize_metadata(metadata)

        # 3. Normalizar intensidad (window/level)
        pixels = self._apply_window_level(pixels, metadata)

        # 4. Redimensionar con preservación de aspecto + padding
        pixels = self._resize_with_padding(pixels)

        # 5. Data augmentation
        if self.augment:
            pixels = self._apply_augmentation(pixels)

        # 6. Convertir a tensor PyTorch
        tensor = torch.from_numpy(pixels).float().unsqueeze(0)  # (1, H, W)

        logger.debug("DICOM procesado: %s → %s", path.name, tensor.shape)
        return tensor, metadata

    def process_standard_image(
        self, path: Union[str, Path]
    ) -> torch.Tensor:
        """Procesa imagen estándar (PNG/JPEG) con el mismo pipeline.

        Args:
            path: Ruta a imagen PNG/JPEG/BMP/TIFF.

        Returns:
            Tensor PyTorch float32 (1, H, W).
        """
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"Imagen no encontrada: {path}")

        try:
            img = Image.open(path).convert("L")
            pixels = np.array(img, dtype=np.float32) / 255.0
        except Exception as e:
            raise ValueError(f"Error cargando imagen {path}: {e}")

        pixels = self._resize_with_padding(pixels)
        if self.augment:
            pixels = self._apply_augmentation(pixels)

        return torch.from_numpy(pixels).float().unsqueeze(0)

    # ── Carga DICOM (pydicom + SimpleITK fallback) ──

    def _load_dicom(
        self, path: Path
    ) -> Tuple[np.ndarray, Dict[str, str]]:
        """Carga DICOM con pydicom, fallback a SimpleITK si falla.

        Returns:
            Tupla (pixel_array float32, metadata dict).

        Raises:
            ValueError: Si ambos backends fallan.
        """
        # Intentar con pydicom primero
        if pydicom is not None:
            try:
                return self._load_with_pydicom(path)
            except Exception as e:
                logger.warning("pydicom falló para %s: %s. Intentando SimpleITK.", path.name, e)

        # Fallback a SimpleITK
        if sitk is not None:
            try:
                return self._load_with_sitk(path)
            except Exception as e:
                raise ValueError(f"Error cargando DICOM {path} (ambos backends fallaron): {e}")

        raise ImportError("Se requiere pydicom o SimpleITK: pip install pydicom SimpleITK")

    def _load_with_pydicom(self, path: Path) -> Tuple[np.ndarray, Dict[str, str]]:
        """Carga con pydicom, aplica VOI LUT si disponible."""
        ds = pydicom.dcmread(str(path))

        try:
            pixels = apply_voi_lut(ds.pixel_array, ds).astype(np.float32)
        except Exception:
            pixels = ds.pixel_array.astype(np.float32)

        # Aplicar RescaleSlope/Intercept si están presentes
        slope = float(getattr(ds, "RescaleSlope", 1))
        intercept = float(getattr(ds, "RescaleIntercept", 0))
        if slope != 1 or intercept != 0:
            pixels = pixels * slope + intercept

        # Invertir MONOCHROME1
        if getattr(ds, "PhotometricInterpretation", "") == "MONOCHROME1":
            pixels = pixels.max() - pixels

        metadata = self._extract_safe_metadata_pydicom(ds)
        return pixels, metadata

    def _load_with_sitk(self, path: Path) -> Tuple[np.ndarray, Dict[str, str]]:
        """Carga con SimpleITK como fallback."""
        reader = sitk.ImageFileReader()
        reader.SetFileName(str(path))
        reader.LoadPrivateTagsOn()
        reader.ReadImageInformation()

        image = sitk.ReadImage(str(path))
        pixels = sitk.GetArrayFromImage(image).astype(np.float32)

        # Si es 3D, tomar slice central
        if pixels.ndim == 3:
            pixels = pixels[pixels.shape[0] // 2]

        metadata = {}
        for key in reader.GetMetaDataKeys():
            try:
                metadata[key] = reader.GetMetaData(key)
            except Exception:
                continue

        return pixels, metadata

    # ── Anonimización (Ley 1581 de 2012) ──

    def _anonymize_metadata(self, metadata: Dict[str, str]) -> Dict[str, str]:
        """Elimina campos PII del diccionario de metadata.

        Cumple Ley 1581 de 2012 (Protección de Datos Personales).
        """
        pii_names = set(DICOM_PII_TAGS.values())
        cleaned = {k: v for k, v in metadata.items() if k not in pii_names}
        cleaned["_anonymized"] = "true"
        cleaned["_anonymized_fields"] = str(len(pii_names))
        return cleaned

    def _extract_safe_metadata_pydicom(self, ds) -> Dict[str, str]:
        """Extrae solo campos seguros (no PII) del dataset pydicom."""
        safe_fields = [
            "Modality", "BodyPartExamined", "ViewPosition",
            "Rows", "Columns", "BitsAllocated", "BitsStored",
            "PhotometricInterpretation", "SamplesPerPixel",
            "WindowCenter", "WindowWidth",
            "RescaleIntercept", "RescaleSlope",
            "Manufacturer", "ManufacturerModelName",
            "StudyDescription", "SeriesDescription",
            "PatientAge",
        ]
        meta = {}
        for field in safe_fields:
            if hasattr(ds, field):
                meta[field] = str(getattr(ds, field))
        return meta

    # ── Normalización Window/Level ──

    def _apply_window_level(
        self, pixels: np.ndarray, metadata: Dict[str, str]
    ) -> np.ndarray:
        """Normaliza intensidad usando window/level (windowing radiográfico).

        Usa valores del header DICOM si disponibles, sino los presets.
        Resultado normalizado a [0, 1].
        """
        # Intentar valores del header DICOM
        wc = self._parse_wl_value(metadata.get("WindowCenter"), self.window_center)
        ww = self._parse_wl_value(metadata.get("WindowWidth"), self.window_width)

        # Aplicar window/level
        lower = wc - (ww / 2)
        upper = wc + (ww / 2)

        pixels = np.clip(pixels, lower, upper)
        pixels = (pixels - lower) / (upper - lower + 1e-8)

        return pixels.astype(np.float32)

    @staticmethod
    def _parse_wl_value(dicom_val: Optional[str], default: float) -> float:
        """Parsea valor window/level del DICOM (puede ser lista o string)."""
        if dicom_val is None:
            return default
        try:
            val = str(dicom_val).strip("[]' ")
            if "\\" in val:
                val = val.split("\\")[0]
            return float(val)
        except (ValueError, TypeError):
            return default

    # ── Resize con preservación de aspecto ──

    def _resize_with_padding(self, pixels: np.ndarray) -> np.ndarray:
        """Redimensiona a target_size manteniendo relación de aspecto.

        Añade padding negro para completar el tamaño objetivo.
        """
        h, w = pixels.shape[:2]
        th, tw = self.target_size
        scale = min(tw / w, th / h)

        new_w = int(w * scale)
        new_h = int(h * scale)

        # Redimensionar con Pillow (alta calidad)
        img = Image.fromarray((pixels * 255).astype(np.uint8), mode="L")
        img = img.resize((new_w, new_h), Image.LANCZOS)

        # Crear canvas con padding
        canvas = np.full((th, tw), self.padding_value, dtype=np.float32)
        pad_top = (th - new_h) // 2
        pad_left = (tw - new_w) // 2
        canvas[pad_top:pad_top + new_h, pad_left:pad_left + new_w] = (
            np.array(img, dtype=np.float32) / 255.0
        )

        return canvas

    # ── Data Augmentation ──

    def _apply_augmentation(self, pixels: np.ndarray) -> np.ndarray:
        """Aplica augmentation aleatorio: flip, rotación, brillo/contraste.

        Solo se usa en modo entrenamiento (augment=True).
        """
        rng = np.random.default_rng()

        # Flip horizontal (50% probabilidad)
        if rng.random() > 0.5:
            pixels = np.fliplr(pixels).copy()

        # Rotación ±15° (50% probabilidad)
        if rng.random() > 0.5:
            angle = rng.uniform(-15, 15)
            img = Image.fromarray((pixels * 255).astype(np.uint8), mode="L")
            img = img.rotate(angle, resample=Image.BILINEAR, fillcolor=0)
            pixels = np.array(img, dtype=np.float32) / 255.0

        # Brillo aleatorio ±20% (30% probabilidad)
        if rng.random() > 0.7:
            factor = rng.uniform(0.8, 1.2)
            pixels = np.clip(pixels * factor, 0, 1)

        # Contraste aleatorio ±20% (30% probabilidad)
        if rng.random() > 0.7:
            mean_val = pixels.mean()
            factor = rng.uniform(0.8, 1.2)
            pixels = np.clip((pixels - mean_val) * factor + mean_val, 0, 1)

        return pixels.astype(np.float32)

    # ── Factories ──

    @classmethod
    def for_training(
        cls, target_size: Tuple[int, int] = (224, 224), window_preset: str = "chest_xray"
    ) -> "DICOMPreprocessor":
        """Factory para preprocesamiento de entrenamiento (con augmentation)."""
        return cls(target_size=target_size, window_preset=window_preset, augment=True)

    @classmethod
    def for_inference(
        cls, target_size: Tuple[int, int] = (224, 224), window_preset: str = "chest_xray"
    ) -> "DICOMPreprocessor":
        """Factory para inferencia (sin augmentation)."""
        return cls(target_size=target_size, window_preset=window_preset, augment=False)


# Mantener compatibilidad con imports existentes
MedicalImagePreprocessor = DICOMPreprocessor
