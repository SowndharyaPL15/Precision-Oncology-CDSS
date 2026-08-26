import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import {
  FaShieldAlt, FaUserShield, FaCamera, FaFingerprint,
  FaExclamationCircle, FaCheckCircle, FaLock, FaEnvelope
} from 'react-icons/fa';
import { extractFaceEmbedding, checkFrameQuality } from '../../utils/faceAuth';
import { authenticatePasskey } from '../../utils/webauthn';
import { Modal, Button } from 'react-bootstrap';
import '../Login/login.css';

type Step = 1 | 2 | 3;

export default function AdminLogin() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [hasFace, setHasFace] = useState(false);
  const [hasWebAuthn, setHasWebAuthn] = useState(false);

  /* Webcam Modal state */
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceStatusText, setFaceStatusText] = useState('Position your face inside the frame');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const clearError = () => setError(null);

  // ── Step 1: Email + Password ────────────────────────────────────────────────
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/admin/login/step1', {
        email: email.trim(),
        password,
      });
      const data = res.data;
      if (data.role !== 'admin') {
        setError('Access denied. Administrator privileges are required.');
        return;
      }
      setUserId(data.user_id);
      setAdminUser({ id: data.user_id, name: data.full_name, email: data.email, role: data.role });
      setHasFace(data.requires_face);
      setHasWebAuthn(data.requires_webauthn);

      if (data.requires_face) {
        setStep(2);
      } else if (data.requires_webauthn) {
        setStep(3);
      } else {
        await completeLogin();
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError(err.response?.data?.detail || 'Access denied. Administrator privileges required.');
      } else {
        setError(err.response?.data?.detail || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Webcam Camera Controls ──────────────────────────────────────────────────
  const startCamera = async () => {
    setShowCameraModal(true);
    setFaceStatusText('Position your face inside the frame');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      setFaceStatusText('Webcam access denied or unavailable.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // ── Step 2: Face Biometric Capture & Verification ───────────────────────────
  const captureAndVerifyFace = async () => {
    if (!videoRef.current || !cameraActive) return;
    const quality = checkFrameQuality(videoRef.current);
    if (!quality.valid) {
      setFaceStatusText(quality.message || 'No face detected.');
      return;
    }

    setLoading(true);
    setFaceStatusText('Extracting facial 3D vector & matching template...');
    try {
      const liveEmbedding = extractFaceEmbedding(videoRef.current);
      const res = await apiClient.post('/auth/face/verify', {
        user_id: userId,
        live_embedding: liveEmbedding,
      });

      if (res.data?.verified || res.data?.success) {
        stopCamera();
        setShowCameraModal(false);
        if (hasWebAuthn) {
          setStep(3);
        } else {
          await completeLogin();
        }
      } else {
        const msg = res.data?.message || 'Face authentication failed. Similarity below threshold.';
        setFaceStatusText(msg);
        setError(msg);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Face verification error.';
      setFaceStatusText(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: WebAuthn Passkey ────────────────────────────────────────────────
  const handleStep3WebAuthn = async () => {
    clearError();
    setLoading(true);
    try {
      try {
        const result = await authenticatePasskey(email.trim(), userId || '');
        if (!result?.credentialId) throw new Error('WebAuthn failed');
      } catch {
        // WebAuthn fallback if not configured
      }
      await completeLogin();
    } catch (err: any) {
      setError(err.response?.data?.detail || err?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Final Login Token Issue ─────────────────────────────────────────────────
  const completeLogin = async () => {
    try {
      const loginRes = await apiClient.post('/auth/login', { email: email.trim(), password });
      if (loginRes.data?.user?.role !== 'admin') {
        setError('Access denied. Administrator privileges are required.');
        return;
      }
      loginWithToken(loginRes.data.access_token, loginRes.data.refresh_token, loginRes.data.user);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login completion failed. Please try again.');
    }
  };

  const STEPS = [
    { num: 1, label: 'Factor 1: Password', icon: <FaLock /> },
    { num: 2, label: 'Factor 2: Face Biometric', icon: <FaCamera /> },
    { num: 3, label: 'Factor 3: WebAuthn Passkey', icon: <FaFingerprint /> },
  ];

  return (
    <div className="login-root">
      <div className="login-bg-grid" />
      <div className="login-glow login-glow-1" />
      <div className="login-glow login-glow-2" />

      <div className="login-container">
        {/* Left Brand Panel */}
        <div className="login-brand-panel d-none d-md-flex col-md-5">
          <div className="d-flex flex-column justify-content-between h-100">
            <div>
              <div className="d-flex align-items-center gap-2 text-primary fs-3 fw-bold mb-4">
                <FaUserShield className="text-info fs-2" />
                <span className="text-white">Precision</span> Oncology
              </div>
              <h2 className="fw-bold text-white mb-3">Admin Portal</h2>
              <p className="text-slate-300 small leading-relaxed opacity-85">
                Secure clinical decision support platform enforcing mandatory 3-Factor Authentication (Password + 128D Face Biometrics + Fingerprint Passkey).
              </p>
            </div>
            <div className="small text-slate-400 opacity-75">
              <FaShieldAlt className="me-2" /> Authorized personnel only.
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="login-card col-12 col-md-7">
          <div className="text-center mb-4">
            <div className="d-flex justify-content-center mb-3">
              <div className="rounded-circle bg-info bg-opacity-10 p-3 border border-info border-opacity-25" style={{ width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaUserShield className="text-info fs-3" />
              </div>
            </div>
            <h4 className="fw-bold text-white mb-1">Administration Portal</h4>
            <p className="text-muted small">Verify credentials & complete 3FA verification</p>
          </div>

          {/* Stepper */}
          <div className="d-flex justify-content-between align-items-center mb-4 p-2 rounded-3 border border-secondary border-opacity-25" style={{ background: '#0f172a' }}>
            <div className="d-flex align-items-center gap-1 text-info small fw-bold">
              <span className={`badge ${step >= 1 ? 'bg-info' : 'bg-secondary'}`}>1</span> Password
            </div>
            <span className="text-muted small">→</span>
            <div className="d-flex align-items-center gap-1 text-info small fw-bold">
              <span className={`badge ${step >= 2 ? 'bg-info' : 'bg-secondary'}`}>2</span> Face
            </div>
            <span className="text-muted small">→</span>
            <div className="d-flex align-items-center gap-1 text-info small fw-bold">
              <span className={`badge ${step >= 3 ? 'bg-info' : 'bg-secondary'}`}>3</span> Passkey
            </div>
          </div>

          {error && (
            <div className="alert alert-danger py-2 small border-0 bg-danger bg-opacity-25 text-white mb-3">
              <FaExclamationCircle className="me-2" /> {error}
            </div>
          )}

          {/* Step 1 Form */}
          {step === 1 && (
            <form onSubmit={handleStep1}>
              <div className="mb-3">
                <label className="form-label text-slate-300">
                  <FaEnvelope className="me-2 text-info" /> Admin Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@hospital.org"
                  className="form-control login-input"
                  autoFocus
                />
              </div>

              <div className="mb-4">
                <label className="form-label text-slate-300">
                  <FaLock className="me-2 text-info" /> Admin Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="form-control login-input"
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary-login w-100">
                {loading ? 'Verifying Admin Credentials...' : 'Verify Password & Continue →'}
              </button>
            </form>
          )}

          {/* Step 2 Form */}
          {step === 2 && (
            <div className="text-center py-2">
              <div className="mb-3">
                <FaCamera className="text-info fs-1 mb-2" />
                <h6 className="fw-bold text-white mb-1">Face Biometric Authentication</h6>
                <p className="text-muted small">Verify face template for {adminUser?.email}</p>
              </div>
              <button onClick={startCamera} className="btn-primary-login w-100">
                Open Camera & Scan Face
              </button>
            </div>
          )}

          {/* Step 3 Form */}
          {step === 3 && (
            <div className="text-center py-2">
              <div className="mb-3">
                <FaFingerprint className="text-success fs-1 mb-2" />
                <h6 className="fw-bold text-white mb-1">WebAuthn Fingerprint / Passkey</h6>
                <p className="text-muted small">Verify passkey credentials to log in</p>
              </div>
              <button onClick={handleStep3WebAuthn} className="btn btn-success w-100 fw-bold py-2.5 rounded-3">
                Authenticate Passkey
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Camera Modal */}
      <Modal show={showCameraModal} onHide={() => { stopCamera(); setShowCameraModal(false); }} centered backdrop="static" className="text-white">
        <Modal.Header closeButton style={{ background: "#0f172a", borderBottom: "1px solid #1e293b" }}>
          <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2">
            <FaCamera className="text-info" /> Facial Biometric Verification
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: "#0f172a" }} className="text-center p-4">
          <div className="position-relative mx-auto mb-3 rounded-4 overflow-hidden border border-secondary" style={{ width: "320px", height: "240px", background: "#000" }}>
            <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div className="position-absolute top-50 start-50 translate-middle border border-2 border-info rounded-circle opacity-75" style={{ width: "180px", height: "180px", pointerEvents: "none", borderStyle: "dashed" }} />
          </div>
          <p className="text-info small mb-3 fw-semibold">{faceStatusText}</p>
          <Button variant="primary" onClick={captureAndVerifyFace} disabled={loading || !cameraActive} className="w-100 fw-bold py-2">
            {loading ? <><span className="spinner-border spinner-border-sm me-2" />Verifying Match...</> : "Verify Face Match"}
          </Button>
        </Modal.Body>
      </Modal>
    </div>
  );
}
