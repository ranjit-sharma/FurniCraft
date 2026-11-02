import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { ThekedarRegisterPage } from './pages/ThekedarRegisterPage';
import { WorkerDashboard } from './pages/WorkerDashboard';
import { ThekedarDashboard } from './pages/ThekedarDashboard';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { AttendancePage } from './pages/AttendancePage';
import { PayrollPage } from './pages/PayrollPage';
import { ToolsPage } from './pages/ToolsPage';
import { FinancePage } from './pages/FinancePage';
import { WorkersPage } from './pages/WorkersPage';
import { ThekedarsPage } from './pages/ThekedarsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { DisputesPage } from './pages/DisputesPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { TransactionSearchPage } from './pages/TransactionSearchPage';
import { MembersOverviewPage } from './pages/MembersOverviewPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
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
  if (user?.role === 'WORKER') return <WorkerDashboard />;
  if (user?.role === 'THEKEDAR') return <ThekedarDashboard />;
  if (user?.role === 'OWNER') return <OwnerDashboard />;
  return <div className="p-8 text-center text-slate-700">Unknown user role</div>;
};

export const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <ThemeProvider>
            <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register-thekedar" element={<ThekedarRegisterPage />} />
              <Route path="/register" element={<Navigate to="/register-thekedar" replace />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardRouter />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/:projectId" element={<ProjectDetailPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="payroll" element={<PayrollPage />} />
                <Route
                  path="tools"
                  element={
                    <ProtectedRoute allowedRoles={['THEKEDAR', 'WORKER']}>
                      <ToolsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="finance" element={<FinancePage />} />
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
                <Route path="disputes" element={<DisputesPage />} />
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
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          </ThemeProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
