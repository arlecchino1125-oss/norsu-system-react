import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './lib/auth';

import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/toast/ToastProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute freshness
      refetchOnWindowFocus: false,
    },
  },
});

const PublicLanding = lazy(() => import('./pages/PublicLandingV2'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const DeptLogin = lazy(() => import('./pages/DeptLogin'));
const CareStaffLogin = lazy(() => import('./pages/CareStaffLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const RolePermissionsPage = lazy(() => import('./pages/admin/features/permissions/components/RolePermissionsPage'));
const DeptDashboard = lazy(() => import('./pages/DeptDashboard'));
const CareStaffDashboard = lazy(() => import('./pages/CareStaffDashboard'));
const NATPortal = lazy(() => import('./pages/NATPortal'));
const StudentPortal = lazy(() => import('./pages/StudentPortal'));
const StudentLogin = lazy(() => import('./pages/StudentLogin'));
const RegistrarLogin = lazy(() => import('./pages/registrar/RegistrarLogin'));
const RegistrarPortal = lazy(() => import('./pages/registrar/RegistrarPortal'));

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
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Router>
          <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={
                <LazyRoute>
                  <PublicLanding />
                </LazyRoute>
              } />
              <Route path="/privacy-policy" element={
                <LazyRoute>
                  <PrivacyPolicy />
                </LazyRoute>
              } />

              {/* Admin Routes */}
              <Route path="/admin" element={
                <LazyRoute>
                  <AdminLogin />
                </LazyRoute>
              } />
              <Route path="/admin/dashboard" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <LazyRoute>
                    <AdminDashboard />
                  </LazyRoute>
                </ProtectedRoute>
              } />
              <Route path="/admin/permissions" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <LazyRoute>
                    <RolePermissionsPage />
                  </LazyRoute>
                </ProtectedRoute>
              } />

              {/* Department Routes */}
              <Route path="/department/login" element={
                <LazyRoute>
                  <DeptLogin />
                </LazyRoute>
              } />
              <Route path="/department/dashboard" element={
                <Navigate to="/department/dashboard/dashboard" replace />
              } />
              <Route path="/department/dashboard/:tab" element={
                <ProtectedRoute allowedRoles={['Department Head']}>
                  <LazyRoute>
                    <DeptDashboard />
                  </LazyRoute>
                </ProtectedRoute>
              } />

              {/* Care Staff Routes */}
              <Route path="/care-staff" element={
                <LazyRoute>
                  <CareStaffLogin />
                </LazyRoute>
              } />
              <Route path="/care-staff/dashboard" element={
                <Navigate to="/care-staff/dashboard/home" replace />
              } />
              <Route path="/care-staff/dashboard/:tab" element={
                <ProtectedRoute allowedRoles={['Care Staff']}>
                  <LazyRoute>
                    <CareStaffDashboard />
                  </LazyRoute>
                </ProtectedRoute>
              } />

              {/* Registrar Routes */}
              <Route path="/registrar/login" element={
                <LazyRoute>
                  <RegistrarLogin />
                </LazyRoute>
              } />
              <Route path="/registrar/dashboard" element={
                <ProtectedRoute allowedRoles={['Registrar']}>
                  <LazyRoute>
                    <RegistrarPortal />
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
                <Navigate to="/student/dashboard" replace />
              } />
              <Route path="/student/:view" element={
                <ProtectedRoute allowedRoles={['Student']}>
                  <LazyRoute>
                    <StudentPortal />
                  </LazyRoute>
                </ProtectedRoute>
              } />
              <Route path="/student/:view/:section" element={
                <ProtectedRoute allowedRoles={['Student']}>
                  <LazyRoute>
                    <StudentPortal />
                  </LazyRoute>
                </ProtectedRoute>
              } />
            </Routes>
          </ToastProvider>
          </AuthProvider>
        </Router>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
