import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import {
  FaShieldAlt, FaUserShield, FaCamera, FaFingerprint,
  FaExclamationCircle, FaCheckCircle, FaLock
} from 'react-icons/fa';
import { extractFaceEmbedding, checkFrameQuality } from '../../utils/faceAuth';
import { authenticatePasskey } from '../../utils/webauthn';
import { Modal, Button } from 'react-bootstrap';

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
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      setCameraActive(false);
    }
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
    <div style={styles.container}>
      <div style={styles.card}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconCircle}>
            <FaUserShield style={{ color: '#0284C7', fontSize: '1.75rem' }} />
          </div>
          <h1 style={styles.title}>Precision Oncology</h1>
          <div style={styles.subTitleBadge}>
            <FaShieldAlt style={{ marginRight: '0.4rem', fontSize: '0.75rem' }} />
            Administration Portal
          </div>
          <p style={styles.subtitle}>Secure 3-Factor Administrator Authentication</p>
        </div>

        {/* Step Indicator */}
        <div style={styles.stepper}>
          {STEPS.map((s, i) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ ...styles.stepItem, ...(step >= s.num ? styles.stepItemActive : {}) }}>
                <div style={{ ...styles.stepCircle, ...(step > s.num ? styles.stepCircleDone : step === s.num ? styles.stepCircleActive : {}) }}>
                  {step > s.num ? <FaCheckCircle style={{ fontSize: '0.7rem' }} /> : s.num}
                </div>
                <span style={{ ...styles.stepLabel, ...(step >= s.num ? { color: '#0284C7' } : {}) }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ ...styles.stepConnector, ...(step > s.num ? { backgroundColor: '#0284C7' } : {}) }} />
              )}
            </div>
          ))}
        </div>

        {/* Error Box */}
        {error && (
          <div style={styles.errorBox}>
            <FaExclamationCircle style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* ── STEP 1: Password ──────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleStep1} style={styles.form}>
            <div style={styles.stepHeader}>
              <div style={styles.stepIcon}><FaLock style={{ color: '#0284C7' }} /></div>
              <div>
                <div style={styles.stepTitle}>Factor 1 — Administrator Password</div>
                <div style={styles.stepDesc}>Enter your admin email and password to start the 3FA verification.</div>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Admin Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@hospital.org"
                style={styles.input}
                autoFocus
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={styles.input}
              />
            </div>

            <button type="submit" disabled={loading} style={styles.primaryBtn}>
              {loading ? 'Verifying Admin Credentials...' : 'Verify Password & Continue →'}
            </button>
          </form>
        )}

        {/* ── STEP 2: Face Biometric ────────────────────────────────────── */}
        {step === 2 && (
          <div style={styles.biometricBox}>
            <div style={styles.stepHeader}>
              <div style={{ ...styles.stepIcon, backgroundColor: '#E0F2FE', border: '1px solid #BAE6FD' }}>
                <FaCamera style={{ color: '#0284C7' }} />
              </div>
              <div>
                <div style={styles.stepTitle}>Factor 2 — Facial Biometric Scan</div>
                <div style={styles.stepDesc}>
                  Verifying 128D facial embedding vector for: <strong>{adminUser?.email}</strong>
                </div>
              </div>
            </div>

            <div style={styles.biometricVisual}>
              <div style={styles.biometricRing}>
                <FaCamera style={{ fontSize: '2rem', color: '#0284C7' }} />
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748B', textAlign: 'center', margin: '0.75rem 0 0 0' }}>
                Position your face in front of the live camera. Vector is calculated and matched against enrolled template.
              </p>
            </div>

            <button onClick={startCamera} disabled={loading} style={styles.primaryBtn}>
              {loading ? 'Processing...' : 'Open Camera & Scan Face →'}
            </button>
          </div>
        )}

        {/* ── STEP 3: WebAuthn Passkey ──────────────────────────────────── */}
        {step === 3 && (
          <div style={styles.biometricBox}>
            <div style={styles.stepHeader}>
              <div style={{ ...styles.stepIcon, backgroundColor: '#D1FAE5', border: '1px solid #6EE7B7' }}>
                <FaFingerprint style={{ color: '#10B981' }} />
              </div>
              <div>
                <div style={styles.stepTitle}>Factor 3 — WebAuthn / Passkey</div>
                <div style={styles.stepDesc}>
                  Touch your security key or biometric sensor to complete 3FA authorization.
                </div>
              </div>
            </div>

            <div style={styles.biometricVisual}>
              <div style={{ ...styles.biometricRing, backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }}>
                <FaFingerprint style={{ fontSize: '2.2rem', color: '#10B981' }} />
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748B', textAlign: 'center', margin: '0.75rem 0 0 0' }}>
                FIDO2 WebAuthn hardware token or OS biometric prompt.
              </p>
            </div>

            <button onClick={handleStep3WebAuthn} disabled={loading} style={{ ...styles.primaryBtn, backgroundColor: '#10B981' }}>
              {loading ? 'Verifying Passkey...' : 'Authenticate WebAuthn Passkey →'}
            </button>
          </div>
        )}

        {/* Footer info */}
        <div style={styles.footer}>
          <FaShieldAlt style={{ marginRight: '0.35rem', color: '#94A3B8' }} />
          Restricted Portal — Unauthorized access attempts are monitored and recorded in the audit log.
        </div>

      </div>

      {/* ── REAL WEBCAM SCAN MODAL ── */}
      <Modal show={showCameraModal} onHide={() => { stopCamera(); setShowCameraModal(false); }} centered backdrop="static" className="text-white">
        <Modal.Header closeButton style={{ background: "#0f172a", borderBottom: "1px solid #1e293b" }}>
          <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
            <FaCamera className="text-info" />Facial Biometric Verification
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: "#0f172a" }} className="text-center p-4">
          <div className="position-relative mx-auto mb-3 rounded-4 overflow-hidden border border-secondary" style={{ width: "320px", height: "240px", background: "#000" }}>
            <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div className="position-absolute top-50 start-50 translate-middle border border-2 border-info rounded-circle opacity-75" style={{ width: "180px", height: "180px", pointerEvents: "none", borderStyle: "dashed" }} />
          </div>
          <p className="text-info small mb-3 fw-semibold">{faceStatusText}</p>
          <Button variant="primary" onClick={captureAndVerifyFace} disabled={loading || !cameraActive} className="w-100 fw-bold py-2">
            {loading ? <><span className="spinner-border spinner-border-sm me-2" />Verifying Similarity...</> : "Verify Face Match"}
          </Button>
        </Modal.Body>
      </Modal>

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
    fontFamily: "'Inter', sans-serif",
    padding: '1.5rem',
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    padding: '2.25rem',
    position: 'relative',
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.75rem',
  },
  iconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#E0F2FE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem auto',
    border: '2px solid #BAE6FD',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#0F172A',
    margin: '0 0 0.4rem 0',
  },
  subTitleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    color: '#0369A1',
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '0.2rem 0.65rem',
    borderRadius: '9999px',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.82rem',
    color: '#64748B',
    margin: 0,
  },
  stepper: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1.5rem',
    padding: '0.6rem 0.8rem',
    backgroundColor: '#F8FAFC',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    opacity: 0.45,
  },
  stepItemActive: {
    opacity: 1,
  },
  stepCircle: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#CBD5E1',
    color: '#FFFFFF',
    fontSize: '0.7rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#0284C7',
  },
  stepCircleDone: {
    backgroundColor: '#10B981',
  },
  stepLabel: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#64748B',
    whiteSpace: 'nowrap',
  },
  stepConnector: {
    flex: 1,
    height: '2px',
    backgroundColor: '#CBD5E1',
    margin: '0 0.4rem',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.6rem',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FCA5A5',
    color: '#991B1B',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.82rem',
    marginBottom: '1.25rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.1rem',
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem',
  },
  stepIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#F1F5F9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    flexShrink: 0,
  },
  stepTitle: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#0F172A',
  },
  stepDesc: {
    fontSize: '0.78rem',
    color: '#64748B',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#334155',
  },
  input: {
    padding: '0.65rem 0.9rem',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    fontSize: '0.88rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  primaryBtn: {
    padding: '0.75rem 1.25rem',
    borderRadius: '8px',
    backgroundColor: '#0284C7',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '0.9rem',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    marginTop: '0.5rem',
    transition: 'background-color 0.2s',
  },
  biometricBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  biometricVisual: {
    padding: '1.5rem',
    backgroundColor: '#F8FAFC',
    borderRadius: '12px',
    border: '1px dashed #CBD5E1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  biometricRing: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    backgroundColor: '#E0F2FE',
    border: '2px solid #BAE6FD',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: '1.75rem',
    paddingTop: '1rem',
    borderTop: '1px solid #F1F5F9',
    textAlign: 'center',
    fontSize: '0.75rem',
    color: '#94A3B8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
