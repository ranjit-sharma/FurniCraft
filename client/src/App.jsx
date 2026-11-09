import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppLayout, PageLoader } from './components/layout/AppLayout';

// Pages load on demand so phones download only the screen they open.
const page = (name) => lazy(() => import(`./pages/${name}.jsx`).then((m) => ({ default: m[name] })));
const LoginPage = page('LoginPage');
const ThekedarRegisterPage = page('ThekedarRegisterPage');
const ThekedarDashboard = page('ThekedarDashboard');
const OwnerDashboard = page('OwnerDashboard');
const ProjectsPage = page('ProjectsPage');
const ProjectDetailPage = page('ProjectDetailPage');
const WorkersPage = page('WorkersPage');
const ThekedarsPage = page('ThekedarsPage');
const ExpensesPage = page('ExpensesPage');
const AuditLogsPage = page('AuditLogsPage');
const TransactionSearchPage = page('TransactionSearchPage');
const MembersOverviewPage = page('MembersOverviewPage');
const QuotationsPage = page('QuotationsPage');

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const DashboardRouter = () => {
  const { user } = useAuth();
  if (user?.role === 'THEKEDAR') return <ThekedarDashboard />;
  if (user?.role === 'OWNER') return <OwnerDashboard />;
  return <Navigate to="/login" replace />;
};

const RootRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AppLayout />;
};

export const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <ThemeProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register-thekedar" element={<ThekedarRegisterPage />} />
              <Route path="/register" element={<Navigate to="/register-thekedar" replace />} />

              <Route
                path="/"
                element={<RootRoute />}
              >
                <Route index element={<DashboardRouter />} />
                <Route path="dashboard" element={<Navigate to="/" replace />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/:projectId" element={<ProjectDetailPage />} />
                <Route path="attendance" element={<Navigate to="/workers" replace />} />
                <Route path="transactions/search" element={<TransactionSearchPage />} />
                <Route
                  path="thekedars"
                  element={
                    <ProtectedRoute allowedRoles={['OWNER']}>
                      <ThekedarsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="workers"
                  element={
                    <ProtectedRoute allowedRoles={['OWNER', 'THEKEDAR']}>
                      <WorkersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="expenses"
                  element={
                    <ProtectedRoute allowedRoles={['OWNER', 'THEKEDAR']}>
                      <ExpensesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <ProtectedRoute allowedRoles={['OWNER']}>
                      <AuditLogsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="members"
                  element={
                    <ProtectedRoute allowedRoles={['OWNER']}>
                      <MembersOverviewPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="quotations"
                  element={
                    <ProtectedRoute allowedRoles={['THEKEDAR']}>
                      <QuotationsPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
          </ThemeProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
