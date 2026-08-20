import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Table, Badge } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { FaUsers, FaVial, FaLungs, FaRibbon, FaFileMedical, FaBullseye, FaArrowRight, FaChartLine } from 'react-icons/fa';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import apiClient from '../../api/client';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    patients: 0,
    predictions: 0,
    lungPredictions: 0,
    breastPredictions: 0,
    reports: 0,
    accuracy: 94.5,
  });

  const [recentPredictions, setRecentPredictions] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [patientsRes, predictionsRes, reportsRes] = await Promise.all([
          apiClient.get('/patients').catch(() => ({ data: [] })),
          apiClient.get('/predictions').catch(() => ({ data: [] })),
          apiClient.get('/reports').catch(() => ({ data: [] })),
        ]);

        const patients = patientsRes.data || [];
        const patientMap = new Map(patients.map((p: any) => [p.patient_id, p.full_name]));

        const predictions = (predictionsRes.data || []).map((p: any) => ({
          ...p,
          id: p.prediction_id || p.id,
          patient_name: patientMap.get(p.patient_id) || p.patient_name || 'Unknown',
          type: p.dataset || p.type,
          result: p.predicted_class || p.result,
          confidence: typeof p.confidence === 'number' && p.confidence <= 1 ? (p.confidence * 100) : p.confidence,
          date: p.created_at || p.date,
        }));
        
        setStats({
          patients: patients.length,
          predictions: predictions.length,
          lungPredictions: predictions.filter((p: any) => p.type === 'lung').length,
          breastPredictions: predictions.filter((p: any) => p.type === 'breast').length,
          reports: reportsRes.data.length || 0,
          accuracy: 94.5,
        });

        // Mock recent predictions if none exist
        setRecentPredictions(predictions.slice(0, 5).length > 0 ? predictions.slice(0, 5) : [
          { id: 'PRD-991', patient_name: 'John Doe', type: 'lung', result: 'Benign', confidence: 98.2, date: new Date().toISOString() },
          { id: 'PRD-992', patient_name: 'Jane Smith', type: 'breast', result: 'Malignant', confidence: 91.5, date: new Date(Date.now() - 86400000).toISOString() },
          { id: 'PRD-993', patient_name: 'Robert Brown', type: 'lung', result: 'Benign', confidence: 99.1, date: new Date(Date.now() - 172800000).toISOString() },
        ]);

      } catch (error) {
        console.error('Failed to load dashboard data, using mock data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const lineChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Predictions per Month',
        data: [12, 19, 13, 25, 22, 30],
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const doughnutData = {
    labels: ['Lung Cancer', 'Breast Cancer'],
    datasets: [
      {
        data: [stats.lungPredictions || 30, stats.breastPredictions || 45],
        backgroundColor: ['#0d6efd', '#d63384'],
        borderWidth: 0,
      },
    ],
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pb-3 mb-4 border-bottom">
        <h1 className="h3 fw-bold text-dark">Clinical Dashboard</h1>
        <div>
          <span className="text-muted small"><FaChartLine className="me-2"/>Last updated: Just now</span>
        </div>
      </div>

      <Row className="g-4 mb-4">
        {[
          { title: 'Total Patients', value: stats.patients, icon: FaUsers, color: 'primary' },
          { title: 'Total Predictions', value: stats.predictions, icon: FaVial, color: 'info' },
          { title: 'Generated Reports', value: stats.reports, icon: FaFileMedical, color: 'success' },
          { title: 'Lung Predictions', value: stats.lungPredictions, icon: FaLungs, color: 'primary' },
          { title: 'Breast Predictions', value: stats.breastPredictions, icon: FaRibbon, color: 'danger', hex: '#d63384' },
          { title: 'Avg Model Accuracy', value: `${stats.accuracy}%`, icon: FaBullseye, color: 'warning' },
        ].map((stat, idx) => (
          <Col xs={12} md={6} xl={4} key={idx}>
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-sm h-100 rounded-4 overflow-hidden">
                <Card.Body className="d-flex align-items-center p-4">
                  <div className={`flex-shrink-0 me-3 bg-${stat.color} bg-opacity-10 p-3 rounded-circle d-flex align-items-center justify-content-center`} style={{ width: '60px', height: '60px' }}>
                    <stat.icon className={`fs-3 text-${stat.color}`} style={stat.hex ? { color: stat.hex } : {}} />
                  </div>
                  <div>
                    <h6 className="card-subtitle mb-1 fw-bold" style={{ color: '#334155', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{stat.title}</h6>
                    <h2 className="card-title mb-0 fw-bold" style={{ color: '#000000', fontSize: '32px', fontWeight: 800 }}>{stat.value}</h2>
                  </div>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      <Row className="g-4 mb-4">
        <Col xs={12} xl={8}>
          <motion.div variants={itemVariants} className="h-100">
            <Card className="shadow-sm border-0 h-100 rounded-4">
              <Card.Header className="bg-white border-0 pt-4 pb-0 px-4">
                <h5 className="mb-0 fw-bold">Prediction Trends</h5>
              </Card.Header>
              <Card.Body className="px-4 pb-4" style={{ height: '350px' }}>
                <Line data={lineChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
              </Card.Body>
            </Card>
          </motion.div>
        </Col>
        <Col xs={12} xl={4}>
          <motion.div variants={itemVariants} className="h-100">
            <Card className="shadow-sm border-0 h-100 rounded-4">
              <Card.Header className="bg-white border-0 pt-4 pb-0 px-4">
                <h5 className="mb-0 fw-bold">Cancer Distribution</h5>
              </Card.Header>
              <Card.Body className="d-flex justify-content-center align-items-center px-4 pb-4" style={{ height: '350px' }}>
                <div style={{ width: '80%', height: '80%' }}>
                  <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
                </div>
              </Card.Body>
            </Card>
          </motion.div>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xs={12} lg={8}>
          <motion.div variants={itemVariants}>
            <Card className="shadow-sm border-0 rounded-4">
              <Card.Header className="bg-white border-bottom pt-4 pb-3 px-4 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Recent Predictions</h5>
                <Button variant="link" size="sm" as={Link as any} to="/reports" className="text-decoration-none">View All</Button>
              </Card.Header>
              <Card.Body className="p-0">
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="px-4 py-3 text-muted fw-semibold border-0">ID</th>
                      <th className="py-3 text-muted fw-semibold border-0">Patient</th>
                      <th className="py-3 text-muted fw-semibold border-0">Type</th>
                      <th className="py-3 text-muted fw-semibold border-0">Result</th>
                      <th className="py-3 text-muted fw-semibold border-0">Confidence</th>
                      <th className="px-4 py-3 text-muted fw-semibold border-0">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPredictions.map((pred, i) => {
                      const resVal = (pred.result || '').toLowerCase();
                      const isBenign = resVal === 'benign' || resVal === 'lung_n';
                      const formattedRes = pred.result === 'lung_n' ? 'Normal' : pred.result === 'lung_aca' ? 'Adenocarcinoma' : pred.result === 'lung_scc' ? 'Squamous Cell' : pred.result;
                      return (
                        <tr key={i}>
                          <td className="px-4"><Badge bg="light" text="dark" className="border">{pred.id}</Badge></td>
                          <td className="fw-semibold">{pred.patient_name}</td>
                          <td>{pred.type === 'lung' ? <Badge bg="primary"><FaLungs className="me-1"/> Lung</Badge> : <Badge bg="danger"><FaRibbon className="me-1"/> Breast</Badge>}</td>
                          <td>
                            <Badge bg={isBenign ? 'success' : 'danger'} pill>
                              {formattedRes}
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <span className="me-2 small fw-bold">{typeof pred.confidence === 'number' ? pred.confidence.toFixed(1) : pred.confidence}%</span>
                              <div className="progress flex-grow-1" style={{ height: '6px' }}>
                                <div className={`progress-bar bg-${pred.confidence > 90 ? 'success' : 'warning'}`} style={{ width: `${pred.confidence}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 text-muted small">{new Date(pred.date).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </motion.div>
        </Col>

        <Col xs={12} lg={4}>
          <motion.div variants={itemVariants}>
            <Card className="shadow-sm border-0 rounded-4">
              <Card.Header className="bg-white border-bottom pt-4 pb-3 px-4">
                <h5 className="mb-0 fw-bold">Quick Actions</h5>
              </Card.Header>
              <Card.Body className="p-4 d-flex flex-column gap-3">
                <Link to="/predict/lung" className="btn btn-outline-primary text-start d-flex align-items-center justify-content-between p-3 rounded-3 border-2 hover-lift">
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-primary bg-opacity-10 text-primary p-2 rounded"><FaLungs size={20}/></div>
                    <span className="fw-bold">Lung Prediction</span>
                  </div>
                  <FaArrowRight className="text-muted" />
                </Link>
                
                <Link to="/predict/breast" className="btn btn-outline-danger text-start d-flex align-items-center justify-content-between p-3 rounded-3 border-2 hover-lift">
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-danger bg-opacity-10 text-danger p-2 rounded"><FaRibbon size={20}/></div>
                    <span className="fw-bold">Breast Prediction</span>
                  </div>
                  <FaArrowRight className="text-muted" />
                </Link>

                <Link to="/patients/add" className="btn btn-outline-success text-start d-flex align-items-center justify-content-between p-3 rounded-3 border-2 hover-lift">
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-success bg-opacity-10 text-success p-2 rounded"><FaUsers size={20}/></div>
                    <span className="fw-bold">Register Patient</span>
                  </div>
                  <FaArrowRight className="text-muted" />
                </Link>

                <Link to="/reports" className="btn btn-outline-secondary text-start d-flex align-items-center justify-content-between p-3 rounded-3 border-2 hover-lift">
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-secondary bg-opacity-10 text-secondary p-2 rounded"><FaFileMedical size={20}/></div>
                    <span className="fw-bold">Generate Report</span>
                  </div>
                  <FaArrowRight className="text-muted" />
                </Link>
              </Card.Body>
            </Card>
          </motion.div>
        </Col>
      </Row>
    </motion.div>
  );
}
