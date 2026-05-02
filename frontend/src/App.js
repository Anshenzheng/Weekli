import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WriteReport from './pages/WriteReport';
import MyReports from './pages/MyReports';
import ManageReports from './pages/ManageReports';
import Reminder from './pages/Reminder';
import Statistics from './pages/Statistics';
import TeamManagement from './pages/TeamManagement';
import UserManagement from './pages/UserManagement';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        加载中...
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole) {
    const hasPermission = () => {
      switch (requiredRole) {
        case 'admin':
          return user.role === 'admin';
        case 'manager':
          return user.role === 'admin' || user.role === 'manager';
        case 'member':
          return true;
        default:
          return true;
      }
    };
    
    if (!hasPermission()) {
      return <Navigate to="/" replace />;
    }
  }
  
  return children;
};

const AppContent = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/report/write" element={
          <ProtectedRoute>
            <MainLayout>
              <WriteReport />
            </MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/report/history" element={
          <ProtectedRoute>
            <MainLayout>
              <MyReports />
            </MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/manage/reports" element={
          <ProtectedRoute requiredRole="manager">
            <MainLayout>
              <ManageReports />
            </MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/manage/reminder" element={
          <ProtectedRoute requiredRole="manager">
            <MainLayout>
              <Reminder />
            </MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/stats" element={
          <ProtectedRoute requiredRole="manager">
            <MainLayout>
              <Statistics />
            </MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/manage/teams" element={
          <ProtectedRoute requiredRole="admin">
            <MainLayout>
              <TeamManagement />
            </MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/manage/users" element={
          <ProtectedRoute requiredRole="admin">
            <MainLayout>
              <UserManagement />
            </MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
