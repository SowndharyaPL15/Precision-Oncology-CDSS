import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import theme from './theme/theme';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import { AuthProvider, useAuth } from './context/AuthContext';

// Public Pages
import HomePage from './pages/Home';
import AboutPage from './pages/About';
import HowItWorksPage from './pages/HowItWorks';
import TechnologyPage from './pages/Technology';
import SecurityPage from './pages/SecurityPage';
import ContactPage from './pages/Contact';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Clinical Portal Pages
import Dashboard from './pages/Dashboard';
import PatientManagement from './pages/PatientManagement';
import AddPatient from './pages/PatientManagement/AddPatient';
import EditPatient from './pages/PatientManagement/EditPatient';
import PatientHistory from './pages/PatientManagement/PatientHistory';
import LungPrediction from './pages/Predictions/LungPrediction';
import BreastPrediction from './pages/Predictions/BreastPrediction';
import PredictionResult from './pages/PredictionResult';
import Reports from './pages/Reports';
import ModelComparison from './pages/ModelComparison';
import Analytics from './pages/Analytics';
import DoctorProfile from './pages/DoctorProfile';
import Settings from './pages/Settings';

// Admin Portal Pages
import AdminLogin from './pages/Admin/AdminLogin';
import AdminSignup from './pages/Admin/AdminSignup';
import AdminDashboard from './pages/Admin/Dashboard';
import UserManagement from './pages/Admin/UserManagement';
import RolesPermissions from './pages/Admin/RolesPermissions';
import AuditLogs from './pages/Admin/AuditLogs';
import SecurityOverview from './pages/Admin/SecurityOverview';
import SystemMonitor from './pages/Admin/SystemMonitor';
import AIModels from './pages/Admin/AIModels';
import AdminSettings from './pages/Admin/AdminSettings';

import ProtectedRoute from './components/ProtectedRoute';

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      {/* ─────────────────────────── PUBLIC ROUTES ─────────────────────────── */}
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/technology" element={<TechnologyPage />} />
      <Route path="/security" element={<SecurityPage />} />
      <Route path="/contact" element={<ContactPage />} />

      {/* Auth routes — redirect authenticated users to their portal */}
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />
            : <Login />
        }
      />
      <Route
        path="/signup"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
      />
      <Route
        path="/admin/login"
        element={
          isAuthenticated && user?.role === 'admin'
            ? <Navigate to="/admin/dashboard" replace />
            : <AdminLogin />
        }
      />
      <Route
        path="/admin/signup"
        element={
          isAuthenticated && user?.role === 'admin'
            ? <Navigate to="/admin/dashboard" replace />
            : <AdminSignup />
        }
      />

      {/* ─────────────────────────── CLINICAL PORTAL ─────────────────────────── */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Patient Routes */}
          <Route element={<ProtectedRoute allowedRoles={['doctor', 'pathologist', 'admin']} />}>
            <Route path="patients" element={<PatientManagement />} />
            <Route path="patients/add" element={<AddPatient />} />
            <Route path="patients/:id/edit" element={<EditPatient />} />
            <Route path="patients/:id/history" element={<PatientHistory />} />
          </Route>

          {/* Prediction & Slide Routes */}
          <Route element={<ProtectedRoute allowedRoles={['doctor', 'pathologist', 'admin']} />}>
            <Route path="predict/lung" element={<LungPrediction />} />
            <Route path="predict/breast" element={<BreastPrediction />} />
            <Route path="result/:predictionId" element={<PredictionResult />} />
            <Route path="reports" element={<Reports />} />
          </Route>

          {/* Analytics & Comparison */}
          <Route path="comparison" element={<ModelComparison />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="profile" element={<DoctorProfile />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      {/* ─────────────────────────── ADMIN PORTAL ─────────────────────────── */}
      <Route element={<ProtectedRoute adminOnly />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/roles" element={<RolesPermissions />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
          <Route path="/admin/security" element={<SecurityOverview />} />
          <Route path="/admin/system-monitor" element={<SystemMonitor />} />
          <Route path="/admin/models" element={<AIModels />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} />
    </ThemeProvider>
  );
}

export default App;
