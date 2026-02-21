import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PublicLanding from './pages/PublicLanding';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import DeptLogin from './pages/DeptLogin';
import DeptDashboard from './pages/DeptDashboard';
import CareStaffLogin from './pages/CareStaffLogin';
import CareStaffDashboard from './pages/CareStaffDashboard';
import NATPortal from './pages/NATPortal';
import StudentPortal from './pages/StudentPortal';

import { AuthProvider } from './lib/auth';

import ProtectedRoute from './components/ProtectedRoute';
import StudentLogin from './pages/StudentLogin';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<PublicLanding />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Department Routes */}
            <Route path="/department/login" element={<DeptLogin />} />
            <Route path="/department/dashboard" element={
              <ProtectedRoute allowedRoles={['Department Head']}>
                <DeptDashboard />
              </ProtectedRoute>
            } />

            {/* Care Staff Routes */}
            <Route path="/care-staff" element={<CareStaffLogin />} />
            <Route path="/care-staff/dashboard" element={
              <ProtectedRoute allowedRoles={['Care Staff']}>
                <CareStaffDashboard />
              </ProtectedRoute>
            } />

            {/* NAT Portal (Self-contained) */}
            <Route path="/nat" element={<NATPortal />} />

            {/* Student Routes */}
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student" element={
              <ProtectedRoute allowedRoles={['Student']}>
                <StudentPortal />
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
