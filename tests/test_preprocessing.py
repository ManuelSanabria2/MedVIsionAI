"""
test_preprocessing.py — Tests del pipeline de preprocesamiento.

Verifica: carga de imágenes, normalización, redimensión, augmentation.
"""

import numpy as np
import pytest
import torch
from pathlib import Path

from src.data.loader import ImageLoader, DICOMLoader, DICOM_PII_TAGS
from src.data.preprocessor import MedicalImagePreprocessor


class TestImageLoader:
    """Tests para ImageLoader."""

    def test_init_grayscale(self):
        loader = ImageLoader(grayscale=True)
        assert loader.grayscale is True

    def test_init_rgb(self):
        loader = ImageLoader(grayscale=False)
        assert loader.grayscale is False

    def test_supported_extensions(self):
        loader = ImageLoader()
        assert ".png" in loader.SUPPORTED
        assert ".jpg" in loader.SUPPORTED
        assert ".jpeg" in loader.SUPPORTED

    def test_file_not_found(self):
        loader = ImageLoader()
        with pytest.raises(FileNotFoundError):
            loader.load("nonexistent_file.png")

    def test_unsupported_extension(self, tmp_path):
        fake_file = tmp_path / "test.xyz"
        fake_file.write_text("not an image")
        loader = ImageLoader()
        with pytest.raises(ValueError, match="no soportada"):
            loader.load(fake_file)


class TestMedicalImagePreprocessor:
    """Tests para MedicalImagePreprocessor."""

    def test_output_shape_224(self):
        prep = MedicalImagePreprocessor(image_size=(224, 224))
        img = np.random.rand(512, 512).astype(np.float32)
        result = prep(img)
        assert result.shape[-2:] == (224, 224) or result.shape[-2:] == torch.Size([224, 224])

    def test_output_shape_512(self):
        prep = MedicalImagePreprocessor(image_size=(512, 512))
        img = np.random.rand(256, 256).astype(np.float32)
        result = prep(img)
        assert result.shape[-2:] == (512, 512) or result.shape[-2:] == torch.Size([512, 512])

    def test_output_is_tensor(self):
        prep = MedicalImagePreprocessor()
        img = np.random.rand(100, 100).astype(np.float32)
        result = prep(img)
        assert isinstance(result, torch.Tensor)

    def test_output_is_float32(self):
        prep = MedicalImagePreprocessor()
        img = np.random.rand(100, 100).astype(np.float32)
        result = prep(img)
        assert result.dtype == torch.float32

    def test_train_preprocessor_factory(self):
        prep = MedicalImagePreprocessor.get_train_preprocessor()
        assert prep.augment is True
        assert prep.normalization == "zscore"

    def test_eval_preprocessor_factory(self):
        prep = MedicalImagePreprocessor.get_eval_preprocessor()
        assert prep.augment is False
        assert prep.normalization == "zscore"

    def test_channel_addition_2d(self):
        prep = MedicalImagePreprocessor()
        img = np.random.rand(100, 100).astype(np.float32)
        result = prep(img)
        assert result.dim() >= 2  # Debe tener al menos canal + spatial


class TestDICOMPIICompliance:
    """Tests de cumplimiento Ley 1581 — anonimización de datos."""

    def test_pii_tags_defined(self):
        assert len(DICOM_PII_TAGS) > 0
        assert "PatientName" in DICOM_PII_TAGS
        assert "PatientID" in DICOM_PII_TAGS
        assert "PatientBirthDate" in DICOM_PII_TAGS

    def test_anonymize_default_true(self):
        try:
            loader = DICOMLoader()
            assert loader.anonymize is True
        except ImportError:
            pytest.skip("pydicom no instalado")
