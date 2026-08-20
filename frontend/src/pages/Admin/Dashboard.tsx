import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale,
  LinearScale, BarElement, Title
} from 'chart.js';
import {
  FaUsers, FaUserCheck, FaUserShield, FaSignInAlt,
  FaExclamationTriangle, FaFingerprint, FaFileAlt, FaServer,
  FaCheckCircle, FaTimesCircle, FaCircle
} from 'react-icons/fa';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface DashboardStats {
  total_users: number;
  active_clinical_users: number;
  administrators: number;
  today_login_events: number;
  failed_auth_attempts: number;
  active_biometric_credentials: number;
  reports_generated: number;
  system_status: string;
}

interface RoleDistribution { admin: number; doctor: number; pathologist: number; }
interface AuditItem { log_id: string; email: string; event_type: string; status: string; ip_address: string; timestamp: string | null; }

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [roles, setRoles] = useState<RoleDistribution | null>(null);
  const [activity, setActivity] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/admin/dashboard-stats');
        setStats(res.data.stats);
        setRoles(res.data.role_distribution);
        setActivity(res.data.recent_activity || []);
      } catch {
        // Show no-data state
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statCards = stats ? [
    { label: 'Total Users', value: stats.total_users, icon: <FaUsers />, color: '#0284C7', bg: '#E0F2FE' },
    { label: 'Active Clinical Users', value: stats.active_clinical_users, icon: <FaUserCheck />, color: '#10B981', bg: '#D1FAE5' },
    { label: 'Administrators', value: stats.administrators, icon: <FaUserShield />, color: '#7C3AED', bg: '#EDE9FE' },
    { label: "Today's Login Events", value: stats.today_login_events, icon: <FaSignInAlt />, color: '#0891B2', bg: '#ECFEFF' },
    { label: 'Failed Auth Attempts', value: stats.failed_auth_attempts, icon: <FaExclamationTriangle />, color: '#DC2626', bg: '#FEE2E2' },
    { label: 'Active Biometrics', value: stats.active_biometric_credentials, icon: <FaFingerprint />, color: '#059669', bg: '#D1FAE5' },
    { label: 'Reports Generated', value: stats.reports_generated, icon: <FaFileAlt />, color: '#D97706', bg: '#FEF3C7' },
    { label: 'System Status', value: stats.system_status, icon: <FaServer />, color: '#16A34A', bg: '#DCFCE7', isText: true },
  ] : [];

  const donutData = roles ? {
    labels: ['Administrators', 'Doctors', 'Pathologists'],
    datasets: [{
      data: [roles.admin, roles.doctor, roles.pathologist],
      backgroundColor: ['#7C3AED', '#0284C7', '#10B981'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  } : null;

  const barData = {
    labels: activity.slice(0, 6).map(a => a.event_type.replace(/_/g, ' ').substring(0, 15) + (a.event_type.length > 15 ? '...' : '')),
    datasets: [{
      label: 'Recent Events',
      data: activity.slice(0, 6).map(() => 1),
      backgroundColor: activity.slice(0, 6).map(a => a.status === 'SUCCESS' ? '#10B981' : '#EF4444'),
      borderRadius: 6,
    }],
  };

  const eventStatusBadge = (status: string) => ({
    backgroundColor: status === 'SUCCESS' ? '#D1FAE5' : '#FEE2E2',
    color: status === 'SUCCESS' ? '#065F46' : '#991B1B',
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '0.2rem 0.5rem',
    borderRadius: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
  } as React.CSSProperties);

  return (
    <div>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Administration Dashboard</h1>
          <p style={styles.pageSubtitle}>System overview and security monitoring — Welcome, {user?.name || 'Administrator'}</p>
        </div>
        <div style={styles.systemBadge}>
          <FaCircle style={{ color: '#10B981', fontSize: '0.6rem' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#047857' }}>All Systems Operational</span>
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingBox}>Loading dashboard metrics from database...</div>
      ) : !stats ? (
        <div style={styles.noDataBox}>No data available — Backend connection may be unavailable.</div>
      ) : (
        <>
          {/* Stat Cards Grid */}
          <div style={styles.statsGrid}>
            {statCards.map((card, i) => (
              <div key={i} style={styles.statCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={styles.statLabel}>{card.label}</p>
                    <p style={{ ...styles.statValue, color: card.color }}>
                      {card.isText ? card.value : card.value.toString()}
                    </p>
                  </div>
                  <div style={{ ...styles.statIconBox, backgroundColor: card.bg, color: card.color }}>
                    {card.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div style={styles.chartsRow}>
            {/* Role Distribution Donut */}
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>User Role Distribution</h3>
              {donutData && (roles.admin + roles.doctor + roles.pathologist) > 0 ? (
                <div style={{ maxWidth: '240px', margin: '0 auto' }}>
                  <Doughnut data={donutData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                </div>
              ) : (
                <p style={styles.noDataText}>No data available</p>
              )}
            </div>

            {/* Recent Authentication Activity */}
            <div style={{ ...styles.chartCard, flex: 2 }}>
              <h3 style={styles.chartTitle}>Recent Authentication Activity</h3>
              {activity.length > 0 ? (
                <div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          {['Timestamp', 'Email', 'Event', 'Status', 'IP'].map(h => (
                            <th key={h} style={styles.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activity.map((log) => (
                          <tr key={log.log_id} style={styles.tr}>
                            <td style={styles.td}>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A'}</td>
                            <td style={styles.td}>{log.email}</td>
                            <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.event_type}</td>
                            <td style={styles.td}>
                              <span style={eventStatusBadge(log.status)}>
                                {log.status === 'SUCCESS' ? <FaCheckCircle /> : <FaTimesCircle />}
                                {log.status}
                              </span>
                            </td>
                            <td style={styles.td}>{log.ip_address || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p style={styles.noDataText}>No data available</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' },
  pageTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 },
  pageSubtitle: { fontSize: '0.875rem', color: '#64748B', margin: '0.25rem 0 0 0' },
  systemBadge: { display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '20px', padding: '0.4rem 1rem' },
  loadingBox: { textAlign: 'center', padding: '3rem', color: '#64748B', fontSize: '0.95rem', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' },
  noDataBox: { textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: '0.95rem', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #E2E8F0' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' },
  statCard: { backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.25rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  statLabel: { fontSize: '0.78rem', color: '#64748B', fontWeight: 600, margin: '0 0 0.25rem 0' },
  statValue: { fontSize: '1.8rem', fontWeight: 800, margin: 0 },
  statIconBox: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' },
  chartsRow: { display: 'flex', gap: '1rem' },
  chartCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.5rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  chartTitle: { fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: '1rem' },
  noDataText: { textAlign: 'center', color: '#94A3B8', fontSize: '0.875rem', padding: '2rem' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, fontSize: '0.75rem', fontWeight: 700, color: '#64748B', padding: '0.5rem 0.75rem', borderBottom: '2px solid #E2E8F0', textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  td: { fontSize: '0.82rem', color: '#334155', padding: '0.6rem 0.75rem', borderBottom: '1px solid #F1F5F9' },
  tr: {},
};
