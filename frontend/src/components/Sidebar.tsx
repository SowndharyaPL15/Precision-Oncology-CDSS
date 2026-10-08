import { Link, useLocation } from 'react-router-dom';
import { FaHospitalUser, FaStethoscope, FaChartBar, FaFileAlt, FaLungs, FaRibbon, FaTimes } from 'react-icons/fa';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();

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
      </div>
    </>
  );
}

