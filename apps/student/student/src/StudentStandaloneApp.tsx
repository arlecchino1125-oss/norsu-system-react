import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';

import ErrorBoundary from '../../../../src/components/ErrorBoundary';
import ProtectedRoute from '../../../../src/components/ProtectedRoute';
import { AuthProvider } from '../../../../src/lib/auth';

const StudentLogin = lazy(() => import('../../../../src/pages/StudentLogin'));
const StudentPortal = lazy(() => import('../../../../src/pages/StudentPortal'));

const RouteLoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
      <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      <h2 className="text-lg font-bold text-slate-900">Loading Student Portal</h2>
      <p className="mt-2 text-sm text-slate-500">Preparing your student workspace...</p>
    </div>
  </div>
);

const LazyRoute = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<RouteLoadingFallback />}>
    {children}
  </Suspense>
);

export default function StudentStandaloneApp() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/student/login" replace />} />
            <Route path="/login" element={<Navigate to="/student/login" replace />} />
            <Route
              path="/student/login"
              element={
                <LazyRoute>
                  <StudentLogin />
                </LazyRoute>
              }
            />
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['Student']}>
                  <LazyRoute>
                    <StudentPortal />
                  </LazyRoute>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/student/login" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
