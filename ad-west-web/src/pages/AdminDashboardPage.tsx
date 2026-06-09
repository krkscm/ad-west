import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MOBILE_LAYOUT_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../context/auth-context';
import { AdminDefinitionsProvider } from '../context/admin-definitions-context';
import { useToast } from '../components/common/Toast';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { NotificationBell } from '../components/common/NotificationBell';
import { AdminUserMenu } from '../components/common/AdminUserMenu';
import { ResetPasswordModal } from '../components/common/ResetPasswordModal';
import { AdminUsersList } from '../components/features/AdminUsersList';
import { AdminUserForm } from '../components/features/AdminUserForm';
import { AuditLogTable } from '../components/features/AuditLogTable';
import { RolesDefinitionPage } from './settings/RolesDefinitionPage';
import { LocationDefinitionPage } from './settings/LocationDefinitionPage';
import { SreniDefinitionPage } from './settings/SreniDefinitionPage';
import { PermissionDefinitionsPage } from './settings/PermissionDefinitionsPage';
import { PermissionSetsPage } from './settings/PermissionSetsPage';
import { UsersPage } from './settings/UsersPage';
import { UsersFormPage } from './settings/UsersFormPage';
import { ApprovalWorkflowPage } from './settings/ApprovalWorkflowPage';
import { ApprovalWorkflowFormPage } from './settings/ApprovalWorkflowFormPage';
import { ApprovalActionsPanel } from '../components/features/ApprovalActionsPanel';
import { EnumValuesPage } from './settings/EnumValuesPage';
import { SreniCalendarPage } from './SreniCalendarPage';
import { SreniContactListPage } from './SreniContactListPage';
import { SreniAttendancePage } from './SreniAttendancePage';
import { SreniDocumentsPage } from './SreniDocumentsPage';
import { SreniReportsPage } from './SreniReportsPage';
import { SreniAnalyticsStudioPage } from './SreniAnalyticsStudioPage';
import { SthanDetailPage } from './SthanDetailPage';
import { AttendanceMetricsPage } from './settings/AttendanceMetricsPage';
import { ReportConfigSettingsPage } from './settings/ReportConfigSettingsPage';
import { ResponsibilityChartPage } from './settings/ResponsibilityChartPage';
import { GoogleIntegrationSettingsPage } from './settings/GoogleIntegrationSettingsPage';
import { SmtpIntegrationSettingsPage } from './settings/SmtpIntegrationSettingsPage';
import { HelpdeskTicketsPage } from './helpdesk/HelpdeskTicketsPage';
import { JobPostingsPage } from './helpdesk/JobPostingsPage';
import { JobApplicationsPage } from './helpdesk/JobApplicationsPage';
import { ReimbursementPage } from './member-services/ReimbursementPage';
import { SpecialEventsPage } from './member-services/SpecialEventsPage';
import { NotificationsAdminPage } from './member-services/NotificationsAdminPage';
import { NotificationCarouselModal } from '../components/common/NotificationCarouselModal';
import { GmailWorkspacePanel } from '../components/features/GmailWorkspacePanel';
import { InsightsPage } from './InsightsPage';
import { GlobalContactsPage } from './GlobalContactsPage';
import { JoinUsReviewPage } from './JoinUsReviewPage';
import {
  ApprovalWorkflowDefinitionApi,
  backendApi,
  LocationDefinitionApi,
  MenuItemApi,
  SreniDefinitionApi,
  UserApi,
} from '../utils/backendApi';
import {
  AdminNavigationContext,
  adminTabToPath,
  getInitialAdminTab,
  getInitialSthanSection,
  getAdminPageTitle,
  navigateToAdminTab,
  navigateToSthanSection,
  parseSthanSectionFromPath,
  resolveAdminTabFromHash,
  resolveAdminTabFromPath,
  SthanSection,
} from '../utils/adminNavigation';

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match && match[1]) {
    return match[1];
  }

  return error.message || fallback;
};

interface UiProgram {
  id: string;
  title: string;
  subtitle: string;
}

const parseNumericValue = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/[^\d.-]/g, '');
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const eventInDateRange = (dateValue: string | undefined, fromDate?: string, toDate?: string): boolean => {
  if (!dateValue) return false;
  const eventDate = Date.parse(dateValue);
  if (!Number.isFinite(eventDate)) return false;
  const fromMs = fromDate ? Date.parse(fromDate) : undefined;
  const toMs = toDate ? Date.parse(toDate) : undefined;
  if (fromMs && eventDate < fromMs) return false;
  if (toMs && eventDate > toMs) return false;
  return true;
};

const normalizeRoleKey = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

type ActiveTab =
  | 'dashboard'
  | 'logs'
  | 'ops'
  | 'settings-permission-sets'
  | 'settings-enum-values'
  | 'settings-users'
  | 'settings-users-form'
  | 'settings-admins'
  | 'settings-admins-form'
  | 'settings-approval-workflows-form'
  | 'settings-roles-definition'
  | 'settings-location-definition'
  | 'settings-sreni-definition'
  | 'settings-permissions'
  | 'settings-approval-workflows'
  | 'settings-attendance-metrics'
  | 'settings-responsibility-chart'
  | 'settings-report-config'
  | 'settings-google-integration'
  | 'settings-smtp-integration'
  | 'insights'
  | 'helpdesk-tickets'
  | 'job-postings'
  | 'job-applications'
  | 'member-services-reimbursements'
  | 'member-services-events'
  | 'member-services-notifications'
  | 'member-services-gmail'
  | 'governance-contacts'
  | 'governance-join-us-review'
  | `sreni-calendar-${string}`
  | `sreni-contacts-${string}`
  | `sreni-attendance-${string}`
  | `sreni-documents-${string}`
  | `sreni-reports-${string}`
  | `sreni-analytics-${string}`
  | `sthan-${string}`
  | 'my-approvals';

const SETTINGS_ROOT_TAB: ActiveTab = 'settings-admins';

/** Temporarily hide Approval Workflows from Settings navigation. */
const SHOW_APPROVAL_WORKFLOWS_TAB = false;

const getInitialTab = (): ActiveTab =>
  getInitialAdminTab({ srenis: [], locations: [] }) as ActiveTab;

const TAB_METADATA: { [key: string]: { label: string; parent?: 'settings' | 'governance' } } = {
  dashboard: { label: 'Dashboard' },
  logs: { label: 'Audit Logs' },
  ops: { label: 'Ops Coverage' },
  'my-approvals': { label: 'My Approvals', parent: 'governance' },
  'settings-permission-sets': { label: 'Permission Sets', parent: 'settings' },
  'settings-enum-values': { label: 'Reference Data', parent: 'settings' },
  'settings-users': { label: 'Users', parent: 'settings' },
  'settings-users-form': { label: 'User Form', parent: 'settings' },
  'settings-admins': { label: 'Admin Management', parent: 'settings' },
  'settings-admins-form': { label: 'Admin Form', parent: 'settings' },
  'settings-approval-workflows-form': { label: 'Approval Workflow Form', parent: 'settings' },
  'settings-roles-definition': { label: 'Roles Definition', parent: 'settings' },
  'settings-location-definition': { label: 'Location Definition', parent: 'settings' },
  'settings-sreni-definition': { label: 'Sreni Definition', parent: 'settings' },
  'settings-permissions': { label: 'Permissions', parent: 'settings' },
  'settings-approval-workflows': { label: 'Approval Workflows', parent: 'settings' },
  'settings-attendance-metrics': { label: 'Attendance Metrics', parent: 'settings' },
  'settings-responsibility-chart': { label: 'Responsibility Chart', parent: 'governance' },
  'settings-report-config': { label: 'Report Config', parent: 'settings' },
  'settings-google-integration': { label: 'Google Integration', parent: 'settings' },
  'settings-smtp-integration': { label: 'Email Integration', parent: 'settings' },
  'insights': { label: 'Insights', parent: 'governance' },
  'helpdesk-tickets': { label: 'Helpdesk Tickets' },
  'job-postings': { label: 'Job Postings' },
  'job-applications': { label: 'Job Applications' },
  'member-services-reimbursements': { label: 'Reimbursements', parent: 'governance' },
  'member-services-events': { label: 'Special Events', parent: 'governance' },
  'member-services-notifications': { label: 'Notifications', parent: 'governance' },
  'member-services-gmail': { label: 'Gmail Workspace', parent: 'governance' },
  'governance-contacts': { label: 'Contacts', parent: 'governance' },
  'governance-join-us-review': { label: 'Join Us Review', parent: 'governance' },
};

const SETTINGS_TABS: ActiveTab[] = Object.entries(TAB_METADATA)
  .filter(([tab, meta]) => meta.parent === 'settings'
    && tab !== 'settings-admins-form'
    && tab !== 'settings-users-form'
    && tab !== 'settings-approval-workflows-form'
    && (SHOW_APPROVAL_WORKFLOWS_TAB || tab !== 'settings-approval-workflows'))
  .map(([tab]) => tab as ActiveTab);

const GOVERNANCE_TABS: ActiveTab[] = Object.entries(TAB_METADATA)
  .filter(([, meta]) => meta.parent === 'governance')
  .map(([tab]) => tab as ActiveTab);

