import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { FaShieldAlt, FaCircle, FaBars } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getBreadcrumb = (path: string) => {
    switch (path) {
      case '/admin/dashboard': return 'Administration Dashboard';
      case '/admin/users': return 'User Management';
      case '/admin/roles': return 'Roles & Permissions';
      case '/admin/audit-logs': return 'Audit & Security Logs';
      case '/admin/security': return 'Security Overview';
      case '/admin/system-monitor': return 'System Health & Infrastructure';
      case '/admin/models': return 'AI Models & Transfer Learning Performance';
      case '/admin/settings': return 'Administrative Settings';
      default: return 'Admin Portal';
    }
  };

  return (
    <div style={styles.layoutContainer}>
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="admin-content-wrapper">
        {/* Top Navbar */}
        <header style={styles.topHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="btn btn-light d-lg-none me-1 border-0 p-1"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation"
              style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <FaBars />
            </button>
            <div style={styles.breadcrumbArea}>
              <FaShieldAlt style={{ color: '#0284C7', fontSize: '1.1rem' }} />
              <span className="d-none d-sm-inline" style={styles.breadcrumbText}>{getBreadcrumb(location.pathname)}</span>
              <span className="d-sm-none" style={{ ...styles.breadcrumbText, fontSize: '0.85rem' }}>
                {getBreadcrumb(location.pathname).length > 20 ? 'Admin Portal' : getBreadcrumb(location.pathname)}
              </span>
            </div>
          </div>

          <div style={styles.headerRight}>
            <div className="d-none d-md-flex" style={styles.statusIndicator}>
              <FaCircle style={{ color: '#10B981', fontSize: '0.55rem' }} />
              <span style={styles.statusText}>System Live</span>
            </div>
            <div style={styles.adminUserBadge}>
              <span className="d-none d-sm-inline" style={styles.adminUserEmail}>{user?.email || 'admin@hospital.org'}</span>
              <span style={styles.roleChip}>ADMIN</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={styles.contentArea}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layoutContainer: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#F8FAFC', // Professional light white background
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: '#0F172A',
  },
  topHeader: {
    height: '64px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1rem',
    position: 'sticky',
    top: 0,
    zIndex: 90,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  },
  breadcrumbArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
  },
  breadcrumbText: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#0F172A',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    borderRadius: '20px',
    padding: '0.3rem 0.75rem',
  },
  statusText: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#047857',
  },
  adminUserBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#F1F5F9',
    padding: '0.35rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
  },
  adminUserEmail: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#334155',
  },
  roleChip: {
    fontSize: '0.65rem',
    fontWeight: 700,
    backgroundColor: '#0284C7',
    color: '#FFFFFF',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
    letterSpacing: '0.04em',
  },
  contentArea: {
    flex: 1,
    padding: '1.5rem',
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
  },
};
