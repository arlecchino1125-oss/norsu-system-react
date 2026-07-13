import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './lib/auth';

import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import InAppBrowserBanner from './components/InAppBrowserBanner'; // claude
import DocumentPreviewModal from './components/DocumentPreviewModal';
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

export const LandingPageSkeleton = () => (
  <div
    role="status"
    aria-label="Loading landing page"
    aria-busy="true"
    className="relative min-h-screen overflow-hidden bg-slate-900 px-2.5 py-3 sm:px-4 sm:py-5 md:px-8 md:py-6"
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(124,58,237,0.18),_transparent_32%)]" />
    <span className="sr-only">Loading the CARE Center landing page</span>

    <div className="relative z-10 mx-auto max-w-7xl" aria-hidden="true">
      <div className="mb-4 flex items-center justify-between rounded-3xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md sm:mb-6 sm:rounded-full md:mb-8 md:px-6">
        <div className="flex items-center gap-3">
          <div className="animate-shimmer h-12 w-24 rounded-full" />
          <div className="space-y-2">
            <div className="animate-shimmer h-3 w-20 rounded-full" />
            <div className="animate-shimmer h-2.5 w-40 rounded-full" />
          </div>
        </div>
        <div className="animate-shimmer h-10 w-28 rounded-full" />
      </div>

      <section className="grid gap-5 rounded-[1.5rem] border border-white/15 bg-white/10 p-3.5 backdrop-blur-xl sm:gap-7 sm:rounded-[2rem] sm:p-5 md:grid-cols-[1.05fr_0.95fr] md:gap-10 md:rounded-[2.5rem] md:p-10">
        <div className="space-y-6">
          <div className="grid max-w-xl grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="space-y-2">
                <div className="animate-shimmer h-16 rounded-2xl sm:h-24 md:h-32" />
                <div className="animate-shimmer mx-auto h-2.5 w-4/5 rounded-full" />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="animate-shimmer h-10 w-[92%] rounded-xl sm:h-12" />
            <div className="animate-shimmer h-10 w-3/4 rounded-xl sm:h-12" />
          </div>

          <div className="animate-shimmer h-14 w-full max-w-xl rounded-2xl sm:h-16" />
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:gap-6">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="animate-shimmer h-32 rounded-2xl sm:h-40 sm:rounded-[1.5rem] md:rounded-[2rem]" />
          ))}
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-8 sm:gap-4 md:mt-10 md:grid-cols-4 md:gap-6">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="animate-shimmer h-28 rounded-2xl sm:h-32 sm:rounded-[1.8rem]" />
        ))}
      </section>
    </div>
  </div>
);

export const CareStaffLoginSkeleton = () => (
  <div
    role="status"
    aria-label="Loading CARE staff login"
    aria-busy="true"
    className="relative flex min-h-screen w-full overflow-hidden bg-[#eef6ff]"
  >
    <div className="absolute inset-0 bg-[linear-gradient(135deg,#eef7ff_0%,#f5f0ff_52%,#eefbf7_100%)]" />
    <div
      className="absolute inset-x-0 top-0 h-[42vh] bg-[linear-gradient(120deg,rgba(14,165,233,0.18),rgba(139,92,246,0.20),rgba(236,72,153,0.12))]"
      style={{ clipPath: 'polygon(0 0, 100% 0, 100% 68%, 0 100%)' }}
    />
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.08]"
      style={{
        backgroundImage: 'linear-gradient(to right, #0f172a 1px, transparent 1px), linear-gradient(to bottom, #0f172a 1px, transparent 1px)',
        backgroundSize: '44px 44px'
      }}
    />
    <span className="sr-only">Loading the CARE staff login page</span>

    <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-5 py-6 sm:px-8 sm:py-8 lg:px-10" aria-hidden="true">
      <div className="grid w-full max-w-6xl items-center gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.85fr)] xl:gap-14">
        <div className="mx-auto w-full max-w-2xl lg:mx-0 lg:max-w-xl">
          <div className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex -space-x-3">
              <div className="animate-shimmer h-16 w-16 rounded-full border-[3px] border-white shadow-xl sm:h-24 sm:w-24" />
              <div className="animate-shimmer h-16 w-16 rounded-full border-[3px] border-white shadow-xl sm:h-24 sm:w-24" />
            </div>
            <div className="space-y-3">
              <div className="animate-shimmer h-3 w-28 rounded-full" />
              <div className="animate-shimmer h-10 w-64 rounded-xl sm:h-14 sm:w-80" />
            </div>
          </div>

          <div className="mb-6 h-1.5 w-24 rounded-full bg-violet-300/70" />
          <div className="space-y-3">
            <div className="animate-shimmer h-5 w-full rounded-full" />
            <div className="animate-shimmer h-5 w-[92%] rounded-full" />
            <div className="animate-shimmer h-5 w-2/3 rounded-full" />
          </div>

          <div className="mt-8 hidden grid-cols-3 gap-3 sm:grid">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3">
                <div className="animate-shimmer mb-2 h-2.5 w-3/4 rounded-full" />
                <div className="animate-shimmer h-3.5 w-5/6 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex w-full items-center justify-center lg:justify-end">
          <div className="w-full max-w-[430px] overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-[0_34px_90px_-35px_rgba(30,41,59,0.58)] sm:p-9">
            <div className="mx-auto mb-3 animate-shimmer h-8 w-44 rounded-xl" />
            <div className="mx-auto mb-8 animate-shimmer h-3.5 w-56 rounded-full" />

            <div className="space-y-5">
              {[0, 1].map((item) => (
                <div key={item} className="space-y-2">
                  <div className="animate-shimmer h-3 w-24 rounded-full" />
                  <div className="animate-shimmer h-14 w-full rounded-2xl" />
                </div>
              ))}
              <div className="animate-shimmer h-14 w-full rounded-2xl" />
              <div className="animate-shimmer h-16 w-full rounded-2xl" />
              <div className="mx-auto animate-shimmer h-9 w-48 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const LazyRoute = ({ children, fallback = <RouteLoadingFallback /> }: { children: ReactNode; fallback?: ReactNode }) => (
  <Suspense fallback={fallback}>
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
            <InAppBrowserBanner /> {/* claude */}
            <DocumentPreviewModal />
            <Routes>
              <Route path="/" element={
                <LazyRoute fallback={<LandingPageSkeleton />}>
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
                <LazyRoute fallback={<CareStaffLoginSkeleton />}>
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
