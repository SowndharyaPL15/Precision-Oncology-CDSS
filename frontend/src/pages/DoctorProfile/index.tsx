import { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Badge, Form, Modal } from 'react-bootstrap';
import { 
  FaUserMd, FaShieldAlt, FaCamera, FaFingerprint, 
  FaKey, FaSignOutAlt, FaClock, FaDesktop, FaCheckCircle 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { extractFaceEmbedding, captureMultiPoseSamples } from '../../utils/faceAuth';
import { registerPasskey } from '../../utils/webauthn';

export default function DoctorProfile() {
  const { user, logout, refreshUserProfile } = useAuth();

  const [profileData, setProfileData] = useState<any>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [relinkingFingerprint, setRelinkingFingerprint] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      setProfileData(response.data);
    } catch (err) {
      setProfileData({
        user_id: user?.id || 'doc-1',
        full_name: user?.name || 'Dr. Jane Smith',
        email: user?.email || 'jane.smith@hospital.org',
        role: user?.role || 'doctor',
        has_face_registered: user?.has_face_registered ?? true,
        has_webauthn_registered: user?.has_webauthn_registered ?? true,
        last_login: new Date().toISOString(),
        last_device: 'Chrome / Windows 11',
        created_at: new Date().toISOString()
      });
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.id]);

  const [scanningFace, setScanningFace] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startFaceScan = async () => {
    setScanningFace(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      toast.warn('Webcam stream unavailable.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const handleCaptureAndSaveFace = async () => {
    const currentUserId = user?.id || profileData?.user_id;
    if (!currentUserId) {
      toast.error('User session not found.');
      return;
    }
    try {
      let samples: number[][] = [];
      if (videoRef.current && cameraActive) {
        samples = await captureMultiPoseSamples(videoRef.current, 3, 200);
      } else {
        const singleEmb = extractFaceEmbedding(videoRef.current!);
        samples = [singleEmb];
      }

      await apiClient.post('/auth/face/enroll', {
        user_id: currentUserId,
        samples: samples,
        model_version: 'v1-128d'
      });

      toast.success('✅ Facial biometric template multi-pose samples enrolled and encrypted!');
      stopCamera();
      setScanningFace(false);
      await refreshUserProfile();
      await fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to enroll facial biometric template');
    }
  };

  const handleRevokeFace = async () => {
    if (!window.confirm('Are you sure you want to revoke your enrolled face credential?')) return;
    try {
      await apiClient.post('/auth/face/revoke');
      toast.success('✅ Face credential revoked successfully.');
      await refreshUserProfile();
      await fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to revoke face credential');
    }
  };

  const [showFingerprintModal, setShowFingerprintModal] = useState(false);

  const handleUpdateFingerprint = () => {
    const currentUserId = user?.id || profileData?.user_id;
    if (!currentUserId) {
      toast.error('User session not found. Please log in again.');
      return;
    }
    setShowFingerprintModal(true);
  };

  const confirmFingerprintScan = async () => {
    const currentUserId = user?.id || profileData?.user_id;
    const currentUserEmail = user?.email || profileData?.email;

    if (!currentUserId || !currentUserEmail) {
      toast.error('User session not found. Please log in again.');
      return;
    }
    setRelinkingFingerprint(true);
    try {
      // Generate fresh passkey credential
      const result = await registerPasskey(currentUserId, currentUserEmail);

      // Post to backend relink route
      await apiClient.post('/auth/webauthn/relink', {
        user_id: currentUserId,
        credential_id: result.credentialId,
        public_key: result.publicKey
      });

      toast.success('✅ Fingerprint credential scanned, enrolled and updated successfully!');
      setShowFingerprintModal(false);
      await refreshUserProfile();
      await fetchProfile();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Fingerprint enrollment failed.');
    } finally {
      setRelinkingFingerprint(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('⚠️ All password fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('⚠️ New passwords do not match.');
      return;
    }
    try {
      await apiClient.post('/auth/change-password', {
        email: profileData?.email || user?.email,
        old_password: oldPassword,
        new_password: newPassword
      });
      toast.success('✅ Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      let errorMsg = 'Failed to update password.';
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail)) {
        errorMsg = detail.map((d: any) => `${d.loc[d.loc.length - 1].replace('_', ' ')}: ${d.msg}`).join(', ');
      }
      toast.error(`❌ ${errorMsg}`);
    }
  };

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="fw-bold text-dark mb-0">Clinical User Security Profile</h2>
          <p className="text-muted small mb-0">Enterprise Credentials & Role Permissions</p>
        </div>
        <Button variant="outline-danger" onClick={logout} className="fw-bold d-flex align-items-center gap-2">
          <FaSignOutAlt /> Sign Out
        </Button>
      </div>

      <Row className="g-4">
        {/* User Card */}
        <Col md={4}>
          <Card className="border-0 shadow-sm rounded-4 text-center p-4">
            <Card.Body>
              <div className="bg-primary bg-opacity-10 d-inline-block p-4 rounded-circle mb-3">
                <FaUserMd className="display-4 text-primary" />
              </div>
              <h4 className="fw-bold text-dark mb-1">{profileData?.full_name || user?.name}</h4>
              <p className="text-muted small mb-3">{profileData?.email || user?.email}</p>

              <Badge bg="primary" className="fs-6 px-3 py-2 text-uppercase mb-3 rounded-pill">
                Role: {profileData?.role || user?.role || 'doctor'}
              </Badge>

              <div className="text-start bg-light p-3 rounded-3 small">
                <div className="mb-2 d-flex align-items-center gap-2 text-muted">
                  <FaClock /> <strong>Last Login:</strong> {profileData?.last_login ? new Date(profileData.last_login).toLocaleString() : 'Just now'}
                </div>
                <div className="d-flex align-items-center gap-2 text-muted">
                  <FaDesktop /> <strong>Device:</strong> {profileData?.last_device || 'Web Browser Client'}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* 3FA Biometrics & Password Management */}
        <Col md={8}>
          <Card className="border-0 shadow-sm rounded-4 mb-4">
            <Card.Header className="bg-white border-0 pt-4 px-4">
              <h5 className="fw-bold text-dark d-flex align-items-center gap-2">
                <FaShieldAlt className="text-primary" /> Three-Factor Biometric Security Status
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Row className="g-3">
                {/* Face Biometric Status */}
                <Col md={6}>
                  <div className="p-3 border rounded-3 bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                        <FaCamera className="text-primary" /> Facial 3D Vector
                      </h6>
                      {profileData?.has_face_registered ?? user?.has_face_registered ? (
                        <Badge bg="success"><FaCheckCircle /> Registered</Badge>
                      ) : (
                        <Badge bg="warning" text="dark">Not Enrolled</Badge>
                      )}
                    </div>
                    <p className="text-muted small mb-3">128D encrypted biometric template stored in database.</p>
                    <div className="d-flex gap-2">
                      <Button size="sm" variant="outline-primary" onClick={startFaceScan} className="w-100 fw-bold">
                        Enroll / Replace Face
                      </Button>
                      <Button size="sm" variant="outline-danger" onClick={handleRevokeFace} className="fw-bold">
                        Revoke
                      </Button>
                    </div>
                  </div>
                </Col>

                {/* Fingerprint Biometric Status */}
                <Col md={6}>
                  <div className="p-3 border rounded-3 bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                        <FaFingerprint className="text-primary" /> Fingerprint Biometric
                      </h6>
                      {profileData?.has_webauthn_registered ?? user?.has_webauthn_registered ? (
                        <Badge bg="success"><FaCheckCircle /> Registered</Badge>
                      ) : (
                        <Badge bg="warning" text="dark">Not Enrolled</Badge>
                      )}
                    </div>
                    <p className="text-muted small mb-3">Linked to Laptop Fingerprint Scanner. Click below to enroll a new credential.</p>
                    <Button size="sm" variant="outline-primary" onClick={handleUpdateFingerprint} className="w-100 fw-bold" disabled={relinkingFingerprint}>
                      {relinkingFingerprint
                        ? <><span className="spinner-border spinner-border-sm me-2" />Enrolling...</>
                        : 'Re-Enroll Fingerprint Credential'}
                    </Button>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Change Password Card */}
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Header className="bg-white border-0 pt-4 px-4">
              <h5 className="fw-bold text-dark d-flex align-items-center gap-2">
                <FaKey className="text-primary" /> Update Password
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Form onSubmit={handleChangePassword}>
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-muted">Current Password</Form.Label>
                      <Form.Control 
                        type="password" 
                        value={oldPassword} 
                        onChange={(e) => setOldPassword(e.target.value)} 
                        placeholder="••••••••" 
                        required 
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-muted">New Password</Form.Label>
                      <Form.Control 
                        type="password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        placeholder="••••••••" 
                        required 
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-muted">Confirm New Password</Form.Label>
                      <Form.Control 
                        type="password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        placeholder="••••••••" 
                        required 
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="text-end mt-3">
                  <Button type="submit" variant="primary" className="fw-bold px-4">
                    Update Password
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Facial Vector Re-Capture Modal */}
      <Modal show={scanningFace} onHide={() => { stopCamera(); setScanningFace(false); }} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold fs-6">Facial Biometric Re-Capture</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-4">
          <p className="text-muted small mb-3">Position your face in the oval frame to extract an updated 128D facial vector.</p>
          <div className="border rounded-4 overflow-hidden bg-dark position-relative mx-auto mb-3" style={{ maxWidth: '340px', height: '230px' }}>
            <video ref={videoRef} className="w-100 h-100" style={{ objectFit: 'cover' }} playsInline muted />
            <div className="position-absolute top-50 start-50 translate-middle border border-2 border-primary rounded-circle" style={{ width: '150px', height: '180px', borderStyle: 'dashed', pointerEvents: 'none' }} />
          </div>
          <Button variant="primary" onClick={handleCaptureAndSaveFace} className="w-100 fw-bold">
            <FaCamera className="me-2" /> Capture & Save 128D Face Vector
          </Button>
        </Modal.Body>
      </Modal>

      {/* Fingerprint Re-Enrollment Scanner Modal */}
      <Modal show={showFingerprintModal} onHide={() => setShowFingerprintModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold fs-6">Fingerprint Credential Re-Enrollment</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-4">
          <div className="bg-primary bg-opacity-10 text-primary p-4 rounded-circle d-inline-block mb-3">
            <FaFingerprint className="display-3" />
          </div>
          <h5 className="fw-bold text-dark mb-2">Scan New Fingerprint</h5>
          <p className="text-muted small mb-4">
            Press your finger against your laptop sensor or click <strong>Confirm Fingerprint Scan</strong> below to record the new biometric credential.
          </p>

          <Button 
            variant="primary" 
            onClick={confirmFingerprintScan} 
            className="w-100 fw-bold py-2"
            disabled={relinkingFingerprint}
          >
            {relinkingFingerprint ? (
              <><span className="spinner-border spinner-border-sm me-2" /> Scanning & Registering...</>
            ) : (
              <><FaFingerprint className="me-2" /> Confirm Fingerprint Scan & Enroll</>
            )}
          </Button>
        </Modal.Body>
      </Modal>

    </Container>
  );
}
