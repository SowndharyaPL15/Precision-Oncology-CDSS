import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  adminOnly?: boolean;
}

export default function ProtectedRoute({ allowedRoles, adminOnly }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admin-only routes: only 'admin' role can access
  if (adminOnly) {
    if (!isAuthenticated) {
      return <Navigate to="/admin/login" replace />;
    }
    if (user?.role !== 'admin') {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ textAlign: 'center', backgroundColor: '#1E293B', borderRadius: '16px', padding: '2.5rem', maxWidth: '420px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
            <h2 style={{ color: '#F1F5F9', fontWeight: 700, fontSize: '1.3rem', marginBottom: '0.5rem' }}>403 — Access Denied</h2>
            <p style={{ color: '#94A3B8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>This area is restricted to System Administrators only. Your current role does not have admin privileges.</p>
            <a href="/dashboard" style={{ backgroundColor: '#0284C7', color: '#fff', padding: '0.65rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>Return to Clinical Portal</a>
          </div>
        </div>
      );
    }
  }

  if (allowedRoles && allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-5 text-center">
        <h3 className="text-danger fw-bold">403 — Unauthorized Access</h3>
        <p className="text-muted">Your role (<strong>{user.role}</strong>) does not have authorization to access this clinical module.</p>
        <a href="/dashboard" className="btn btn-primary mt-3">Return to Main Dashboard</a>
      </div>
    );
  }

  return <Outlet />;
}
