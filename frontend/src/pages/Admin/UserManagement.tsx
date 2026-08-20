import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/client';
import {
  FaSearch, FaUserCheck, FaUserTimes, FaShieldAlt, FaFingerprint,
  FaKey, FaLock, FaUnlock, FaEye, FaChevronDown
} from 'react-icons/fa';

interface SecurityStatus {
  face_auth_enrolled: boolean;
  webauthn_enrolled: boolean;
  account_locked: boolean;
}
interface UserRecord {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  failed_attempts: number;
  last_login: string | null;
  created_at: string | null;
  security_status: SecurityStatus;
}

const ROLES = ['All', 'admin', 'doctor', 'pathologist'];
const STATUS_OPTIONS = ['All', 'Active', 'Inactive'];

export default function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const limit = 15;

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit, offset: page * limit };
      if (search) params.search = search;
      if (roleFilter !== 'All') params.role = roleFilter;
      if (statusFilter === 'Active') params.is_active = 'true';
      if (statusFilter === 'Inactive') params.is_active = 'false';

      const res = await apiClient.get('/admin/users', { params });
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleStatusToggle = async (u: UserRecord) => {
    setActionLoading(u.user_id + '_status');
    try {
      await apiClient.put(`/admin/users/${u.user_id}/status`, { is_active: !u.is_active });
      showToast(`User ${u.is_active ? 'deactivated' : 'activated'} successfully.`);
      fetchUsers();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Status update failed.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (u: UserRecord, newRole: string) => {
    setActionLoading(u.user_id + '_role');
    try {
      await apiClient.put(`/admin/users/${u.user_id}/role`, { role: newRole });
      showToast(`Role updated to '${newRole}' for ${u.full_name}.`);
      fetchUsers();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Role update failed.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const roleBadge = (role: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      admin: { bg: '#EDE9FE', color: '#6D28D9' },
      doctor: { bg: '#E0F2FE', color: '#075985' },
      pathologist: { bg: '#D1FAE5', color: '#065F46' },
    };
    const style = map[role] || { bg: '#F1F5F9', color: '#334155' };
    return (
      <span style={{ ...styles.badge, backgroundColor: style.bg, color: style.color }}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ ...styles.toast, backgroundColor: toast.type === 'success' ? '#D1FAE5' : '#FEE2E2', color: toast.type === 'success' ? '#065F46' : '#991B1B', border: `1px solid ${toast.type === 'success' ? '#6EE7B7' : '#FCA5A5'}` }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>User Management</h1>
          <p style={styles.pageSubtitle}>{total} total users — Manage clinical users and administrators</p>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filtersRow}>
        <div style={styles.searchBox}>
          <FaSearch style={{ color: '#94A3B8', position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.filterGroup}>
          {ROLES.map(r => (
            <button key={r} onClick={() => { setRoleFilter(r); setPage(0); }}
              style={{ ...styles.filterBtn, ...(roleFilter === r ? styles.filterBtnActive : {}) }}>
              {r}
            </button>
          ))}
        </div>
        <div style={styles.filterGroup}>
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(0); }}
              style={{ ...styles.filterBtn, ...(statusFilter === s ? styles.filterBtnActive : {}) }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Name / Email', 'Role', 'Status', 'Security', 'Last Login', 'Created', 'Actions'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={styles.emptyCell}>Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} style={styles.emptyCell}>No users found.</td></tr>
              ) : users.map((u) => (
                <tr key={u.user_id} style={styles.tr}>
                  {/* Name/Email */}
                  <td style={styles.td}>
                    <div style={styles.userCell}>
                      <div style={{ ...styles.avatar, backgroundColor: u.role === 'admin' ? '#7C3AED' : u.role === 'doctor' ? '#0284C7' : '#10B981' }}>
                        {u.full_name.charAt(0)}
                      </div>
                      <div>
                        <div style={styles.userName}>{u.full_name}</div>
                        <div style={styles.userEmail}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  {/* Role */}
                  <td style={styles.td}>{roleBadge(u.role)}</td>
                  {/* Status */}
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, backgroundColor: u.is_active ? '#D1FAE5' : '#FEE2E2', color: u.is_active ? '#065F46' : '#991B1B' }}>
                      {u.is_active ? '● Active' : '● Inactive'}
                    </span>
                  </td>
                  {/* Security */}
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <span title="Face Auth" style={{ ...styles.secIcon, color: u.security_status.face_auth_enrolled ? '#10B981' : '#CBD5E1' }}><FaFingerprint /></span>
                      <span title="WebAuthn" style={{ ...styles.secIcon, color: u.security_status.webauthn_enrolled ? '#0284C7' : '#CBD5E1' }}><FaKey /></span>
                      {u.security_status.account_locked && <span title="Account Locked" style={{ ...styles.secIcon, color: '#DC2626' }}><FaLock /></span>}
                      {u.failed_attempts > 0 && <span style={styles.failBadge}>{u.failed_attempts} fail</span>}
                    </div>
                  </td>
                  {/* Last Login */}
                  <td style={styles.td}>{u.last_login ? new Date(u.last_login).toLocaleDateString() : '—'}</td>
                  {/* Created */}
                  <td style={styles.td}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                  {/* Actions */}
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button onClick={() => setSelectedUser(u)} style={styles.actionBtn} title="View Security Details">
                        <FaEye />
                      </button>
                      <button
                        onClick={() => handleStatusToggle(u)}
                        disabled={actionLoading === u.user_id + '_status'}
                        style={{ ...styles.actionBtn, color: u.is_active ? '#DC2626' : '#10B981' }}
                        title={u.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {u.is_active ? <FaUserTimes /> : <FaUserCheck />}
                      </button>
                      <div style={{ position: 'relative' }}>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          disabled={actionLoading === u.user_id + '_role'}
                          style={styles.roleSelect}
                        >
                          {['doctor', 'pathologist', 'admin'].map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={styles.pagination}>
          <span style={styles.paginationInfo}>Showing {Math.min(page * limit + 1, total)}–{Math.min((page + 1) * limit, total)} of {total}</span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i)}
                style={{ ...styles.pageBtn, ...(i === page ? styles.pageBtnActive : {}) }}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Security Detail Modal */}
      {selectedUser && (
        <div style={styles.modalOverlay} onClick={() => setSelectedUser(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Security Status — {selectedUser.full_name}</h3>
              <button onClick={() => setSelectedUser(null)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.secDetailRow}>
                <span>Email</span><strong>{selectedUser.email}</strong>
              </div>
              <div style={styles.secDetailRow}>
                <span>Role</span>{roleBadge(selectedUser.role)}
              </div>
              <div style={styles.secDetailRow}>
                <span>Account Status</span>
                <span style={{ color: selectedUser.is_active ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                  {selectedUser.is_active ? '✓ Active' : '✕ Inactive'}
                </span>
              </div>
              <div style={styles.secDetailRow}>
                <span>Face Biometric</span>
                <span style={{ color: selectedUser.security_status.face_auth_enrolled ? '#10B981' : '#94A3B8', fontWeight: 600 }}>
                  <FaFingerprint /> {selectedUser.security_status.face_auth_enrolled ? 'Enrolled' : 'Not Enrolled'}
                </span>
              </div>
              <div style={styles.secDetailRow}>
                <span>WebAuthn Key</span>
                <span style={{ color: selectedUser.security_status.webauthn_enrolled ? '#0284C7' : '#94A3B8', fontWeight: 600 }}>
                  <FaKey /> {selectedUser.security_status.webauthn_enrolled ? 'Registered' : 'Not Registered'}
                </span>
              </div>
              <div style={styles.secDetailRow}>
                <span>Account Locked</span>
                <span style={{ color: selectedUser.security_status.account_locked ? '#DC2626' : '#10B981', fontWeight: 600 }}>
                  {selectedUser.security_status.account_locked ? <><FaLock /> Locked</> : <><FaUnlock /> Unlocked</>}
                </span>
              </div>
              <div style={styles.secDetailRow}>
                <span>Failed Attempts</span><strong>{selectedUser.failed_attempts}</strong>
              </div>
              <div style={styles.secDetailRow}>
                <span>Last Login</span><strong>{selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : 'Never'}</strong>
              </div>
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#FEF9EC', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '0.8rem', color: '#92400E' }}>
                <FaShieldAlt style={{ marginRight: '0.4rem' }} />
                Biometric vector templates are protected and cannot be accessed or modified through this interface.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toast: { position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999, padding: '0.75rem 1.25rem', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  pageTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 },
  pageSubtitle: { fontSize: '0.875rem', color: '#64748B', margin: '0.25rem 0 0 0' },
  filtersRow: { display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' as const },
  searchBox: { position: 'relative', flex: 1, minWidth: '200px' },
  searchInput: { width: '100%', paddingLeft: '2.25rem', paddingRight: '0.75rem', paddingTop: '0.6rem', paddingBottom: '0.6rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' as const },
  filterGroup: { display: 'flex', gap: '0.25rem', backgroundColor: '#F1F5F9', borderRadius: '8px', padding: '0.2rem' },
  filterBtn: { padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: 'pointer', color: '#64748B', backgroundColor: 'transparent' },
  filterBtnActive: { backgroundColor: '#FFFFFF', color: '#0284C7', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  tableCard: { backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, fontSize: '0.72rem', fontWeight: 700, color: '#64748B', padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  tr: { transition: 'background 0.1s' },
  td: { fontSize: '0.85rem', color: '#334155', padding: '0.85rem 1rem', borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' as const },
  emptyCell: { textAlign: 'center' as const, padding: '3rem', color: '#94A3B8', fontSize: '0.9rem' },
  badge: { display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 },
  userCell: { display: 'flex', alignItems: 'center', gap: '0.65rem' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 },
  userName: { fontWeight: 600, fontSize: '0.88rem', color: '#0F172A' },
  userEmail: { fontSize: '0.75rem', color: '#64748B' },
  secIcon: { fontSize: '1rem' },
  failBadge: { fontSize: '0.65rem', backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.15rem 0.35rem', borderRadius: '10px', fontWeight: 700 },
  actions: { display: 'flex', gap: '0.4rem', alignItems: 'center' },
  actionBtn: { width: '30px', height: '30px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '0.85rem' },
  roleSelect: { padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.78rem', cursor: 'pointer', backgroundColor: '#F8FAFC', color: '#334155' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #F1F5F9' },
  paginationInfo: { fontSize: '0.8rem', color: '#64748B' },
  pageBtn: { width: '30px', height: '30px', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', backgroundColor: '#F8FAFC', color: '#64748B' },
  pageBtnActive: { backgroundColor: '#0284C7', color: '#fff', borderColor: '#0284C7' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { backgroundColor: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0' },
  modalTitle: { fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0 },
  closeBtn: { border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '1.1rem', color: '#64748B' },
  modalBody: { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  secDetailRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', paddingBottom: '0.6rem', borderBottom: '1px solid #F1F5F9' },
};
