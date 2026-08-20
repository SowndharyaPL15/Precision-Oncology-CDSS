import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Card, Table, Badge, Spinner, InputGroup, Form } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch, FaEdit, FaHistory, FaUserInjured } from 'react-icons/fa';
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
                        <Link to={`/patients/${patient.patient_id}/history`} className="btn btn-light btn-sm me-2 shadow-sm text-info">
                          <FaHistory /> History
                        </Link>
                        <Link to={`/patients/${patient.patient_id}/edit`} className="btn btn-outline-primary btn-sm shadow-sm">
                          <FaEdit />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </motion.div>
    </Container>
  );
}
