import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/client';
import { FaSearch, FaCheckCircle, FaTimesCircle, FaFilter, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface AuditLogItem {
  log_id: string;
  user_id: string | null;
  email: string;
  event_type: string;
  status: string;
  ip_address: string;
  user_agent: string;
  auth_factors_used: string[] | null;
  timestamp: string | null;
}

const EVENT_TYPES = [
  '', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'ADMIN_LOGIN_FAILED', 'ADMIN_ACCESS_DENIED_CLINICAL_USER',
  'SIGNUP', 'FACE_ENROLLED', 'FACE_VERIFICATION_SUCCESS', 'FACE_VERIFICATION_FAILED',
  'FINGERPRINT_REPLACED', 'FINGERPRINT_REPLACE_FAILED', 'WEBAUTHN_REVOKED',
  'ACCOUNT_LOCKED', 'ROLE_CHANGED', 'USER_STATUS_CHANGED_ACTIVATED', 'USER_STATUS_CHANGED_DEACTIVATED',
  'REPORT_GENERATED', 'OTP_FALLBACK'
];

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (search) params.search = search;
      if (eventType) params.event_type = eventType;
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get('/admin/audit-logs', { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [search, eventType, statusFilter, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const statusBadge = (status: string) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      backgroundColor: status === 'SUCCESS' ? '#D1FAE5' : '#FEE2E2',
      color: status === 'SUCCESS' ? '#065F46' : '#991B1B',
      padding: '0.2rem 0.55rem', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700
    }}>
      {status === 'SUCCESS' ? <FaCheckCircle /> : <FaTimesCircle />} {status}
    </span>
  );

  const eventBadge = (event: string) => {
    const color = event.includes('FAILED') || event.includes('DENIED') || event.includes('LOCKED')
      ? { bg: '#FEE2E2', text: '#991B1B' }
      : event.includes('SUCCESS') || event.includes('ENROLLED') || event.includes('ACTIVATED')
        ? { bg: '#D1FAE5', text: '#065F46' }
        : { bg: '#F1F5F9', text: '#334155' };
    return (
      <code style={{ fontSize: '0.72rem', backgroundColor: color.bg, color: color.text, padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
        {event}
      </code>
    );
  };

  return (
    <div>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Audit & Security Logs</h1>
          <p style={styles.pageSubtitle}>{total.toLocaleString()} total log entries — Comprehensive authentication and action trail</p>
        </div>
      </div>

      {/* Security Note */}
      <div style={styles.securityNote}>
        Passwords, biometric embeddings, and cryptographic key material are never exposed through audit logs.
        Only event metadata is displayed here for security compliance.
      </div>

      {/* Filters */}
      <div style={styles.filtersRow}>
        <div style={styles.searchWrapper}>
          <FaSearch style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search by email, event, or IP address..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={styles.searchInput}
          />
        </div>

        <select value={eventType} onChange={e => { setEventType(e.target.value); setPage(1); }} style={styles.select}>
          <option value="">All Events</option>
          {EVENT_TYPES.filter(Boolean).map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
        </select>

        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={styles.select}>
          <option value="">All Status</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
        </select>

        <button onClick={() => { setSearch(''); setEventType(''); setStatusFilter(''); setPage(1); }} style={styles.clearBtn}>
          Clear Filters
        </button>
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Timestamp', 'User / Email', 'Event Type', 'Status', 'Auth Factors', 'IP Address', 'Device'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={styles.emptyCell}>Loading audit logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} style={styles.emptyCell}>No audit logs found matching the filters.</td></tr>
              ) : logs.map(log => (
                <tr key={log.log_id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : '—'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#0F172A' }}>{log.email}</div>
                    {log.user_id && <div style={{ fontSize: '0.68rem', color: '#94A3B8', fontFamily: 'monospace' }}>{log.user_id.slice(0, 12)}...</div>}
                  </td>
                  <td style={styles.td}>{eventBadge(log.event_type)}</td>
                  <td style={styles.td}>{statusBadge(log.status)}</td>
                  <td style={styles.td}>
                    {log.auth_factors_used ? (
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {log.auth_factors_used.map(f => (
                          <span key={f} style={{ fontSize: '0.65rem', backgroundColor: '#E0F2FE', color: '#0369A1', padding: '0.15rem 0.4rem', borderRadius: '8px', fontWeight: 600 }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    ) : <span style={{ color: '#CBD5E1' }}>—</span>}
                  </td>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748B' }}>
                    {log.ip_address || '—'}
                  </td>
                  <td style={{ ...styles.td, maxWidth: '180px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.user_agent ? log.user_agent.substring(0, 40) + (log.user_agent.length > 40 ? '...' : '') : '—'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={styles.pagination}>
          <span style={styles.paginationInfo}>
            Page {page} of {totalPages} — {total.toLocaleString()} entries
          </span>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={styles.paginBtn}>
              <FaChevronLeft />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = page <= 4 ? i + 1 : i + page - 3;
              if (p > totalPages) return null;
              return (
                <button key={p} onClick={() => setPage(p)}
                  style={{ ...styles.paginBtn, ...(p === page ? styles.paginBtnActive : {}) }}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={styles.paginBtn}>
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  pageTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 },
  pageSubtitle: { fontSize: '0.875rem', color: '#64748B', margin: '0.25rem 0 0 0' },
  securityNote: { backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#92400E', marginBottom: '1.25rem' },
  filtersRow: { display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' as const },
  searchWrapper: { position: 'relative', flex: 1, minWidth: '220px' },
  searchInput: { width: '100%', paddingLeft: '2.25rem', paddingRight: '0.75rem', paddingTop: '0.6rem', paddingBottom: '0.6rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' as const },
  select: { padding: '0.6rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem', color: '#334155', outline: 'none', cursor: 'pointer' },
  clearBtn: { padding: '0.6rem 1rem', backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#64748B' },
  tableCard: { backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, fontSize: '0.72rem', fontWeight: 700, color: '#64748B', padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textTransform: 'uppercase' as const, letterSpacing: '0.05em', whiteSpace: 'nowrap' as const },
  tr: {},
  td: { fontSize: '0.85rem', color: '#334155', padding: '0.75rem 1rem', borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' as const },
  emptyCell: { textAlign: 'center' as const, padding: '3rem', color: '#94A3B8', fontSize: '0.9rem' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderTop: '1px solid #F1F5F9' },
  paginationInfo: { fontSize: '0.8rem', color: '#64748B' },
  paginBtn: { width: '32px', height: '32px', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', backgroundColor: '#F8FAFC', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  paginBtnActive: { backgroundColor: '#0284C7', color: '#fff', borderColor: '#0284C7' },
};
