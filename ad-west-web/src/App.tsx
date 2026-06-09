import { ToastProvider } from './components/common/Toast';
import { ConfirmDialogProvider } from './components/common/ConfirmDialog';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/auth-context';
import { ThemeProvider } from './context/ThemeContext';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { MemberPortalPage } from './pages/MemberPortalPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { ForcePasswordChangePage } from './pages/ForcePasswordChangePage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { PublicHelpdeskPage } from './pages/public/PublicHelpdeskPage';
import { PublicJobsPage } from './pages/public/PublicJobsPage';
import { PublicEventRegistrationPage } from './pages/public/PublicEventRegistrationPage';
import { PublicContactRegistrationPage } from './pages/public/PublicContactRegistrationPage';
import { PublicPortalPage } from './pages/public/PublicPortalPage';
import { AppLoader } from './components/common/AppLoader';
import { InternalLinkInterceptor } from './components/common/InternalLinkInterceptor';
import { usePathname } from './hooks/usePathname';

function isPublicOnlyPath(pathname: string): boolean {
  return pathname === '/helpdesk'
    || pathname === '/join-us'
    || pathname === '/jobs'
    || pathname === '/jobs/apply'
    || pathname === '/jobs/post'
    || pathname === '/forgot-password'
    || pathname === '/reset-password'
    || /^\/events\/[^/]+\/register$/.test(pathname);
}

function isPortalPath(pathname: string): boolean {
  return pathname === '/' || pathname === '/portal';
}

function PublicRouteContent({ pathname }: { pathname: string }) {
  if (isPortalPath(pathname)) {
    return <PublicPortalPage />;
  }

  if (pathname === '/helpdesk') {
    return <PublicHelpdeskPage />;
  }

  if (pathname === '/join-us') {
    return <PublicContactRegistrationPage />;
  }

  if (/^\/events\/[^/]+\/register$/.test(pathname)) {
    return <PublicEventRegistrationPage />;
  }

  if (pathname === '/jobs' || pathname === '/jobs/apply' || pathname === '/jobs/post') {
    return <PublicJobsPage />;
  }

  if (pathname === '/forgot-password') {
    return <ForgotPasswordPage />;
  }

  if (pathname === '/reset-password') {
    return <ResetPasswordPage />;
  }

  return null;
}

function AppContent() {
  const pathname = usePathname();
  const { adminUser, memberUser, mustResetPassword, isInitializing, token, memberToken } = useAuth();

  const publicOnly = isPublicOnlyPath(pathname);
  const portal = isPortalPath(pathname);
  const hasStoredSession = Boolean(token || memberToken);

  // Public routes render immediately — do not block on auth initialization.
  if (publicOnly) {
    return <PublicRouteContent pathname={pathname} />;
  }

  if (portal && !adminUser && !memberUser && !hasStoredSession) {
    return <PublicPortalPage />;
  }

  if (isInitializing) {
    return <AppLoader />;
  }

  if (pathname === '/login') {
    if (adminUser && mustResetPassword) return <ForcePasswordChangePage />;
    if (adminUser) return <AdminDashboardPage />;
    if (memberUser) return <MemberPortalPage onBack={() => undefined} />;
    return <AdminLoginPage />;
  }

  if (adminUser && mustResetPassword) return <ForcePasswordChangePage />;
  if (adminUser) return <AdminDashboardPage />;
  if (memberUser) return <MemberPortalPage onBack={() => undefined} />;

  if (portal) {
    return <PublicPortalPage />;
  }

  return <PublicPortalPage />;
}

function App() {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <ThemeProvider>
          <AuthProvider>
            <InternalLinkInterceptor />
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}

export default App;
