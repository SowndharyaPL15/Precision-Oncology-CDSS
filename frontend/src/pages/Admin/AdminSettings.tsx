import { useAuth } from '../../context/AuthContext';
import { FaUserShield, FaShieldAlt, FaClock, FaBell, FaLock, FaInfoCircle } from 'react-icons/fa';

export default function AdminSettings() {
  const { user, logout } = useAuth();

  return (
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Administrative Settings</h1>
        <p style={styles.pageSubtitle}>Admin profile, security preferences, and session information</p>
      </div>

      <div style={styles.grid}>
        {/* Admin Profile */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIconBox}><FaUserShield style={{ color: '#7C3AED' }} /></div>
            <h3 style={styles.cardTitle}>Admin Profile</h3>
          </div>

          <div style={styles.profileAvatar}>
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>

          <div style={styles.fieldRows}>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>Full Name</span>
              <span style={styles.fieldValue}>{user?.name || 'Administrator'}</span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>Email Address</span>
              <span style={styles.fieldValue}>{user?.email || '—'}</span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>System Role</span>
              <span style={{ ...styles.fieldValue, color: '#7C3AED', fontWeight: 700 }}>ADMIN</span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>Portal Access</span>
              <span style={{ ...styles.fieldValue, color: '#10B981', fontWeight: 700 }}>Administration Portal</span>
            </div>
          </div>

          <div style={styles.noteBox}>
            <FaInfoCircle style={{ color: '#0369A1', flexShrink: 0 }} />
            <span>Role changes must be performed by another administrator through the User Management console.</span>
          </div>
        </div>

        {/* Security Preferences */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.cardIconBox, backgroundColor: '#D1FAE5' }}><FaShieldAlt style={{ color: '#065F46' }} /></div>
            <h3 style={styles.cardTitle}>Security Preferences</h3>
          </div>

          <div style={styles.preferenceList}>
            {[
              { label: '3FA Multi-Factor Authentication', value: 'Required (System Policy)', locked: true, status: 'Enforced' },
              { label: 'Face Biometric Enrollment', value: user?.has_face_registered ? 'Enrolled' : 'Not Enrolled', locked: false, status: user?.has_face_registered ? 'Active' : 'Optional' },
              { label: 'WebAuthn Passkey', value: user?.has_webauthn_registered ? 'Registered' : 'Not Registered', locked: false, status: user?.has_webauthn_registered ? 'Active' : 'Optional' },
              { label: 'JWT Token Expiry', value: '60 minutes (System Default)', locked: true, status: 'Enforced' },
              { label: 'Audit Logging', value: 'All Admin Actions Logged', locked: true, status: 'Mandatory' },
            ].map(pref => (
              <div key={pref.label} style={styles.prefRow}>
                <div style={{ flex: 1 }}>
                  <div style={styles.prefLabel}>{pref.label}</div>
                  <div style={styles.prefValue}>{pref.value}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {pref.locked && <FaLock style={{ color: '#CBD5E1', fontSize: '0.8rem' }} title="System Policy - Cannot Change" />}
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '10px',
                    backgroundColor: pref.status === 'Enforced' || pref.status === 'Mandatory' ? '#E0F2FE' : pref.status === 'Active' ? '#D1FAE5' : '#F1F5F9',
                    color: pref.status === 'Enforced' || pref.status === 'Mandatory' ? '#075985' : pref.status === 'Active' ? '#065F46' : '#64748B',
                  }}>
                    {pref.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p style={styles.secNote}>Security policies marked as Enforced cannot be modified by administrators to maintain system integrity.</p>
        </div>

        {/* Session Information */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.cardIconBox, backgroundColor: '#FEF3C7' }}><FaClock style={{ color: '#D97706' }} /></div>
            <h3 style={styles.cardTitle}>Active Session</h3>
          </div>

          <div style={styles.fieldRows}>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>Session Portal</span>
              <span style={styles.fieldValue}>Administration Portal</span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>Token Type</span>
              <span style={styles.fieldValue}>JWT (HS256 Signed)</span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>Token Duration</span>
              <span style={styles.fieldValue}>60 minutes + Refresh Token</span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>Authentication</span>
              <span style={{ ...styles.fieldValue, color: '#10B981', fontWeight: 700 }}>3FA Verified</span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>Last Login</span>
              <span style={styles.fieldValue}>{user?.last_login ? new Date(user.last_login).toLocaleString() : '—'}</span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>Last Device</span>
              <span style={{ ...styles.fieldValue, fontSize: '0.78rem' }}>{user?.last_device ? user.last_device.substring(0, 50) : '—'}</span>
            </div>
          </div>

          <button onClick={logout} style={styles.logoutBtn}>
            Sign Out of Admin Session
          </button>
        </div>

        {/* Notification Preferences */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.cardIconBox, backgroundColor: '#E0F2FE' }}><FaBell style={{ color: '#0284C7' }} /></div>
            <h3 style={styles.cardTitle}>Notification Preferences</h3>
          </div>

          <div style={styles.preferenceList}>
            {[
              { label: 'Failed Login Alerts', description: 'Notify on repeated failed authentication attempts', status: 'Via Audit Log' },
              { label: 'Account Lockout Events', description: 'Notify when user accounts are automatically locked', status: 'Via Audit Log' },
              { label: 'Role Change Events', description: 'Log all administrative role assignments', status: 'Mandatory Log' },
              { label: 'Security Status Alerts', description: 'Monitor biometric and WebAuthn credential changes', status: 'Via Audit Log' },
              { label: 'System Health Monitoring', description: 'Database, AI Engine, and Storage status tracking', status: 'Dashboard Live' },
            ].map(pref => (
              <div key={pref.label} style={styles.prefRow}>
                <div style={{ flex: 1 }}>
                  <div style={styles.prefLabel}>{pref.label}</div>
                  <div style={styles.prefValue}>{pref.description}</div>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '10px', backgroundColor: '#D1FAE5', color: '#065F46', whiteSpace: 'nowrap' as const }}>
                  {pref.status}
                </span>
              </div>
            ))}
          </div>

          <p style={styles.secNote}>
            All security notifications are automatically captured in the Persistent Audit Log stored in PostgreSQL.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { marginBottom: '1.5rem' },
  pageTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 },
  pageSubtitle: { fontSize: '0.875rem', color: '#64748B', margin: '0.25rem 0 0 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' },
  card: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' },
  cardIconBox: { width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitle: { fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0 },
  profileAvatar: { width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#7C3AED', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.4rem', margin: '0 auto 1.25rem auto' },
  fieldRows: { display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' },
  fieldRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.6rem', borderBottom: '1px solid #F1F5F9' },
  fieldLabel: { fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 },
  fieldValue: { fontSize: '0.875rem', color: '#334155', fontWeight: 600, textAlign: 'right' as const },
  noteBox: { display: 'flex', alignItems: 'flex-start', gap: '0.5rem', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: '#0369A1' },
  preferenceList: { display: 'flex', flexDirection: 'column', gap: '0' },
  prefRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between', paddingBottom: '0.75rem', marginBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' },
  prefLabel: { fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.15rem' },
  prefValue: { fontSize: '0.78rem', color: '#64748B' },
  secNote: { fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.5rem', lineHeight: 1.4, fontStyle: 'italic' },
  logoutBtn: { width: '100%', padding: '0.7rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', marginTop: '0.5rem' },
};
