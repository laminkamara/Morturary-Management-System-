import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import SimpleDashboard from './components/Dashboard/SimpleDashboard';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import StaffDashboard from './components/Dashboard/StaffDashboard';
import PathologistDashboard from './components/Dashboard/PathologistDashboard';
import BodiesList from './components/Bodies/BodiesList';
import BodyRegistration from './components/Bodies/BodyRegistration';
import StorageManagement from './components/Storage/StorageManagement';
import UserManagement from './components/Users/UserManagement';
import AutopsyManagement from './components/Autopsies/AutopsyManagement';
import TaskManagement from './components/Tasks/TaskManagement';
import ReleaseManagement from './components/Releases/ReleaseManagement';
import ReportsManagement from './components/Reports/ReportsManagement';
import NotificationCenter from './components/Notifications/NotificationCenter';
import SettingsManagement from './components/Settings/SettingsManagement';
import ErrorBoundary from './components/Layout/ErrorBoundary';

const DashboardRouter: React.FC = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'staff':
      return <StaffDashboard />;
    case 'pathologist':
      return <PathologistDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SettingsProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardRouter />} />
                <Route 
                  path="users" 
                  element={
                    <ProtectedRoute>
                      <UserManagement />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="bodies" 
                  element={
                    <ProtectedRoute>
                      <BodiesList />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="bodies/register" 
                  element={
                    <ProtectedRoute>
                      <BodyRegistration />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="storage" 
                  element={
                    <ProtectedRoute>
                      <StorageManagement />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="autopsies" 
                  element={
                    <ProtectedRoute>
                      <AutopsyManagement />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="tasks" 
                  element={
                    <ProtectedRoute>
                      <TaskManagement />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="releases" 
                  element={
                    <ProtectedRoute>
                      <ReleaseManagement />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="reports" 
                  element={
                    <ProtectedRoute>
                      <ReportsManagement />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="notifications" 
                  element={
                    <ProtectedRoute>
                      <NotificationCenter />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="settings" 
                  element={
                    <ProtectedRoute>
                      <SettingsManagement />
                    </ProtectedRoute>
                  } 
                />
              </Route>
            </Routes>
          </Router>
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;