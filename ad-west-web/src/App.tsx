import { ToastProvider } from './components/common/Toast';
import { ConfirmDialogProvider } from './components/common/ConfirmDialog';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/auth-context';
import { ThemeProvider } from './context/ThemeContext';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { MemberPortalPage } from './pages/MemberPortalPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { ForcePasswordChangePage } from './pages/ForcePasswordChangePage';

function AppContent() {
  const { adminUser, memberUser, mustResetPassword } = useAuth();

  if (adminUser && mustResetPassword) {
    return <ForcePasswordChangePage />;
  }

  if (adminUser) {
    return <AdminDashboardPage />;
  }

  if (memberUser) {
    return <MemberPortalPage onBack={() => undefined} />;
  }

  return <AdminLoginPage />;
}

function App() {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}

export default App;
