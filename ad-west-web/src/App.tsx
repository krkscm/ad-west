import { ToastProvider } from './components/common/Toast';
import { ConfirmDialogProvider } from './components/common/ConfirmDialog';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/auth-context';
import { ThemeProvider } from './context/ThemeContext';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { MemberPortalPage } from './pages/MemberPortalPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { ForcePasswordChangePage } from './pages/ForcePasswordChangePage';
import { PublicHelpdeskPage } from './pages/public/PublicHelpdeskPage';
import { PublicJobsPage } from './pages/public/PublicJobsPage';
import { PublicEventRegistrationPage } from './pages/public/PublicEventRegistrationPage';

function PublicRouteContent() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';

  if (pathname === '/helpdesk') {
    return <PublicHelpdeskPage />;
  }

  if (/^\/events\/[^/]+\/register$/.test(pathname)) {
    return <PublicEventRegistrationPage />;
  }

  if (pathname === '/jobs' || pathname === '/jobs/apply' || pathname === '/jobs/post') {
    return <PublicJobsPage />;
  }

  return null;
}

function AppContent() {
  const publicContent = PublicRouteContent();
  if (publicContent) {
    return publicContent;
  }

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
