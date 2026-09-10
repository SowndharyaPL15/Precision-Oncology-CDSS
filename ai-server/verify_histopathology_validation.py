import os
import sys
import glob
import numpy as np
from PIL import Image, ImageDraw

# Add current dir to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.processing.histopathology_validator import validate_histopathology_image


def run_tests():
    print("=" * 75)
    print("      PRECISION ONCOLOGY HISTOPATHOLOGY VALIDATION TEST SUITE")
    print("=" * 75)

    workspace_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    # ─────────────────────────────────────────────────────────────
    # 1. Test Authentic Lung Slides
    # ─────────────────────────────────────────────────────────────
    lung_samples = [
        os.path.join(workspace_dir, "datasets", "lungs", "lung_aca", "lungaca1.jpeg"),
        os.path.join(workspace_dir, "datasets", "lungs", "lung_n", "lungn1.jpeg"),
        os.path.join(workspace_dir, "datasets", "lungs", "lung_scc", "lungscc1.jpeg")
    ]

    print("\n[+] Testing Authentic Lung Histopathology Slides:")
    for path in lung_samples:
        if os.path.exists(path):
            is_valid, conf, msg, details = validate_histopathology_image(path)
            status = "PASS" if is_valid else "FAIL"
            print(f"  [{status}] {os.path.basename(path)}: valid={is_valid}, conf={conf*100:.1f}%, H&E stain={details.get('he_stain_ratio', 0)*100:.1f}% -> {msg}")
            assert is_valid, f"Lung slide {path} should be valid!"
        else:
            print(f"  [SKIP] Not found: {path}")

    # ─────────────────────────────────────────────────────────────
    # 2. Test Authentic Breast Slides (BreaKHis)
    # ─────────────────────────────────────────────────────────────
    breast_dir = os.path.join(workspace_dir, "datasets", "BreaKHis 400X")
    breast_samples = []
    if os.path.exists(breast_dir):
        all_pngs = glob.glob(os.path.join(breast_dir, "**", "*.png"), recursive=True)
        breast_samples = all_pngs[:5]

    print("\n[+] Testing Authentic Breast (BreaKHis) Histopathology Slides:")
    for path in breast_samples:
        is_valid, conf, msg, details = validate_histopathology_image(path)
        status = "PASS" if is_valid else "FAIL"
        print(f"  [{status}] {os.path.basename(path)}: valid={is_valid}, conf={conf*100:.1f}%, H&E stain={details.get('he_stain_ratio', 0)*100:.1f}% -> {msg}")
        assert is_valid, f"Breast slide {path} should be valid!"

    # ─────────────────────────────────────────────────────────────
    # 3. Test Non-Histopathology Negative Controls (Must be REJECTED)
    # ─────────────────────────────────────────────────────────────
    print("\n[-] Testing Non-Histopathology Negative Control Images (Must be REJECTED):")

    # 3a. Document Screenshot (Cream / Orange header - user test case)
    doc_cream = Image.new("RGB", (800, 500), color=(254, 246, 235))
    draw_c = ImageDraw.Draw(doc_cream)
    draw_c.rectangle([20, 20, 780, 45], fill=(245, 130, 32))  # Orange bar
    for y in range(65, 450, 16):
        draw_c.line([(40, y), (np.random.randint(250, 740), y)], fill=(30, 30, 30), width=2)
    is_valid, conf, msg, details = validate_histopathology_image(doc_cream)
    print(f"  [{'PASS (REJECTED)' if not is_valid else 'FAIL'}] Document Screenshot (Cream/Orange Header): valid={is_valid}, conf={conf*100:.1f}% -> {msg}")
    assert not is_valid, "Cream document screenshot MUST be rejected!"

    # 3b. White Document with Black Text
    doc_white = Image.new("RGB", (600, 400), color=(255, 255, 255))
    draw_w = ImageDraw.Draw(doc_white)
    for y in range(30, 380, 18):
        draw_w.line([(30, y), (570, y)], fill=(10, 10, 10), width=2)
    is_valid, conf, msg, details = validate_histopathology_image(doc_white)
    print(f"  [{'PASS (REJECTED)' if not is_valid else 'FAIL'}] White Document / PDF Screenshot: valid={is_valid}, conf={conf*100:.1f}% -> {msg}")
    assert not is_valid, "White document MUST be rejected!"

    # 3c. Dark Mode UI / Code Editor Screenshot
    ui_dark = Image.new("RGB", (600, 400), color=(30, 30, 34))
    draw_d = ImageDraw.Draw(ui_dark)
    draw_d.rectangle([10, 10, 590, 40], fill=(45, 45, 50))
    for y in range(60, 370, 20):
        draw_d.line([(30, y), (np.random.randint(150, 500), y)], fill=(80, 200, 255), width=2)
    is_valid, conf, msg, details = validate_histopathology_image(ui_dark)
    print(f"  [{'PASS (REJECTED)' if not is_valid else 'FAIL'}] Dark UI / Code Editor Screenshot: valid={is_valid}, conf={conf*100:.1f}% -> {msg}")
    assert not is_valid, "Dark UI screenshot MUST be rejected!"

    # 3d. Green Vegetation / Landscape Photo
    green_nature = np.zeros((224, 224, 3), dtype=np.uint8)
    green_nature[:, :, 1] = 190  # Vibrant Green
    green_nature[:, :, 0] = 50
    green_nature[:, :, 2] = 30
    is_valid, conf, msg, details = validate_histopathology_image(green_nature)
    print(f"  [{'PASS (REJECTED)' if not is_valid else 'FAIL'}] Green Nature / Vegetation: valid={is_valid}, conf={conf*100:.1f}% -> {msg}")
    assert not is_valid, "Green nature image must be rejected!"

    # 3e. Grayscale Radiograph / X-Ray / CT Scan
    xray = np.random.randint(40, 210, (224, 224), dtype=np.uint8)
    xray_rgb = np.stack([xray] * 3, axis=-1)
    is_valid, conf, msg, details = validate_histopathology_image(xray_rgb)
    print(f"  [{'PASS (REJECTED)' if not is_valid else 'FAIL'}] Grayscale Radiograph / X-Ray: valid={is_valid}, conf={conf*100:.1f}% -> {msg}")
    assert not is_valid, "Grayscale image must be rejected!"

    # 3f. Blank White Slide / Overexposed
    blank_white = np.ones((224, 224, 3), dtype=np.uint8) * 255
    is_valid, conf, msg, details = validate_histopathology_image(blank_white)
    print(f"  [{'PASS (REJECTED)' if not is_valid else 'FAIL'}] Blank White Slide: valid={is_valid}, conf={conf*100:.1f}% -> {msg}")
    assert not is_valid, "Blank white slide must be rejected!"

    # 3g. Solid Pitch Black
    solid_black = np.zeros((224, 224, 3), dtype=np.uint8)
    is_valid, conf, msg, details = validate_histopathology_image(solid_black)
    print(f"  [{'PASS (REJECTED)' if not is_valid else 'FAIL'}] Solid Pitch Black Image: valid={is_valid}, conf={conf*100:.1f}% -> {msg}")
    assert not is_valid, "Solid black image must be rejected!"

    # 3h. Portrait / Human Skin Photo
    skin = np.zeros((224, 224, 3), dtype=np.uint8)
    skin[:, :, 0] = 235  # Peach / beige skin tone
    skin[:, :, 1] = 185
    skin[:, :, 2] = 145
    is_valid, conf, msg, details = validate_histopathology_image(skin)
    print(f"  [{'PASS (REJECTED)' if not is_valid else 'FAIL'}] Human Skin / Portrait Photo: valid={is_valid}, conf={conf*100:.1f}% -> {msg}")
    assert not is_valid, "Skin tone photo must be rejected!"

    print("\n" + "=" * 75)
    print("  ALL HISTOPATHOLOGY VALIDATION TESTS PASSED SUCCESSFULLY! (100% ACCURACY)")
    print("=" * 75)


if __name__ == "__main__":
    run_tests()
