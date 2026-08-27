import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FaStethoscope, FaTachometerAlt, FaUsers, FaUserLock, FaClipboardList,
  FaShieldAlt, FaServer, FaBrain, FaCog, FaSignOutAlt, FaUserShield, FaUser, FaTimes
} from 'react-icons/fa';

const navItems = [
  { to: '/admin/dashboard', icon: <FaTachometerAlt />, label: 'Dashboard' },
  { to: '/admin/users', icon: <FaUsers />, label: 'Users' },
  { to: '/admin/roles', icon: <FaUserLock />, label: 'Roles & Permissions' },
  { to: '/admin/audit-logs', icon: <FaClipboardList />, label: 'Audit Logs' },
  { to: '/admin/security', icon: <FaShieldAlt />, label: 'Security' },
  { to: '/admin/system-monitor', icon: <FaServer />, label: 'System Monitoring' },
  { to: '/admin/models', icon: <FaBrain />, label: 'AI Models' },
  { to: '/admin/settings', icon: <FaCog />, label: 'Settings' },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const location = useLocation();
  const { logout, user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

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
      <aside 
        className={`sidebar-responsive ${isOpen ? 'show' : ''}`}
        style={{
          ...styles.sidebar,
          zIndex: 1010
        }}
      >
        {/* Brand Header */}
        <div style={{ ...styles.brandArea, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={styles.brandIconWrapper}>
              <FaStethoscope style={{ color: '#38BDF8', fontSize: '1.25rem' }} />
            </div>
            <div>
              <div style={styles.brandTitle}>Precision Oncology</div>
              <div style={styles.brandSub}>Administration</div>
            </div>
          </div>
          <button 
            className="btn btn-dark d-lg-none border-0 p-1" 
            onClick={onClose}
            aria-label="Close sidebar"
            style={{ fontSize: '1.2rem', color: '#94A3B8', backgroundColor: 'transparent' }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Admin Privilege Tag */}
        <div style={styles.adminTag}>
          <FaUserShield style={{ color: '#38BDF8', fontSize: '0.85rem' }} />
          <span style={styles.adminTagText}>Enterprise Admin</span>
        </div>

        {/* Navigation Links */}
        <nav style={styles.nav}>
          <div style={styles.navLabel}>ADMINISTRATION</div>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={handleLinkClick}
              style={{
                ...styles.navItem,
                ...(isActive(item.to) ? styles.navItemActive : {}),
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navText}>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Flex Spacer */}
        <div style={{ flex: 1 }} />

        {/* Admin Profile & Logout Section */}
        <div style={styles.userArea}>
          <Link to="/admin/settings" style={styles.profileBox} onClick={handleLinkClick}>
            <div style={styles.userAvatar}>
              {user?.name ? user.name.charAt(0).toUpperCase() : <FaUser />}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={styles.userName}>{user?.name || 'Administrator'}</div>
              <div style={styles.userRole}>System Administrator</div>
            </div>
          </Link>
          <button onClick={logout} style={styles.logoutBtn}>
            <FaSignOutAlt style={{ marginRight: '0.4rem' }} /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '260px',
    minWidth: '260px',
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    backgroundColor: '#0F172A', // Dark Slate
    display: 'flex',
    flexDirection: 'column',
    padding: '1.25rem 1rem',
    overflowY: 'auto',
    borderRight: '1px solid #1E293B',
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.12)',
  },
  brandArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
    padding: '0.25rem 0.5rem',
  },
  brandIconWrapper: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#1E293B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #334155',
  },
  brandTitle: {
    fontSize: '0.92rem',
    fontWeight: 700,
    color: '#F8FAFC',
    lineHeight: 1.2,
  },
  brandSub: {
    fontSize: '0.68rem',
    color: '#38BDF8',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  adminTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    color: '#38BDF8',
    borderRadius: '8px',
    padding: '0.45rem 0.75rem',
    marginBottom: '1.25rem',
    border: '1px solid rgba(56, 189, 248, 0.25)',
  },
  adminTagText: {
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  navLabel: {
    fontSize: '0.65rem',
    color: '#64748B',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '0 0.6rem',
    marginBottom: '0.4rem',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem',
    textDecoration: 'none',
    color: '#94A3B8',
    fontSize: '0.85rem',
    fontWeight: 500,
    padding: '0.55rem 0.75rem',
    borderRadius: '8px',
    transition: 'all 0.15s ease-in-out',
  },
  navItemActive: {
    backgroundColor: '#0284C7',
    color: '#FFFFFF',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
  },
  navIcon: {
    fontSize: '0.95rem',
    width: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  navText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userArea: {
    borderTop: '1px solid #1E293B',
    paddingTop: '1rem',
    marginTop: '0.5rem',
  },
  profileBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    padding: '0.5rem',
    borderRadius: '8px',
    textDecoration: 'none',
    marginBottom: '0.65rem',
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#0284C7',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.88rem',
    flexShrink: 0,
  },
  userName: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#F8FAFC',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '145px',
  },
  userRole: {
    fontSize: '0.68rem',
    color: '#94A3B8',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#EF4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '0.45rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease-in-out',
  },
};

