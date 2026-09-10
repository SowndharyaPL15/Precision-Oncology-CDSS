import os
import sys
import numpy as np
from PIL import Image

# Add current dir to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.processing.histopathology_validator import validate_histopathology_image

def run_tests():
    print("=" * 70)
    print("      HISTOPATHOLOGY SLIDE VALIDATION TEST SUITE")
    print("=" * 70)

    workspace_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    # 1. Test Valid Lung Slides
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
            print(f"  [{status}] {os.path.basename(path)}: valid={is_valid}, conf={conf*100:.1f}%, H&E={details.get('he_concordance', 0)*100:.1f}% -> {msg}")
            assert is_valid, f"Lung slide {path} should be valid!"
        else:
            print(f"  [SKIP] Not found: {path}")

    # 2. Test Valid Breast Slides (BreaKHis)
    breast_dir = os.path.join(workspace_dir, "datasets", "BreaKHis 400X", "test")
    breast_samples = []
    if os.path.exists(breast_dir):
        for root, dirs, files in os.walk(breast_dir):
            for f in files:
                if f.endswith('.png'):
                    breast_samples.append(os.path.join(root, f))
                    if len(breast_samples) >= 3:
                        break
            if len(breast_samples) >= 3:
                break
                
    print("\n[+] Testing Authentic Breast (BreaKHis) Histopathology Slides:")
    for path in breast_samples:
        is_valid, conf, msg, details = validate_histopathology_image(path)
        status = "PASS" if is_valid else "FAIL"
        print(f"  [{status}] {os.path.basename(path)}: valid={is_valid}, conf={conf*100:.1f}%, H&E={details.get('he_concordance', 0)*100:.1f}% -> {msg}")
        assert is_valid, f"Breast slide {path} should be valid!"

    # 3. Test Non-Histopathology Images (Must be REJECTED)
    print("\n[-] Testing Non-Histopathology Negative Control Images (Must be REJECTED):")
    
    # 3a. Green nature / landscape
    green_nature = np.zeros((224, 224, 3), dtype=np.uint8)
    green_nature[:, :, 1] = 180  # Strong green
    green_nature[:, :, 0] = 50
    green_nature[:, :, 2] = 40
    is_valid, conf, msg, details = validate_histopathology_image(green_nature)
    print(f"  [{'PASS (REJECTED)' if not is_valid else 'FAIL'}] Green Nature/Landscape: valid={is_valid} -> {msg}")
    assert not is_valid, "Green nature image must be rejected!"

    # 3b. Grayscale X-ray / CT scan
    xray = np.random.randint(40, 210, (224, 224), dtype=np.uint8)
    xray_rgb = np.stack([xray] * 3, axis=-1)
    is_valid, conf, msg, details = validate_histopathology_image(xray_rgb)
    print(f"  [{'PASS (REJECTED)' if not is_valid else 'FAIL'}] Grayscale Radiograph/X-Ray: valid={is_valid} -> {msg}")
    assert not is_valid, "Grayscale image must be rejected!"

    # 3c. Blank white slide / overexposed
    blank_white = np.ones((224, 224, 3), dtype=np.uint8) * 255
    is_valid, conf, msg, details = validate_histopathology_image(blank_white)
    print(f"  [{'PASS (REJECTED)' if not is_valid else 'FAIL'}] Blank White Slide: valid={is_valid} -> {msg}")
    assert not is_valid, "Blank white slide must be rejected!"

    # 3d. Solid Pitch Black
    solid_black = np.zeros((224, 224, 3), dtype=np.uint8)
    is_valid, conf, msg, details = validate_histopathology_image(solid_black)
    print(f"  [{'PASS (REJECTED)' if not is_valid else 'FAIL'}] Solid Pitch Black Image: valid={is_valid} -> {msg}")
    assert not is_valid, "Solid black image must be rejected!"

    # 3e. Flat Blue sky / Ocean
    blue_sky = np.zeros((224, 224, 3), dtype=np.uint8)
    blue_sky[:, :, 0] = 50
    blue_sky[:, :, 1] = 150
    blue_sky[:, :, 2] = 230
    is_valid, conf, msg, details = validate_histopathology_image(blue_sky)
    print(f"  [{'PASS (REJECTED)' if not is_valid else 'FAIL'}] Blue Sky/Ocean: valid={is_valid} -> {msg}")
    assert not is_valid, "Blue sky image must be rejected!"

    print("\n" + "=" * 70)
    print("  ALL HISTOPATHOLOGY VALIDATION TESTS PASSED SUCCESSFULLY! (100%)")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
