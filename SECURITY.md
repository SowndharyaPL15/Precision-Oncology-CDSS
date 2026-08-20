# Security Architecture & WebAuthn Implementation

This document outlines the security architecture, cryptography standards, and biometric authentication design implemented in the Precision Oncology Clinical Decision Support System (CDSS).

---

## 1. Enterprise Multi-Factor Authentication (3FA)

The system enforces a strict 3-Factor Authentication (3FA) workflow for healthcare professionals accessing sensitive clinical data and AI predictions:

1. **Factor 1 (Knowledge):** Account Password (bcrypt hashed, salted).
2. **Factor 2 (Visual Biometrics):** 128-Dimensional Facial Vector Embedding + Liveness Detection.
3. **Factor 3 (Hardware Biometrics):** W3C Web Authentication standard (`navigator.credentials`) via OS platform authenticators.

---

## 2. WebAuthn Hardware Biometrics

### Why WebAuthn Triggers OS Security Windows
WebAuthn (`navigator.credentials.get` / `navigator.credentials.create`) is the official W3C standard for browser biometrics.
- **Privacy & Security Guarantee:** Web browsers are isolated from raw hardware biometrics. Browsers never receive, read, or process raw fingerprint images or facial scans.
- **OS Hardware Enclave:** Biometric verification occurs inside the device's secure enclave (e.g. Windows Hello TPM chip, Apple Secure Enclave, Android TEE).
- **Public-Key Cryptography:** The device enclave generates an asymmetric key pair. Only signed cryptographic assertions leave the device.

### Supported Platforms & Authenticators
- **Windows:** Windows Hello (Fingerprint, Facial Recognition, PIN).
- **macOS / iOS:** Touch ID, Face ID.
- **Android:** Android Fingerprint / Biometric Prompt.
- **Cross-Platform:** FIDO2 / WebAuthn Hardware Security Keys (YubiKey).

---

## 3. Browser Considerations

### Microsoft Edge vs. Google Chrome
- **Google Chrome:** Executes WebAuthn assertions directly via Windows Hello / Touch ID prompts upon explicit user action.
- **Microsoft Edge:** Integrates WebAuthn calls into Microsoft Password Manager passkey sync workflows, which may display Microsoft PIN or passkey confirmation dialogs during key enrollment.
- **Recommendation:** Google Chrome is recommended for direct hardware biometric prompts.

---

## 4. Privacy & Zero-Trust Compliance

1. **Zero Raw Biometric Storage:** Raw facial photos and raw fingerprint images are never saved to databases or transferred over networks.
2. **Mathematical Vectorization:** Facial biometrics are converted into 128D mathematical float vectors on client runtime.
3. **WebAuthn Public-Key Isolation:** WebAuthn credentials store only public keys and credential IDs on the backend database.
