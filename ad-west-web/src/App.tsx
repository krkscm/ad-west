import { useState } from 'react';
import { ToastProvider } from './components/common/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { MemberPortalPage } from './pages/MemberPortalPage';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'admin' | 'member'>('landing');
  const { adminUser } = useAuth();

  // Simple state-based router
  switch (currentPage) {
    case 'admin':
      if (adminUser) {
        return <AdminDashboardPage />;
      }
      return <AdminLoginPage onBack={() => setCurrentPage('landing')} />;
    case 'member':
      return <MemberPortalPage onBack={() => setCurrentPage('landing')} />;
    case 'landing':
    default:
      return <LandingPage onNavigate={(dest) => setCurrentPage(dest)} />;
  }
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
