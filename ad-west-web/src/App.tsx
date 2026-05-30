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
import { PublicContactRegistrationPage } from './pages/public/PublicContactRegistrationPage';
import { PublicPortalPage } from './pages/public/PublicPortalPage';

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

  return null;
}

function AppContent() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';

  // Authenticated users navigating to root or portal — skip public portal, go to dashboard
  const { adminUser, memberUser, mustResetPassword, isInitializing } = useAuth();

  // Only show public routes if the user is not authenticated (or the path is a known public path)
  const isPublicOnlyPath = pathname === '/helpdesk' || pathname === '/join-us' || pathname === '/jobs'
    || pathname === '/jobs/apply' || pathname === '/jobs/post'
    || /^\/events\/[^/]+\/register$/.test(pathname);

  const isPortalPath = pathname === '/' || pathname === '/portal';

  // Public-only paths always show their content regardless of auth
  if (isPublicOnlyPath) {
    const publicContent = PublicRouteContent();
    if (publicContent) return publicContent;
  }

  // Admin/member login path — fall through to auth flow
  if (pathname === '/login') {
    if (adminUser && mustResetPassword) return <ForcePasswordChangePage />;
    if (adminUser) return <AdminDashboardPage />;
    if (memberUser) return <MemberPortalPage onBack={() => undefined} />;
    return <AdminLoginPage />;
  }

  if (isInitializing) {
    return (
      <div className="app-bootstrap-screen admin-theme">
        <div className="app-bootstrap-orb app-bootstrap-orb-primary" />
        <div className="app-bootstrap-orb app-bootstrap-orb-accent" />
        <div className="glass-panel app-bootstrap-card">
          <div className="app-bootstrap-spinner" aria-hidden="true">
            <span className="app-bootstrap-spinner-ring app-bootstrap-spinner-ring-outer" />
            <span className="app-bootstrap-spinner-ring app-bootstrap-spinner-ring-inner" />
            <span className="app-bootstrap-spinner-dot" />
          </div>
          <div className="app-bootstrap-copy">
            <h2>Preparing your workspace</h2>
            <p>Signing you in and loading your dashboard.</p>
          </div>
        </div>
      </div>
    );
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

  // Loading spinner while auth initialises
  return (
    <div className="app-bootstrap-screen admin-theme">
      <div className="app-bootstrap-orb app-bootstrap-orb-primary" />
      <div className="app-bootstrap-orb app-bootstrap-orb-accent" />
      <div className="glass-panel app-bootstrap-card">
        <div className="app-bootstrap-spinner" aria-hidden="true">
          <span className="app-bootstrap-spinner-ring app-bootstrap-spinner-ring-outer" />
          <span className="app-bootstrap-spinner-ring app-bootstrap-spinner-ring-inner" />
          <span className="app-bootstrap-spinner-dot" />
        </div>
        <div className="app-bootstrap-copy">
          <h2>Preparing your workspace</h2>
          <p>Signing you in and loading your dashboard.</p>
        </div>
      </div>
    </div>
  );
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
