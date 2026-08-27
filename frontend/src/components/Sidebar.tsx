import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUserMd, FaHospitalUser, FaStethoscope, FaChartBar, FaFileAlt, FaSignOutAlt, FaCog, FaLungs, FaRibbon, FaTimes } from 'react-icons/fa';
import { Dropdown } from 'react-bootstrap';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { logout, user } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 992) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && (
        <div className="sidebar-backdrop" onClick={onClose} style={{ zIndex: 1005 }}></div>
      )}
      <div 
        className={`sidebar sidebar-responsive d-flex flex-column flex-shrink-0 p-3 text-white bg-dark ${isOpen ? 'show' : ''}`} 
        style={{ width: '280px', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 1010 }}
      >
        <div className="d-flex align-items-center justify-content-between mb-3 mb-md-0 me-md-auto">
          <Link to="/" className="d-flex align-items-center text-white text-decoration-none" onClick={handleLinkClick}>
            <FaStethoscope className="me-2 fs-4" />
            <span className="fs-5">Precision Oncology</span>
          </Link>
          <button 
            className="btn btn-dark d-lg-none border-0 p-1" 
            onClick={onClose}
            aria-label="Close sidebar"
            style={{ fontSize: '1.2rem' }}
          >
            <FaTimes />
          </button>
        </div>
        <hr />
        <ul className="nav nav-pills flex-column mb-auto">
          <li className="nav-item">
            <Link to="/dashboard" className={`nav-link text-white ${isActive('/dashboard')}`} onClick={handleLinkClick}>
              <FaChartBar className="me-2" />
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/patients" className={`nav-link text-white ${location.pathname.startsWith('/patients') ? 'active' : ''}`} onClick={handleLinkClick}>
              <FaHospitalUser className="me-2" />
              Patients
            </Link>
          </li>
          <li>
            <Link to="/predict/lung" className={`nav-link text-white ${isActive('/predict/lung')}`} onClick={handleLinkClick}>
              <FaLungs className="me-2" />
              Lung Prediction
            </Link>
          </li>
          <li>
            <Link to="/predict/breast" className={`nav-link text-white ${isActive('/predict/breast')}`} onClick={handleLinkClick}>
              <FaRibbon className="me-2" />
              Breast Prediction
            </Link>
          </li>
          <li>
            <Link to="/reports" className={`nav-link text-white ${isActive('/reports')}`} onClick={handleLinkClick}>
              <FaFileAlt className="me-2" />
              Reports
            </Link>
          </li>
          <li>
            <Link to="/analytics" className={`nav-link text-white ${isActive('/analytics')}`} onClick={handleLinkClick}>
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
            <Dropdown.Item as={Link} to="/profile" onClick={handleLinkClick}>
              <FaUserMd className="me-2 text-muted" /> Profile
            </Dropdown.Item>
            <Dropdown.Item as={Link} to="/settings" onClick={handleLinkClick}>
              <FaCog className="me-2 text-muted" /> Settings
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item onClick={logout} className="text-danger">
              <FaSignOutAlt className="me-2" /> Sign out
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </>
  );
}

