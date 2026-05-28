import torch

from src.inference.predictor import MedVisionPredictor


def _synthetic_chest_tensor(with_opacity: bool) -> torch.Tensor:
    image = torch.full((1, 224, 224), 0.35)
    image[:, 45:175, 35:105] = 0.30
    image[:, 45:175, 119:189] = 0.31
    if with_opacity:
        image[:, 85:130, 138:178] = 0.62
    return image


def test_lung_opacity_score_stays_low_for_symmetric_healthy_sample():
    score = MedVisionPredictor._estimate_lung_opacity_score(
        _synthetic_chest_tensor(with_opacity=False)
    )

    assert score is not None
    assert score["score"] < 1.0


def test_lung_opacity_score_flags_focal_asymmetric_opacity():
    score = MedVisionPredictor._estimate_lung_opacity_score(
        _synthetic_chest_tensor(with_opacity=True)
    )

    assert score is not None
    assert score["score"] >= 1.0