const buildBreadcrumbItems = (
  activeTab: ActiveTab,
  options?: { formLabel?: string; usersFormLabel?: string; approvalWorkflowFormLabel?: string; sreniName?: string; sthanName?: string },
): Array<{ label: string; targetTab?: ActiveTab }> => {
  const items: Array<{ label: string; targetTab?: ActiveTab }> = [{ label: 'Home', targetTab: 'dashboard' }];
  const tabStr = activeTab as string;

  if (activeTab === 'settings-admins-form') {
    items.push({ label: 'Settings', targetTab: SETTINGS_ROOT_TAB });
    items.push({ label: 'Admin Management', targetTab: 'settings-admins' });
    items.push({ label: options?.formLabel ?? 'New Administrator' });
  } else if (activeTab === 'settings-users-form') {
    items.push({ label: 'Settings', targetTab: SETTINGS_ROOT_TAB });
    items.push({ label: 'Users', targetTab: 'settings-users' });
    items.push({ label: options?.usersFormLabel ?? 'New User' });
  } else if (activeTab === 'settings-approval-workflows-form') {
    items.push({ label: 'Settings', targetTab: SETTINGS_ROOT_TAB });
    items.push({ label: 'Approval Workflows', targetTab: 'settings-approval-workflows' });
    items.push({ label: options?.approvalWorkflowFormLabel ?? 'New Approval Workflow' });
  } else if (SETTINGS_TABS.includes(activeTab)) {
    items.push({ label: 'Settings', targetTab: SETTINGS_ROOT_TAB });
    items.push({ label: TAB_METADATA[activeTab]?.label ?? activeTab, targetTab: activeTab });
  } else if (GOVERNANCE_TABS.includes(activeTab)) {
    items.push({ label: 'General Services' });
    items.push({ label: TAB_METADATA[activeTab]?.label ?? activeTab, targetTab: activeTab });
  } else if (tabStr.startsWith('sreni-calendar-')) {
    items.push({ label: options?.sreniName ?? 'Sreni' });
    items.push({ label: 'Calendar' });
  } else if (tabStr.startsWith('sreni-contacts-')) {
    items.push({ label: options?.sreniName ?? 'Sreni' });
    items.push({ label: 'Contacts' });
  } else if (tabStr.startsWith('sreni-attendance-')) {
    items.push({ label: options?.sreniName ?? 'Sreni' });
    items.push({ label: 'Attendance' });
  } else if (tabStr.startsWith('sreni-documents-')) {
    items.push({ label: options?.sreniName ?? 'Sreni' });
    items.push({ label: 'Documents' });
  } else if (tabStr.startsWith('sreni-reports-')) {
    items.push({ label: options?.sreniName ?? 'Sreni' });
    items.push({ label: 'Reports' });
  } else if (tabStr.startsWith('sreni-analytics-')) {
    items.push({ label: options?.sreniName ?? 'Sreni' });
    items.push({ label: 'Analytics Studio' });
  } else if (tabStr.startsWith('sthan-')) {
    items.push({ label: 'Sthans' });
    items.push({ label: options?.sthanName ?? 'Sthan' });
  } else {
    items.push({ label: 'Dashboard', targetTab: 'dashboard' });
    if (activeTab !== 'dashboard') {
      items.push({ label: TAB_METADATA[activeTab]?.label ?? activeTab, targetTab: activeTab });
    }
  }

  return items.filter((item, index, allItems) => {
    if (index === 0) return true;
    return item.label.toLowerCase() !== allItems[index - 1].label.toLowerCase();
  });
};

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTabState] = useState<ActiveTab>(getInitialTab);
  const [isGovernanceOpen, setIsGovernanceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isMobileLayout = useMediaQuery(MOBILE_LAYOUT_QUERY);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [adminFormEditId, setAdminFormEditId] = useState<string | null>(null);
  const [usersFormEdit, setUsersFormEdit] = useState<UserApi | null>(null);
  const [approvalWorkflowFormEdit, setApprovalWorkflowFormEdit] = useState<ApprovalWorkflowDefinitionApi | null>(null);
  const [sidebarMenuItems, setSidebarMenuItems] = useState<MenuItemApi[]>([]);
  const [sreniDefinitions, setSreniDefinitions] = useState<SreniDefinitionApi[]>([]);
  const [locationDefinitions, setLocationDefinitions] = useState<LocationDefinitionApi[]>([]);
  const [openSreniKeys, setOpenSreniKeys] = useState<Set<string>>(new Set());
  const [openSthanKeys, setOpenSthanKeys] = useState<Set<string>>(new Set());
  const [activeSthanSection, setActiveSthanSection] = useState<SthanSection>(getInitialSthanSection);
  const { adminUser, logout } = useAuth();
  const { addToast } = useToast();

  const navigationContext = useMemo<AdminNavigationContext>(
    () => ({
      srenis: sreniDefinitions,
      locations: locationDefinitions,
      sthanSection: activeSthanSection,
    }),
    [sreniDefinitions, locationDefinitions, activeSthanSection],
  );
  const navigationContextRef = useRef<AdminNavigationContext>(navigationContext);
  navigationContextRef.current = navigationContext;

  const setActiveTab = useCallback((tab: ActiveTab, options?: { sthanSection?: SthanSection; replace?: boolean }) => {
    const ctx: AdminNavigationContext = {
      ...navigationContextRef.current,
      sthanSection: options?.sthanSection ?? (
        (tab as string).startsWith('sthan-') ? activeSthanSection : undefined
      ),
    };
    navigateToAdminTab(tab, ctx, { replace: options?.replace });
    setActiveTabState(tab);
    if (options?.sthanSection) {
      setActiveSthanSection(options.sthanSection);
    } else if ((tab as string).startsWith('sthan-') && !options?.sthanSection) {
      setActiveSthanSection('calendar');
    }
    if (isMobileLayout) {
      setIsMobileNavOpen(false);
    }
  }, [activeSthanSection, isMobileLayout]);

  useEffect(() => {
    if (!isMobileLayout) {
      setIsMobileNavOpen(false);
    }
  }, [isMobileLayout]);

  useEffect(() => {
    if (isMobileLayout && isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
    }
  }, [isMobileLayout, isSidebarCollapsed]);

  useEffect(() => {
    if (!isMobileLayout || !isMobileNavOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileNavOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileLayout, isMobileNavOpen]);

  const openAdminForm = useCallback((editId: string | null) => {
    setAdminFormEditId(editId);
    setActiveTab('settings-admins-form');
  }, [setActiveTab]);

  const closeAdminForm = useCallback(() => {
    setAdminFormEditId(null);
    setActiveTab('settings-admins');
  }, [setActiveTab]);

  const openUsersForm = useCallback((user: UserApi | null) => {
    setUsersFormEdit(user);
    setActiveTab('settings-users-form');
  }, [setActiveTab]);

  const closeUsersForm = useCallback(() => {
    setUsersFormEdit(null);
    setActiveTab('settings-users');
  }, [setActiveTab]);

  const openApprovalWorkflowForm = useCallback((workflow: ApprovalWorkflowDefinitionApi | null) => {
    setApprovalWorkflowFormEdit(workflow);
    setActiveTab('settings-approval-workflows-form');
  }, [setActiveTab]);

  const closeApprovalWorkflowForm = useCallback(() => {
    setApprovalWorkflowFormEdit(null);
    setActiveTab('settings-approval-workflows');
  }, [setActiveTab]);

  useEffect(() => {
    const onPopState = () => {
      const tab = resolveAdminTabFromPath(window.location.pathname, navigationContextRef.current);
      setActiveTabState((tab ?? 'dashboard') as ActiveTab);
      setActiveSthanSection(parseSthanSectionFromPath(window.location.pathname) ?? 'calendar');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.title = `${getAdminPageTitle(activeTab, navigationContext)} | AD West Admin`;
  }, [activeTab, navigationContext]);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      const tab = resolveAdminTabFromHash(hash, navigationContext);
      if (tab) {
        navigateToAdminTab(tab, navigationContext, { replace: true });
        window.location.hash = '';
        setActiveTabState(tab as ActiveTab);
      }
      return;
    }

    const tab = resolveAdminTabFromPath(window.location.pathname, navigationContext);
    if (tab) {
      setActiveTabState(tab as ActiveTab);
      setActiveSthanSection(parseSthanSectionFromPath(window.location.pathname) ?? 'calendar');
      const expectedPath = window.location.pathname.replace(/\/+$/, '') || '/';
      const normalizedPath = expectedPath === '/login' ? '/admin/dashboard' : expectedPath;
      const canonicalPath = adminTabToPath(tab, {
        ...navigationContext,
        sthanSection: parseSthanSectionFromPath(window.location.pathname) ?? 'calendar',
      });
      if (normalizedPath !== canonicalPath) {
        navigateToAdminTab(tab, {
          ...navigationContext,
          sthanSection: parseSthanSectionFromPath(window.location.pathname) ?? 'calendar',
        }, { replace: true });
      }
    }
  }, [navigationContext]);

  useEffect(() => {
    if (!SHOW_APPROVAL_WORKFLOWS_TAB
      && (activeTab === 'settings-approval-workflows' || activeTab === 'settings-approval-workflows-form')) {
      setActiveTab('settings-roles-definition', { replace: true });
    }
  }, [activeTab, setActiveTab]);

  // Load sidebar menu items (sreni menus live in this table)
  const loadSidebarMenus = useCallback(() => {
    backendApi.listMenuItems()
      .then(items => setSidebarMenuItems(items))
      .catch(() => {});
  }, []);

  useEffect(() => { loadSidebarMenus(); }, [loadSidebarMenus]);

  const toggleSreniOpen = useCallback((key: string) => {
    setOpenSreniKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const toggleSthanOpen = useCallback((key: string) => {
    setOpenSthanKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // Metrics state
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingJoinUsCount, setPendingJoinUsCount] = useState(0);
  const [programs, setPrograms] = useState<UiProgram[]>([]);
  const [, setOpenTicketsCount] = useState(0);
  const [, setNewApplicationsCount] = useState(0);
  const [, setUnderReviewApplicationsCount] = useState(0);
  const [, setActiveJobPostingsCount] = useState(0);
  const [, setExpiringJobPostingsCount] = useState(0);
  const [srenyId, setSrenyId] = useState('');
  const [docFolderName, setDocFolderName] = useState('Weekly Reports');
  const [docFileName, setDocFileName] = useState('sreny-weekly-summary.pdf');
  const [docResult, setDocResult] = useState('');
  const [latestDocumentId, setLatestDocumentId] = useState('');
  const [reportTemplateName, setReportTemplateName] = useState('Monthly Activity Report');
  const [reportResult, setReportResult] = useState('');
  const [latestTemplateId, setLatestTemplateId] = useState('');
  const [approvalResult, setApprovalResult] = useState('');
  const [latestWorkflowId, setLatestWorkflowId] = useState('');
  const [persistenceReadinessSummary, setPersistenceReadinessSummary] = useState('Not loaded yet');
  const [sreniContactTotal, setSreniContactTotal] = useState(0);
  const [sthanContactTotal, setSthanContactTotal] = useState(0);
  const [sreniAttendanceTotal, setSreniAttendanceTotal] = useState(0);
  const [sthanAttendanceTotal, setSthanAttendanceTotal] = useState(0);
  const [sreniReportingTotal, setSreniReportingTotal] = useState(0);
  const [sthanReportingTotal, setSthanReportingTotal] = useState(0);

  const refreshDefinitions = useCallback(async () => {
    const [sreniesResult, locationsResult] = await Promise.allSettled([
      backendApi.listSreniDefinitions(),
      backendApi.listLocationDefinitions(),
    ]);

    const sreniItems = sreniesResult.status === 'fulfilled' ? sreniesResult.value : [];
    const locationItems = locationsResult.status === 'fulfilled' ? locationsResult.value : [];

    setSreniDefinitions(sreniItems);
    setLocationDefinitions(locationItems);

    if (sreniItems.length > 0) {
      setSrenyId((prev) => prev || sreniItems[0]?.id || '');
      setPrograms(
        sreniItems.map((sreni) => ({
          id: sreni.id,
          title: sreni.name,
          subtitle: sreni.code ?? '',
        })),
      );
    } else {
      setPrograms([]);
    }
  }, []);

  useEffect(() => {
    const loadCoreData = async () => {
      try {
        const pendingApprovalsResult = await Promise.allSettled([
          backendApi.listMyApprovalActions('pending'),
        ]).then((results) => results[0]);

        if (pendingApprovalsResult.status === 'fulfilled') {
          setPendingApprovalsCount(pendingApprovalsResult.value.length);
        } else {
          setPendingApprovalsCount(0);
        }

        const joinUsResult = await Promise.allSettled([
          backendApi.listJoinUsSubmissions({ page: 1, pageSize: 1, status: 'pending' }),
        ]).then((results) => results[0]);
        if (joinUsResult.status === 'fulfilled') {
          setPendingJoinUsCount(joinUsResult.value.pendingCount);
        } else {
          setPendingJoinUsCount(0);
        }

        await refreshDefinitions();
      } catch {
        setPendingApprovalsCount(0);
        setPrograms([]);
        setSreniDefinitions([]);
        setLocationDefinitions([]);
      }
    };

    void loadCoreData();
  }, [refreshDefinitions]);

  useEffect(() => {
    if (activeTab !== 'dashboard') {
      return;
    }

    const loadDashboardMetrics = async () => {
      const sreniItems = sreniDefinitions;
      const sthanItems = locationDefinitions.filter((location) => location.level === 'STHAN' && location.active);
      if (sreniItems.length === 0 && sthanItems.length === 0) {
        return;
      }

      try {
        const [
          ticketsResult,
          jobPostingsResult,
          jobApplicationsResult,
          monthlyReportsResult,
        ] = await Promise.allSettled([
          backendApi.listHelpdeskTickets(),
          backendApi.listJobPostings(),
          backendApi.listAllJobApplications(),
          backendApi.listAllMonthlyReports(),
        ]);

        if (monthlyReportsResult.status === 'fulfilled') {
          setSreniReportingTotal(monthlyReportsResult.value.length);
        } else {
          setSreniReportingTotal(0);
        }

        const fromDate = new Date();
        fromDate.setMonth(fromDate.getMonth() - 1);
        const toDate = new Date();
        const fromIso = fromDate.toISOString().slice(0, 10);
        const toIso = toDate.toISOString().slice(0, 10);

        const [
          sreniContactsResults,
          sthanContactsResults,
          sreniAttendanceResults,
          sthanReportsResults,
        ] = await Promise.all([
          Promise.allSettled(sreniItems.map((sreni) => backendApi.listSreniContacts(sreni.id, 1, 1))),
          Promise.allSettled(sthanItems.map((location) => backendApi.listSthanContacts(location.id, 1, 1))),
          Promise.allSettled(sreniItems.map((sreni) => backendApi.listSreniAttendanceListing(sreni.id))),
          Promise.allSettled(sthanItems.map((location) => backendApi.listSthanReports(location.id))),
        ]);

        const totalSreniContacts = sreniContactsResults.reduce((sum, result) => {
          if (result.status !== 'fulfilled') return sum;
          return sum + (result.value.total ?? result.value.items.length ?? 0);
        }, 0);
        setSreniContactTotal(totalSreniContacts);

        const totalSthanContacts = sthanContactsResults.reduce((sum, result) => {
          if (result.status !== 'fulfilled') return sum;
          return sum + (result.value.total ?? result.value.items.length ?? 0);
        }, 0);
        setSthanContactTotal(totalSthanContacts);

        const totalSreniAttendance = sreniAttendanceResults.reduce((sum, result) => {
          if (result.status !== 'fulfilled') return sum;
          const listingItems = Array.isArray(result.value) ? result.value : [];
          const score = listingItems.reduce((innerSum, item) => {
            if (!eventInDateRange(item.event?.date, fromIso, toIso)) return innerSum;
            const eventScore = item.metrics.reduce((eventTotal, metricItem) => {
              const values = metricItem.capture?.values ?? {};
              const numericTotal = Object.values(values as Record<string, unknown>).reduce<number>((acc, value) => acc + parseNumericValue(value), 0);
              return eventTotal + (numericTotal > 0 ? numericTotal : metricItem.capture ? 1 : 0);
            }, 0);
            return innerSum + eventScore;
          }, 0);
          return sum + score;
        }, 0);
        setSreniAttendanceTotal(totalSreniAttendance);

        const totalSthanAttendance = sreniAttendanceResults.reduce((sum, result) => {
          if (result.status !== 'fulfilled') return sum;
          const listingItems = Array.isArray(result.value) ? result.value : [];
          const score = listingItems.reduce((innerSum, item) => {
            if (!eventInDateRange(item.event?.date, fromIso, toIso)) return innerSum;
            return innerSum + (item.event?.sthanIds?.length ?? 0);
          }, 0);
          return sum + score;
        }, 0);
        setSthanAttendanceTotal(totalSthanAttendance);

        const totalSthanReports = sthanReportsResults.reduce((sum, result) => {
          if (result.status !== 'fulfilled') return sum;
          const reports = Array.isArray(result.value) ? result.value : [];
          const filteredCount = reports.filter((report) => {
            const periodDate = new Date(report.periodYear, report.periodMonth - 1, 1);
            const iso = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}-01`;
            return eventInDateRange(iso, fromIso, toIso);
          }).length;
          return sum + filteredCount;
        }, 0);
        setSthanReportingTotal(totalSthanReports);

        if (ticketsResult.status === 'fulfilled') {
          const tickets = ticketsResult.value.items;
          setOpenTicketsCount(tickets.filter((ticket) => ticket.status === 'open' || ticket.status === 'in_progress').length);
        } else {
          setOpenTicketsCount(0);
        }

        if (jobPostingsResult.status === 'fulfilled') {
          const jobPostings = jobPostingsResult.value.items;
          const activeJobPostings = jobPostings.filter((job) => job.isActive);
          setActiveJobPostingsCount(activeJobPostings.length);

          const now = Date.now();
          const next14Days = now + 14 * 24 * 60 * 60 * 1000;
          setExpiringJobPostingsCount(
            activeJobPostings.filter((job) => {
              if (!job.expiresAt) return false;
              const expiresAt = Date.parse(job.expiresAt);
              return Number.isFinite(expiresAt) && expiresAt >= now && expiresAt <= next14Days;
            }).length,
          );
        } else {
          setActiveJobPostingsCount(0);
          setExpiringJobPostingsCount(0);
        }

        if (jobApplicationsResult.status === 'fulfilled') {
          const applications = jobApplicationsResult.value.items;
          setNewApplicationsCount(applications.filter((application) => application.status === 'new').length);
          setUnderReviewApplicationsCount(applications.filter((application) => application.status === 'under_review').length);
        } else {
          setNewApplicationsCount(0);
          setUnderReviewApplicationsCount(0);
        }
      } catch {
        setOpenTicketsCount(0);
        setNewApplicationsCount(0);
        setUnderReviewApplicationsCount(0);
        setActiveJobPostingsCount(0);
        setExpiringJobPostingsCount(0);
        setSreniContactTotal(0);
        setSthanContactTotal(0);
        setSreniAttendanceTotal(0);
        setSthanAttendanceTotal(0);
        setSreniReportingTotal(0);
        setSthanReportingTotal(0);
      }
    };

    void loadDashboardMetrics();
  }, [activeTab, sreniDefinitions, locationDefinitions]);

  if (!adminUser) return null;

  // Normalize role values so both UI labels and API enum values are supported.
  const normalizedRoles = adminUser.roles.map((assignment) => normalizeRoleKey(assignment.role));

  const isSuperAdmin = normalizedRoles.includes('SUPERADMIN');
  const isZoneAdmin = normalizedRoles.includes('ZONEADMIN');
  const userRole = adminUser.roles[0]?.role ?? (isSuperAdmin ? 'Super Admin' : isZoneAdmin ? 'Zone Admin' : 'Sreny Admin');
  const showOpsTab = isSuperAdmin || isZoneAdmin;

  // Allowed tabs:
  // Super Admin: dashboard, logs + all settings
  // Zone Admin: dashboard, logs
  // Sreny Admin: dashboard
  const showAdminsTab = isSuperAdmin;
  const showLogsTab = isSuperAdmin || isZoneAdmin;
  const isSettingsTabActive = SETTINGS_TABS.includes(activeTab)
    || activeTab === 'settings-admins-form'
    || activeTab === 'settings-users-form'
    || (SHOW_APPROVAL_WORKFLOWS_TAB && activeTab === 'settings-approval-workflows-form');
  const hasMenuKey = (key: string) => sidebarMenuItems.some((item) => item.active && item.key === key);

  const showInsightsTab = isSuperAdmin || hasMenuKey('insights');
  const showMyApprovalsTab = isSuperAdmin || hasMenuKey('my-approvals');
  const showResponsibilityChartTab = isSuperAdmin || hasMenuKey('settings-responsibility-chart');
  const showReimbursementsTab = isSuperAdmin || hasMenuKey('member-services-reimbursements');
  const showEventsTab = isSuperAdmin || hasMenuKey('member-services-events');
  const showNotificationsTab = isSuperAdmin || hasMenuKey('member-services-notifications');
  const showGmailTab = isSuperAdmin || hasMenuKey('member-services-gmail');
  const showContactsTab = isSuperAdmin || hasMenuKey('governance-contacts');
  const showJoinUsReviewTab = isSuperAdmin || hasMenuKey('governance-join-us-review');

  const governanceMenu = sidebarMenuItems.find((item) => item.active && item.key === 'governance');
  const governanceLabel = governanceMenu?.label || 'General Services';
  const governanceIcon = governanceMenu?.icon || '🧭';

  const showGovernanceSection =
    isSuperAdmin ||
    hasMenuKey('governance') ||
    showInsightsTab ||
    showMyApprovalsTab ||
    showResponsibilityChartTab ||
    showReimbursementsTab ||
    showEventsTab ||
    showNotificationsTab ||
    showGmailTab ||
    showContactsTab ||
    showJoinUsReviewTab;

  const showGatewaySection = isSuperAdmin || hasMenuKey('helpdesk') || hasMenuKey('helpdesk-tickets') || hasMenuKey('job-postings') || hasMenuKey('job-applications');
  const showHelpdeskTicketsTab = isSuperAdmin || hasMenuKey('helpdesk-tickets');
  const showJobPostingsTab = isSuperAdmin || hasMenuKey('job-postings');
  const showJobApplicationsTab = isSuperAdmin || hasMenuKey('job-applications');
  const isGatewayTabActive = activeTab === 'helpdesk-tickets' || activeTab === 'job-postings' || activeTab === 'job-applications';
  const isGatewaySectionOpen = isGatewayOpen || isGatewayTabActive;

  const isGovernanceTabActive = activeTab === 'insights' || activeTab === 'my-approvals' || activeTab === 'settings-responsibility-chart' || activeTab === 'member-services-reimbursements' || activeTab === 'member-services-events' || activeTab === 'member-services-notifications' || activeTab === 'member-services-gmail' || activeTab === 'governance-contacts' || activeTab === 'governance-join-us-review';
  const isGovernanceSectionOpen = isGovernanceOpen || isGovernanceTabActive;

  // Sreni sidebar menu structure — only items whose keys start with 'sreni-'
  const sreniParentMenus = sidebarMenuItems.filter(m => m.active && m.key.startsWith('sreni-') && !m.parentKey);
  const sreniChildMenus = sidebarMenuItems.filter(m => m.active && m.parentKey?.startsWith('sreni-'));

  // Sthans sidebar — one "sthans" root parent, each sthan location is a child
  const sthansRootMenu = sidebarMenuItems.find(m => m.active && m.key === 'sthans');
  const sthanChildMenus = sidebarMenuItems.filter(m => m.active && m.parentKey === 'sthans');

  // Active sthan key is everything after "sthan-" in the tab string
  const activeSthanKey = (activeTab as string).startsWith('sthan-')
    ? (activeTab as string).slice('sthan-'.length) : null;
  const activeSthanMenuLabel = activeSthanKey
    ? sthanChildMenus.find(m => m.key === `sthan-${activeSthanKey}`)?.label
    : undefined;

  const handleSthanSectionChange = useCallback((section: SthanSection) => {
    if (!activeSthanKey) return;
    setActiveSthanSection(section);
    navigateToSthanSection(activeSthanKey, section, navigationContextRef.current);
  }, [activeSthanKey]);

  const activeSreniCalendarKey = (activeTab as string).startsWith('sreni-calendar-')
    ? (activeTab as string).slice('sreni-calendar-'.length)
    : null;
  const activeSreniContactsKey = (activeTab as string).startsWith('sreni-contacts-')
    ? (activeTab as string).slice('sreni-contacts-'.length)
    : null;
  const activeSreniAttendanceKey = (activeTab as string).startsWith('sreni-attendance-')
    ? (activeTab as string).slice('sreni-attendance-'.length)
    : null;
  const activeSreniDocumentsKey = (activeTab as string).startsWith('sreni-documents-')
    ? (activeTab as string).slice('sreni-documents-'.length)
    : null;
  const activeSreniReportsKey = (activeTab as string).startsWith('sreni-reports-')
    ? (activeTab as string).slice('sreni-reports-'.length)
    : null;
  const activeSreniAnalyticsKey = (activeTab as string).startsWith('sreni-analytics-')
    ? (activeTab as string).slice('sreni-analytics-'.length)
    : null;
  const activeSreniKey = activeSreniCalendarKey ?? activeSreniContactsKey ?? activeSreniAttendanceKey ?? activeSreniDocumentsKey ?? activeSreniReportsKey ?? activeSreniAnalyticsKey;
  const activeSreniMenuLabel = activeSreniKey
    ? sreniParentMenus.find(m => m.key === `sreni-${activeSreniKey}`)?.label
    : undefined;

  const breadcrumbItems = buildBreadcrumbItems(activeTab, {
    formLabel: activeTab === 'settings-admins-form' ? (adminFormEditId ? 'Edit Administrator' : 'New Administrator') : undefined,
    usersFormLabel: activeTab === 'settings-users-form' ? (usersFormEdit ? 'Edit User' : 'New User') : undefined,
    approvalWorkflowFormLabel: activeTab === 'settings-approval-workflows-form' ? (approvalWorkflowFormEdit ? 'Edit Approval Workflow' : 'New Approval Workflow') : undefined,
    sreniName: activeSreniMenuLabel,
    sthanName: activeSthanMenuLabel ?? activeSthanKey ?? undefined,
  });
  const sidebarWidth = isSidebarCollapsed ? '84px' : '260px';
  const currentYear = new Date().getFullYear();
  const thresholdProfile = isSuperAdmin
    ? { approvalsWatch: 5, approvalsCritical: 15, intakeWatch: 10, intakeCritical: 25, coverageWatch: 80, coverageHealthy: 92, expiringWatch: 2, expiringCritical: 6, unmappedWatch: 1, unmappedCritical: 4, reviewLoadWatch: 55, reviewLoadCritical: 75, backlogDensityWatch: 2, backlogDensityCritical: 4 }
    : isZoneAdmin
    ? { approvalsWatch: 3, approvalsCritical: 10, intakeWatch: 7, intakeCritical: 16, coverageWatch: 75, coverageHealthy: 90, expiringWatch: 1, expiringCritical: 4, unmappedWatch: 1, unmappedCritical: 3, reviewLoadWatch: 50, reviewLoadCritical: 70, backlogDensityWatch: 1.5, backlogDensityCritical: 3 }
    : { approvalsWatch: 2, approvalsCritical: 6, intakeWatch: 5, intakeCritical: 12, coverageWatch: 70, coverageHealthy: 85, expiringWatch: 1, expiringCritical: 3, unmappedWatch: 1, unmappedCritical: 2, reviewLoadWatch: 45, reviewLoadCritical: 65, backlogDensityWatch: 1, backlogDensityCritical: 2 };

  const toSignal = (value: number, watchAt: number, criticalAt: number): 'healthy' | 'watch' | 'critical' => {
    if (value >= criticalAt) return 'critical';
    if (value >= watchAt) return 'watch';
    return 'healthy';
  };

  const signalStyles: Record<'healthy' | 'watch' | 'critical' | 'neutral', { accent: string; badgeClass: string; label: string }> = {
    healthy: { accent: 'var(--success)', badgeClass: 'badge-success', label: 'Healthy' },
    watch: { accent: 'var(--warning)', badgeClass: 'badge-warning', label: 'Watch' },
    critical: { accent: 'var(--error)', badgeClass: 'badge-error', label: 'Critical' },
    neutral: { accent: 'var(--info)', badgeClass: 'badge-info', label: 'Baseline' },
  };

  const approvalsSignal = toSignal(pendingApprovalsCount, thresholdProfile.approvalsWatch, thresholdProfile.approvalsCritical);
  const dashboardHeading = isSuperAdmin
    ? 'Executive Dashboard'
    : isZoneAdmin
    ? 'Zone Operations Dashboard'
    : 'Sreni Operations Dashboard';
  const dashboardSubtitle = isSuperAdmin
    ? 'Contacts, attendance, and reporting pulse across Sthan and Sreni units.'
    : isZoneAdmin
    ? 'Zone-level coverage for contacts, attendance, and reporting outcomes.'
    : 'Sreni execution pulse based on contacts, attendance, and reporting cadence.';

  const contactCoverageTotal = sreniContactTotal + sthanContactTotal;
  const attendanceCoverageTotal = sreniAttendanceTotal + sthanAttendanceTotal;
  const reportingCoverageTotal = sreniReportingTotal + sthanReportingTotal;
  const contactsSignal: 'healthy' | 'watch' | 'critical' = contactCoverageTotal > 0 ? 'healthy' : 'watch';
  const attendanceSignal: 'healthy' | 'watch' | 'critical' = attendanceCoverageTotal > 0 ? 'healthy' : 'watch';
  const reportingSignal: 'healthy' | 'watch' | 'critical' = reportingCoverageTotal > 0 ? 'healthy' : 'watch';

  const dashboardMetrics = [
    { label: 'Sreni Contacts', value: sreniContactTotal, signal: contactsSignal, icon: '👥', hint: 'Total uploaded contacts' },
    { label: 'Sthan Contacts', value: sthanContactTotal, signal: contactsSignal, icon: '🏘️', hint: 'Total uploaded contacts' },
    { label: 'Sreni Attendance', value: sreniAttendanceTotal, signal: attendanceSignal, icon: '✅', hint: 'Attendance activity score (last month)' },
    { label: 'Sthan Attendance', value: sthanAttendanceTotal, signal: attendanceSignal, icon: '📍', hint: 'Sthan-scoped attendance sessions (last month)' },
    { label: 'Sreni Reporting', value: sreniReportingTotal, signal: reportingSignal, icon: '🧾', hint: 'Submitted monthly reports (last month)' },
    { label: 'Sthan Reporting', value: sthanReportingTotal, signal: reportingSignal, icon: '📊', hint: 'Submitted sthan reports (last month)' },
  ];

  const dashboardPipelineRows = [
    { label: 'Contacts Coverage (Sreni + Sthan)', value: contactCoverageTotal, signal: contactsSignal },
    { label: 'Attendance Pulse (Sreni + Sthan)', value: attendanceCoverageTotal, signal: attendanceSignal },
    { label: 'Reporting Output (Sreni + Sthan)', value: reportingCoverageTotal, signal: reportingSignal },
    { label: 'Pending Approvals', value: pendingApprovalsCount, signal: approvalsSignal },
  ];

  const dashboardPriorities = [
    {
      id: 'contacts-governance',
      title: 'Strengthen contact coverage',
      value: contactCoverageTotal,
      note: contactCoverageTotal > 0 ? 'Validate stale Sthan and Sreni contact uploads and close remaining gaps.' : 'Start by uploading Sthan and Sreni contacts to establish baseline coverage.',
      targetTab: 'settings-location-definition' as ActiveTab,
      tone: signalStyles[contactsSignal].accent,
    },
    {
      id: 'attendance-quality',
      title: 'Improve attendance capture quality',
      value: attendanceCoverageTotal,
      note: attendanceCoverageTotal > 0 ? 'Review low-activity Sthans/Srenis in Insights and enforce timely capture.' : 'Attendance activity is missing. Encourage event-level attendance capture across all units.',
      targetTab: 'insights' as ActiveTab,
      tone: signalStyles[attendanceSignal].accent,
    },
    {
      id: 'reporting-compliance',
      title: 'Lift reporting compliance',
      value: reportingCoverageTotal,
      note: reportingCoverageTotal > 0 ? 'Track Sreni and Sthan units with no monthly submissions and follow up.' : 'No reporting submissions were captured in the last month.',
      targetTab: 'settings-report-config' as ActiveTab,
      tone: signalStyles[reportingSignal].accent,
    },
  ];

  const runDocumentFlow = async () => {
    if (!srenyId) {
      addToast('Load dashboard data first to get a valid sreny.', 'warning');
      return;
    }

    try {
      const folder = await backendApi.createDocumentFolder({
        srenyId,
        name: docFolderName.trim() || 'Weekly Reports',
      });

      const document = await backendApi.createDocumentFile({
        srenyId,
        folderId: folder.id,
        fileName: docFileName.trim() || 'sreny-weekly-summary.pdf',
        fileType: 'application/pdf',
        category: 'weekly_update',
        description: 'Initial generated weekly file',
        accessLevel: 'sreny',
      });

      const version = await backendApi.createDocumentVersion(document.id, {
        fileName: `${document.fileName.replace(/\.pdf$/i, '')}-v2.pdf`,
        fileType: document.fileType,
        category: document.category,
        description: 'Version 2 for verification flow',
      });

      setLatestDocumentId(version.id);
      setDocResult(`folder=${folder.id}, docV1=${document.id}, docV2=${version.id}, version=${version.version}`);
      addToast('FR-DOC flow executed successfully.', 'success');
    } catch (error) {
      addToast(toUiError(error, 'Document flow failed.'), 'error');
    }
  };

  const runReportFlow = async () => {
    if (!srenyId) {
      addToast('Load dashboard data first to get a valid sreny.', 'warning');
      return;
    }

    try {
      const template = await backendApi.createReportTemplate({
        srenyId,
        name: reportTemplateName.trim() || 'Monthly Activity Report',
        fields: [
          { key: 'period', label: 'Period', type: 'text', required: true },
          { key: 'attendance', label: 'Attendance Count', type: 'number', required: true },
        ],
      });

      setLatestTemplateId(template.id);
      const submissions = await backendApi.listReportSubmissions('submitted');

      if (submissions.length > 0) {
        const reviewed = await backendApi.reviewReportSubmission(submissions[0].id, {
          decision: 'approved',
          note: 'Approved via admin ops coverage flow',
        });
        setReportResult(`template=${template.id}, reviewedSubmission=${reviewed.id}, status=${reviewed.status}`);
      } else {
        setReportResult(`template=${template.id}, no submitted reports available for review`);
      }

      addToast('FR-DOC report template/review flow executed.', 'success');
    } catch (error) {
      addToast(toUiError(error, 'Report flow failed.'), 'error');
    }
  };

  const runApprovalFlow = async () => {
    const targetId = latestDocumentId || latestTemplateId;
    if (!targetId) {
      addToast('Run document or report flow first to generate a target for approval.', 'warning');
      return;
    }

    try {
      let workflowId = latestWorkflowId;
      if (!workflowId) {
        const workflows = await backendApi.listApprovalWorkflows();
        workflowId = workflows[0]?.id || '';
      }

      if (!workflowId) {
        const created = await backendApi.createApprovalWorkflow({
          name: 'Document Submission Approval',
          targetType: 'document_submission',
          steps: ['sreny_admin_review', 'zone_admin_review'],
        });
        workflowId = created.id;
      }

      setLatestWorkflowId(workflowId);
      const item = await backendApi.submitApprovalItem({
        workflowId,
        targetId,
        summary: 'Automated approval item from ops coverage',
      });

      const reviewed = await backendApi.reviewApprovalItem(item.id, {
        decision: 'approved',
        note: 'Approved via admin ops coverage flow',
      });

      setApprovalResult(`workflow=${workflowId}, item=${item.id}, status=${reviewed.status}`);
      addToast('FR-APR workflow flow executed.', 'success');
    } catch (error) {
      addToast(toUiError(error, 'Approval flow failed.'), 'error');
    }
  };

  const loadPersistenceReadiness = async () => {
    try {
      const readiness = await backendApi.getCoreBusinessPersistenceReadiness();
      setPersistenceReadinessSummary(
        `coreBusinessStore=${readiness.coreBusinessStore} | authStoreMode=${readiness.authStoreMode} | readyForUat=${String(readiness.readyForUat)} | blockers=${readiness.blockers.length}`,
      );
      addToast('Persistence readiness loaded.', 'success');
    } catch (error) {
      addToast(toUiError(error, 'Failed to load persistence readiness.'), 'error');
      setPersistenceReadinessSummary('Failed to load readiness');
    }
  };

  return (
    <AdminDefinitionsProvider
      sreniDefinitions={sreniDefinitions}
      locationDefinitions={locationDefinitions}
      onRefresh={refreshDefinitions}
    >
    <div className="admin-theme admin-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <NotificationCarouselModal userType="admin" />
      {isMobileLayout && isMobileNavOpen && (
        <button
          type="button"
          className="admin-nav-backdrop"
          aria-label="Close navigation drawer"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      {/* Top Header — full width above sidebar */}
      <header
        className="admin-header"
        style={{
          height: '72px',
          minHeight: '72px',
          maxHeight: '72px',
          flexShrink: 0,
          borderBottom: '1px solid var(--border-dark)',
          backgroundColor: 'var(--glass-bg)',
          padding: '0 32px 0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="admin-header__left">
          <button
            type="button"
            className="admin-header__brand"
            onClick={() => setActiveTab('dashboard')}
            title="AD West - IFCA — Home"
            aria-label="AD West - IFCA — go to dashboard"
          >
            <img src="/favicon.png" alt="" className="admin-header__brand-logo" />
            <span className="admin-header__brand-name">AD West - IFCA</span>
          </button>
          <button
            type="button"
            className="admin-nav-toggle"
            onClick={() => {
              if (isMobileLayout) {
                setIsMobileNavOpen((prev) => !prev);
                return;
              }
              setIsSidebarCollapsed((prev) => !prev);
            }}
            aria-label={
              isMobileLayout
                ? (isMobileNavOpen ? 'Close navigation' : 'Open navigation')
                : (isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar')
            }
            aria-expanded={isMobileLayout ? isMobileNavOpen : undefined}
            title={
              isMobileLayout
                ? (isMobileNavOpen ? 'Close navigation' : 'Open navigation')
                : (isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar')
            }
            style={{
              width: '34px',
              height: '34px',
              minWidth: '34px',
              minHeight: '34px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              border: '1px solid var(--border-dark)',
              background: 'var(--glass-bg)',
              color: 'var(--text-secondary-dark)',
              fontSize: '1.05rem',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
            }}
          >
            {isMobileLayout && isMobileNavOpen ? '✕' : '≡'}
          </button>
          <span className="admin-header__crumb-sep" aria-hidden="true">/</span>
          <div className="admin-header__breadcrumbs">
            {breadcrumbItems.map((item, index) => {
              const isLast = index === breadcrumbItems.length - 1;
              return (
                <React.Fragment key={`${item.label}-${index}`}>
                  {item.targetTab ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab(item.targetTab!)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        padding: 0,
                        cursor: 'pointer',
                        color: isLast ? 'var(--text-primary-dark)' : '#8ea0bd',
                        fontWeight: isLast ? 700 : 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontSize: '0.88rem',
                        lineHeight: 1,
                      }}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span
                      style={{
                        color: isLast ? 'var(--text-primary-dark)' : '#8ea0bd',
                        fontWeight: isLast ? 700 : 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                  {!isLast && <span style={{ color: '#bcc7d9', fontSize: '0.78rem' }}>{'>'}</span>}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="admin-header__actions">
          <NotificationBell />
          <button
            type="button"
            className="admin-header__icon-btn"
            onClick={() => setShowResetPassword(true)}
            aria-label="Reset password"
            title="Reset password"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary-dark)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', borderRadius: '8px', transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(148,163,184,0.1)'; e.currentTarget.style.color = 'var(--text-primary-dark)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary-dark)'; }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </button>
          <div className="admin-header__divider" style={{ width: '1px', height: '24px', background: 'var(--border-dark)', margin: '0 4px' }} />
          <ThemeToggle iconOnly placement="header" />
          <AdminUserMenu
            name={adminUser.name}
            email={adminUser.email}
            picture={adminUser.picture}
            gender={adminUser.gender}
            roleLabel={userRole}
            roleBadgeClass={isSuperAdmin ? 'badge-error' : isZoneAdmin ? 'badge-warning' : 'badge-info'}
          />
        </div>

        <ResetPasswordModal isOpen={showResetPassword} onClose={() => setShowResetPassword(false)} />
      </header>

      <div className="admin-shell" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      
      {/* Sidebar navigation */}
      <aside
        className={`admin-sidebar${isMobileLayout && isMobileNavOpen ? ' admin-sidebar--open' : ''}`}
        style={{
          width: isMobileLayout ? 'min(86vw, 320px)' : sidebarWidth,
          height: isMobileLayout ? 'calc(100vh - 72px)' : '100%',
          flexShrink: 0,
          borderRight: '1px solid var(--border-dark)',
          backgroundColor: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
          transition: isMobileLayout ? 'transform 0.22s ease' : 'width 0.2s ease',
          overflowY: 'auto',
          overflowX: 'hidden',
          position: isMobileLayout ? 'fixed' : 'relative',
          top: isMobileLayout ? 72 : undefined,
          left: isMobileLayout ? 0 : undefined,
          zIndex: isMobileLayout ? 1200 : undefined,
          transform: isMobileLayout ? (isMobileNavOpen ? 'translateX(0)' : 'translateX(-104%)') : undefined,
          pointerEvents: isMobileLayout && !isMobileNavOpen ? 'none' : 'auto',
          boxShadow: isMobileLayout && isMobileNavOpen ? '0 24px 56px -20px rgba(2, 6, 23, 0.6)' : undefined,
        }}
      >
        {/* Navigation Items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px' }}>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`sidebar-nav-item${activeTab === 'dashboard' ? ' is-active' : ''}`}
            style={{ justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}
            title="Dashboard"
          >
            <span>📊</span>{!isSidebarCollapsed && <span style={{ marginLeft: '8px' }}>Dashboard</span>}
          </button>

          {showGovernanceSection && (
            <div>
              <button
                className={`sidebar-nav-item${isGovernanceTabActive ? ' is-active' : ''}`}
                style={{ justifyContent: isSidebarCollapsed ? 'center' : 'space-between', width: '100%' }}
                title={governanceLabel}
                onClick={() => {
                  if (isSidebarCollapsed) {
                    if (showInsightsTab) {
                      setActiveTab('insights');
                      return;
                    }
                    if (showMyApprovalsTab) {
                      setActiveTab('my-approvals');
                      return;
                    }
                    if (showContactsTab) { setActiveTab('governance-contacts'); return; }
                    if (showResponsibilityChartTab) {
                      setActiveTab('settings-responsibility-chart');
                      return;
                    }
                    if (showReimbursementsTab) { setActiveTab('member-services-reimbursements'); return; }
                    if (showEventsTab) { setActiveTab('member-services-events'); return; }
                    if (showNotificationsTab) { setActiveTab('member-services-notifications'); return; }
                    if (showGmailTab) { setActiveTab('member-services-gmail'); return; }
                    return;
                  }
                  setIsGovernanceOpen((prev) => !prev);
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span>{governanceIcon}</span>
                  {!isSidebarCollapsed && <span>{governanceLabel}</span>}
                </span>
                {!isSidebarCollapsed && <span style={{ fontSize: '0.8rem' }}>{isGovernanceSectionOpen ? '▾' : '▸'}</span>}
              </button>

              {isGovernanceSectionOpen && !isSidebarCollapsed && (
                <div style={{ display: 'grid', gap: '4px', paddingLeft: '14px' }}>
                  {showInsightsTab && (
                    <button
                      onClick={() => setActiveTab('insights')}
                      className={`sidebar-nav-item${activeTab === 'insights' ? ' is-active' : ''}`}
                    >
                      📈 Insights
                    </button>
                  )}

                  {showMyApprovalsTab && (
                    <button
                      onClick={() => setActiveTab('my-approvals')}
                      className={`sidebar-nav-item${activeTab === 'my-approvals' ? ' is-active' : ''}`}
                      style={{ justifyContent: 'space-between' }}
                    >
                      <span>📝 My Approvals</span>
                      {pendingApprovalsCount > 0 && (
                        <span style={{ background: 'var(--warning)', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700 }}>
                          {pendingApprovalsCount}
                        </span>
                      )}
                    </button>
                  )}

                  {showJoinUsReviewTab && (
                    <button
                      onClick={() => setActiveTab('governance-join-us-review')}
                      className={`sidebar-nav-item${activeTab === 'governance-join-us-review' ? ' is-active' : ''}`}
                      style={{ justifyContent: 'space-between' }}
                    >
                      <span>📝 Join Us Review</span>
                      {pendingJoinUsCount > 0 && (
                        <span style={{ background: 'var(--warning)', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700 }}>
                          {pendingJoinUsCount}
                        </span>
                      )}
                    </button>
                  )}

                  {showContactsTab && (
                    <button
                      onClick={() => setActiveTab('governance-contacts')}
                      className={`sidebar-nav-item${activeTab === 'governance-contacts' ? ' is-active' : ''}`}
                    >
                      📋 Contacts
                    </button>
                  )}

                  {showResponsibilityChartTab && (
                    <button
                      onClick={() => setActiveTab('settings-responsibility-chart')}
                      className={`sidebar-nav-item${activeTab === 'settings-responsibility-chart' ? ' is-active' : ''}`}
                    >
                      🧭 Responsibility Chart
                    </button>
                  )}

                  {showReimbursementsTab && (
                    <button
                      onClick={() => setActiveTab('member-services-reimbursements')}
                      className={`sidebar-nav-item${activeTab === 'member-services-reimbursements' ? ' is-active' : ''}`}
                    >
                      💰 Reimbursements
                    </button>
                  )}
                  {showEventsTab && (
                    <button
                      onClick={() => setActiveTab('member-services-events')}
                      className={`sidebar-nav-item${activeTab === 'member-services-events' ? ' is-active' : ''}`}
                    >
                      🗓️ Special Events
                    </button>
                  )}
                  {showNotificationsTab && (
                    <button
                      onClick={() => setActiveTab('member-services-notifications')}
                      className={`sidebar-nav-item${activeTab === 'member-services-notifications' ? ' is-active' : ''}`}
                    >
                      🔔 Notifications
                    </button>
                  )}
                  {showGmailTab && (
                    <button
                      onClick={() => setActiveTab('member-services-gmail')}
                      className={`sidebar-nav-item${activeTab === 'member-services-gmail' ? ' is-active' : ''}`}
                    >
                      ✉️ Gmail Workspace
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dynamic Sreni sections — each Sreni created in Settings appears here */}
          {sreniParentMenus.map(sreni => {
            const sreniId = sreni.key.replace(/^sreni-/, '');
            const calTab = `sreni-calendar-${sreniId}` as ActiveTab;
            const contactsTab = `sreni-contacts-${sreniId}` as ActiveTab;
            const attendanceTab = `sreni-attendance-${sreniId}` as ActiveTab;
            const documentsTab = `sreni-documents-${sreniId}` as ActiveTab;
            const reportsTab = `sreni-reports-${sreniId}` as ActiveTab;
            const analyticsTab = `sreni-analytics-${sreniId}` as ActiveTab;
            const isSreniTabActive = activeTab === calTab || activeTab === contactsTab || activeTab === attendanceTab || activeTab === documentsTab || activeTab === reportsTab || activeTab === analyticsTab;
            const isSectionOpen = openSreniKeys.has(sreni.key) || isSreniTabActive;
            const children = sreniChildMenus.filter(c => c.parentKey === sreni.key);

            return (
              <div key={sreni.key}>
                <button
                  onClick={() => toggleSreniOpen(sreni.key)}
                  className={`sidebar-nav-item${isSreniTabActive ? ' is-active' : ''}`}
                  style={{ justifyContent: isSidebarCollapsed ? 'center' : 'space-between', width: '100%' }}
                  title={sreni.label}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span>{sreni.icon ?? '🏘️'}</span>
                    {!isSidebarCollapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{sreni.label}</span>}
                  </span>
                  {!isSidebarCollapsed && <span style={{ fontSize: '0.8rem', flexShrink: 0 }}>{isSectionOpen ? '▾' : '▸'}</span>}
                </button>

                {isSectionOpen && !isSidebarCollapsed && (
                  <div style={{ display: 'grid', gap: '2px', paddingLeft: '14px' }}>
                    {children.map(child => {
                      const isContacts = child.key.endsWith('-contacts');
                      const isAttendance = child.key.endsWith('-attendance');
                      const isDocuments = child.key.endsWith('-documents');
                      const isReports = child.key.endsWith('-reports');
                      const isAnalytics = child.key.endsWith('-analytics');
                      const childSreniId = child.key.replace(/^sreni-/, '').replace(/-(calendar|contacts|attendance|documents|reports|analytics)$/, '');
                      const childTab = isContacts
                        ? `sreni-contacts-${childSreniId}` as ActiveTab
                        : isAttendance
                        ? `sreni-attendance-${childSreniId}` as ActiveTab
                        : isDocuments
                        ? `sreni-documents-${childSreniId}` as ActiveTab
                        : isReports
                        ? `sreni-reports-${childSreniId}` as ActiveTab
                        : isAnalytics
                        ? `sreni-analytics-${childSreniId}` as ActiveTab
                        : `sreni-calendar-${childSreniId}` as ActiveTab;
                      const isChildActive = activeTab === childTab;
                      return (
                        <button
                          key={child.key}
                          onClick={() => setActiveTab(childTab)}
                          className={`sidebar-nav-item${isChildActive ? ' is-active' : ''}`}
                          
                        >
                          {child.icon ?? '📅'} {child.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Sthans section — one collapsible group, each sthan is a direct clickable item */}
          {sthansRootMenu && sthanChildMenus.length > 0 && (
            <div>
              <button
                onClick={() => toggleSthanOpen('sthans')}
                className={`sidebar-nav-item${activeSthanKey ? ' is-active' : ''}`}
                style={{ justifyContent: isSidebarCollapsed ? 'center' : 'space-between', width: '100%' }}
                title="Sthans"
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span>📍</span>
                  {!isSidebarCollapsed && <span>Sthans</span>}
                </span>
                {!isSidebarCollapsed && (
                  <span style={{ fontSize: '0.8rem', flexShrink: 0 }}>
                    {(openSthanKeys.has('sthans') || !!activeSthanKey) ? '▾' : '▸'}
                  </span>
                )}
              </button>

              {(openSthanKeys.has('sthans') || !!activeSthanKey) && !isSidebarCollapsed && (
                <div style={{ display: 'grid', gap: '2px', paddingLeft: '14px' }}>
                  {sthanChildMenus.map(child => {
                    const locId = child.key.replace(/^sthan-/, '');
                    const childTab = `sthan-${locId}` as ActiveTab;
                    const isActive = (activeTab as string) === childTab;
                    return (
                      <button
                        key={child.key}
                        onClick={() => setActiveTab(childTab, { sthanSection: 'calendar' })}
                        className={`sidebar-nav-item${isActive ? ' is-active' : ''}`}
                        
                        title={child.label}
                      >
                        {child.icon ?? '📍'} {child.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {showGatewaySection && (
            <div>
              <button
                className={`sidebar-nav-item${isGatewayTabActive ? ' is-active' : ''}`}
                style={{ justifyContent: isSidebarCollapsed ? 'center' : 'space-between', width: '100%' }}
                title="Helpdesk"
                onClick={() => {
                  if (isSidebarCollapsed) {
                    if (showHelpdeskTicketsTab) {
                      setActiveTab('helpdesk-tickets');
                      return;
                    }
                    if (showJobPostingsTab) {
                      setActiveTab('job-postings');
                      return;
                    }
                    if (showJobApplicationsTab) {
                      setActiveTab('job-applications');
                    }
                    return;
                  }
                  setIsGatewayOpen((prev) => !prev);
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span>🛠️</span>
                  {!isSidebarCollapsed && <span>Helpdesk</span>}
                </span>
                {!isSidebarCollapsed && <span style={{ fontSize: '0.8rem' }}>{isGatewaySectionOpen ? '▾' : '▸'}</span>}
              </button>

              {isGatewaySectionOpen && !isSidebarCollapsed && (
                <div style={{ display: 'grid', gap: '4px', paddingLeft: '14px' }}>
                  {showHelpdeskTicketsTab && (
                    <button
                      onClick={() => setActiveTab('helpdesk-tickets')}
                      className={`sidebar-nav-item${activeTab === 'helpdesk-tickets' ? ' is-active' : ''}`}
                    >
                      🎫 Helpdesk Tickets
                    </button>
                  )}

                  {showJobPostingsTab && (
                    <button
                      onClick={() => setActiveTab('job-postings')}
                      className={`sidebar-nav-item${activeTab === 'job-postings' ? ' is-active' : ''}`}
                    >
                      📋 Job Postings
                    </button>
                  )}

                  {showJobApplicationsTab && (
                    <button
                      onClick={() => setActiveTab('job-applications')}
                      className={`sidebar-nav-item${activeTab === 'job-applications' ? ' is-active' : ''}`}
                    >
                      📄 Job Applications
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className={`sidebar-nav-item${isSettingsTabActive ? ' is-active' : ''}`}
            style={{ justifyContent: isSidebarCollapsed ? 'center' : 'space-between' }}
            title="Settings"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>⚙️</span>{!isSidebarCollapsed && <span>Settings</span>}
            </span>
            {!isSidebarCollapsed && <span style={{ fontSize: '0.8rem' }}>{isSettingsOpen ? '▾' : '▸'}</span>}
          </button>

          {isSettingsOpen && !isSidebarCollapsed && (
            <div style={{ display: 'grid', gap: '4px', paddingLeft: '14px' }}>
              <button
                onClick={() => setActiveTab('settings-roles-definition')}
                className={`sidebar-nav-item${activeTab === 'settings-roles-definition' ? ' is-active' : ''}`}
                
              >
                🎭 Roles Definition
              </button>

              <button
                onClick={() => setActiveTab('settings-location-definition')}
                className={`sidebar-nav-item${activeTab === 'settings-location-definition' ? ' is-active' : ''}`}
                
              >
                📍 Location Definition
              </button>

              <button
                onClick={() => setActiveTab('settings-sreni-definition')}
                className={`sidebar-nav-item${activeTab === 'settings-sreni-definition' ? ' is-active' : ''}`}
                
              >
                🏘️ Sreni Definition
              </button>

              <button
                onClick={() => setActiveTab('settings-permissions')}
                className={`sidebar-nav-item${activeTab === 'settings-permissions' ? ' is-active' : ''}`}
                
              >
                🔒 Permissions
              </button>

              <button
                onClick={() => setActiveTab('settings-permission-sets')}
                className={`sidebar-nav-item${activeTab === 'settings-permission-sets' ? ' is-active' : ''}`}
                
              >
                🗂️ Permission Sets
              </button>

              <button
                onClick={() => setActiveTab('settings-enum-values')}
                className={`sidebar-nav-item${activeTab === 'settings-enum-values' ? ' is-active' : ''}`}
                
              >
                🏷️ Reference Data
              </button>

              {showAdminsTab && (
                <button
                  onClick={() => setActiveTab('settings-admins')}
                  className={`sidebar-nav-item${activeTab === 'settings-admins' ? ' is-active' : ''}`}
                  
                >
                  👤 Admin Management
                </button>
              )}

              {SHOW_APPROVAL_WORKFLOWS_TAB && (
                <button
                  onClick={() => setActiveTab('settings-approval-workflows')}
                  className={`sidebar-nav-item${activeTab === 'settings-approval-workflows' ? ' is-active' : ''}`}
                  
                >
                  ✅ Approval Workflows
                </button>
              )}

              <button
                onClick={() => setActiveTab('settings-users')}
                className={`sidebar-nav-item${activeTab === 'settings-users' ? ' is-active' : ''}`}
                
              >
                👥 Users
              </button>

              <button
                onClick={() => setActiveTab('settings-attendance-metrics')}
                className={`sidebar-nav-item${activeTab === 'settings-attendance-metrics' ? ' is-active' : ''}`}
                
              >
                📏 Attendance Metrics
              </button>

              <button
                onClick={() => setActiveTab('settings-report-config')}
                className={`sidebar-nav-item${activeTab === 'settings-report-config' ? ' is-active' : ''}`}
                
              >
                📊 Report Config
              </button>

              {showAdminsTab && (
                <button
                  onClick={() => setActiveTab('settings-google-integration')}
                  className={`sidebar-nav-item${activeTab === 'settings-google-integration' ? ' is-active' : ''}`}
                  
                >
                  🔐 Google Integration
                </button>
              )}

              {showAdminsTab && (
                <button
                  onClick={() => setActiveTab('settings-smtp-integration')}
                  className={`sidebar-nav-item${activeTab === 'settings-smtp-integration' ? ' is-active' : ''}`}
                  
                >
                  📧 Email Integration
                </button>
              )}

            </div>
          )}
        </nav>

        {/* Logout Section */}
        <div style={{ padding: '0 12px' }}>
          <button 
            onClick={logout}
            className="btn btn-danger-ghost btn-sm"
            style={{ 
              width: '100%', 
              justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
            }}
            title="Log Out"
          >
            <span>🚪</span>{!isSidebarCollapsed && <span style={{ marginLeft: '8px' }}>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="admin-main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

        {/* Body content */}
        <div key={activeTab} className="tab-content-wrapper admin-content" style={{ padding: '32px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          
          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <div className="animate-slide-up" style={{ display: 'grid', gap: '18px' }}>
              <div>
                <h2 className="page-title">{dashboardHeading}</h2>
                <p className="page-subtitle">{dashboardSubtitle}</p>
              </div>

              <div className="dashboard-grid">
                {dashboardMetrics.map((metric) => (
                  <div key={metric.label} className="glass-panel widget-card" style={{ borderLeft: `3px solid ${signalStyles[metric.signal].accent}` }}>
                    <div className="widget-icon" style={{ background: `${signalStyles[metric.signal].accent}18`, color: signalStyles[metric.signal].accent }}>
                      {metric.icon}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span className="widget-label">{metric.label}</span>
                      <span className={`badge ${signalStyles[metric.signal].badgeClass}`} style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
                        {signalStyles[metric.signal].label}
                      </span>
                    </div>
                    <div className="widget-value" style={{ color: signalStyles[metric.signal].accent, marginTop: '4px' }}>{metric.value}</div>
                    {metric.hint && (
                      <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--text-secondary-dark)' }}>{metric.hint}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="glass-panel glass-panel--flat" style={{ padding: '14px 16px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
                  Contacts baseline: <strong style={{ color: 'var(--text-primary-dark)' }}>{contactCoverageTotal}</strong>
                </span>
                <span className={`badge ${signalStyles[attendanceSignal].badgeClass}`}>
                  Attendance pulse {attendanceCoverageTotal}
                </span>
                <span className={`badge ${signalStyles[reportingSignal].badgeClass}`}>
                  Reporting output {reportingCoverageTotal}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '16px' }}>
                <div className="glass-panel glass-panel--flat" style={{ padding: '18px' }}>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 700, marginBottom: '12px' }}>Priority Queue</h3>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {dashboardPriorities.map((priority) => (
                      <div key={priority.id} style={{ border: '1px solid var(--border-dark)', borderRadius: '10px', padding: '12px', background: 'var(--panel-soft-bg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ fontWeight: 700 }}>{priority.title}</div>
                          <span style={{ color: priority.tone, fontWeight: 800 }}>{priority.value}</span>
                        </div>
                        <p style={{ margin: '6px 0 10px', fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>{priority.note}</p>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActiveTab(priority.targetTab)}>
                          Open
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-panel glass-panel--flat" style={{ padding: '18px' }}>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 700, marginBottom: '12px' }}>Operational Focus</h3>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {dashboardPipelineRows.map((row) => (
                      <div key={row.label} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-dark)', background: 'var(--panel-soft-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{row.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`badge ${signalStyles[row.signal].badgeClass}`} style={{ fontSize: '0.66rem', padding: '2px 7px' }}>
                            {signalStyles[row.signal].label}
                          </span>
                          <span style={{ color: signalStyles[row.signal].accent, fontWeight: 800 }}>{row.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="glass-panel glass-panel--flat" style={{ padding: '18px' }}>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 700, marginBottom: '12px' }}>Sreni Directory Snapshot</h3>
                  <div style={{ display: 'grid', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                    {programs.length === 0 && (
                      <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-dark)', color: 'var(--text-secondary-dark)', fontSize: '0.84rem' }}>
                        No active sreni definitions found.
                      </div>
                    )}
                    {programs.map((program) => (
                      <div key={program.id} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-dark)', background: 'var(--panel-soft-bg)' }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: 700 }}>{program.title}</div>
                        <div style={{ marginTop: '2px', fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>Zone ID: {program.subtitle || 'Not mapped'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-panel glass-panel--flat" style={{ padding: '18px' }}>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 700, marginBottom: '12px' }}>Quick Navigation</h3>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {showMyApprovalsTab && (
                      <button type="button" className="btn btn-secondary" style={{ justifyContent: 'space-between' }} onClick={() => setActiveTab('my-approvals')}>
                        <span>My Approvals</span>
                        <span className="badge badge-warning" style={{ marginLeft: '8px' }}>{pendingApprovalsCount}</span>
                      </button>
                    )}
                    {showResponsibilityChartTab && (
                      <button type="button" className="btn btn-secondary" style={{ justifyContent: 'space-between' }} onClick={() => setActiveTab('settings-responsibility-chart')}>
                        <span>Responsibility Chart</span>
                        <span>↗</span>
                      </button>
                    )}
                    {showGatewaySection && (
                      <button type="button" className="btn btn-secondary" style={{ justifyContent: 'space-between' }} onClick={() => setActiveTab(showHelpdeskTicketsTab ? 'helpdesk-tickets' : showJobPostingsTab ? 'job-postings' : 'job-applications')}>
                        <span>Helpdesk Workspace</span>
                        <span>↗</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'insights' && <InsightsPage />}

          {/* TAB 2: ADMINS LIST (now under Settings) */}
          {activeTab === 'settings-admins' && showAdminsTab && (
            <AdminUsersList
              onAdd={() => openAdminForm(null)}
              onEdit={(id) => openAdminForm(id)}
            />
          )}

          {activeTab === 'settings-admins-form' && showAdminsTab && (
            <AdminUserForm
              editingId={adminFormEditId}
              onBack={closeAdminForm}
              onSaved={closeAdminForm}
            />
          )}

          {/* TAB 3: AUDIT LOGS */}
          {activeTab === 'logs' && showLogsTab && <AuditLogTable />}

          {/* TAB 4: FRM OPERATIONS */}
          {activeTab === 'ops' && showOpsTab && (
            <div className="animate-slide-up" style={{ display: 'grid', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>Core Business Persistence Readiness</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <button className="btn btn-secondary" onClick={loadPersistenceReadiness}>Load Persistence Readiness</button>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>{persistenceReadinessSummary}</div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>FR-DOC Document and Report Ops</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input className="input" value={docFolderName} onChange={(e) => setDocFolderName(e.target.value)} placeholder="folder name" />
                    <input className="input" value={docFileName} onChange={(e) => setDocFileName(e.target.value)} placeholder="document file name" />
                  </div>
                  <button className="btn btn-primary" onClick={runDocumentFlow}>Run Document Folder + Version Flow</button>
                  {docResult && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary-dark)' }}>{docResult}</div>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', marginTop: '6px' }}>
                    <input className="input" value={reportTemplateName} onChange={(e) => setReportTemplateName(e.target.value)} placeholder="report template name" />
                    <button className="btn btn-secondary" onClick={runReportFlow}>Run Report Template + Review Flow</button>
                  </div>
                  {reportResult && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary-dark)' }}>{reportResult}</div>}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>FR-APR Approval Ops</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <button className="btn btn-secondary" onClick={runApprovalFlow}>Run Approval Workflow + Review Flow</button>
                  {approvalResult && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary-dark)' }}>{approvalResult}</div>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings-roles-definition' && <RolesDefinitionPage />}

          {activeTab === 'settings-location-definition' && <LocationDefinitionPage />}

          {activeTab === 'settings-sreni-definition' && (
            <SreniDefinitionPage onSreniChange={loadSidebarMenus} />
          )}

          {activeTab === 'settings-permissions' && <PermissionDefinitionsPage />}

          {activeTab === 'settings-permission-sets' && <PermissionSetsPage />}

          {activeTab === 'settings-enum-values' && <EnumValuesPage />}

          {activeTab === 'settings-users' && (
            <UsersPage
              onAdd={() => openUsersForm(null)}
              onEdit={(user: UserApi) => openUsersForm(user)}
              editingUserId={usersFormEdit?.id ?? null}
            />
          )}

          {activeTab === 'settings-users-form' && (
            <UsersFormPage
              editingUser={usersFormEdit}
              onBack={closeUsersForm}
              onSaved={closeUsersForm}
            />
          )}

          {activeTab === 'my-approvals' && <ApprovalActionsPanel />}

          {activeTab === 'helpdesk-tickets' && showHelpdeskTicketsTab && <HelpdeskTicketsPage />}

          {activeTab === 'job-postings' && showJobPostingsTab && <JobPostingsPage />}

          {activeTab === 'job-applications' && showJobApplicationsTab && <JobApplicationsPage />}

          {activeTab === 'member-services-reimbursements' && showReimbursementsTab && <ReimbursementPage />}

          {activeTab === 'member-services-events' && showEventsTab && <SpecialEventsPage />}

          {activeTab === 'member-services-notifications' && showNotificationsTab && <NotificationsAdminPage />}

          {activeTab === 'member-services-gmail' && showGmailTab && <GmailWorkspacePanel />}

          {activeTab === 'governance-join-us-review' && showJoinUsReviewTab && <JoinUsReviewPage />}
          {activeTab === 'governance-contacts' && showContactsTab && <GlobalContactsPage />}

          {SHOW_APPROVAL_WORKFLOWS_TAB && activeTab === 'settings-approval-workflows' && (
            <ApprovalWorkflowPage
              onAdd={() => openApprovalWorkflowForm(null)}
              onEdit={(workflow: ApprovalWorkflowDefinitionApi) => openApprovalWorkflowForm(workflow)}
              editingWorkflowId={approvalWorkflowFormEdit?.id ?? null}
            />
          )}

          {SHOW_APPROVAL_WORKFLOWS_TAB && activeTab === 'settings-approval-workflows-form' && (
            <ApprovalWorkflowFormPage
              editingWorkflow={approvalWorkflowFormEdit}
              onBack={closeApprovalWorkflowForm}
              onSaved={closeApprovalWorkflowForm}
            />
          )}

          {activeTab === 'settings-attendance-metrics' && <AttendanceMetricsPage />}

          {(activeTab as string).startsWith('sreni-calendar-') && activeSreniCalendarKey && (() => {
            const sreniMenu = sreniParentMenus.find(m => m.key === `sreni-${activeSreniCalendarKey}`);
            return sreniMenu ? (
              <SreniCalendarPage sreniId={activeSreniCalendarKey} sreniName={sreniMenu.label} />
            ) : null;
          })()}

          {(activeTab as string).startsWith('sreni-contacts-') && activeSreniContactsKey && (() => {
            const sreniMenu = sreniParentMenus.find(m => m.key === `sreni-${activeSreniContactsKey}`);
            return sreniMenu ? (
              <SreniContactListPage sreniId={activeSreniContactsKey} sreniName={sreniMenu.label} />
            ) : null;
          })()}

          {(activeTab as string).startsWith('sreni-attendance-') && activeSreniAttendanceKey && (() => {
            const sreniMenu = sreniParentMenus.find(m => m.key === `sreni-${activeSreniAttendanceKey}`);
            return sreniMenu ? (
              <SreniAttendancePage sreniId={activeSreniAttendanceKey} sreniName={sreniMenu.label} />
            ) : null;
          })()}

          {(activeTab as string).startsWith('sreni-documents-') && activeSreniDocumentsKey && (() => {
            const sreniMenu = sreniParentMenus.find(m => m.key === `sreni-${activeSreniDocumentsKey}`);
            return sreniMenu ? (
              <SreniDocumentsPage sreniId={activeSreniDocumentsKey} sreniName={sreniMenu.label} />
            ) : null;
          })()}

          {(activeTab as string).startsWith('sreni-reports-') && activeSreniReportsKey && (() => {
            const sreniMenu = sreniParentMenus.find(m => m.key === `sreni-${activeSreniReportsKey}`);
            return sreniMenu ? (
              <SreniReportsPage sreniId={activeSreniReportsKey} sreniName={sreniMenu.label} />
            ) : null;
          })()}

          {(activeTab as string).startsWith('sreni-analytics-') && activeSreniAnalyticsKey && (() => {
            const sreniMenu = sreniParentMenus.find(m => m.key === `sreni-${activeSreniAnalyticsKey}`);
            return sreniMenu ? (
              <SreniAnalyticsStudioPage sreniId={activeSreniAnalyticsKey} sreniName={sreniMenu.label} />
            ) : null;
          })()}

          {activeTab === 'settings-report-config' && <ReportConfigSettingsPage />}

          {activeTab === 'settings-google-integration' && showAdminsTab && <GoogleIntegrationSettingsPage />}

          {activeTab === 'settings-smtp-integration' && showAdminsTab && <SmtpIntegrationSettingsPage />}

          {activeTab === 'settings-responsibility-chart' && <ResponsibilityChartPage />}

          {/* Sthan detail page — tabs (Reports / Expenses / Contacts) are rendered inside */}
          {(activeTab as string).startsWith('sthan-') && activeSthanKey && (() => {
            const sthanMenu = sthanChildMenus.find(m => m.key === `sthan-${activeSthanKey}`);
            return sthanMenu ? (
              <SthanDetailPage
                locationId={activeSthanKey}
                locationName={sthanMenu.label}
                activeSection={activeSthanSection}
                onSectionChange={handleSthanSectionChange}
              />
            ) : null;
          })()}

        </div>

        <footer
          style={{
            height: '56px',
            minHeight: '56px',
            maxHeight: '56px',
            borderTop: '1px solid var(--border-dark)',
            backgroundColor: 'var(--glass-bg)',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>
            © {currentYear} AD West - IFCA
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
            Powered by <a style={{ color: 'var(--text-secondary-dark)', textDecoration: 'underline' }}>VGK Technologies</a>
          </span>
        </footer>
      </main>
      </div>
    </div>
    </AdminDefinitionsProvider>
  );
};


