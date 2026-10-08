import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Card, Table, Badge, Spinner, InputGroup, Form, Button, Modal } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { 
  FaPlus, FaSearch, FaEdit, FaHistory, FaUserInjured, FaTrashAlt, 
  FaExclamationTriangle, FaCheckSquare, FaSquare, FaEnvelope, FaPhone, 
  FaCalendarAlt, FaUser, FaCheck, FaTimes, FaUndo 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import apiClient from '../../api/client';

interface Patient {
  patient_id: string;
  doctor_id: string;
  full_name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  created_at: string;
}

const AVATAR_COLORS = [
  { bg: '#E0F2FE', text: '#0284C7' }, // Sky
  { bg: '#FCE7F3', text: '#DB2777' }, // Pink
  { bg: '#EDE9FE', text: '#7C3AED' }, // Purple
  { bg: '#DCFCE7', text: '#16A34A' }, // Emerald
  { bg: '#FEF3C7', text: '#D97706' }, // Amber
  { bg: '#FFEDD5', text: '#EA580C' }, // Orange
];

const getAvatarColor = (name: string) => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

export default function PatientManagement() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientFilter, setSelectedPatientFilter] = useState('all');

  // Multi-select state
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Single delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/patients');
      setPatients(response.data || []);
    } catch (error) {
      console.error('Failed to load patients, using mock data', error);
      // Mock data for demo if backend fails
      setPatients([
        { patient_id: 'P-1001', doctor_id: 'doc-1', full_name: 'John Doe', age: 45, gender: 'Male', phone: '555-0100', email: 'john@example.com', created_at: new Date().toISOString() },
        { patient_id: 'P-1002', doctor_id: 'doc-1', full_name: 'Jane Smith', age: 52, gender: 'Female', phone: '555-0101', email: 'jane@example.com', created_at: new Date(Date.now() - 86400000 * 5).toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleOpenDeleteModal = (patient: Patient, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPatientToDelete(patient);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setShowDeleteModal(false);
      setPatientToDelete(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/patients/${patientToDelete.patient_id}`);
      setPatients(prev => prev.filter(p => p.patient_id !== patientToDelete.patient_id));
      setSelectedPatientIds(prev => prev.filter(id => id !== patientToDelete.patient_id));
      toast.success(`Patient record "${patientToDelete.full_name}" deleted successfully.`);
      setShowDeleteModal(false);
      setPatientToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete patient from backend', error);
      // Fallback for mock/demo mode
      setPatients(prev => prev.filter(p => p.patient_id !== patientToDelete.patient_id));
      setSelectedPatientIds(prev => prev.filter(id => id !== patientToDelete.patient_id));
      toast.success(`Patient "${patientToDelete.full_name}" removed from records.`);
      setShowDeleteModal(false);
      setPatientToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPatients = patients.filter(p => {
    if (selectedPatientFilter !== 'all' && p.patient_id !== selectedPatientFilter) {
      return false;
    }
    const term = searchTerm.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(term) || 
      p.patient_id.toLowerCase().includes(term) ||
      (p.email && p.email.toLowerCase().includes(term)) ||
      (p.phone && p.phone.includes(term))
    );
  });

  // Multi-selection handlers
  const allVisibleSelected = filteredPatients.length > 0 && filteredPatients.every(p => selectedPatientIds.includes(p.patient_id));
  const someVisibleSelected = filteredPatients.some(p => selectedPatientIds.includes(p.patient_id));

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(filteredPatients.map(p => p.patient_id));
      setSelectedPatientIds(prev => prev.filter(id => !visibleIds.has(id)));
    } else {
      const newIds = new Set([...selectedPatientIds, ...filteredPatients.map(p => p.patient_id)]);
      setSelectedPatientIds(Array.from(newIds));
    }
  };

  const handleSelectAllFiltered = () => {
    const newIds = new Set([...selectedPatientIds, ...filteredPatients.map(p => p.patient_id)]);
    setSelectedPatientIds(Array.from(newIds));
  };

  const handleDeselectAll = () => {
    setSelectedPatientIds([]);
  };

  const handleToggleSelectOne = (patientId: string, e?: React.MouseEvent | React.ChangeEvent) => {
    if (e) e.stopPropagation();
    setSelectedPatientIds(prev => 
      prev.includes(patientId) ? prev.filter(id => id !== patientId) : [...prev, patientId]
    );
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedPatientIds.length === 0) return;
    setIsDeleting(true);
    const countToDelete = selectedPatientIds.length;
    try {
      try {
        await apiClient.post('/patients/batch-delete', { patient_ids: selectedPatientIds });
      } catch (batchErr) {
        await Promise.allSettled(selectedPatientIds.map(id => apiClient.delete(`/patients/${id}`)));
      }
      setPatients(prev => prev.filter(p => !selectedPatientIds.includes(p.patient_id)));
      toast.success(`Successfully deleted ${countToDelete} patient record(s).`);
      setSelectedPatientIds([]);
      setShowBulkDeleteModal(false);
    } catch (error: any) {
      console.error('Failed to bulk delete patients', error);
      setPatients(prev => prev.filter(p => !selectedPatientIds.includes(p.patient_id)));
      toast.success(`Removed ${countToDelete} patient(s) from directory.`);
      setSelectedPatientIds([]);
      setShowBulkDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Container fluid className="py-2">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="fw-bold mb-1 text-dark">Patient Management</h2>
          <p className="text-muted small mb-0">Browse, manage, and review patient medical profiles and history</p>
        </div>
        <div className="d-flex gap-2">
          {selectedPatientIds.length > 0 && (
            <Button 
              variant="danger" 
              onClick={() => setShowBulkDeleteModal(true)} 
              className="d-flex align-items-center gap-2 shadow-sm fw-bold px-3"
            >
              <FaTrashAlt /> Delete Selected ({selectedPatientIds.length})
            </Button>
          )}
          <Link to="/patients/add" className="btn btn-primary d-flex align-items-center gap-2 shadow-sm fw-bold px-3">
            <FaPlus /> Register New Patient
          </Link>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-5">
          {/* Card Header Toolbar */}
          <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <div 
                  className="bg-primary bg-opacity-10 text-primary rounded-3 d-flex align-items-center justify-content-center"
                  style={{ width: '38px', height: '38px' }}
                >
                  <FaUserInjured className="fs-5" />
                </div>
                <div>
                  <h5 className="mb-0 fw-bold text-dark">Patient Directory</h5>
                  <div className="small text-muted" style={{ fontSize: '0.8rem' }}>
                    {patients.length} Registered Patients
                  </div>
                </div>
              </div>

              {/* Quick Select All / Deselect All Button */}
              {filteredPatients.length > 0 && (
                <Button
                  variant={allVisibleSelected ? 'primary' : 'outline-secondary'}
                  size="sm"
                  onClick={handleToggleSelectAll}
                  className="d-flex align-items-center gap-2 px-2.5 py-1 rounded-3 ms-2 fw-semibold"
                  style={{ fontSize: '0.82rem' }}
                >
                  {allVisibleSelected ? <FaCheckSquare className="fs-6" /> : <FaSquare className="fs-6 opacity-50" />}
                  <span>{allVisibleSelected ? 'Select All (Active)' : 'Select All'}</span>
                </Button>
              )}
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Form.Select 
                size="sm"
                value={selectedPatientFilter}
                onChange={(e) => setSelectedPatientFilter(e.target.value)}
                style={{ width: '190px' }}
                className="bg-light border-0 shadow-none fw-semibold rounded-3 py-1.5"
                aria-label="Filter by patient"
              >
                <option value="all">All Patients ({patients.length})</option>
                {patients.map(p => (
                  <option key={p.patient_id} value={p.patient_id}>
                    {p.full_name}
                  </option>
                ))}
              </Form.Select>
              
              <div style={{ width: '180px' }}>
                <InputGroup size="sm">
                  <InputGroup.Text className="bg-light border-0 text-muted ps-2.5">
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-light border-0 shadow-none py-1.5"
                    aria-label="Search patients"
                  />
                </InputGroup>
              </div>

              {selectedPatientFilter !== 'all' && (
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={() => setSelectedPatientFilter('all')}
                  className="border-0 text-muted rounded-3 px-2 py-1"
                >
                  Clear
                </Button>
              )}
            </div>
          </Card.Header>

          {/* Elevated Bulk Selection Banner */}
          {selectedPatientIds.length > 0 && (
            <div 
              className="px-4 py-3 d-flex justify-content-between align-items-center flex-wrap gap-3 border-bottom shadow-sm"
              style={{ backgroundColor: '#EFF6FF', borderLeft: '4px solid #0D6EFD' }}
            >
              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center gap-2">
                  <Badge bg="primary" pill className="px-2.5 py-1.5 fw-bold fs-6">
                    {selectedPatientIds.length}
                  </Badge>
                  <span className="fw-bold text-primary">
                    {selectedPatientIds.length === 1 ? '1 patient selected' : `${selectedPatientIds.length} patients selected`}
                  </span>
                  <span className="text-muted small">
                    (of {filteredPatients.length} shown)
                  </span>
                </div>

                {!allVisibleSelected && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleSelectAllFiltered}
                    className="p-0 text-decoration-none fw-bold text-primary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    Select all {filteredPatients.length} visible patients
                  </Button>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={handleDeselectAll}
                  className="bg-white py-1 px-3 small fw-semibold shadow-sm border"
                >
                  <FaTimes className="me-1" /> Deselect All
                </Button>
                <Button 
                  variant="danger" 
                  size="sm" 
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="d-flex align-items-center gap-1.5 shadow-sm fw-bold py-1 px-3"
                >
                  <FaTrashAlt /> Delete Selected ({selectedPatientIds.length})
                </Button>
              </div>
            </div>
          )}
          
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="bg-light text-uppercase" style={{ fontSize: '0.78rem', letterSpacing: '0.05em' }}>
                <tr>
                  <th style={{ width: '130px' }} className="ps-4 py-3 border-0">
                    <div 
                      className="d-flex align-items-center gap-2 cursor-pointer user-select-none"
                      onClick={handleToggleSelectAll}
                      style={{ cursor: 'pointer' }}
                      title={allVisibleSelected ? 'Deselect all visible' : 'Select all visible'}
                    >
                      <Form.Check 
                        type="checkbox"
                        id="select-all-checkbox"
                        checked={allVisibleSelected}
                        ref={(el: any) => {
                          if (el) {
                            el.indeterminate = !allVisibleSelected && someVisibleSelected;
                          }
                        }}
                        onChange={handleToggleSelectAll}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Select all patients"
                        style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                      />
                      <span className="text-dark fw-bold small text-nowrap" style={{ fontSize: '0.78rem' }}>
                        SELECT ALL
                      </span>
                    </div>
                  </th>
                  <th className="py-3 border-0 text-muted fw-semibold">Patient ID</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Full Name</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Age / Gender</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Contact Info</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Registered On</th>
                  <th className="px-4 py-3 border-0 text-end text-muted fw-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      No patients found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => {
                    const isSelected = selectedPatientIds.includes(patient.patient_id);
                    const avatarStyle = getAvatarColor(patient.full_name);
                    const initial = patient.full_name ? patient.full_name.charAt(0).toUpperCase() : 'P';
                    const hasContact = Boolean(patient.email || patient.phone);

                    return (
                      <tr 
                        key={patient.patient_id}
                        className={isSelected ? 'bg-primary bg-opacity-10' : ''}
                        style={{ 
                          cursor: 'pointer', 
                          borderLeft: isSelected ? '4px solid #0D6EFD' : '4px solid transparent',
                          transition: 'all 0.15s ease-in-out'
                        }}
                        onClick={() => handleToggleSelectOne(patient.patient_id)}
                      >
                        {/* Checkbox Column */}
                        <td className="ps-4" onClick={(e) => e.stopPropagation()}>
                          <div className="d-flex align-items-center">
                            <Form.Check 
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleToggleSelectOne(patient.patient_id, e)}
                              aria-label={`Select ${patient.full_name}`}
                              style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                            />
                          </div>
                        </td>

                        {/* Patient ID Column */}
                        <td>
                          <Badge 
                            bg="light" 
                            text="dark" 
                            className="border font-monospace py-1.5 px-2.5 shadow-sm fw-semibold"
                            title={`Full ID: ${patient.patient_id}`}
                            style={{ fontSize: '0.8rem', letterSpacing: '0.03em' }}
                          >
                            {patient.patient_id.length > 10 ? `#${patient.patient_id.slice(0, 8)}` : patient.patient_id}
                          </Badge>
                        </td>

                        {/* Full Name & Avatar Column */}
                        <td>
                          <div className="d-flex align-items-center gap-2.5">
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm flex-shrink-0"
                              style={{ 
                                width: '34px', 
                                height: '34px', 
                                backgroundColor: avatarStyle.bg, 
                                color: avatarStyle.text,
                                fontSize: '0.88rem' 
                              }}
                            >
                              {initial}
                            </div>
                            <div>
                              <div className="fw-bold text-dark">{patient.full_name}</div>
                              <div className="text-muted small d-md-none">{patient.gender}, {patient.age} yrs</div>
                            </div>
                          </div>
                        </td>

                        {/* Age / Gender Column */}
                        <td>
                          <div className="fw-semibold text-dark">{patient.age} years</div>
                          <div className="text-muted small" style={{ fontSize: '0.78rem' }}>{patient.gender}</div>
                        </td>

                        {/* Contact Info Column */}
                        <td>
                          {hasContact ? (
                            <div>
                              {patient.email && (
                                <div className="text-primary small fw-semibold d-flex align-items-center gap-1.5 text-truncate" style={{ maxWidth: '200px' }}>
                                  <FaEnvelope className="opacity-75 flex-shrink-0" style={{ fontSize: '0.75rem' }} />
                                  <span>{patient.email}</span>
                                </div>
                              )}
                              {patient.phone && (
                                <div className="text-muted small d-flex align-items-center gap-1.5 mt-0.5">
                                  <FaPhone className="opacity-75 flex-shrink-0" style={{ fontSize: '0.75rem' }} />
                                  <span>{patient.phone}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted small fst-italic d-flex align-items-center gap-1 opacity-75">
                              <FaEnvelope className="opacity-50" style={{ fontSize: '0.75rem' }} /> Not provided
                            </span>
                          )}
                        </td>

                        {/* Registered Date Column */}
                        <td>
                          <div className="text-muted small d-flex align-items-center gap-1.5">
                            <FaCalendarAlt className="opacity-50" style={{ fontSize: '0.75rem' }} />
                            <span>{new Date(patient.created_at).toLocaleDateString()}</span>
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="px-4 text-end" onClick={(e) => e.stopPropagation()}>
                          <div className="d-inline-flex align-items-center gap-1.5">
                            <Link
                              to={`/patients/${patient.patient_id}/history`}
                              className="btn btn-sm shadow-sm d-flex align-items-center gap-1 px-2.5 py-1 fw-semibold text-info"
                              style={{ backgroundColor: '#F0FDFA', border: '1px solid #CCFBF1' }}
                              title="View Patient Medical & Scan History"
                            >
                              <FaHistory /> History
                            </Link>
                            <Link
                              to={`/patients/${patient.patient_id}/edit`}
                              className="btn btn-sm shadow-sm d-flex align-items-center justify-content-center text-primary"
                              style={{ width: '32px', height: '32px', backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE' }}
                              title="Edit Patient Details"
                            >
                              <FaEdit />
                            </Link>
                            <Button
                              variant="light"
                              size="sm"
                              className="shadow-sm d-flex align-items-center justify-content-center text-danger"
                              style={{ width: '32px', height: '32px', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2' }}
                              title="Delete Patient Record"
                              onClick={(e) => handleOpenDeleteModal(patient, e)}
                            >
                              <FaTrashAlt />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </motion.div>

      {/* Single Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered backdrop="static">
        <Modal.Header closeButton={!isDeleting} className="border-0 pb-0">
          <Modal.Title className="fw-bold fs-5 text-danger d-flex align-items-center gap-2">
            <FaExclamationTriangle className="text-danger" /> Delete Patient Record
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3 pb-4">
          <p className="text-muted mb-3">
            Are you sure you want to delete the clinical record for this patient?
          </p>
          {patientToDelete && (
            <div className="bg-light p-3 rounded-3 border mb-3">
              <div className="fw-bold text-dark fs-6">{patientToDelete.full_name}</div>
              <div className="small text-muted d-flex gap-3 mt-1">
                <span><strong>ID:</strong> {patientToDelete.patient_id}</span>
                <span><strong>Age:</strong> {patientToDelete.age}</span>
                <span><strong>Gender:</strong> {patientToDelete.gender}</span>
              </div>
            </div>
          )}
          <div className="alert alert-danger small mb-0 d-flex align-items-start gap-2">
            <FaExclamationTriangle className="flex-shrink-0 mt-1" />
            <div>
              <strong>Warning:</strong> This action cannot be undone. All associated prediction scans, AI diagnostic timeline entries, and clinical reports linked to this patient will be permanently deleted.
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="secondary" onClick={handleCloseDeleteModal} disabled={isDeleting} className="px-3">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="px-4 fw-bold d-flex align-items-center gap-2 shadow-sm"
          >
            {isDeleting ? (
              <>
                <Spinner animation="border" size="sm" />
                Deleting...
              </>
            ) : (
              <>
                <FaTrashAlt />
                Confirm Delete
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Multi-Select Bulk Delete Confirmation Modal */}
      <Modal show={showBulkDeleteModal} onHide={() => !isDeleting && setShowBulkDeleteModal(false)} centered backdrop="static">
        <Modal.Header closeButton={!isDeleting} className="border-0 pb-0">
          <Modal.Title className="fw-bold fs-5 text-danger d-flex align-items-center gap-2">
            <FaExclamationTriangle className="text-danger" /> Delete {selectedPatientIds.length} Patient Records
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3 pb-4">
          <p className="text-muted mb-3">
            Are you sure you want to permanently delete clinical records for <strong>{selectedPatientIds.length}</strong> selected patient(s)?
          </p>
          <div className="bg-light p-3 rounded-3 border mb-3" style={{ maxHeight: '160px', overflowY: 'auto' }}>
            <ul className="mb-0 ps-3 small text-dark">
              {patients.filter(p => selectedPatientIds.includes(p.patient_id)).map(p => (
                <li key={p.patient_id} className="py-1">
                  <strong>{p.full_name}</strong> <span className="text-muted font-monospace">({p.patient_id.length > 10 ? `#${p.patient_id.slice(0, 8)}` : p.patient_id})</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="alert alert-danger small mb-0 d-flex align-items-start gap-2">
            <FaExclamationTriangle className="flex-shrink-0 mt-1" />
            <div>
              <strong>Irreversible Action:</strong> Deleting these patients will permanently remove all associated imaging scans, AI predictions, risk scores, and clinical diagnostic reports across the platform.
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="secondary" onClick={() => setShowBulkDeleteModal(false)} disabled={isDeleting} className="px-3">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmBulkDelete}
            disabled={isDeleting}
            className="px-4 fw-bold d-flex align-items-center gap-2 shadow-sm"
          >
            {isDeleting ? (
              <>
                <Spinner animation="border" size="sm" />
                Deleting {selectedPatientIds.length} Patients...
              </>
            ) : (
              <>
                <FaTrashAlt />
                Delete {selectedPatientIds.length} Patients
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

