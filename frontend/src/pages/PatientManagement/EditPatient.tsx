import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Row, Col, Spinner } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaSave, FaUserEdit } from 'react-icons/fa';
import apiClient from '../../api/client';

export default function EditPatient() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    gender: 'Male',
    email: '',
    phone: ''
  });

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const response = await apiClient.get(`/patients/${id}`);
        setFormData({
          full_name: response.data.full_name,
          age: response.data.age.toString(),
          gender: response.data.gender,
          email: response.data.email,
          phone: response.data.phone
        });
      } catch (error: any) {
        console.error('Failed to load patient', error);
        toast.error(error.response?.data?.detail || 'Failed to load patient data');
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<any>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put(`/patients/${id}`, { ...formData, age: parseInt(formData.age) });
      toast.success('Patient updated successfully');
      navigate('/patients');
    } catch (error: any) {
      console.error('Failed to update patient', error);
      toast.error(error.response?.data?.detail || 'Failed to update patient');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Container className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}><Spinner animation="border" variant="primary" /></Container>;
  }

  return (
    <Container fluid>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-4 border-bottom">
        <h2 className="fw-bold mb-0 text-dark">Edit Patient Details</h2>
        <Link to="/patients" className="btn btn-outline-secondary d-flex align-items-center gap-2 shadow-sm">
          <FaArrowLeft /> Back to Directory
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="shadow-sm border-0 rounded-4" style={{ maxWidth: '800px' }}>
          <Card.Header className="bg-white border-bottom py-3">
            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2 text-primary">
              <FaUserEdit /> Update Information
            </h5>
          </Card.Header>
          <Card.Body className="p-4 p-md-5">
            <Form onSubmit={handleSubmit}>
              <Row className="g-4">
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted">Full Name <span className="text-danger">*</span></Form.Label>
                    <Form.Control type="text" name="full_name" value={formData.full_name} onChange={handleChange} required className="bg-light" />
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted">Age <span className="text-danger">*</span></Form.Label>
                    <Form.Control type="number" name="age" value={formData.age} onChange={handleChange} required min="0" max="150" className="bg-light" />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted">Gender <span className="text-danger">*</span></Form.Label>
                    <Form.Select name="gender" value={formData.gender} onChange={handleChange} required className="bg-light">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted">Email Address</Form.Label>
                    <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} className="bg-light" />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted">Phone Number</Form.Label>
                    <Form.Control type="text" name="phone" value={formData.phone} onChange={handleChange} className="bg-light" />
                  </Form.Group>
                </Col>
              </Row>

              <hr className="my-4" />
              
              <div className="d-flex justify-content-end gap-3">
                <Link to="/patients" className="btn btn-light fw-bold px-4">Cancel</Link>
                <Button variant="primary" type="submit" disabled={saving} className="fw-bold px-4 d-flex align-items-center gap-2 shadow-sm">
                  {saving ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : <FaSave />}
                  {saving ? 'Saving...' : 'Update Patient'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </motion.div>
    </Container>
  );
}
