import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { LoginView } from './pages/auth/LoginView';
import { RegisterView } from './pages/auth/RegisterView';
import { DashboardView } from './pages/dashboard/DashboardView';
import { ProjectListView } from './pages/projects/ProjectListView';
import { CaseListView } from './pages/cases/CaseListView';
import { CaseWizardView } from './pages/cases/CaseWizardView';
import { RateManagementView } from './pages/admin/RateManagementView';
import { DepreciationFactorsView } from './pages/admin/DepreciationFactorsView';
import { AuditLogView } from './pages/admin/AuditLogView';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gov-bg flex items-center justify-center text-slate-500 text-xs font-semibold">
        Verifying institutional credentials...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Guard (redirect to dashboard if logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gov-bg flex items-center justify-center text-slate-500 text-xs font-semibold">
        Loading...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginView />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterView />
          </PublicRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardView />} />
        <Route path="/projects" element={<ProjectListView />} />
        <Route path="/cases" element={<CaseListView />} />
        <Route path="/cases/:id" element={<CaseWizardView />} />
        <Route path="/rates" element={<RateManagementView />} />
        <Route path="/depreciation-factors" element={<DepreciationFactorsView />} />
        <Route path="/audit-logs" element={<AuditLogView />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
