import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUserMd, FaHospitalUser, FaStethoscope, FaChartBar, FaFileAlt, FaSignOutAlt, FaCog, FaLungs, FaRibbon } from 'react-icons/fa';
import { Dropdown } from 'react-bootstrap';
import './Sidebar.css';

export default function Sidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <div className="sidebar d-flex flex-column flex-shrink-0 p-3 text-white bg-dark" style={{ width: '280px', height: '100vh', position: 'fixed', top: 0, left: 0 }}>
      <Link to="/" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
        <FaStethoscope className="me-2 fs-4" />
        <span className="fs-5">Precision Oncology</span>
      </Link>
      <hr />
      <ul className="nav nav-pills flex-column mb-auto">
        <li className="nav-item">
          <Link to="/" className={`nav-link text-white ${isActive('/')}`}>
            <FaChartBar className="me-2" />
            Dashboard
          </Link>
        </li>
        <li>
          <Link to="/patients" className={`nav-link text-white ${location.pathname.startsWith('/patients') ? 'active' : ''}`}>
            <FaHospitalUser className="me-2" />
            Patients
          </Link>
        </li>
        <li>
          <Link to="/predict/lung" className={`nav-link text-white ${isActive('/predict/lung')}`}>
            <FaLungs className="me-2" />
            Lung Prediction
          </Link>
        </li>
        <li>
          <Link to="/predict/breast" className={`nav-link text-white ${isActive('/predict/breast')}`}>
            <FaRibbon className="me-2" />
            Breast Prediction
          </Link>
        </li>
        <li>
          <Link to="/reports" className={`nav-link text-white ${isActive('/reports')}`}>
            <FaFileAlt className="me-2" />
            Reports
          </Link>
        </li>
        <li>
          <Link to="/analytics" className={`nav-link text-white ${isActive('/analytics')}`}>
            <FaChartBar className="me-2" />
            Analytics
          </Link>
        </li>
      </ul>
      <hr />

      {/* Doctor Profile Dropdown — React-Bootstrap Dropdown (no Bootstrap JS dependency) */}
      <Dropdown drop="up">
        <Dropdown.Toggle
          variant="dark"
          className="d-flex align-items-center text-white text-decoration-none bg-transparent border-0 p-0 shadow-none w-100"
          style={{ outline: 'none' }}
        >
          <FaUserMd className="rounded-circle me-2 fs-4 flex-shrink-0" />
          <strong className="text-truncate">{user?.name || 'Doctor Profile'}</strong>
        </Dropdown.Toggle>

        <Dropdown.Menu variant="dark" className="shadow border-0 mb-1" style={{ width: '230px' }}>
          <Dropdown.Item as={Link} to="/profile">
            <FaUserMd className="me-2 text-muted" /> Profile
          </Dropdown.Item>
          <Dropdown.Item as={Link} to="/settings">
            <FaCog className="me-2 text-muted" /> Settings
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item onClick={logout} className="text-danger">
            <FaSignOutAlt className="me-2" /> Sign out
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}
