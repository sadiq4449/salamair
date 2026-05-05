import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { ToastContainer } from './components/ui/Toast';
import { useToastStore } from './store/toastStore';
import api from './services/api';
import { useNotificationSocket } from './hooks/useNotificationSocket';
import { Loader2 } from 'lucide-react';
import SalamAirBrandLogo from './components/branding/SalamAirBrandLogo';
import type { UserRole } from './types';
import { agentRoutes } from './routes/agentRoutes';
import { salesRoutes } from './routes/salesRoutes';
import { sharedRoutes } from './routes/sharedRoutes';
import { AdminLayoutLazy, adminChildRoutes } from './routes/adminRoutes';

const AppLayout = lazy(() => import('./components/Layout/AppLayout'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));

function RouteFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-gray-950 px-4">
      <SalamAirBrandLogo heightClass="h-10" className="opacity-95" />
      <Loader2 className="h-8 w-8 animate-spin text-[#00A9C1]" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-gray-950 px-4">
        <SalamAirBrandLogo
          heightClass="h-10"
          className="opacity-95"
        />
        <Loader2 className="h-8 w-8 animate-spin text-[#00A9C1]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RoleRoute({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

/** Admins see analytics on the main Dashboard; keep /analytics for agents & sales only. */
function AnalyticsEntry() {
  const { user } = useAuth();
  if (user?.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Analytics />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-gray-950 px-4">
        <SalamAirBrandLogo
          heightClass="h-10"
          className="opacity-95"
        />
        <Loader2 className="h-8 w-8 animate-spin text-[#00A9C1]" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function NotificationSocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <NotificationSocketInner>{children}</NotificationSocketInner>;
  }
  return <>{children}</>;
}

function NotificationSocketInner({ children }: { children: React.ReactNode }) {
  useNotificationSocket();
  return <>{children}</>;
}

function AppInit({ children }: { children: React.ReactNode }) {
  const { loadUser } = useAuth();

  useEffect(() => {
    loadUser();
    api.get('/auth/csrf').catch(() => {});
  }, [loadUser]);

  return <NotificationSocketProvider>{children}</NotificationSocketProvider>;
}

export default function App() {
  const { toasts, removeToast } = useToastStore();

  return (
    <BrowserRouter>
      <AppInit>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />

              {agentRoutes.map(({ path, roles, Component }) => (
                <Route key={path} path={path} element={<RoleRoute roles={roles}><Component /></RoleRoute>} />
              ))}

              {salesRoutes.map(({ path, roles, Component }) => (
                <Route key={path} path={path} element={<RoleRoute roles={roles}><Component /></RoleRoute>} />
              ))}

              {sharedRoutes.map(({ path, roles, Component }) => (
                <Route key={path} path={path} element={<RoleRoute roles={roles}><Component /></RoleRoute>} />
              ))}

              <Route
                path="/analytics"
                element={
                  <RoleRoute roles={['agent', 'sales', 'admin']}>
                    <AnalyticsEntry />
                  </RoleRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <RoleRoute roles={['admin']}>
                    <AdminLayoutLazy />
                  </RoleRoute>
                }
              >
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                {adminChildRoutes.map(({ path, Component }) => (
                  <Route key={path} path={path} element={<Component />} />
                ))}
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AppInit>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </BrowserRouter>
  );
}
