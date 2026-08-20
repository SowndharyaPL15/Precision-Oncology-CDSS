import { useState, useEffect } from 'react';
import apiClient from '../../api/client';

interface SecurityItem {
  name: string;
  category: string;
  status: string;
  badge_type: string;
  description: string;
  metric: string;
}

export default function SecurityOverview() {
  const [items, setItems] = useState<SecurityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/admin/security-status')
      .then(res => setItems(res.data.security_matrix || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const badgeStyle = (type: string): React.CSSProperties => {
    const map: Record<string, { bg: string; color: string; symbol: string }> = {
      success: { bg: '#D1FAE5', color: '#065F46', symbol: '✓ Active' },
      warning: { bg: '#FEF3C7', color: '#92400E', symbol: '⚠ Attention Required' },
      danger: { bg: '#FEE2E2', color: '#991B1B', symbol: '✕ Disabled' },
    };
    return { backgroundColor: map[type]?.bg || '#F1F5F9', color: map[type]?.color || '#334155' };
  };
  const badgeLabel = (type: string) =>
    type === 'success' ? '✓ Active' : type === 'warning' ? '⚠ Attention Required' : '✕ Disabled';

  const categoryColors: Record<string, string> = {
    Authentication: '#7C3AED',
    Biometrics: '#10B981',
    'Hardware Auth': '#0284C7',
    'Session Management': '#0891B2',
    Authorization: '#D97706',
    Compliance: '#DC2626',
  };

  return (
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Security Overview</h1>
        <p style={styles.pageSubtitle}>System security posture and active protection mechanism status</p>
      </div>

      <div style={styles.secNote}>
        Cryptographic keys, biometric vectors, and session tokens are never exposed through this interface.
        Status information is derived from live database queries.
      </div>

      {loading ? (
        <div style={styles.loadingBox}>Loading security status from database...</div>
      ) : items.length === 0 ? (
        <div style={styles.noDataBox}>No data available</div>
      ) : (
        <div style={styles.grid}>
          {items.map(item => (
            <div key={item.name} style={styles.card}>
              <div style={styles.cardTop}>
                <div>
                  <div style={{ ...styles.categoryTag, backgroundColor: `${categoryColors[item.category] || '#64748B'}15`, color: categoryColors[item.category] || '#64748B' }}>
                    {item.category}
                  </div>
                  <h3 style={styles.cardTitle}>{item.name}</h3>
                </div>
                <span style={{ ...styles.badge, ...badgeStyle(item.badge_type) }}>
                  {badgeLabel(item.badge_type)}
                </span>
              </div>

              <p style={styles.cardDesc}>{item.description}</p>

              <div style={styles.metricRow}>
                <span style={styles.metricLabel}>Scope / Metric</span>
                <span style={styles.metricValue}>{item.metric}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security Architecture Summary */}
      <div style={styles.archCard}>
        <h3 style={styles.archTitle}>3FA Authentication Architecture</h3>
        <div style={styles.flowRow}>
          {['Password (Knowledge)', 'AES-256 Face Biometric (Inherence)', 'WebAuthn FIDO2 Token (Possession)', 'RBAC Role Enforcement', 'JWT Session Issued'].map((step, i, arr) => (
            <div key={step} style={styles.flowItem}>
              <div style={styles.flowStep}>
                <div style={styles.flowNum}>{i + 1}</div>
                <div style={styles.flowLabel}>{step}</div>
              </div>
              {i < arr.length - 1 && <div style={styles.flowArrow}>→</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { marginBottom: '1rem' },
  pageTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 },
  pageSubtitle: { fontSize: '0.875rem', color: '#64748B', margin: '0.25rem 0 0 0' },
  secNote: { backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#92400E', marginBottom: '1.25rem' },
  loadingBox: { textAlign: 'center', padding: '3rem', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' },
  noDataBox: { textAlign: 'center', padding: '3rem', color: '#94A3B8', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #E2E8F0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' },
  card: { backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.25rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem' },
  categoryTag: { display: 'inline-block', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '8px', marginBottom: '0.3rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  cardTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0 },
  badge: { display: 'inline-block', padding: '0.25rem 0.65rem', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' as const },
  cardDesc: { fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5, marginBottom: '1rem' },
  metricRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9' },
  metricLabel: { fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 },
  metricValue: { fontSize: '0.8rem', color: '#334155', fontWeight: 700 },
  archCard: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  archTitle: { fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: '1.25rem' },
  flowRow: { display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' as const },
  flowItem: { display: 'flex', alignItems: 'center', gap: '0.25rem' },
  flowStep: { display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px', padding: '0.4rem 0.75rem' },
  flowNum: { width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#0284C7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 },
  flowLabel: { fontSize: '0.78rem', color: '#0369A1', fontWeight: 600 },
  flowArrow: { color: '#94A3B8', fontWeight: 700, fontSize: '1rem', padding: '0 0.1rem' },
};
