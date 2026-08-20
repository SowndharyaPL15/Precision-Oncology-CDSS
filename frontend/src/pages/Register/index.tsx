import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Alert, Modal, Button, Badge } from "react-bootstrap";
import {
  FaStethoscope, FaUser, FaEnvelope, FaLock, FaUserMd, FaUserPlus,
  FaCheckCircle, FaUserShield, FaCamera, FaFingerprint, FaShieldAlt, FaArrowRight,
  FaEye, FaEyeSlash, FaTimes, FaInfoCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";
import apiClient from "../../api/client";
import { extractFaceEmbedding, captureMultiPoseSamples, checkFrameQuality } from "../../utils/faceAuth";
import { registerPasskey } from "../../utils/webauthn";
import "../Login/login.css";

/* ════════════════════════════════════════════════════════════════ */
export default function Register() {
  const navigate = useNavigate();

  /* role-type gate */
  const [roleType, setRoleType] = useState<"clinician" | null>(null);

  /* clinician form */
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState("doctor");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* 3FA */
  const [createdUser, setCreatedUser] = useState<{ id: string; email: string } | null>(null);
  const [showBiometricModal, setShowBiometricModal] = useState(false);

  /* face */
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [enrollingFace, setEnrollingFace] = useState(false);
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [faceStatusText, setFaceStatusText] = useState("Position your face inside the frame");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /* fingerprint */
  const [enrollingFingerprint, setEnrollingFingerprint] = useState(false);
  const [fingerprintEnrolled, setFingerprintEnrolled] = useState(false);

  useEffect(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
  }, []);

  /* ── Step 1: Create clinician account ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMsg("Please fill in all required fields."); return;
    }
    if (password !== confirmPassword) { setErrorMsg("Passwords do not match."); return; }
    if (password.length < 6) { setErrorMsg("Password must be at least 6 characters."); return; }
    setLoading(true); setErrorMsg(null);
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
    try {
      const signupRes = await apiClient.post("/auth/signup", {
        full_name: fullName.trim(), email: email.trim(), password, role,
      });
      const userId = signupRes.data?.user_id || "new-user";
      toast.success("Account created successfully!");
      let token = "demo-token";
      try {
        const lr = await apiClient.post("/auth/login", { email: email.trim(), password });
        token = lr.data.access_token;
        localStorage.setItem("token", token);
      } catch { console.warn("Auto-login fallback."); }
      setCreatedUser({ id: userId, email: email.trim() });
      setShowBiometricModal(true);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === "string" ? detail : "Failed to create account. Email may already exist.");
    } finally { setLoading(false); }
  };

  /* ── Step 2: Face ── */
  const startFaceCamera = async () => {
    setShowFaceModal(true);
    setFaceStatusText("Position your face inside the frame");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); setCameraActive(true); }
    } catch { setFaceStatusText("Webcam access denied."); toast.error("Unable to access webcam."); }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      setCameraActive(false);
    }
  };

  const executeFaceEnrollment = async () => {
    if (!videoRef.current || !cameraActive) { toast.warn("Camera unavailable."); return; }
    const quality = checkFrameQuality(videoRef.current);
    if (!quality.valid) { const msg = quality.message || "No face detected."; toast.warn(msg); setFaceStatusText(msg); return; }
    setEnrollingFace(true); setFaceStatusText("Capturing multi-pose 3D facial vectors...");
    try {
      let samples: number[][] = [];
      try { samples = await captureMultiPoseSamples(videoRef.current, 3, 200); }
      catch { samples = [extractFaceEmbedding(videoRef.current)]; }
      await apiClient.post("/auth/face/enroll", { user_id: createdUser?.id, samples, model_version: "v1-128d" });
      setFaceEnrolled(true); toast.success("Facial 3D biometric enrolled!");
      setTimeout(() => { stopCamera(); setShowFaceModal(false); }, 1000);
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Failed to enroll face biometric.";
      toast.error(detail); setFaceStatusText(detail);
    } finally { setEnrollingFace(false); }
  };

  /* ── Step 3: Fingerprint ── */
  const handleEnrollFingerprint = async () => {
    if (!createdUser) return;
    setEnrollingFingerprint(true);
    try {
      await registerPasskey(createdUser.id, createdUser.email);
      setFingerprintEnrolled(true); toast.success("Fingerprint / WebAuthn passkey enrolled!");
    } catch (err: any) { toast.error(err.message || "Failed to enroll fingerprint."); }
    finally { setEnrollingFingerprint(false); }
  };

  /* ── Finish ── */
  const finishRegistration = () => {
    if (!faceEnrolled) { toast.error("Face biometric scan is compulsory!"); return; }
    if (!fingerprintEnrolled) { toast.error("Fingerprint/Passkey enrollment is compulsory!"); return; }
    setShowBiometricModal(false);
    localStorage.removeItem("token"); localStorage.removeItem("user_data");
    toast.success("Registration complete! Please sign in.");
    navigate("/login");
  };

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1a2744 50%, #0f172a 100%)",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflowY: "auto",
      position: "relative",
    }}>
      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "44px 44px", zIndex: 0,
      }} />
      {/* Glow 1 */}
      <div style={{
        position: "fixed", width: "420px", height: "420px", borderRadius: "50%",
        background: "#3b82f6", top: "-120px", left: "-120px",
        filter: "blur(90px)", opacity: 0.15, pointerEvents: "none", zIndex: 0,
      }} />
      {/* Glow 2 */}
      <div style={{
        position: "fixed", width: "480px", height: "480px", borderRadius: "50%",
        background: "#06b6d4", bottom: "-160px", right: "-160px",
        filter: "blur(90px)", opacity: 0.1, pointerEvents: "none", zIndex: 0,
      }} />

      {/* Page content — above background */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: "1100px", margin: "0 auto", padding: "3rem 1.5rem 2rem" }}>

        {/* ── Shared Header ── */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
            <FaStethoscope style={{ fontSize: "2rem", color: "#38bdf8" }} />
            <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: "1.6rem" }}>
              Precision <span style={{ color: "#38bdf8" }}>Oncology</span> CDSS
            </span>
          </div>
          <h1 style={{ fontWeight: 800, color: "#f1f5f9", fontSize: "1.9rem", marginBottom: "0.4rem" }}>
            Create Your Account
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0 }}>
            Select your account type to get started with 3FA secure registration.
          </p>
        </div>

        {/* ── Role Selector ── */}
        {roleType === null && (
          <div style={{ marginBottom: "3rem" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap" }}>

              {/* Clinician card */}
              <button
                type="button"
                onClick={() => setRoleType("clinician")}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                style={{
                  width: "280px", textAlign: "left", color: "#fff", cursor: "pointer",
                  background: "linear-gradient(135deg,#0f2744 0%,#0a1e3d 100%)",
                  border: "2px solid #0ea5e9", boxShadow: "0 0 30px rgba(14,165,233,0.25)",
                  borderRadius: "16px", padding: "1.75rem", transition: "transform 0.2s",
                }}
              >
                <FaUserMd style={{ fontSize: "2.5rem", color: "#38bdf8", marginBottom: "0.75rem", display: "block" }} />
                <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: "1.15rem", marginBottom: "0.4rem" }}>Clinician Account</div>
                <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>
                  For Oncologists, Doctors, and Pathologists accessing clinical AI diagnostics.
                </p>
                <div style={{ color: "#38bdf8", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <FaArrowRight /> Register as Clinician
                </div>
              </button>

              {/* Admin card */}
              <button
                type="button"
                onClick={() => navigate("/admin/signup")}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                style={{
                  width: "280px", textAlign: "left", color: "#fff", cursor: "pointer",
                  background: "linear-gradient(135deg,#2d1b00 0%,#1a1000 100%)",
                  border: "2px solid #f59e0b", boxShadow: "0 0 30px rgba(245,158,11,0.25)",
                  borderRadius: "16px", padding: "1.75rem", transition: "transform 0.2s",
                }}
              >
                <FaUserShield style={{ fontSize: "2.5rem", color: "#f59e0b", marginBottom: "0.75rem", display: "block" }} />
                <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: "1.15rem", marginBottom: "0.4rem" }}>Administrator Account</div>
                <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>
                  For System Administrators managing users, security, and telemetry (Requires Approval Code).
                </p>
                <div style={{ color: "#f59e0b", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <FaArrowRight /> Register as Admin
                </div>
              </button>
            </div>

            <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem", color: "#94a3b8" }}>
              Already have an account?{" "}
              <Link to="/login" className="register-link ms-1">Sign In</Link>
            </div>
          </div>
        )}

        {/* ── Clinician Registration Form ── */}
        {roleType === "clinician" && (
          <div className="login-container" style={{ gap: "2.5rem", alignItems: "flex-start" }}>

            {/* Left brand panel */}
            <div className="login-brand-panel">
              <div>
                <button type="button" onClick={() => setRoleType(null)}
                  className="btn btn-link text-slate-400 p-0 mb-3 small text-decoration-none d-flex align-items-center gap-1">
                  <FaTimes className="me-1" />Change role type
                </button>
                <div className="d-flex align-items-center gap-2 text-primary fs-3 fw-bold mb-4">
                  <FaStethoscope className="text-info fs-2" />
                  <span className="text-white">Precision</span> Oncology
                </div>
                <h2 className="fw-bold text-white mb-3">Clinician Registration</h2>
                <p className="text-slate-300 small">
                  Register as an Oncologist or Pathologist. All accounts require compulsory 3-Factor
                  Authentication: Password + Face 3D Vector + Fingerprint / Passkey.
                </p>
              </div>
              <div className="pt-4 border-top border-secondary border-opacity-25">
                <div className="d-flex align-items-center gap-2 text-success small mb-2">
                  <FaCheckCircle /><span>AES-256 Encrypted Biometric Templates</span>
                </div>
                <div className="d-flex align-items-center gap-2 text-info small">
                  <FaUserShield /><span>Compulsory 3FA: Password + Face + Fingerprint</span>
                </div>
              </div>
            </div>

            {/* Right form card */}
            <div className="login-card">
              <div className="mb-4">
                <h3 className="fw-bold text-white mb-1">Clinician Sign Up</h3>
                <p className="text-muted small">Create your account and configure compulsory 3FA biometrics.</p>
              </div>

              {errorMsg && (
                <Alert variant="danger" className="py-2 small border-0 bg-danger bg-opacity-25 text-white">{errorMsg}</Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold text-slate-300"><FaUser className="me-2 text-info" />Full Name</Form.Label>
                  <Form.Control type="text" placeholder="e.g. Dr. Sarah Jenkins" value={fullName}
                    onChange={e => setFullName(e.target.value)} className="login-input" required />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold text-slate-300"><FaEnvelope className="me-2 text-info" />Email Address</Form.Label>
                  <Form.Control type="email" placeholder="e.g. sarah@hospital.org" value={email}
                    onChange={e => setEmail(e.target.value)} className="login-input" required />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold text-slate-300"><FaLock className="me-2 text-info" />Password</Form.Label>
                  <div className="position-relative">
                    <Form.Control type={showPassword ? "text" : "password"} placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)} className="login-input pe-5" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="btn btn-link position-absolute end-0 top-50 translate-middle-y pe-3 text-decoration-none"
                      style={{ zIndex: 5, border: "none", background: "transparent" }}>
                      {showPassword ? <FaEyeSlash className="text-info" /> : <FaEye className="text-slate-400" />}
                    </button>
                  </div>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold text-slate-300"><FaLock className="me-2 text-info" />Confirm Password</Form.Label>
                  <div className="position-relative">
                    <Form.Control type={showConfirmPassword ? "text" : "password"} placeholder="••••••••"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="login-input pe-5" required />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="btn btn-link position-absolute end-0 top-50 translate-middle-y pe-3 text-decoration-none"
                      style={{ zIndex: 5, border: "none", background: "transparent" }}>
                      {showConfirmPassword ? <FaEyeSlash className="text-info" /> : <FaEye className="text-slate-400" />}
                    </button>
                  </div>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="small fw-semibold text-slate-300"><FaUserMd className="me-2 text-info" />Clinical Role</Form.Label>
                  <Form.Select value={role} onChange={e => setRole(e.target.value)} className="login-input">
                    <option value="doctor" style={{ background: "#0f172a" }}>Oncologist / Medical Doctor</option>
                    <option value="pathologist" style={{ background: "#0f172a" }}>Pathologist</option>
                  </Form.Select>
                </Form.Group>

                <div className="mb-4 p-3 rounded-3" style={{ background: "rgba(30,41,59,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <label className="small fw-semibold text-slate-300 mb-2 d-block">
                    <FaShieldAlt className="me-2 text-primary" />Compulsory 3FA Biometric Authenticators:
                  </label>
                  <div className="d-flex flex-column gap-2">
                    {[
                      { icon: <FaCamera className="text-info" />, label: "128D Facial 3D Vector", enrolled: faceEnrolled },
                      { icon: <FaFingerprint className="text-primary" />, label: "Fingerprint / Passkey", enrolled: fingerprintEnrolled },
                    ].map(item => (
                      <div key={item.label} className="d-flex justify-content-between align-items-center p-2 rounded" style={{ background: "#0f172a" }}>
                        <span className="small text-slate-200 d-flex align-items-center gap-2">{item.icon}{item.label}</span>
                        {item.enrolled ? <Badge bg="success"><FaCheckCircle /> Enrolled</Badge> : <Badge bg="danger">Compulsory</Badge>}
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn-primary-login mb-3 d-flex align-items-center justify-content-center gap-2" disabled={loading}>
                  {loading
                    ? <><span className="spinner-border spinner-border-sm" /><span>Creating Account...</span></>
                    : <><FaUserPlus /><span>Create Account &amp; Setup 3FA Biometrics</span></>
                  }
                </button>
              </Form>

              <div className="text-center pt-3 border-top border-secondary border-opacity-25 small">
                Already have an account? <Link to="/login" className="register-link ms-1">Sign In</Link>
              </div>
            </div>
          </div>
        )}

        {/* Footer — Home only */}
        <div style={{ textAlign: "center", padding: "2rem 0", fontSize: "0.85rem", color: "#64748b" }}>
          <Link to="/" className="register-link">← Back to Home</Link>
        </div>

      </div>

      {/* ── 3FA BIOMETRICS MODAL ── */}
      <Modal show={showBiometricModal} onHide={() => {}} centered backdrop="static" className="text-white">
        <Modal.Header style={{ background: "#0f172a", borderBottom: "1px solid #1e293b" }}>
          <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
            <FaShieldAlt className="text-primary" />Compulsory 3FA Biometrics Setup for {fullName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: "#0f172a" }} className="p-4">
          <p className="text-muted small mb-4">
            Both Face Vector and Fingerprint/Passkey enrollment are <strong>compulsory</strong> to activate your clinical account.
          </p>
          <div className="d-flex flex-column gap-3 mb-4">
            <div className="p-3 rounded-3" style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="d-flex align-items-center gap-2">
                  <FaCamera className="text-info fs-5" />
                  <div><h6 className="fw-bold mb-0 text-white">Factor 2: Facial 3D Vector</h6><small className="text-muted">128D Encrypted Vector</small></div>
                </div>
                {faceEnrolled ? <Badge bg="success"><FaCheckCircle /> Enrolled</Badge> : <Badge bg="danger">Compulsory</Badge>}
              </div>
              <Button size="sm" variant={faceEnrolled ? "outline-success" : "primary"} onClick={startFaceCamera} className="w-100 mt-2 fw-bold">
                {faceEnrolled ? "Re-Enroll Face Vector" : "Scan & Enroll Face Vector"}
              </Button>
            </div>

            <div className="p-3 rounded-3" style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="d-flex align-items-center gap-2">
                  <FaFingerprint className="text-primary fs-5" />
                  <div><h6 className="fw-bold mb-0 text-white">Factor 3: Fingerprint / Passkey</h6><small className="text-muted">Windows Hello / Touch ID / FIDO2</small></div>
                </div>
                {fingerprintEnrolled ? <Badge bg="success"><FaCheckCircle /> Enrolled</Badge> : <Badge bg="danger">Compulsory</Badge>}
              </div>
              <Button size="sm" variant={fingerprintEnrolled ? "outline-success" : "outline-primary"} onClick={handleEnrollFingerprint} disabled={enrollingFingerprint} className="w-100 mt-2 fw-bold">
                {enrollingFingerprint
                  ? <><span className="spinner-border spinner-border-sm me-2" />Enrolling...</>
                  : fingerprintEnrolled ? "Re-Enroll Fingerprint Passkey" : "Enroll Fingerprint / Passkey"}
              </Button>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer style={{ background: "#0f172a", borderTop: "1px solid #1e293b" }}>
          <Button variant={faceEnrolled && fingerprintEnrolled ? "success" : "secondary"}
            onClick={finishRegistration} className="w-100 fw-bold d-flex align-items-center justify-content-center gap-2 py-2">
            <span>Complete Registration &amp; Proceed to Login</span><FaArrowRight />
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── FACE SCAN MODAL ── */}
      <Modal show={showFaceModal} onHide={() => { stopCamera(); setShowFaceModal(false); }} centered backdrop="static" className="text-white">
        <Modal.Header closeButton style={{ background: "#0f172a", borderBottom: "1px solid #1e293b" }}>
          <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
            <FaCamera className="text-info" />Facial Biometric Enrollment
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: "#0f172a" }} className="text-center p-4">
          <div className="position-relative mx-auto mb-3 rounded-4 overflow-hidden border border-secondary" style={{ width: "320px", height: "240px", background: "#000" }}>
            <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div className="position-absolute top-50 start-50 translate-middle border border-2 border-info rounded-circle opacity-75" style={{ width: "180px", height: "180px", pointerEvents: "none" }} />
          </div>
          <p className="text-slate-300 small mb-3">{faceStatusText}</p>
          <Button variant="primary" onClick={executeFaceEnrollment} disabled={enrollingFace || !cameraActive} className="w-100 fw-bold py-2">
            {enrollingFace
              ? <><span className="spinner-border spinner-border-sm me-2" />Capturing Biometrics...</>
              : "Capture & Enroll Face Template"}
          </Button>
        </Modal.Body>
      </Modal>

    </div>
  );
}
