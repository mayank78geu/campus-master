import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import LandingPage from './pages/LandingPage';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentDashboard from './pages/StudentDashboard';
import CourseSpacePage from './pages/CourseSpacePage';

function DashboardRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ maxWidth: '1240px', margin: '4rem auto', textAlign: 'center', color: 'var(--ink-muted)' }}>
        Loading dashboard...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return user.role === 'FACULTY' ? <FacultyDashboard /> : <StudentDashboard />;
}

function MainApp() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [authInitialRole, setAuthInitialRole] = useState('FACULTY');

  const handleOpenAuth = (mode = 'login', role = 'FACULTY') => {
    setAuthInitialMode(mode);
    setAuthInitialRole(role);
    setAuthModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar onOpenAuth={handleOpenAuth} />

      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<LandingPage onOpenAuth={handleOpenAuth} />} />
          <Route path="/dashboard" element={<DashboardRouter />} />
          <Route path="/courses/:id" element={<CourseSpacePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authInitialMode}
        initialRole={authInitialRole}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <MainApp />
      </Router>
    </AuthProvider>
  );
}
