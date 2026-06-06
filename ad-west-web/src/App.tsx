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

function PublicRouteContent() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';

  // Public portal landing page — shown at root for unauthenticated visitors
  if (pathname === '/' || pathname === '/portal') {
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
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';

  // Authenticated users navigating to root or portal — skip public portal, go to dashboard
  const { adminUser, memberUser, mustResetPassword, isInitializing } = useAuth();

  // Only show public routes if the user is not authenticated (or the path is a known public path)
  const isPublicOnlyPath = pathname === '/helpdesk' || pathname === '/join-us' || pathname === '/jobs'
    || pathname === '/jobs/apply' || pathname === '/jobs/post'
    || pathname === '/forgot-password' || pathname === '/reset-password'
    || /^\/events\/[^/]+\/register$/.test(pathname);

  const isPortalPath = pathname === '/' || pathname === '/portal';

  // Public-only paths always show their content regardless of auth
  if (isPublicOnlyPath) {
    const publicContent = PublicRouteContent();
    if (publicContent) return publicContent;
  }

  if (isInitializing) {
    return <AppLoader />;
  }

  // Admin/member login path — render only after session initialization completes.
  if (pathname === '/login') {
    if (adminUser && mustResetPassword) return <ForcePasswordChangePage />;
    if (adminUser) return <AdminDashboardPage />;
    if (memberUser) return <MemberPortalPage onBack={() => undefined} />;
    return <AdminLoginPage />;
  }

  // Authenticated users — go to their workspace
  if (!isInitializing) {
    if (adminUser && mustResetPassword) return <ForcePasswordChangePage />;
    if (adminUser) return <AdminDashboardPage />;
    if (memberUser) return <MemberPortalPage onBack={() => undefined} />;
  }

  // Unauthenticated users at root or /portal — show public portal
  if (isPortalPath && !isInitializing) {
    return <PublicPortalPage />;
  }

  // Still initialising or unrecognised path — show portal as fallback for unauthenticated
  if (!isInitializing) {
    return <PublicPortalPage />;
  }

  // Loading while auth initialises
  return <AppLoader />;
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
