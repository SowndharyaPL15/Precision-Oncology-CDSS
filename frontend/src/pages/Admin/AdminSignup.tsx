import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Alert, Modal, Button, Badge } from 'react-bootstrap';
import {
  FaUser, FaEnvelope, FaLock, FaUserPlus,
  FaCheckCircle, FaUserShield, FaCamera, FaFingerprint, FaShieldAlt,
  FaEye, FaEyeSlash, FaArrowRight, FaArrowLeft,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import apiClient from '../../api/client';
import { extractFaceEmbedding, captureMultiPoseSamples, checkFrameQuality } from '../../utils/faceAuth';
import { registerPasskey } from '../../utils/webauthn';
import '../Login/login.css';

export default function AdminSignup() {
  const navigate = useNavigate();

  /* ── Form Fields ── */
  const [fullName, setFullName]               = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminCode, setAdminCode]             = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [errorMsg, setErrorMsg]               = useState<string | null>(null);

  /* ── 3FA state ── */
  const [createdUser, setCreatedUser]         = useState<{ id: string; email: string } | null>(null);
  const [showBiometricModal, setShowBiometricModal] = useState(false);

  /* ── Face Camera ── */
  const [showFaceModal, setShowFaceModal]     = useState(false);
  const [cameraActive, setCameraActive]       = useState(false);
  const [enrollingFace, setEnrollingFace]     = useState(false);
  const [faceEnrolled, setFaceEnrolled]       = useState(false);
  const [faceStatusText, setFaceStatusText]   = useState('Position your face inside the frame');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /* ── Fingerprint ── */
  const [enrollingFingerprint, setEnrollingFingerprint] = useState(false);
  const [fingerprintEnrolled, setFingerprintEnrolled]   = useState(false);

  /* ════════════════════ STEP 1: Create Admin Account ════════════════════ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword || !adminCode) {
      setErrorMsg('Please fill in all required fields including the Admin Approval Code.');
      return;
    }
    if (password !== confirmPassword) { setErrorMsg('Passwords do not match.'); return; }
    if (password.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }

    setLoading(true);
    setErrorMsg(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');

    try {
      const signupRes = await apiClient.post('/auth/signup', {
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role: 'admin',
        admin_code: adminCode.trim(),
      });

      const userId = signupRes.data?.user_id || 'new-admin';
      toast.success('✅ Admin account created! Now complete 3FA biometric setup.');

      // Auto-login to get token for biometric enrollment
      try {
        const lr = await apiClient.post('/auth/login', { email: email.trim(), password });
        localStorage.setItem('token', lr.data.access_token);
      } catch { console.warn('Auto-login fallback.'); }

      setCreatedUser({ id: userId, email: email.trim() });
      setShowBiometricModal(true);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to create admin account. Check approval code or email already exists.');
    } finally {
      setLoading(false);
    }
  };

  /* ════════════════════ STEP 2: Face Camera ════════════════════ */
  const startFaceCamera = async () => {
    setShowFaceModal(true);
    setFaceStatusText('Position your face inside the frame');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      setFaceStatusText('Webcam access denied.');
      toast.error('Unable to access webcam. Check camera permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      setCameraActive(false);
    }
  };

  const executeFaceEnrollment = async () => {
    if (!videoRef.current || !cameraActive) { toast.warn('Camera unavailable.'); return; }
    const quality = checkFrameQuality(videoRef.current);
    if (!quality.valid) {
      const msg = quality.message || 'No face detected.';
      toast.warn(msg);
      setFaceStatusText(msg);
      return;
    }
    setEnrollingFace(true);
    setFaceStatusText('Capturing multi-pose 3D facial vectors...');
    try {
      let samples: number[][] = [];
      try { samples = await captureMultiPoseSamples(videoRef.current, 3, 200); }
      catch { samples = [extractFaceEmbedding(videoRef.current)]; }

      await apiClient.post('/auth/face/enroll', {
        user_id: createdUser?.id,
        samples,
        model_version: 'v1-128d',
      });
      setFaceEnrolled(true);
      toast.success('✅ Facial biometric enrolled successfully!');
      setTimeout(() => { stopCamera(); setShowFaceModal(false); }, 1000);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to enroll face biometric.';
      toast.error(detail);
      setFaceStatusText(detail);
    } finally {
      setEnrollingFace(false);
    }
  };

  /* ════════════════════ STEP 3: Fingerprint ════════════════════ */
  const handleEnrollFingerprint = async () => {
    if (!createdUser) return;
    setEnrollingFingerprint(true);
    try {
      await registerPasskey(createdUser.id, createdUser.email);
      setFingerprintEnrolled(true);
      toast.success('✅ Fingerprint / Passkey enrolled!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to enroll passkey.');
    } finally {
      setEnrollingFingerprint(false);
    }
  };

  /* ════════════════════ FINISH ════════════════════ */
  const finishRegistration = () => {
    if (!faceEnrolled) { toast.error('❌ Face biometric is compulsory! Please enroll.'); return; }
    if (!fingerprintEnrolled) { toast.error('❌ Fingerprint/Passkey is compulsory! Please enroll.'); return; }
    setShowBiometricModal(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user_data');
    toast.success('🎉 Admin registration complete! Please sign in via Admin Portal.');
    navigate('/admin/login');
  };

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div className="login-root">
      <div className="login-bg-grid" />
      <div className="login-glow login-glow-1" style={{ background: 'radial-gradient(circle at 30% 40%, rgba(245,158,11,0.15) 0%, transparent 70%)' }} />
      <div className="login-glow login-glow-2" style={{ background: 'radial-gradient(circle at 70% 60%, rgba(245,158,11,0.08) 0%, transparent 70%)' }} />

      <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem' }}>

        {/* ── Back Link ── */}
        <div className="mb-4">
          <Link to="/signup" className="text-slate-400 small text-decoration-none d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
            <FaArrowLeft className="me-1" /> Back to Role Selection
          </Link>
        </div>

        {/* ── Header ── */}
        <div className="text-center mb-5">
          <div className="d-flex justify-content-center align-items-center gap-2 mb-3">
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px',
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FaUserShield style={{ fontSize: '1.6rem', color: '#fff' }} />
            </div>
          </div>
          <h1 className="fw-bold text-white mb-1" style={{ fontSize: '1.9rem' }}>
            System Administrator <span style={{ color: '#f59e0b' }}>Sign Up</span>
          </h1>
          <p className="text-slate-300 small mb-0">
            Create an admin account with a valid Approval Code + compulsory 3FA biometrics.
          </p>
        </div>

        {/* ── Two-column layout ── */}
        <div className="login-container" style={{ gap: '2.5rem', alignItems: 'flex-start' }}>

          {/* Left Info Panel */}
          <div className="login-brand-panel">
            <div>
              <div className="d-flex align-items-center gap-2 fw-bold mb-4" style={{ fontSize: '1.3rem' }}>
                <FaUserShield style={{ color: '#f59e0b', fontSize: '1.6rem' }} />
                <span className="text-white">Admin</span>
                <span style={{ color: '#f59e0b' }}>Portal</span>
              </div>
              <h2 className="fw-bold text-white mb-3">Administrator Registration</h2>
              <p className="text-slate-300 small">
                Admin accounts have <strong style={{ color: '#f59e0b' }}>full system access</strong> —
                User Provisioning, Audit Logs, Security Controls, and AI Model Management.
                Registration requires a valid Approval Code and compulsory 3FA biometric enrollment.
              </p>
            </div>

            <div className="pt-4 border-top border-secondary border-opacity-25">
              <div className="d-flex align-items-start gap-2 text-warning small mb-3">
                <FaShieldAlt className="mt-1 flex-shrink-0" />
                <div>
                  <div className="fw-bold mb-1">Admin Approval Code</div>
                  <div className="text-slate-400">Required to create an admin account. Default: <code style={{ color: '#fbbf24' }}>ADMIN-SECRET-2026</code></div>
                </div>
              </div>
              <div className="d-flex align-items-start gap-2 text-info small mb-3">
                <FaCamera className="mt-1 flex-shrink-0" />
                <div>
                  <div className="fw-bold mb-1">Compulsory 3FA</div>
                  <div className="text-slate-400">Password + 128D Face Vector + Fingerprint Passkey — all three required</div>
                </div>
              </div>
              <div className="d-flex align-items-start gap-2 text-success small">
                <FaCheckCircle className="mt-1 flex-shrink-0" />
                <div>
                  <div className="fw-bold mb-1">AES-256 Encrypted Biometrics</div>
                  <div className="text-slate-400">All biometric templates are encrypted at rest</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Form */}
          <div className="login-card" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
            <div className="mb-4">
              <h3 className="fw-bold text-white mb-1">Create Admin Account</h3>
              <p className="text-muted small">Fill in your details and enter the Admin Approval Code.</p>
            </div>

            {errorMsg && (
              <Alert variant="danger" className="py-2 small border-0 bg-danger bg-opacity-25 text-white">
                {errorMsg}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              {/* Full Name */}
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-slate-300">
                  <FaUser className="me-2 text-warning" />Full Name
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. System Administrator"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="login-input"
                  required
                />
              </Form.Group>

              {/* Email */}
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-slate-300">
                  <FaEnvelope className="me-2 text-warning" />Admin Email Address
                </Form.Label>
                <Form.Control
                  type="email"
                  placeholder="admin@hospital.org"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="login-input"
                  required
                />
              </Form.Group>

              {/* Password */}
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-slate-300">
                  <FaLock className="me-2 text-warning" />Password
                </Form.Label>
                <div className="position-relative">
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="login-input pe-5"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="btn btn-link position-absolute end-0 top-50 translate-middle-y pe-3 text-decoration-none"
                    style={{ border: 'none', background: 'transparent' }}>
                    {showPassword ? <FaEyeSlash className="text-warning" /> : <FaEye className="text-slate-400" />}
                  </button>
                </div>
              </Form.Group>

              {/* Confirm Password */}
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-slate-300">
                  <FaLock className="me-2 text-warning" />Confirm Password
                </Form.Label>
                <div className="position-relative">
                  <Form.Control
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="login-input pe-5"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="btn btn-link position-absolute end-0 top-50 translate-middle-y pe-3 text-decoration-none"
                    style={{ border: 'none', background: 'transparent' }}>
                    {showConfirmPassword ? <FaEyeSlash className="text-warning" /> : <FaEye className="text-slate-400" />}
                  </button>
                </div>
              </Form.Group>

              {/* Admin Approval Code */}
              <Form.Group className="mb-4">
                <Form.Label className="small fw-semibold" style={{ color: '#fbbf24' }}>
                  <FaUserShield className="me-2 text-warning" />Admin Approval Code <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter admin approval code"
                  value={adminCode}
                  onChange={e => setAdminCode(e.target.value)}
                  className="login-input"
                  style={{ borderColor: '#f59e0b', borderWidth: '2px' }}
                  required
                />
                <Form.Text className="text-slate-400 small">
                  Default code: <code style={{ color: '#fbbf24' }}>ADMIN-SECRET-2026</code> (contact your system admin)
                </Form.Text>
              </Form.Group>

              {/* 3FA Preview */}
              <div className="mb-4 p-3 rounded-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <label className="small fw-semibold mb-2 d-block" style={{ color: '#fbbf24' }}>
                  <FaShieldAlt className="me-2" />Compulsory 3FA Biometrics (after account creation):
                </label>
                <div className="d-flex flex-column gap-2">
                  {[
                    { icon: <FaCamera className="text-info" />, label: '128D Facial 3D Vector' },
                    { icon: <FaFingerprint className="text-warning" />, label: 'Fingerprint / Passkey (FIDO2)' },
                  ].map(item => (
                    <div key={item.label} className="d-flex justify-content-between align-items-center p-2 rounded"
                      style={{ background: 'rgba(15,23,42,0.6)' }}>
                      <span className="small text-slate-200 d-flex align-items-center gap-2">{item.icon}{item.label}</span>
                      <Badge bg="danger" style={{ fontSize: '0.65rem' }}>Required</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary-login mb-3 d-flex align-items-center justify-content-center gap-2"
                disabled={loading}
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderColor: '#f59e0b' }}
              >
                {loading ? (
                  <><span className="spinner-border spinner-border-sm" /><span>Creating Admin Account...</span></>
                ) : (
                  <><FaUserPlus /><span>Create Admin Account & Setup 3FA</span></>
                )}
              </button>
            </Form>

            <div className="text-center pt-3 border-top border-secondary border-opacity-25 small">
              Already an administrator?{' '}
              <Link to="/admin/login" className="register-link ms-1" style={{ color: '#f59e0b' }}>Admin Sign In</Link>
            </div>
            <div className="text-center mt-2 small text-slate-400">
              Are you a doctor or pathologist?{' '}
              <Link to="/signup" className="register-link ms-1">Clinician Sign Up</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════ 3FA BIOMETRICS MODAL ══════════════ */}
      <Modal show={showBiometricModal} onHide={() => {}} centered backdrop="static" className="text-white">
        <Modal.Header style={{ background: '#0f172a', borderBottom: '1px solid rgba(245,158,11,0.3)' }}>
          <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
            <FaShieldAlt className="text-warning" />
            Compulsory 3FA Biometrics Setup — {fullName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: '#0f172a' }} className="p-4">
          <p className="text-muted small mb-4">
            Both <strong style={{ color: '#fbbf24' }}>Face Vector</strong> and{' '}
            <strong style={{ color: '#fbbf24' }}>Fingerprint / Passkey</strong> are{' '}
            <strong>compulsory</strong> to activate your administrator account.
          </p>

          <div className="d-flex flex-column gap-3 mb-4">
            {/* Face Enrollment */}
            <div className="p-3 rounded-3" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="d-flex align-items-center gap-2">
                  <FaCamera className="text-info fs-5" />
                  <div>
                    <h6 className="fw-bold mb-0 text-white">Factor 2: Facial 3D Vector</h6>
                    <small className="text-muted">128D Encrypted Biometric Template</small>
                  </div>
                </div>
                {faceEnrolled
                  ? <Badge bg="success"><FaCheckCircle className="me-1" />Enrolled</Badge>
                  : <Badge bg="danger">Compulsory</Badge>}
              </div>
              <Button
                size="sm"
                variant={faceEnrolled ? 'outline-success' : 'primary'}
                onClick={startFaceCamera}
                className="w-100 mt-2 fw-bold"
              >
                <FaCamera className="me-2" />
                {faceEnrolled ? 'Re-Enroll Face Vector' : 'Scan & Enroll Face Vector'}
              </Button>
            </div>

            {/* Fingerprint Enrollment */}
            <div className="p-3 rounded-3" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="d-flex align-items-center gap-2">
                  <FaFingerprint className="text-warning fs-5" />
                  <div>
                    <h6 className="fw-bold mb-0 text-white">Factor 3: Fingerprint / Passkey</h6>
                    <small className="text-muted">Windows Hello / Touch ID / FIDO2</small>
                  </div>
                </div>
                {fingerprintEnrolled
                  ? <Badge bg="success"><FaCheckCircle className="me-1" />Enrolled</Badge>
                  : <Badge bg="danger">Compulsory</Badge>}
              </div>
              <Button
                size="sm"
                variant={fingerprintEnrolled ? 'outline-success' : 'outline-warning'}
                onClick={handleEnrollFingerprint}
                disabled={enrollingFingerprint}
                className="w-100 mt-2 fw-bold"
              >
                {enrollingFingerprint
                  ? <><span className="spinner-border spinner-border-sm me-2" />Enrolling...</>
                  : <><FaFingerprint className="me-2" />{fingerprintEnrolled ? 'Re-Enroll Passkey' : 'Enroll Fingerprint / Passkey'}</>}
              </Button>
            </div>
          </div>

          {/* Status summary */}
          <div className="p-2 rounded-3 text-center small"
            style={{ background: faceEnrolled && fingerprintEnrolled ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
                     border: `1px solid ${faceEnrolled && fingerprintEnrolled ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}` }}>
            {faceEnrolled && fingerprintEnrolled
              ? <span className="text-success fw-bold"><FaCheckCircle className="me-2" />All 3FA factors enrolled — ready to complete!</span>
              : <span className="text-danger fw-semibold">⚠ Both face and fingerprint enrollment are required to proceed.</span>}
          </div>
        </Modal.Body>
        <Modal.Footer style={{ background: '#0f172a', borderTop: '1px solid rgba(245,158,11,0.3)' }}>
          <Button
            variant={faceEnrolled && fingerprintEnrolled ? 'warning' : 'secondary'}
            onClick={finishRegistration}
            className="w-100 fw-bold d-flex align-items-center justify-content-center gap-2 py-2"
            disabled={!faceEnrolled || !fingerprintEnrolled}
          >
            <span>Complete Admin Registration & Go to Login</span>
            <FaArrowRight />
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ══════════════ FACE SCAN MODAL ══════════════ */}
      <Modal
        show={showFaceModal}
        onHide={() => { stopCamera(); setShowFaceModal(false); }}
        centered
        backdrop="static"
        className="text-white"
      >
        <Modal.Header closeButton style={{ background: '#0f172a', borderBottom: '1px solid #1e293b' }}>
          <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
            <FaCamera className="text-info" />Facial Biometric Enrollment
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: '#0f172a' }} className="text-center p-4">
          <p className="text-slate-300 small mb-3">
            Centre your face inside the oval frame and stay still while capturing.
          </p>
          <div
            className="position-relative mx-auto mb-3 rounded-4 overflow-hidden border border-secondary"
            style={{ width: '320px', height: '240px', background: '#000' }}
          >
            <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div
              className="position-absolute top-50 start-50 translate-middle border border-2 border-info rounded-circle opacity-75"
              style={{ width: '180px', height: '180px', pointerEvents: 'none', borderStyle: 'dashed' }}
            />
          </div>
          <p className="text-info small mb-3 fw-semibold">{faceStatusText}</p>
          <Button
            variant="primary"
            onClick={executeFaceEnrollment}
            disabled={enrollingFace || !cameraActive}
            className="w-100 fw-bold py-2"
          >
            {enrollingFace
              ? <><span className="spinner-border spinner-border-sm me-2" />Capturing Biometrics...</>
              : 'Capture & Enroll Face Template'}
          </Button>
        </Modal.Body>
      </Modal>
    </div>
  );
}
