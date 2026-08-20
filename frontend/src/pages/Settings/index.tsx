import { useState, useCallback } from 'react';
import { Container, Card, Row, Col, Form, Button, Nav, Tab, Badge, Modal } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaCog, FaShieldAlt, FaBell, FaDatabase, FaSlidersH, 
  FaSave, FaCheckCircle, FaLock, FaUserShield,
  FaFingerprint, FaExclamationTriangle, FaSync, FaInfoCircle,
  FaHistory
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { updateFingerprint } from '../../utils/webauthn';

// ─────────────────────────────────────────────────────────────────────────────
// Biometric Update Modal
// ─────────────────────────────────────────────────────────────────────────────

interface BiometricUpdateModalProps {
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  hasExisting: boolean;
}

function BiometricUpdateModal({ show, onConfirm, onCancel, hasExisting }: BiometricUpdateModalProps) {
  return (
    <Modal show={show} onHide={onCancel} centered backdrop="static" keyboard={false}>
      <Modal.Header className="border-0 pb-0 pt-4 px-4">
        <div className="d-flex align-items-center gap-3 w-100">
          <div className="bg-warning bg-opacity-10 p-3 rounded-circle">
            <FaExclamationTriangle className="text-warning fs-4" />
          </div>
          <div>
            <Modal.Title className="fw-bold fs-6 text-dark">
              {hasExisting ? 'Replace Biometric Credential' : 'Register Biometric Credential'}
            </Modal.Title>
            <p className="text-muted small mb-0">
              {hasExisting ? 'This will permanently remove your existing credential.' : 'Register your fingerprint or passkey.'}
            </p>
          </div>
        </div>
      </Modal.Header>
      <Modal.Body className="px-4 pt-3 pb-2">
        {hasExisting && (
          <div className="alert alert-warning border-0 rounded-3 small d-flex gap-2 py-2 px-3 mb-3">
            <FaExclamationTriangle className="flex-shrink-0 mt-1" />
            <div>
              <strong>Your old fingerprint/passkey will be permanently revoked</strong> and replaced with
              the new one. You will need to use the new credential on your next login.
            </div>
          </div>
        )}

        <div className="bg-light rounded-3 p-3 mb-3">
          <p className="fw-bold small text-dark mb-2">What will happen:</p>
          <ul className="small text-muted mb-0 ps-3">
            <li>Windows Hello / Touch ID will prompt for biometric verification</li>
            <li>A new WebAuthn passkey will be generated on this device</li>
            {hasExisting && <li>Your existing biometric credential will be revoked immediately</li>}
            <li>A security audit log entry will be recorded</li>
            <li className="text-success fw-semibold">Your fingerprint image is <em>never</em> stored — only a cryptographic key</li>
          </ul>
        </div>

        <div className="alert alert-info border-0 rounded-3 small d-flex gap-2 py-2 px-3 mb-0">
          <FaInfoCircle className="flex-shrink-0 mt-1 text-info" />
          <div>
            <strong>Physical biometric verification</strong> is performed entirely by your operating system
            (Windows Hello / Touch ID). The browser cannot access your fingerprint sensor directly.
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="border-0 px-4 pb-4 pt-2 gap-2">
        <Button variant="outline-secondary" onClick={onCancel} className="rounded-3 fw-semibold px-4">
          Cancel
        </Button>
        <Button
          variant={hasExisting ? 'warning' : 'primary'}
          onClick={onConfirm}
          className="rounded-3 fw-bold px-4"
          id="btn-confirm-fingerprint-update"
        >
          <FaFingerprint className="me-2" />
          {hasExisting ? 'Yes, Replace Credential' : 'Register Fingerprint'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Windows-Hello-style overlay shown while navigator.credentials.create() is active
// ─────────────────────────────────────────────────────────────────────────────

interface BiometricWaitingOverlayProps {
  show: boolean;
}

function BiometricWaitingOverlay({ show }: BiometricWaitingOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="biometric-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
          style={{ zIndex: 1090, backgroundColor: 'rgba(15, 23, 42, 0.82)', backdropFilter: 'blur(10px)' }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white text-dark p-5 rounded-4 shadow-lg text-center"
            style={{ maxWidth: '420px', width: '90%' }}
          >
            <div
              className="bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center rounded-circle mb-4"
              style={{ width: '96px', height: '96px' }}
            >
              <FaFingerprint className="text-primary" style={{ fontSize: '3rem' }} />
            </div>

            <h5 className="fw-bold text-dark mb-2">Waiting for Windows Security...</h5>
            <p className="text-muted small mb-4">
              Complete hardware biometric verification using{' '}
              <strong>Windows Hello</strong>, <strong>Touch ID</strong>, or your{' '}
              <strong>FIDO2 security key</strong>.
            </p>

            <div className="d-flex align-items-center justify-content-center gap-2 text-primary fw-semibold small">
              <span className="spinner-border spinner-border-sm" />
              Awaiting OS fingerprint sensor response…
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Biometric Credential Management Card (Security tab)
// ─────────────────────────────────────────────────────────────────────────────

interface BiometricManagementCardProps {
  hasWebAuthn: boolean;
  onSuccess: () => void;
}

function BiometricManagementCard({ hasWebAuthn, onSuccess }: BiometricManagementCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [lastResult, setLastResult] = useState<{ revokedCount: number; isReplacement: boolean } | null>(null);

  const handleConfirm = useCallback(async () => {
    setShowModal(false);
    setWaiting(true);
    setLastResult(null);

    try {
      const result = await updateFingerprint();
      setWaiting(false);
      setLastResult({ revokedCount: result.revokedCount, isReplacement: result.isReplacement });
      toast.success('✅ New fingerprint/passkey registered successfully.', { autoClose: 5000 });
      onSuccess(); // Refresh user profile in AuthContext
    } catch (err: any) {
      setWaiting(false);
      const msg: string = err?.message || 'Unable to register the new credential.';

      if (msg.includes('cancelled')) {
        toast.warn('⚠️ Biometric registration cancelled.', { autoClose: 4000 });
      } else if (msg.includes('not supported') || msg.includes('not supported on this')) {
        toast.error('❌ This authenticator is not supported on this device.', { autoClose: 5000 });
      } else if (msg.includes('verification failed')) {
        toast.error('❌ Biometric verification failed. Please try again.', { autoClose: 5000 });
      } else if (msg.includes('Authentication required')) {
        toast.error('🔒 Session expired. Please log out and log in again.', { autoClose: 5000 });
      } else {
        toast.error(`❌ ${msg}`, { autoClose: 5000 });
      }
    }
  }, [onSuccess]);

  return (
    <>
      <BiometricWaitingOverlay show={waiting} />
      <BiometricUpdateModal
        show={showModal}
        onConfirm={handleConfirm}
        onCancel={() => setShowModal(false)}
        hasExisting={hasWebAuthn}
      />

      <Card className="border rounded-3 bg-light p-0 overflow-hidden">
        {/* Card header strip */}
        <div
          className="d-flex align-items-center gap-3 px-4 py-3"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
          }}
        >
          <div className="p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', width: '40px', height: '40px' }}>
            <FaFingerprint className="text-white fs-5" />
          </div>
          <div>
            <div className="fw-bold text-white">Biometric Credential Management</div>
            <div className="text-white small" style={{ opacity: 0.8 }}>
              WebAuthn passkey — Windows Hello / Touch ID / FIDO2
            </div>
          </div>
          <div className="ms-auto">
            <Badge
              bg={hasWebAuthn ? 'success' : 'secondary'}
              className="rounded-pill px-3 py-2"
            >
              {hasWebAuthn ? '✓ Registered' : 'Not Registered'}
            </Badge>
          </div>
        </div>

        <div className="p-4">
          {/* Success result banner */}
          {lastResult && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="alert alert-success border-0 rounded-3 d-flex align-items-start gap-2 small py-2 px-3 mb-3"
            >
              <FaCheckCircle className="text-success flex-shrink-0 mt-1" />
              <div>
                <strong>New biometric credential registered successfully.</strong>
                {lastResult.isReplacement && (
                  <span className="text-muted">
                    {' '}({lastResult.revokedCount} old credential{lastResult.revokedCount !== 1 ? 's' : ''} revoked.)
                  </span>
                )}
                <br />
                <span className="text-muted">
                  A security audit log entry has been recorded for this change.
                </span>
              </div>
            </motion.div>
          )}

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <div className="d-flex flex-column gap-1">
                <span className="small fw-bold text-dark">Current Status</span>
                <div className="d-flex align-items-center gap-2">
                  <FaFingerprint className={hasWebAuthn ? 'text-success' : 'text-muted'} />
                  <span className="small text-muted">
                    {hasWebAuthn
                      ? 'Platform biometric credential is active'
                      : 'No biometric credential registered yet'}
                  </span>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="d-flex flex-column gap-1">
                <span className="small fw-bold text-dark">User Verification</span>
                <div className="d-flex align-items-center gap-2">
                  <FaLock className="text-primary" />
                  <span className="small text-muted">Required (hardware-enforced)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 mb-1">
            <FaInfoCircle className="text-muted small" />
            <span className="text-muted" style={{ fontSize: '0.78rem' }}>
              Your fingerprint image is <strong>never stored</strong>. Only a cryptographic public key
              is saved. Biometric verification is performed entirely by your OS.
            </span>
          </div>
        </div>

        <div
          className="d-flex align-items-center gap-3 px-4 py-3 border-top"
          style={{ backgroundColor: '#f8fafc' }}
        >
          <Button
            variant={hasWebAuthn ? 'outline-warning' : 'primary'}
            className="fw-bold rounded-3 d-flex align-items-center gap-2"
            onClick={() => setShowModal(true)}
            disabled={waiting}
            id="btn-update-fingerprint"
          >
            {waiting ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              <FaSync />
            )}
            {hasWebAuthn ? 'Update / Replace Fingerprint' : 'Register Fingerprint'}
          </Button>

          {hasWebAuthn && (
            <span className="text-muted small d-flex align-items-center gap-1">
              <FaHistory className="text-muted" />
              Replaces existing credential and logs the change
            </span>
          )}
        </div>
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Settings Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Settings() {
  const { user, refreshUserProfile } = useAuth();

  const [settings, setSettings] = useState({
    // General System Settings
    hospitalName: 'General Oncology Medical Center',
    defaultModel: 'densenet121',
    confidenceThreshold: 85,
    autoSaveReports: true,
    
    // Security & Biometrics
    enforce3FA: true,
    sessionTimeout: 30,
    faceMatchThreshold: 0.70,
    webauthnHardwareOnly: true,

    // Notifications
    emailAlerts: true,
    criticalRiskNotifications: true,
    weeklyAuditReport: false,

    // UI Theme & Display
    themeMode: 'light',
    compactDensity: false,
    enableAnimations: true
  });

  const handleChange = (e: React.ChangeEvent<any>) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('system_settings', JSON.stringify(settings));
    toast.success('✅ System & Security preferences saved successfully!');
  };

  // Called after a successful fingerprint update to refresh has_webauthn_registered in context
  const handleBiometricSuccess = useCallback(async () => {
    await refreshUserProfile();
  }, [refreshUserProfile]);

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
        <div>
          <h2 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
            <FaCog className="text-primary" /> System Settings &amp; Preferences
          </h2>
          <p className="text-muted small mb-0">Manage clinical AI parameters, biometric 3FA security, and system preferences</p>
        </div>
        <Button variant="primary" onClick={handleSave} className="fw-bold d-flex align-items-center gap-2 shadow-sm">
          <FaSave /> Save Configuration
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Tab.Container defaultActiveKey="security">
          <Row className="g-4">
            <Col md={3}>
              <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                <Card.Body className="p-2">
                  <Nav variant="pills" className="flex-column nav-pills-custom">
                    <Nav.Item className="mb-1">
                      <Nav.Link eventKey="security" className="d-flex align-items-center gap-2 py-3 px-3 rounded-3 fw-semibold">
                        <FaShieldAlt className="fs-5 text-primary" /> Security &amp; 3FA
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item className="mb-1">
                      <Nav.Link eventKey="ai_inference" className="d-flex align-items-center gap-2 py-3 px-3 rounded-3 fw-semibold">
                        <FaSlidersH className="fs-5 text-success" /> AI Model Parameters
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item className="mb-1">
                      <Nav.Link eventKey="notifications" className="d-flex align-items-center gap-2 py-3 px-3 rounded-3 fw-semibold">
                        <FaBell className="fs-5 text-warning" /> Notifications &amp; Alerts
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="system" className="d-flex align-items-center gap-2 py-3 px-3 rounded-3 fw-semibold">
                        <FaDatabase className="fs-5 text-info" /> Clinical Workstation
                      </Nav.Link>
                    </Nav.Item>
                  </Nav>
                </Card.Body>
              </Card>
            </Col>

            <Col md={9}>
              <Tab.Content>
                {/* ── Security & 3FA Settings ── */}
                <Tab.Pane eventKey="security">
                  <Card className="border-0 shadow-sm rounded-4">
                    <Card.Header className="bg-white border-0 pt-4 px-4">
                      <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                        <FaUserShield className="text-primary" /> Enterprise Security &amp; Biometric Policy
                      </h5>
                      <p className="text-muted small mb-0">Configure authentication policies, lockout rules, and biometric matching parameters.</p>
                    </Card.Header>
                    <Card.Body className="p-4">
                      <Form onSubmit={handleSave}>
                        <Row className="g-4 mb-4">
                          <Col md={6}>
                            <Card className="border rounded-3 bg-light p-3">
                              <Form.Check 
                                type="switch"
                                id="enforce3FA"
                                name="enforce3FA"
                                label={<span className="fw-bold text-dark">Enforce Mandatory 3FA Login</span>}
                                checked={settings.enforce3FA}
                                onChange={handleChange}
                              />
                              <p className="text-muted small mb-0 mt-1">Requires Password + Facial Cosine Match + WebAuthn Passkey for access.</p>
                            </Card>
                          </Col>

                          <Col md={6}>
                            <Card className="border rounded-3 bg-light p-3">
                              <Form.Check 
                                type="switch"
                                id="webauthnHardwareOnly"
                                name="webauthnHardwareOnly"
                                label={<span className="fw-bold text-dark">Hardware Enclave Isolation (TPM/FIDO2)</span>}
                                checked={settings.webauthnHardwareOnly}
                                onChange={handleChange}
                              />
                              <p className="text-muted small mb-0 mt-1">Isolate passkey verification to Windows Hello / Secure Enclave hardware.</p>
                            </Card>
                          </Col>

                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-bold small text-muted">Facial Verification Match Threshold ({settings.faceMatchThreshold})</Form.Label>
                              <Form.Range 
                                min={0.50} 
                                max={0.90} 
                                step={0.05} 
                                name="faceMatchThreshold"
                                value={settings.faceMatchThreshold}
                                onChange={handleChange}
                              />
                              <div className="d-flex justify-content-between small text-muted">
                                <span>0.50 (Lenient)</span>
                                <span className="fw-bold text-primary">0.70 (Recommended)</span>
                                <span>0.90 (Strict)</span>
                              </div>
                            </Form.Group>
                          </Col>

                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-bold small text-muted">Inactivity Session Timeout (Minutes)</Form.Label>
                              <Form.Select 
                                name="sessionTimeout"
                                value={settings.sessionTimeout}
                                onChange={handleChange}
                                className="bg-light"
                              >
                                <option value={15}>15 Minutes</option>
                                <option value={30}>30 Minutes (Recommended)</option>
                                <option value={60}>60 Minutes</option>
                                <option value={120}>2 Hours</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        </Row>

                        {/* ─── Biometric Credential Management ─── */}
                        <div className="mb-4">
                          <div className="d-flex align-items-center gap-2 mb-3">
                            <FaFingerprint className="text-primary fs-5" />
                            <h6 className="fw-bold text-dark mb-0">Biometric Credential Management</h6>
                          </div>

                          <BiometricManagementCard
                            hasWebAuthn={!!user?.has_webauthn_registered}
                            onSuccess={handleBiometricSuccess}
                          />
                        </div>

                        <div className="d-flex justify-content-end border-top pt-3">
                          <Button type="submit" variant="primary" className="fw-bold px-4">
                            <FaSave className="me-2" /> Save Security Policy
                          </Button>
                        </div>
                      </Form>
                    </Card.Body>
                  </Card>
                </Tab.Pane>

                {/* ── AI Model Parameters ── */}
                <Tab.Pane eventKey="ai_inference">
                  <Card className="border-0 shadow-sm rounded-4">
                    <Card.Header className="bg-white border-0 pt-4 px-4">
                      <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                        <FaSlidersH className="text-success" /> AI Diagnostic Inference &amp; XAI Settings
                      </h5>
                      <p className="text-muted small mb-0">Select default model architectures, confidence thresholds, and Grad-CAM parameters.</p>
                    </Card.Header>
                    <Card.Body className="p-4">
                      <Form onSubmit={handleSave}>
                        <Row className="g-4 mb-4">
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-bold small text-muted">Default Deep Learning Architecture</Form.Label>
                              <Form.Select 
                                name="defaultModel"
                                value={settings.defaultModel}
                                onChange={handleChange}
                                className="bg-light"
                              >
                                <option value="densenet121">DenseNet121 (Highest Accuracy - 98.3% Lung / 97.9% Breast)</option>
                                <option value="resnet50">ResNet50 (Standard Clinical Benchmark)</option>
                                <option value="efficientnetb0">EfficientNetB0 (Fast Light-weight Model)</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>

                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-bold small text-muted">Clinical High-Confidence Threshold ({settings.confidenceThreshold}%)</Form.Label>
                              <Form.Range 
                                min={70} 
                                max={95} 
                                step={1}
                                name="confidenceThreshold"
                                value={settings.confidenceThreshold}
                                onChange={handleChange}
                              />
                              <div className="d-flex justify-content-between small text-muted">
                                <span>70%</span>
                                <span className="fw-bold text-success">85% Threshold</span>
                                <span>95%</span>
                              </div>
                            </Form.Group>
                          </Col>

                          <Col md={12}>
                            <Card className="border rounded-3 bg-light p-3">
                              <Form.Check 
                                type="switch"
                                id="autoSaveReports"
                                name="autoSaveReports"
                                label={<span className="fw-bold text-dark">Automatically Save Diagnostic Scans &amp; Grad-CAM Heatmaps</span>}
                                checked={settings.autoSaveReports}
                                onChange={handleChange}
                              />
                              <p className="text-muted small mb-0 mt-1">Saves all uploaded histopathological images, diagnostic probabilities, and XAI heatmaps directly to PostgreSQL report history.</p>
                            </Card>
                          </Col>
                        </Row>

                        <div className="d-flex justify-content-end border-top pt-3">
                          <Button type="submit" variant="primary" className="fw-bold px-4">
                            <FaSave className="me-2" /> Save AI Configuration
                          </Button>
                        </div>
                      </Form>
                    </Card.Body>
                  </Card>
                </Tab.Pane>

                {/* ── Notifications ── */}
                <Tab.Pane eventKey="notifications">
                  <Card className="border-0 shadow-sm rounded-4">
                    <Card.Header className="bg-white border-0 pt-4 px-4">
                      <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                        <FaBell className="text-warning" /> Notification Preferences
                      </h5>
                      <p className="text-muted small mb-0">Configure alerts for critical malignant diagnosis reports and security audit logs.</p>
                    </Card.Header>
                    <Card.Body className="p-4">
                      <Form onSubmit={handleSave}>
                        <div className="d-flex flex-column gap-3 mb-4">
                          <Card className="border rounded-3 bg-light p-3">
                            <Form.Check 
                              type="switch"
                              id="criticalRiskNotifications"
                              name="criticalRiskNotifications"
                              label={<span className="fw-bold text-dark">High-Risk Malignant Alerts</span>}
                              checked={settings.criticalRiskNotifications}
                              onChange={handleChange}
                            />
                            <p className="text-muted small mb-0 mt-1">Send immediate alert notifications when an AI scan detects high-confidence malignant carcinoma.</p>
                          </Card>

                          <Card className="border rounded-3 bg-light p-3">
                            <Form.Check 
                              type="switch"
                              id="emailAlerts"
                              name="emailAlerts"
                              label={<span className="fw-bold text-dark">Email Diagnostic Summaries</span>}
                              checked={settings.emailAlerts}
                              onChange={handleChange}
                            />
                            <p className="text-muted small mb-0 mt-1">Email copy of generated clinical diagnostic PDF reports to attending oncologist.</p>
                          </Card>

                          <Card className="border rounded-3 bg-light p-3">
                            <Form.Check 
                              type="switch"
                              id="weeklyAuditReport"
                              name="weeklyAuditReport"
                              label={<span className="fw-bold text-dark">Weekly Security Audit Digest</span>}
                              checked={settings.weeklyAuditReport}
                              onChange={handleChange}
                            />
                            <p className="text-muted small mb-0 mt-1">Send weekly summary of account logins, biometric authentication attempts, and audit logs.</p>
                          </Card>
                        </div>

                        <div className="d-flex justify-content-end border-top pt-3">
                          <Button type="submit" variant="primary" className="fw-bold px-4">
                            <FaSave className="me-2" /> Save Notification Settings
                          </Button>
                        </div>
                      </Form>
                    </Card.Body>
                  </Card>
                </Tab.Pane>

                {/* ── Workstation & Clinical Settings ── */}
                <Tab.Pane eventKey="system">
                  <Card className="border-0 shadow-sm rounded-4">
                    <Card.Header className="bg-white border-0 pt-4 px-4">
                      <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                        <FaDatabase className="text-info" /> Clinical Workstation &amp; Facility Info
                      </h5>
                      <p className="text-muted small mb-0">Set hospital branding, report headers, and workstation UI options.</p>
                    </Card.Header>
                    <Card.Body className="p-4">
                      <Form onSubmit={handleSave}>
                        <Row className="g-4 mb-4">
                          <Col md={12}>
                            <Form.Group>
                              <Form.Label className="fw-bold small text-muted">Hospital / Clinical Facility Header Name</Form.Label>
                              <Form.Control 
                                type="text"
                                name="hospitalName"
                                value={settings.hospitalName}
                                onChange={handleChange}
                                className="bg-light"
                                required
                              />
                              <Form.Text className="text-muted">This header name appears on generated patient PDF clinical reports.</Form.Text>
                            </Form.Group>
                          </Col>

                          <Col md={6}>
                            <Card className="border rounded-3 bg-light p-3">
                              <Form.Check 
                                type="switch"
                                id="enableAnimations"
                                name="enableAnimations"
                                label={<span className="fw-bold text-dark">Enable UI Animations &amp; Micro-transitions</span>}
                                checked={settings.enableAnimations}
                                onChange={handleChange}
                              />
                              <p className="text-muted small mb-0 mt-1">Enable Framer Motion page transitions and card hover animations.</p>
                            </Card>
                          </Col>
                        </Row>

                        <div className="d-flex justify-content-end border-top pt-3">
                          <Button type="submit" variant="primary" className="fw-bold px-4">
                            <FaSave className="me-2" /> Save Workstation Settings
                          </Button>
                        </div>
                      </Form>
                    </Card.Body>
                  </Card>
                </Tab.Pane>

              </Tab.Content>
            </Col>
          </Row>
        </Tab.Container>
      </motion.div>
    </Container>
  );
}
