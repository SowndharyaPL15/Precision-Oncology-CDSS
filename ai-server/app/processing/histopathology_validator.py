"""
Histopathology Image Validator Module
=====================================
Provides strict validation to ensure uploaded images are genuine microscopic
histopathology slides (Hematoxylin and Eosin - H&E stained tissue sections).

Rejects:
- Natural photographs (landscapes, people, animals, vegetation)
- Non-histological medical images (grayscale X-rays, CT/MRI scans, ultrasounds)
- Digital graphics, text documents, UI screenshots, diagrams
- Blank, overexposed, underexposed, or corrupted image files
"""

import os
import numpy as np
from PIL import Image
from typing import Tuple, Dict, Any, Union


def validate_histopathology_image(
    img_input: Union[str, np.ndarray, Image.Image]
) -> Tuple[bool, float, str, Dict[str, Any]]:
    """
    Validates whether an input image meets the optical and histological criteria
    of an H&E stained histopathology slide.

    Args:
        img_input: File path (str), NumPy array (RGB), or PIL Image.

    Returns:
        is_valid (bool): True if image is a verified histopathology slide, False otherwise.
        confidence_score (float): Confidence level of histopathology classification [0.0 - 1.0].
        message (str): Human-readable clinical diagnostic message or warning.
        details (dict): Optical and stain composition metrics computed during analysis.
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

    # 2. Normalize and compute HSV space
    norm_arr = arr / 255.0
    r, g, b = norm_arr[:, :, 0], norm_arr[:, :, 1], norm_arr[:, :, 2]

    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    delta = max_c - min_c

    s = np.zeros_like(max_c)
    mask = max_c > 1e-6
    s[mask] = delta[mask] / max_c[mask]
    v = max_c

    hue = np.zeros_like(max_c)
    d_mask = delta > 1e-6
    r_max = (max_c == r) & d_mask
    g_max = (max_c == g) & d_mask
    b_max = (max_c == b) & d_mask

    hue[r_max] = 60.0 * (((g[r_max] - b[r_max]) / delta[r_max]) % 6)
    hue[g_max] = 60.0 * (((b[g_max] - r[g_max]) / delta[g_max]) + 2)
    hue[b_max] = 60.0 * (((r[b_max] - g[b_max]) / delta[b_max]) + 4)

    total_pixels = h * w

    # 3. Tissue Segmentation
    # Slide background under brightfield microscopy is near-white (high V, very low S)
    # Pitch black borders or dark margins have low V
    tissue_mask = ~((v > 0.94) & (s < 0.08)) & (v > 0.08)
    tissue_count = np.sum(tissue_mask)
    tissue_ratio = float(tissue_count / total_pixels)

    if tissue_ratio < 0.03:
        return (
            False,
            0.0,
            "No histological tissue detected. The slide appears to be completely blank, solid color, or overexposed.",
            {"tissue_ratio": round(tissue_ratio, 4)}
        )

    tissue_sats = s[tissue_mask]
    tissue_hues = hue[tissue_mask]
    mean_sat = float(np.mean(tissue_sats))

    # 4. Grayscale / Monochrome Detection
    # Radiographs, CT scans, MRIs, and documents lack chromatic staining.
    sat_colored_ratio = float(np.sum(tissue_sats > 0.05) / max(len(tissue_sats), 1))
    if mean_sat < 0.04 or sat_colored_ratio < 0.15:
        return (
            False,
            0.0,
            "Grayscale or monochrome image detected (e.g. X-ray, CT scan, or document). Precision Oncology AI is designed exclusively for color H&E histopathology slides.",
            {
                "mean_saturation": round(mean_sat, 4),
                "sat_colored_ratio": round(sat_colored_ratio, 4)
            }
        )

    # 5. Microscopic Cellular Texture & Nucleus Gradient (Laplacian Variance)
    gray = 0.2989 * r + 0.5870 * g + 0.1140 * b
    laplacian = np.abs(
        gray[1:-1, 2:] + gray[1:-1, :-2] + gray[2:, 1:-1] + gray[:-2, 1:-1] - 4 * gray[1:-1, 1:-1]
    )
    lap_var = float(np.var(laplacian))

    if lap_var < 0.00003:
        return (
            False,
            0.1,
            "Image lacks microscopic cellular granularity, nuclear boundaries, and texture patterns characteristic of histopathology slides.",
            {"laplacian_variance": round(lap_var, 6)}
        )

    # 6. Color Spectrum Analysis for H&E Staining
    # Hematoxylin (Blue / Violet / Purple): Hue in [170, 310]
    # Eosin (Pink / Magenta / Carmine Red / Rose): Hue in [300, 360] or [0, 50]
    # Non-Histology Colors: Strong vegetation green (Hue 65-155 with saturation > 0.18)
    green_nature_mask = (tissue_hues >= 65) & (tissue_hues <= 155) & (tissue_sats > 0.18)
    green_nature_ratio = float(np.sum(green_nature_mask) / len(tissue_hues))

    if green_nature_ratio > 0.20:
        return (
            False,
            0.05,
            f"Natural outdoor/vegetation color signature detected ({green_nature_ratio*100:.1f}% green hues). Uploaded image is not a histopathology slide.",
            {"green_ratio": round(green_nature_ratio, 4)}
        )

    # H&E Stain Concordance:
    he_concordant_mask = (tissue_hues >= 170) | (tissue_hues <= 50) | (tissue_sats < 0.12)
    he_concordance_ratio = float(np.sum(he_concordant_mask) / len(tissue_hues))

    # Channel Dominance: In H&E staining, Red (Eosin) and Blue (Hematoxylin) dominate over Green
    tissue_r = r[tissue_mask]
    tissue_g = g[tissue_mask]
    tissue_b = b[tissue_mask]
    he_channel_balance = float(np.mean((tissue_r >= tissue_g - 0.08) | (tissue_b >= tissue_g - 0.08)))

    details = {
        "tissue_ratio": round(tissue_ratio, 4),
        "he_concordance": round(he_concordance_ratio, 4),
        "he_channel_balance": round(he_channel_balance, 4),
        "mean_saturation": round(mean_sat, 4),
        "laplacian_variance": round(lap_var, 6),
        "green_ratio": round(green_nature_ratio, 4)
    }

    if he_concordance_ratio < 0.65 or he_channel_balance < 0.60:
        return (
            False,
            0.2,
            f"Stain chromatic profile does not match Hematoxylin & Eosin (H&E) histopathology staining (stain match: {he_concordance_ratio*100:.1f}%). Only histopathology slides are permitted.",
            details
        )

    # 7. Compute overall confidence score [0.0 - 1.0]
    confidence_score = min(
        1.0,
        0.4 * he_concordance_ratio
        + 0.3 * he_channel_balance
        + 0.2 * min(1.0, lap_var / 0.0002)
        + 0.1 * min(1.0, mean_sat / 0.3)
    )

    return (
        True,
        round(confidence_score, 4),
        "Valid H&E histopathology slide verified.",
        details
    )
