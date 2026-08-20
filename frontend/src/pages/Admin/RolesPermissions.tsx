import { FaUserShield, FaUserMd, FaMicroscope, FaCheckCircle } from 'react-icons/fa';

const ROLES = [
  {
    name: 'ADMIN',
    icon: <FaUserShield />,
    color: '#7C3AED',
    bg: '#EDE9FE',
    description: 'System Administrator — Full administrative control over the Precision Oncology platform.',
    permissions: [
      'User Management (View, Activate, Deactivate)',
      'Role Assignment & Role Management',
      'Audit Log Access & Security Monitoring',
      'Security Configuration & System Monitoring',
      'AI Model Registry Management',
      'Admin Portal Access',
      'Administrative Settings',
    ],
  },
  {
    name: 'DOCTOR / ONCOLOGIST',
    icon: <FaUserMd />,
    color: '#0284C7',
    bg: '#E0F2FE',
    description: 'Clinical Oncologist — Patient management and AI-assisted clinical decision support.',
    permissions: [
      'Patient Information Management',
      'Risk Assessment & Clinical Summary',
      'AI Prediction (Lung & Breast Cancer)',
      'Grad-CAM Visual Explainability',
      'Clinical Report Generation (PDF/JSON)',
      'Patient Prediction History',
      'Model Comparison Analytics',
    ],
  },
  {
    name: 'PATHOLOGIST',
    icon: <FaMicroscope />,
    color: '#10B981',
    bg: '#D1FAE5',
    description: 'Clinical Pathologist — Histopathology analysis and AI-powered image classification.',
    permissions: [
      'Patient Management',
      'Histopathology Slide Analysis',
      'AI Prediction (Lung & Breast Cancer)',
      'Grad-CAM Heatmap Explainability',
      'Clinical Report Generation',
      'Prediction Result Viewing',
    ],
  },
];

export default function RolesPermissions() {
  return (
    <div>
      {/* Header */}
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Roles & Permissions</h1>
        <p style={styles.pageSubtitle}>System-defined role capabilities for the Precision Oncology Clinical Decision Support Platform.</p>
      </div>

      <div style={styles.infoBox}>
        Roles are defined and enforced at the backend API level using Role-Based Access Control (RBAC) dependencies.
        Clinical users cannot access any <code>/admin/*</code> API endpoints. All role assignments are logged in the audit trail.
      </div>

      {/* Role Cards */}
      <div style={styles.rolesGrid}>
        {ROLES.map((role) => (
          <div key={role.name} style={styles.roleCard}>
            <div style={styles.roleHeader}>
              <div style={{ ...styles.roleIconBox, backgroundColor: role.bg, color: role.color }}>
                {role.icon}
              </div>
              <div>
                <div style={{ ...styles.roleTitle, color: role.color }}>{role.name}</div>
                <div style={styles.roleDesc}>{role.description}</div>
              </div>
            </div>

            <div style={styles.permissionsSection}>
              <div style={styles.permissionsLabel}>Permissions</div>
              <ul style={styles.permList}>
                {role.permissions.map((perm) => (
                  <li key={perm} style={styles.permItem}>
                    <FaCheckCircle style={{ color: role.color, flexShrink: 0, fontSize: '0.8rem', marginTop: '2px' }} />
                    <span>{perm}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* RBAC Note */}
      <div style={styles.rbacNote}>
        <h3 style={styles.rbacTitle}>Backend RBAC Enforcement</h3>
        <p style={styles.rbacText}>
          All API endpoints use <code>require_roles([...])</code> FastAPI dependency injection to enforce server-side role checks.
          A clinical user attempting to call any <code>/api/v1/admin/*</code> endpoint will receive a <strong>403 Forbidden</strong> response regardless of the frontend state.
        </p>
        <div style={styles.rbacExamples}>
          <div style={styles.rbacRow}>
            <span style={styles.rbacBadge('#D1FAE5', '#065F46')}>ADMIN</span>
            <span style={styles.rbacArrow}>→</span>
            <code style={styles.rbacCode}>GET /api/v1/admin/users</code>
            <span style={styles.rbacResult('#D1FAE5', '#065F46')}>200 OK</span>
          </div>
          <div style={styles.rbacRow}>
            <span style={styles.rbacBadge('#E0F2FE', '#075985')}>DOCTOR</span>
            <span style={styles.rbacArrow}>→</span>
            <code style={styles.rbacCode}>GET /api/v1/admin/users</code>
            <span style={styles.rbacResult('#FEE2E2', '#991B1B')}>403 Forbidden</span>
          </div>
          <div style={styles.rbacRow}>
            <span style={styles.rbacBadge('#D1FAE5', '#065F46')}>PATHOLOGIST</span>
            <span style={styles.rbacArrow}>→</span>
            <code style={styles.rbacCode}>GET /api/v1/admin/users</code>
            <span style={styles.rbacResult('#FEE2E2', '#991B1B')}>403 Forbidden</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  pageHeader: { marginBottom: '1.25rem' },
  pageTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 },
  pageSubtitle: { fontSize: '0.875rem', color: '#64748B', margin: '0.25rem 0 0 0' },
  infoBox: { backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '10px', padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#0369A1', marginBottom: '1.5rem' },
  rolesGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' },
  roleCard: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  roleHeader: { display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1.25rem', borderBottom: '1px solid #F1F5F9' },
  roleIconBox: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 },
  roleTitle: { fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.2rem' },
  roleDesc: { fontSize: '0.75rem', color: '#64748B', lineHeight: 1.4 },
  permissionsSection: { padding: '1.25rem' },
  permissionsLabel: { fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.75rem' },
  permList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  permItem: { display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.82rem', color: '#334155' },
  rbacNote: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  rbacTitle: { fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 0.5rem 0' },
  rbacText: { fontSize: '0.875rem', color: '#334155', marginBottom: '1rem' },
  rbacExamples: { display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '8px' },
  rbacRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
  rbacArrow: { color: '#94A3B8', fontWeight: 700 },
  rbacCode: { fontSize: '0.8rem', backgroundColor: '#E2E8F0', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#334155' },
  rbacBadge: (bg: string, color: string) => ({ backgroundColor: bg, color, fontWeight: 700, fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '10px', minWidth: '100px', textAlign: 'center' }),
  rbacResult: (bg: string, color: string) => ({ backgroundColor: bg, color, fontWeight: 700, fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '10px' }),
};
