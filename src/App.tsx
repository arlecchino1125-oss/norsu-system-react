import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PublicLanding from './pages/PublicLandingV2';
import AdminLogin from './pages/AdminLogin';
import DeptLogin from './pages/DeptLogin';
import CareStaffLogin from './pages/CareStaffLogin';

import { AuthProvider } from './lib/auth';

import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const DeptDashboard = lazy(() => import('./pages/DeptDashboard'));
const CareStaffDashboard = lazy(() => import('./pages/CareStaffDashboard'));
const NATPortal = lazy(() => import('./pages/NATPortal'));
const StudentPortal = lazy(() => import('./pages/StudentPortal'));
const StudentLogin = lazy(() => import('./pages/StudentLogin'));

const RouteLoadingFallback = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-violet-500" />
      <h2 className="text-lg font-bold text-slate-900">Loading Page</h2>
      <p className="mt-2 text-sm text-slate-500">Preparing the next portal view...</p>
    </div>
  </div>
);

const LazyRoute = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<RouteLoadingFallback />}>
    {children}
  </Suspense>
);

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
                <LazyRoute>
                  <AdminDashboard />
                </LazyRoute>
              </ProtectedRoute>
            } />

            {/* Department Routes */}
            <Route path="/department/login" element={<DeptLogin />} />
            <Route path="/department/dashboard" element={
              <ProtectedRoute allowedRoles={['Department Head']}>
                <LazyRoute>
                  <DeptDashboard />
                </LazyRoute>
              </ProtectedRoute>
            } />

            {/* Care Staff Routes */}
            <Route path="/care-staff" element={<CareStaffLogin />} />
            <Route path="/care-staff/dashboard" element={
              <ProtectedRoute allowedRoles={['Care Staff']}>
                <LazyRoute>
                  <CareStaffDashboard />
                </LazyRoute>
              </ProtectedRoute>
            } />

            {/* NAT Portal (Self-contained) */}
            <Route path="/nat" element={
              <LazyRoute>
                <NATPortal />
              </LazyRoute>
            } />

            {/* Student Routes */}
            <Route path="/student/login" element={
              <LazyRoute>
                <StudentLogin />
              </LazyRoute>
            } />
            <Route path="/student" element={
              <ProtectedRoute allowedRoles={['Student']}>
                <LazyRoute>
                  <StudentPortal />
                </LazyRoute>
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
