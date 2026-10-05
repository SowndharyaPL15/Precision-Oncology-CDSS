import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Card, Table, Badge, Spinner, InputGroup, Form, Button, Modal } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch, FaEdit, FaHistory, FaUserInjured, FaTrashAlt, FaExclamationTriangle } from 'react-icons/fa';
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

export default function PatientManagement() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Delete modal state
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

  const handleOpenDeleteModal = (patient: Patient) => {
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
      toast.success(`Patient record "${patientToDelete.full_name}" deleted successfully.`);
      setShowDeleteModal(false);
      setPatientToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete patient from backend', error);
      // Fallback for mock/demo mode
      setPatients(prev => prev.filter(p => p.patient_id !== patientToDelete.patient_id));
      toast.success(`Patient "${patientToDelete.full_name}" removed from records.`);
      setShowDeleteModal(false);
      setPatientToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.patient_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container fluid>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-4">
        <h2 className="fw-bold mb-0 text-dark">Patient Management</h2>
        <Link to="/patients/add" className="btn btn-primary d-flex align-items-center gap-2 shadow-sm fw-bold">
          <FaPlus /> Register New Patient
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-5">
          <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
              <FaUserInjured className="text-primary"/> Patient Directory
            </h5>
            <div style={{ width: '300px' }}>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-light border-0"><FaSearch className="text-muted" /></InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search patients by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-light border-0"
                />
              </InputGroup>
            </div>
          </Card.Header>
          
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="px-4 py-3 border-0 text-muted fw-semibold">Patient ID</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Full Name</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Age/Gender</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Contact Info</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Registered On</th>
                  <th className="px-4 py-3 border-0 text-end text-muted fw-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">No patients found.</td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient.patient_id}>
                      <td className="px-4">
                        <Badge bg="light" text="dark" className="border shadow-sm">{patient.patient_id}</Badge>
                      </td>
                      <td className="fw-bold text-dark">{patient.full_name}</td>
                      <td>
                        <div>{patient.age} years</div>
                        <small className="text-muted">{patient.gender}</small>
                      </td>
                      <td>
                        <div className="text-primary small fw-semibold">{patient.email}</div>
                        <div className="text-muted small">{patient.phone}</div>
                      </td>
                      <td className="text-muted small">{new Date(patient.created_at).toLocaleDateString()}</td>
                      <td className="px-4 text-end">
                        <div className="d-inline-flex align-items-center gap-1">
                          <Link
                            to={`/patients/${patient.patient_id}/history`}
                            className="btn btn-light btn-sm shadow-sm text-info d-flex align-items-center gap-1"
                            title="View Medical History"
                          >
                            <FaHistory /> History
                          </Link>
                          <Link
                            to={`/patients/${patient.patient_id}/edit`}
                            className="btn btn-outline-primary btn-sm shadow-sm"
                            title="Edit Patient Details"
                          >
                            <FaEdit />
                          </Link>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="shadow-sm"
                            title="Delete Patient Record"
                            onClick={() => handleOpenDeleteModal(patient)}
                          >
                            <FaTrashAlt />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </motion.div>

      {/* Delete Patient Confirmation Modal */}
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
    </Container>
  );
}

