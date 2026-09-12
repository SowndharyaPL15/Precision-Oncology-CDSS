"""
Histopathology Image Validator Module
=====================================
Provides multi-stage clinical validation to ensure uploaded images are
genuine microscopic histopathology slides (Hematoxylin and Eosin - H&E stained
tissue sections).

Calibrated for:
- Alveolar lung tissue (sparse alveolar air spaces, capillaries, erythrocytes, and bronchial walls)
- Breast biopsy tissue (ductal structures, stroma, adipocytes)
- High-magnification (400X) and low-magnification whole slide sections

Rejects:
- Text documents, job notices, PDFs, UI screenshots, and diagrams
- Natural photographs (landscapes, people, vegetation, objects)
- Non-histological medical images (grayscale X-rays, CT scans, MRIs, ultrasounds)
- Blank, overexposed, underexposed, solid-color, or corrupted image files
"""

import os
import numpy as np
from PIL import Image
from typing import Tuple, Dict, Any, Union


def validate_histopathology_image(
    img_input: Union[str, np.ndarray, Image.Image]
) -> Tuple[bool, float, str, Dict[str, Any]]:
    """
    Validates whether an input image meets the optical, chromatic, and structural
    criteria of an authentic H&E stained histopathology slide.

    Args:
        img_input: File path (str), NumPy array (RGB), or PIL Image.

    Returns:
        is_valid (bool): True if image is a verified histopathology slide, False otherwise.
        confidence_score (float): Confidence level of histopathology verification [0.0 - 1.0].
        message (str): Human-readable clinical diagnostic message or rejection reason.
        details (dict): Optical, chromatic, and spatial metrics computed during analysis.
    """
    # 1. Image Loading & Array Conversion
    try:
        if isinstance(img_input, str):
            if not os.path.exists(img_input):
                return False, 0.0, "Image file not found on server.", {}
            with Image.open(img_input) as img:
                img_rgb = img.convert("RGB")
                arr = np.array(img_rgb, dtype=np.float32)
        elif isinstance(img_input, np.ndarray):
            arr = img_input.astype(np.float32)
            if arr.ndim == 2:
                arr = np.stack([arr] * 3, axis=-1)
            elif arr.shape[-1] == 4:
                arr = arr[:, :, :3]
            if arr.max() <= 1.0:
                arr = arr * 255.0
        elif isinstance(img_input, Image.Image):
            arr = np.array(img_input.convert("RGB"), dtype=np.float32)
        else:
            return False, 0.0, "Unsupported image data format.", {}
    except Exception as e:
        return False, 0.0, f"Failed to decode image file: {str(e)}", {}

    h, w, c = arr.shape
    if c != 3 or h < 32 or w < 32:
        return (
            False,
            0.0,
            "Invalid image dimensions. Minimum required resolution is 32x32 pixels with 3 RGB channels.",
            {"shape": (h, w, c)}
        )

    norm_arr = arr / 255.0
    r, g, b = norm_arr[:, :, 0], norm_arr[:, :, 1], norm_arr[:, :, 2]
    total_pixels = h * w

    # 2. RGB to HSV Color Space Transformation
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    delta = max_c - min_c

    s = np.zeros_like(max_c)
    mask = max_c > 1e-5
    s[mask] = delta[mask] / max_c[mask]
    v = max_c

    hue = np.zeros_like(max_c)
    d_mask = delta > 1e-5
    r_max = (max_c == r) & d_mask
    g_max = (max_c == g) & d_mask
    b_max = (max_c == b) & d_mask

    hue[r_max] = 60.0 * (((g[r_max] - b[r_max]) / delta[r_max]) % 6)
    hue[g_max] = 60.0 * (((b[g_max] - r[g_max]) / delta[g_max]) + 2)
    hue[b_max] = 60.0 * (((r[b_max] - g[b_max]) / delta[b_max]) + 4)

    # 3. Brightfield Glass Background & Blank Image Detection
    glass_mask = (v > 0.94) & (s < 0.06)
    glass_ratio = float(np.sum(glass_mask) / total_pixels)

    if glass_ratio > 0.985:
        return (
            False,
            0.0,
            "No histological tissue detected. The slide is blank, overexposed, or consists entirely of clear background glass.",
            {"glass_ratio": round(glass_ratio, 4)}
        )

    # 4. Grayscale / Monochrome Radiograph & Document Detection
    mean_sat = float(np.mean(s))
    sat_colored_ratio = float(np.sum(s > 0.05) / total_pixels)
    if mean_sat < 0.025 or sat_colored_ratio < 0.04:
        return (
            False,
            0.0,
            "Grayscale or monochrome image detected (e.g. X-ray, CT scan, MRI, or document). Precision Oncology AI requires full-color H&E histopathology slides.",
            {
                "mean_saturation": round(mean_sat, 4),
                "sat_colored_ratio": round(sat_colored_ratio, 4)
            }
        )

    # 5. Genuine H&E Stain Chromatic Verification
    # Eosin: Pink / Rose / Magenta / Erythrocyte eosinophilic stain (Cytoplasm, extracellular matrix, RBCs)
    eosin_mask = (s > 0.04) & (
        ((hue >= 270) & (hue <= 360)) |
        ((hue >= 0) & (hue <= 38) & (r > g * 0.80))
    )

    # Hematoxylin: Purple / Indigo / Violet / Deep Blue (Basophilic cellular nuclei)
    hema_mask = (s > 0.04) & (hue >= 180) & (hue < 290) & (b > g * 0.85)

    he_stain_mask = eosin_mask | hema_mask
    he_stain_ratio = float(np.sum(he_stain_mask) / total_pixels)

    # Tissue coverage (non-glass, non-black regions)
    tissue_mask = ~glass_mask & (v > 0.05)
    tissue_count = int(np.sum(tissue_mask))
    tissue_stain_ratio = float(np.sum(he_stain_mask & tissue_mask) / max(tissue_count, 1))

    # 6. Non-Histological Foreign Synthetic Color Detection (Vegetation green, synthetic UI yellow/cyan)
    synthetic_green = (s > 0.35) & (hue >= 75) & (hue <= 165)
    synthetic_yellow = (s > 0.40) & (hue >= 45) & (hue < 75) & (g > r * 1.20)
    synthetic_cyan = (s > 0.40) & (hue >= 165) & (hue < 195) & (g > 0.7) & (b > 0.7) & (r < 0.3)
    foreign_mask = synthetic_green | synthetic_yellow | synthetic_cyan
    foreign_ratio = float(np.sum(foreign_mask) / total_pixels)

    # 7. Spatial Flatness (Detects digital documents, PDFs, and UI screenshots)
    gray = 0.2989 * r + 0.5870 * g + 0.1140 * b
    dx = np.abs(gray[:, 1:] - gray[:, :-1])
    dy = np.abs(gray[1:, :] - gray[:-1, :])
    flat_pixels_x = np.sum(dx < 0.003) / (h * (w - 1))
    flat_pixels_y = np.sum(dy < 0.003) / ((h - 1) * w)
    flatness_ratio = float((flat_pixels_x + flat_pixels_y) / 2.0)

    # 8. 3D Color Richness & Histogram Spread
    hist, _ = np.histogramdd(norm_arr.reshape(-1, 3), bins=8, range=[[0, 1], [0, 1], [0, 1]])
    non_empty_bins = int(np.sum(hist > (total_pixels * 0.0005)))

    # 9. Gradient Isotropy (Biological Cellular vs Manhattan Grid / Text / UI)
    gx = gray[1:-1, 2:] - gray[1:-1, :-2]
    gy = gray[2:, 1:-1] - gray[:-2, 1:-1]
    magnitude = np.sqrt(gx**2 + gy**2)
    edge_mask = magnitude > 0.04
    if np.sum(edge_mask) >= 50:
        angles = np.arctan2(gy[edge_mask], gx[edge_mask]) % np.pi
        a_hist, _ = np.histogram(angles, bins=8, range=[0, np.pi])
        prob = a_hist / float(len(angles))
        isotropy_entropy = float(-np.sum((prob + 1e-6) * np.log(prob + 1e-6)))
    else:
        isotropy_entropy = 0.0

    details = {
        "he_stain_ratio": round(he_stain_ratio, 4),
        "tissue_stain_ratio": round(tissue_stain_ratio, 4),
        "eosin_ratio": round(float(np.sum(eosin_mask) / total_pixels), 4),
        "hematoxylin_ratio": round(float(np.sum(hema_mask) / total_pixels), 4),
        "foreign_color_ratio": round(foreign_ratio, 4),
        "flatness_ratio": round(flatness_ratio, 4),
        "color_bins": non_empty_bins,
        "isotropy_entropy": round(isotropy_entropy, 4),
        "glass_ratio": round(glass_ratio, 4)
    }

    # Calibrated Clinical Rejection Filters
    if he_stain_ratio < 0.015:
        return (
            False,
            0.0,
            f"Image lacks Hematoxylin & Eosin (H&E) cellular staining ({he_stain_ratio*100:.1f}% stain found, minimum 1.5% required). Uploaded image appears to be a document, photograph, or non-histological file.",
            details
        )

    if foreign_ratio >= 0.25:
        return (
            False,
            0.0,
            f"Non-histological color artifacts detected ({foreign_ratio*100:.1f}% synthetic green/yellow/cyan). Authentic H&E slides consist primarily of purple Hematoxylin and pink Eosin staining.",
            details
        )

    if non_empty_bins < 8:
        return (
            False,
            0.0,
            "Image exhibits discrete synthetic digital color distribution. Digital diagrams, screenshots, and text documents are not permitted.",
            details
        )

    if flatness_ratio > 0.92 and he_stain_ratio < 0.05:
        return (
            False,
            0.0,
            "Image consists primarily of a flat monochrome page background (document or screenshot pattern).",
            details
        )

    # Valid H&E Slide Confidence Calculation
    confidence = min(
        0.99,
        max(
            0.85,
            0.70
            + 0.25 * min(1.0, he_stain_ratio / 0.30)
            + 0.05 * min(1.0, isotropy_entropy / 2.0)
        )
    )

    return (
        True,
        round(confidence, 4),
        "Valid H&E histopathology slide verified.",
        details
    )
