import os
import sys
import time
import subprocess
import requests

BACKEND_URL = "http://127.0.0.1:8005/api/v1"
WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
SAMPLE_IMAGE = os.path.join(WORKSPACE_DIR, "datasets", "lungs", "lung_aca", "lungaca1.jpeg")

def start_server():
    print("[*] Starting backend FastAPI server...")
    ai_server_dir = os.path.join(WORKSPACE_DIR, "ai-server")
    python_exe = os.path.join(WORKSPACE_DIR, ".venv", "Scripts", "python.exe")
    if not os.path.exists(python_exe):
        python_exe = "python" # fallback

    # Start the server subprocess
    p = subprocess.Popen(
        [python_exe, "main.py"],
        cwd=ai_server_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        text=True
    )
    
    # Wait for the server to spin up by polling the health endpoint
    start_time = time.time()
    while time.time() - start_time < 90:
        try:
            resp = requests.get(f"{BACKEND_URL}/health", timeout=1)
            if resp.status_code == 200:
                print(f"[+] Server started successfully in {time.time() - start_time:.2f} seconds!")
                return p
        except requests.exceptions.RequestException:
            pass
        time.sleep(1)
        
    print("[-] Server failed to start within 90 seconds.")
    p.terminate()
    sys.exit(1)

def run_tests():
    print("\n--- Starting Backend Integration Tests ---")
    
    passed_tests = 0
    total_tests = 0
    
    # Test 1: Health Check
    total_tests += 1
    print("[*] Test 1: Health Check GET /health")
    try:
        r = requests.get(f"{BACKEND_URL}/health")
        if r.status_code == 200:
            print(f"    Uptime: {r.json().get('uptime_seconds')}s, TF Version: {r.json().get('tensorflow_version')}")
            passed_tests += 1
            print("    [PASS]")
        else:
            print(f"    [FAIL] Status code: {r.status_code}")
    except Exception as e:
        print(f"    [FAIL] Connection error: {e}")

    # Test 2: Models list
    total_tests += 1
    print("\n[*] Test 2: Get Available Models GET /models")
    try:
        r = requests.get(f"{BACKEND_URL}/models")
        if r.status_code == 200:
            models = r.json().get("models", [])
            print(f"    Available models: {[m['name'] for m in models]}")
            passed_tests += 1
            print("    [PASS]")
        else:
            print(f"    [FAIL] Status code: {r.status_code}")
    except Exception as e:
        print(f"    [FAIL] Connection error: {e}")

    # Test 3: Doctor CRUD - Create Doctor
    total_tests += 1
    print("\n[*] Test 3: Create Doctor POST /doctors")
    doc_id = None
    email = f"test_doctor_{int(time.time())}@precision.org"
    doctor_payload = {
        "full_name": "Dr. Test Integrator",
        "email": email,
        "password": "securepassword123",
        "specialization": "Oncology",
        "hospital": "Precision Test Lab"
    }
    try:
        r = requests.post(f"{BACKEND_URL}/doctors", json=doctor_payload)
        if r.status_code == 200:
            doc_id = r.json().get("doctor_id")
            print(f"    Created Doctor ID: {doc_id}")
            passed_tests += 1
            print("    [PASS]")
        else:
            print(f"    [FAIL] Status code: {r.status_code}, Response: {r.text}")
    except Exception as e:
        print(f"    [FAIL] Connection error: {e}")

    # Test 4: Doctor CRUD - Get Doctor
    if doc_id:
        total_tests += 1
        print(f"\n[*] Test 4: Get Doctor GET /doctors/{doc_id}")
        try:
            r = requests.get(f"{BACKEND_URL}/doctors/{doc_id}")
            if r.status_code == 200:
                print(f"    Name: {r.json().get('full_name')}, Email: {r.json().get('email')}")
                passed_tests += 1
                print("    [PASS]")
            else:
                print(f"    [FAIL] Status code: {r.status_code}")
        except Exception as e:
            print(f"    [FAIL] Connection error: {e}")

    # Test 5: Patient CRUD - Create Patient
    patient_id = None
    if doc_id:
        total_tests += 1
        print("\n[*] Test 5: Create Patient POST /patients")
        patient_payload = {
            "doctor_id": doc_id,
            "full_name": "John Doe Integration",
            "age": 45,
            "gender": "Male",
            "phone": "+15555551234",
            "email": f"johndoe_{int(time.time())}@example.com",
            "smoking_history": "Yes",
            "family_history": "No",
            "symptoms": "Chronic cough, chest pain",
            "clinical_biomarkers": {"EGFR": "Negative"}
        }
        try:
            r = requests.post(f"{BACKEND_URL}/patients", json=patient_payload)
            if r.status_code == 200:
                patient_id = r.json().get("patient_id")
                print(f"    Created Patient ID: {patient_id}")
                passed_tests += 1
                print("    [PASS]")
            else:
                print(f"    [FAIL] Status code: {r.status_code}, Response: {r.text}")
        except Exception as e:
            print(f"    [FAIL] Connection error: {e}")

    # Test 6: Patient CRUD - Get Patient
    if patient_id:
        total_tests += 1
        print(f"\n[*] Test 6: Get Patient GET /patients/{patient_id}")
        try:
            r = requests.get(f"{BACKEND_URL}/patients/{patient_id}")
            if r.status_code == 200:
                print(f"    Name: {r.json().get('full_name')}, Age: {r.json().get('age')}")
                passed_tests += 1
                print("    [PASS]")
            else:
                print(f"    [FAIL] Status code: {r.status_code}")
        except Exception as e:
            print(f"    [FAIL] Connection error: {e}")

    # Test 7: AI Predict Endpoint (Lung / DenseNet121)
    if patient_id and os.path.exists(SAMPLE_IMAGE):
        total_tests += 1
        print("\n[*] Test 7: Predict Model POST /predict")
        try:
            with open(SAMPLE_IMAGE, "rb") as img_file:
                files = {"file": img_file}
                data = {
                    "dataset": "lung",
                    "model_name": "densenet121",
                    "patient_id": patient_id
                }
                r = requests.post(f"{BACKEND_URL}/predict", files=files, data=data)
                if r.status_code == 200:
                    res = r.json()
                    print(f"    Predicted Class: {res.get('predicted_class')}")
                    print(f"    Confidence: {res.get('confidence') * 100:.2f}%")
                    passed_tests += 1
                    print("    [PASS]")
                else:
                    print(f"    [FAIL] Status code: {r.status_code}, Response: {r.text}")
        except Exception as e:
            print(f"    [FAIL] Error executing prediction: {e}")
    else:
        print("\n[!] Skipping Predict test due to missing patient or image.")

    # Test 8: AI Grad-CAM Explainability
    if os.path.exists(SAMPLE_IMAGE):
        total_tests += 1
        print("\n[*] Test 8: Grad-CAM Explainability POST /gradcam")
        try:
            with open(SAMPLE_IMAGE, "rb") as img_file:
                files = {"file": img_file}
                data = {
                    "dataset": "lung",
                    "model_name": "densenet121"
                }
                r = requests.post(f"{BACKEND_URL}/gradcam", files=files, data=data)
                if r.status_code == 200:
                    res = r.json()
                    print(f"    Grad-CAM Overlay URL: {res.get('overlay_url')}")
                    passed_tests += 1
                    print("    [PASS]")
                else:
                    print(f"    [FAIL] Status code: {r.status_code}, Response: {r.text}")
        except Exception as e:
            print(f"    [FAIL] Error executing Grad-CAM: {e}")

    # Test 9: Clinical PDF/JSON Report generation
    if patient_id and os.path.exists(SAMPLE_IMAGE):
        total_tests += 1
        print("\n[*] Test 9: Report Generation POST /report")
        try:
            with open(SAMPLE_IMAGE, "rb") as img_file:
                files = {"file": img_file}
                data = {
                    "dataset": "lung",
                    "model_name": "densenet121",
                    "patient_id": patient_id
                }
                r = requests.post(f"{BACKEND_URL}/report", files=files, data=data)
                if r.status_code == 200:
                    res = r.json()
                    print(f"    Created Report ID: {res.get('report_id')}")
                    passed_tests += 1
                    print("    [PASS]")
                else:
                    print(f"    [FAIL] Status code: {r.status_code}, Response: {r.text}")
        except Exception as e:
            print(f"    [FAIL] Error generating report: {e}")

    # Test 10: Model Comparison endpoint
    total_tests += 1
    print("\n[*] Test 10: Get Model Comparison Reports GET /comparison")
    try:
        r = requests.get(f"{BACKEND_URL}/comparison")
        if r.status_code == 200:
            print("    Successfully fetched comparison metrics for datasets.")
            passed_tests += 1
            print("    [PASS]")
        else:
            print(f"    [FAIL] Status code: {r.status_code}, Response: {r.text}")
    except Exception as e:
        print(f"    [FAIL] Connection error: {e}")

    print("\n--- Test Summary ---")
    print(f"Passed: {passed_tests} / {total_tests}")
    return passed_tests == total_tests

if __name__ == "__main__":
    if not os.path.exists(SAMPLE_IMAGE):
        print(f"[-] Sample image not found at {SAMPLE_IMAGE}")
        sys.exit(1)
        
    proc = start_server()
    try:
        success = run_tests()
    finally:
        print("\n[*] Shutting down backend server...")
        proc.terminate()
        proc.wait()
        print("[+] Backend server stopped.")
        
    if success:
        print("[+] All integration tests passed successfully!")
        sys.exit(0)
    else:
        print("[-] Some tests failed.")
        sys.exit(1)
