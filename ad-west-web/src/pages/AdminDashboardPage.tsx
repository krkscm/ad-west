import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/auth-context';
import { useToast } from '../components/common/Toast';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { NotificationBell } from '../components/common/NotificationBell';
import { ResetPasswordModal } from '../components/common/ResetPasswordModal';
import { AdminUsersList } from '../components/features/AdminUsersList';
import { AdminUserForm } from '../components/features/AdminUserForm';
import { AuditLogTable } from '../components/features/AuditLogTable';
import { EditRequestsList } from '../components/features/EditRequestsList';
import { ImportReconciliationPanel } from '../components/features/ImportReconciliationPanel';
import { TicketActivityPanel } from '../components/features/TicketActivityPanel';
import { RolesDefinitionPage } from './settings/RolesDefinitionPage';
import { LocationDefinitionPage } from './settings/LocationDefinitionPage';
import { SreniDefinitionPage } from './settings/SreniDefinitionPage';
import { PermissionDefinitionsPage } from './settings/PermissionDefinitionsPage';
import { PermissionSetsPage } from './settings/PermissionSetsPage';
import { UsersPage } from './settings/UsersPage';
import { UsersFormPage } from './settings/UsersFormPage';
import { ApprovalWorkflowPage } from './settings/ApprovalWorkflowPage';
import { ApprovalWorkflowFormPage } from './settings/ApprovalWorkflowFormPage';
import { EnumValuesPage } from './settings/EnumValuesPage';
import { SreniCalendarPage } from './SreniCalendarPage';
import { SreniContactListPage } from './SreniContactListPage';
import { SreniAttendancePage } from './SreniAttendancePage';
import { SreniDocumentsPage } from './SreniDocumentsPage';
import { SreniReportsPage } from './SreniReportsPage';
import { AttendanceMetricsPage } from './settings/AttendanceMetricsPage';
import { ReportConfigSettingsPage } from './settings/ReportConfigSettingsPage';
import {
  ApprovalWorkflowDefinitionApi,
  backendApi,
  HelpdeskMetricsApi,
  MenuItemApi,
  UserApi,
} from '../utils/backendApi';

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

interface UiAuditLog {
  id: string;
  actorName: string;
  action: string;
  timestamp: string;
}

interface UiProgram {
  id: string;
  title: string;
  startDate: string;
}

type ActiveTab =
  | 'dashboard'
  | 'approvals'
  | 'logs'
  | 'imports'
  | 'ticket-activity'
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
  | 'settings-report-config'
  | `sreni-calendar-${string}`
  | `sreni-contacts-${string}`
  | `sreni-attendance-${string}`
  | `sreni-documents-${string}`
  | `sreni-reports-${string}`;

const SETTINGS_ROOT_TAB: ActiveTab = 'settings-admins';

const ALL_TABS: ActiveTab[] = [
  'dashboard', 'approvals', 'logs', 'imports', 'ticket-activity', 'ops',
  'settings-admins', 'settings-admins-form', 'settings-users-form', 'settings-roles-definition', 'settings-location-definition',
  'settings-sreni-definition', 'settings-permissions', 'settings-permission-sets', 'settings-enum-values',
  'settings-users', 'settings-approval-workflows', 'settings-approval-workflows-form', 'settings-attendance-metrics',
  'settings-report-config',
];

const LEGACY_TAB_REDIRECTS: Record<string, ActiveTab> = {
  'permission-sets': 'settings-permission-sets',
  'users': 'settings-users',
  'approval-workflows': 'settings-approval-workflows',
};

const resolveTabFromHash = (hash: string): ActiveTab | null => {
  const normalizedHash = LEGACY_TAB_REDIRECTS[hash] ?? hash;
  if ((ALL_TABS as string[]).includes(normalizedHash)) return normalizedHash as ActiveTab;
  if (normalizedHash.startsWith('sreni-calendar-')) return normalizedHash as ActiveTab;
  if (normalizedHash.startsWith('sreni-contacts-')) return normalizedHash as ActiveTab;
  if (normalizedHash.startsWith('sreni-attendance-')) return normalizedHash as ActiveTab;
  if (normalizedHash.startsWith('sreni-documents-')) return normalizedHash as ActiveTab;
  if (normalizedHash.startsWith('sreni-reports-')) return normalizedHash as ActiveTab;
  return null;
};

const getInitialTab = (): ActiveTab => {
  const hash = window.location.hash.replace(/^#/, '');
  return resolveTabFromHash(hash) ?? 'dashboard';
};

const TAB_METADATA: { [key: string]: { label: string; parent?: 'settings' } } = {
  dashboard: { label: 'Dashboard' },
  approvals: { label: 'Approvals' },
  logs: { label: 'Audit Logs' },
  imports: { label: 'Import Reconciliation' },
  'ticket-activity': { label: 'Ticket Activity' },
  ops: { label: 'Ops Coverage' },
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
  'settings-report-config': { label: 'Report Config', parent: 'settings' },
};

const SETTINGS_TABS: ActiveTab[] = Object.entries(TAB_METADATA)
  .filter(([tab, meta]) => meta.parent === 'settings' && tab !== 'settings-admins-form' && tab !== 'settings-users-form' && tab !== 'settings-approval-workflows-form')
  .map(([tab]) => tab as ActiveTab);

const buildBreadcrumbItems = (
  activeTab: ActiveTab,
  options?: { formLabel?: string; usersFormLabel?: string; approvalWorkflowFormLabel?: string; sreniName?: string },
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [adminFormEditId, setAdminFormEditId] = useState<string | null>(null);
  const [usersFormEdit, setUsersFormEdit] = useState<UserApi | null>(null);
  const [approvalWorkflowFormEdit, setApprovalWorkflowFormEdit] = useState<ApprovalWorkflowDefinitionApi | null>(null);
  const [sidebarMenuItems, setSidebarMenuItems] = useState<MenuItemApi[]>([]);
  const [openSreniKeys, setOpenSreniKeys] = useState<Set<string>>(new Set());
  const { adminUser, logout } = useAuth();
  const { addToast } = useToast();

  const setActiveTab = useCallback((tab: ActiveTab) => {
    window.location.hash = tab;
    setActiveTabState(tab);
  }, []);

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
    const onHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      const resolvedTab = resolveTabFromHash(hash);
      if (resolvedTab) {
        if ((LEGACY_TAB_REDIRECTS[hash] ?? null) === resolvedTab) {
          window.location.hash = resolvedTab;
        }
        setActiveTabState(resolvedTab);
        return;
      }
      setActiveTabState('dashboard');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

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

  // Metrics state
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [totalContactsCount, setTotalContactsCount] = useState(0);
  const [ticketMetrics, setTicketMetrics] = useState<HelpdeskMetricsApi | null>(null);
  const [recentLogs, setRecentLogs] = useState<UiAuditLog[]>([]);
  const [programs, setPrograms] = useState<UiProgram[]>([]);
  const [srenyId, setSrenyId] = useState('');
  const [contactId, setContactId] = useState('');
  const [metadataJson, setMetadataJson] = useState('{"designation":"coordinator","dutyWindow":"weekday-evening"}');
  const [metadataResponse, setMetadataResponse] = useState('');
  const [importResponse, setImportResponse] = useState('');
  const [searchTerm, setSearchTerm] = useState('issue');
  const [searchCount, setSearchCount] = useState<number | null>(null);
  const [docFolderName, setDocFolderName] = useState('Weekly Reports');
  const [docFileName, setDocFileName] = useState('sreny-weekly-summary.pdf');
  const [docResult, setDocResult] = useState('');
  const [latestDocumentId, setLatestDocumentId] = useState('');
  const [reportTemplateName, setReportTemplateName] = useState('Monthly Activity Report');
  const [reportResult, setReportResult] = useState('');
  const [latestTemplateId, setLatestTemplateId] = useState('');
  const [jobTitle, setJobTitle] = useState('Community Program Coordinator');
  const [jobResult, setJobResult] = useState('');
  const [latestJobId, setLatestJobId] = useState('');
  const [approvalResult, setApprovalResult] = useState('');
  const [latestWorkflowId, setLatestWorkflowId] = useState('');
  const [persistenceReadinessSummary, setPersistenceReadinessSummary] = useState('Not loaded yet');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [metrics, contacts, logs, programRows, pendingRequests, srenies] = await Promise.all([
          backendApi.getHelpdeskTicketMetrics(),
          backendApi.listContacts(),
          backendApi.listAuditLogs(),
          backendApi.listPrograms(),
          backendApi.listAdminEditRequests('pending'),
          backendApi.listSrenies(),
        ]);

        setPendingApprovalsCount(pendingRequests.length);
        setTicketMetrics(metrics);
        setOpenTicketsCount(metrics.open + metrics.inProgress);
        setTotalContactsCount(contacts.filter((c) => c.status === 'active').length);
        setSrenyId((prev) => prev || srenies[0]?.id || '');
        setContactId((prev) => prev || contacts[0]?.id || '');
        setRecentLogs(
          logs.slice(0, 5).map((log) => ({
            id: log.id,
            actorName: log.actorId,
            action: log.action,
            timestamp: log.timestamp,
          })),
        );
        setPrograms(
          programRows.map((program) => ({
            id: program.id,
            title: program.title,
            startDate: program.startDate,
          })),
        );
      } catch {
        setPendingApprovalsCount(0);
        setOpenTicketsCount(0);
        setTotalContactsCount(0);
        setTicketMetrics(null);
        setRecentLogs([]);
        setPrograms([]);
      }
    };

    void loadDashboard();
  }, [activeTab]);

  if (!adminUser) return null;

  // Determine user permissions based on first role
  const userRole = adminUser.roles[0]?.role;

  const isSuperAdmin = userRole === 'Super Admin';
  const isZoneAdmin = userRole === 'Zone Admin';
  const showOpsTab = isSuperAdmin || isZoneAdmin;

  // Allowed tabs:
  // Super Admin: dashboard, approvals, logs + all settings
  // Zone Admin: dashboard, approvals, logs
  // Sreny Admin: dashboard, approvals
  const showAdminsTab = isSuperAdmin;
  const showLogsTab = isSuperAdmin || isZoneAdmin;
  const isSettingsTabActive = SETTINGS_TABS.includes(activeTab) || activeTab === 'settings-admins-form' || activeTab === 'settings-users-form' || activeTab === 'settings-approval-workflows-form';

  // Sreni sidebar menu structure — only items whose keys start with 'sreni-'
  const sreniParentMenus = sidebarMenuItems.filter(m => m.active && m.key.startsWith('sreni-') && !m.parentKey);
  const sreniChildMenus = sidebarMenuItems.filter(m => m.active && m.parentKey?.startsWith('sreni-'));

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
  const activeSreniKey = activeSreniCalendarKey ?? activeSreniContactsKey ?? activeSreniAttendanceKey ?? activeSreniDocumentsKey ?? activeSreniReportsKey;
  const activeSreniMenuLabel = activeSreniKey
    ? sreniParentMenus.find(m => m.key === `sreni-${activeSreniKey}`)?.label
    : undefined;

  const breadcrumbItems = buildBreadcrumbItems(activeTab, {
    formLabel: activeTab === 'settings-admins-form' ? (adminFormEditId ? 'Edit Administrator' : 'New Administrator') : undefined,
    usersFormLabel: activeTab === 'settings-users-form' ? (usersFormEdit ? 'Edit User' : 'New User') : undefined,
    approvalWorkflowFormLabel: activeTab === 'settings-approval-workflows-form' ? (approvalWorkflowFormEdit ? 'Edit Approval Workflow' : 'New Approval Workflow') : undefined,
    sreniName: activeSreniMenuLabel,
  });
  const sidebarWidth = isSidebarCollapsed ? '84px' : '260px';
  const currentYear = new Date().getFullYear();

  const runMetadataUpsert = async () => {
    if (!contactId || !srenyId) {
      addToast('Select both contact and sreny first.', 'error');
      return;
    }

    try {
      const parsed = JSON.parse(metadataJson) as Record<string, string>;
      const response = await backendApi.upsertContactSrenyMetadata(contactId, srenyId, parsed);
      setMetadataResponse(JSON.stringify(response.customMetadataBySreny?.[srenyId] ?? {}, null, 2));
      addToast('FRM-008 metadata upsert successful.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Metadata upsert failed.', 'error');
    }
  };

  const runMergeFlow = async () => {
    try {
      const importRecord = await backendApi.startContactImport({
        fileName: 'merge-propagation-ui.csv',
        fileType: 'csv',
        hasHeader: true,
      });
      const duplicates = await backendApi.listImportDuplicates(importRecord.id);
      if (!duplicates.length) {
        setImportResponse(`Import ${importRecord.id} created with 0 duplicate candidates.`);
        addToast('No duplicate candidates for merge in this dataset.', 'warning');
        return;
      }

      const first = duplicates[0];
      const merged = await backendApi.mergeDuplicate(importRecord.id, first.id);
      const reconciliation = await backendApi.getImportReconciliation(importRecord.id);

      let finalizedStatus = 'not-finalized';
      if (reconciliation.canFinalize) {
        const finalized = await backendApi.finalizeImport(importRecord.id);
        finalizedStatus = finalized.status;
      }

      setImportResponse(
        `importId=${importRecord.id}, duplicateId=${first.id}, left=${first.leftContactId}, right=${first.rightContactId}, merged=${merged.success}, pending=${reconciliation.pendingDuplicates}, mergedCount=${reconciliation.mergedDuplicates}, skippedCount=${reconciliation.skippedDuplicates}, finalized=${finalizedStatus}`,
      );
      addToast('FRM-017 merge propagation executed.', 'success');
    } catch (error) {
      addToast(toUiError(error, 'Merge flow failed.'), 'error');
    }
  };

  const runTicketSearch = async () => {
    try {
      const rows = await backendApi.listHelpdeskTickets(undefined, searchTerm.trim());
      setSearchCount(rows.length);
      addToast('FRM-035 search executed.', 'success');
    } catch (error) {
      addToast(toUiError(error, 'Ticket search failed.'), 'error');
    }
  };

  const refreshMetrics = async () => {
    try {
      const metrics = await backendApi.getHelpdeskTicketMetrics();
      setTicketMetrics(metrics);
      setOpenTicketsCount(metrics.open + metrics.inProgress);
      addToast('FRM-035 metrics refreshed.', 'success');
    } catch (error) {
      addToast(toUiError(error, 'Metrics refresh failed.'), 'error');
    }
  };

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

  const runJobFlow = async () => {
    if (!srenyId) {
      addToast('Load dashboard data first to get a valid sreny.', 'warning');
      return;
    }

    try {
      const listing = await backendApi.createJobListing({
        srenyId,
        title: jobTitle.trim() || 'Community Program Coordinator',
        organization: 'ADWest Community Network',
        location: 'Dubai',
        jobType: 'part_time',
        description: 'Coordinate local programs and attendance support.',
        skills: ['coordination', 'excel', 'community-engagement'],
      });

      const activeListing = await backendApi.updateJobListingStatus(listing.id, 'active');
      setLatestJobId(activeListing.id);
      const resumes = await backendApi.listResumes();
      setJobResult(`job=${activeListing.id}, status=${activeListing.status}, resumesIndexed=${resumes.length}`);
      addToast('FR-JOB listing/status flow executed.', 'success');
    } catch (error) {
      addToast(toUiError(error, 'Job flow failed.'), 'error');
    }
  };

  const runApprovalFlow = async () => {
    const targetId = latestDocumentId || latestJobId || latestTemplateId;
    if (!targetId) {
      addToast('Run document, report, or job flow first to generate a target for approval.', 'warning');
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
    <div className="admin-theme" style={{ display: 'flex', minHeight: '100vh', width: '100vw' }}>
      
      {/* Sidebar navigation */}
      <aside
        style={{
          width: sidebarWidth,
          height: '100vh',
          flexShrink: 0,
          borderRight: '1px solid var(--border-dark)',
          backgroundColor: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
          transition: 'width 0.2s ease',
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'sticky',
          top: 0,
        }}
      >
        {/* Brand */}
        <div style={{ padding: isSidebarCollapsed ? '0 12px' : '0 24px', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
          <img
            src="/favicon.png"
            alt="Abu Dhabi West"
            style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'contain', flexShrink: 0 }}
          />
          {!isSidebarCollapsed && (
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary-dark)', lineHeight: 1 }}>Abu Dhabi West</h3>
          )}
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px' }}>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', 
              padding: '10px 16px', 
              fontSize: '0.9rem',
              background: activeTab === 'dashboard' ? '' : 'transparent',
              border: 'none',
              color: activeTab === 'dashboard' ? '#fff' : 'var(--text-secondary-dark)'
            }}
            title="Dashboard"
          >
            <span>📊</span>{!isSidebarCollapsed && <span style={{ marginLeft: '8px' }}>Dashboard</span>}
          </button>

          {/* Dynamic Sreni sections — each Sreni created in Settings appears here */}
          {sreniParentMenus.map(sreni => {
            const sreniId = sreni.key.replace(/^sreni-/, '');
            const calTab = `sreni-calendar-${sreniId}` as ActiveTab;
            const contactsTab = `sreni-contacts-${sreniId}` as ActiveTab;
            const attendanceTab = `sreni-attendance-${sreniId}` as ActiveTab;
            const documentsTab = `sreni-documents-${sreniId}` as ActiveTab;
            const reportsTab = `sreni-reports-${sreniId}` as ActiveTab;
            const isSreniTabActive = activeTab === calTab || activeTab === contactsTab || activeTab === attendanceTab || activeTab === documentsTab || activeTab === reportsTab;
            const isSectionOpen = openSreniKeys.has(sreni.key) || isSreniTabActive;
            const children = sreniChildMenus.filter(c => c.parentKey === sreni.key);

            return (
              <div key={sreni.key}>
                <button
                  onClick={() => toggleSreniOpen(sreni.key)}
                  className={`btn ${isSreniTabActive ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
                    padding: '10px 16px',
                    fontSize: '0.9rem',
                    background: isSreniTabActive ? '' : 'transparent',
                    border: 'none',
                    color: isSreniTabActive ? '#fff' : 'var(--text-secondary-dark)',
                    width: '100%',
                  }}
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
                      const childSreniId = child.key.replace(/^sreni-/, '').replace(/-(calendar|contacts|attendance|documents|reports)$/, '');
                      const childTab = isContacts
                        ? `sreni-contacts-${childSreniId}` as ActiveTab
                        : isAttendance
                        ? `sreni-attendance-${childSreniId}` as ActiveTab
                        : isDocuments
                        ? `sreni-documents-${childSreniId}` as ActiveTab
                        : isReports
                        ? `sreni-reports-${childSreniId}` as ActiveTab
                        : `sreni-calendar-${childSreniId}` as ActiveTab;
                      const isChildActive = activeTab === childTab;
                      return (
                        <button
                          key={child.key}
                          onClick={() => setActiveTab(childTab)}
                          className={`btn ${isChildActive ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            justifyContent: 'flex-start',
                            padding: '8px 14px',
                            fontSize: '0.84rem',
                            background: isChildActive ? '' : 'transparent',
                            border: 'none',
                            color: isChildActive ? '#fff' : 'var(--text-secondary-dark)',
                          }}
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

          <button
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className={`btn ${isSettingsTabActive ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
              padding: '10px 16px',
              fontSize: '0.9rem',
              background: isSettingsTabActive ? '' : 'transparent',
              border: 'none',
              color: isSettingsTabActive ? '#fff' : 'var(--text-secondary-dark)'
            }}
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
                className={`btn ${activeTab === 'settings-roles-definition' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  justifyContent: 'flex-start',
                  padding: '8px 14px',
                  fontSize: '0.84rem',
                  background: activeTab === 'settings-roles-definition' ? '' : 'transparent',
                  border: 'none',
                  color: activeTab === 'settings-roles-definition' ? '#fff' : 'var(--text-secondary-dark)'
                }}
              >
                🎭 Roles Definition
              </button>

              <button
                onClick={() => setActiveTab('settings-location-definition')}
                className={`btn ${activeTab === 'settings-location-definition' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  justifyContent: 'flex-start',
                  padding: '8px 14px',
                  fontSize: '0.84rem',
                  background: activeTab === 'settings-location-definition' ? '' : 'transparent',
                  border: 'none',
                  color: activeTab === 'settings-location-definition' ? '#fff' : 'var(--text-secondary-dark)'
                }}
              >
                📍 Location Definition
              </button>

              <button
                onClick={() => setActiveTab('settings-sreni-definition')}
                className={`btn ${activeTab === 'settings-sreni-definition' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  justifyContent: 'flex-start',
                  padding: '8px 14px',
                  fontSize: '0.84rem',
                  background: activeTab === 'settings-sreni-definition' ? '' : 'transparent',
                  border: 'none',
                  color: activeTab === 'settings-sreni-definition' ? '#fff' : 'var(--text-secondary-dark)'
                }}
              >
                🏘️ Sreni Definition
              </button>

              <button
                onClick={() => setActiveTab('settings-permissions')}
                className={`btn ${activeTab === 'settings-permissions' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  justifyContent: 'flex-start',
                  padding: '8px 14px',
                  fontSize: '0.84rem',
                  background: activeTab === 'settings-permissions' ? '' : 'transparent',
                  border: 'none',
                  color: activeTab === 'settings-permissions' ? '#fff' : 'var(--text-secondary-dark)'
                }}
              >
                🔒 Permissions
              </button>

              <button
                onClick={() => setActiveTab('settings-permission-sets')}
                className={`btn ${activeTab === 'settings-permission-sets' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  justifyContent: 'flex-start',
                  padding: '8px 14px',
                  fontSize: '0.84rem',
                  background: activeTab === 'settings-permission-sets' ? '' : 'transparent',
                  border: 'none',
                  color: activeTab === 'settings-permission-sets' ? '#fff' : 'var(--text-secondary-dark)'
                }}
              >
                🗂️ Permission Sets
              </button>

              <button
                onClick={() => setActiveTab('settings-enum-values')}
                className={`btn ${activeTab === 'settings-enum-values' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  justifyContent: 'flex-start',
                  padding: '8px 14px',
                  fontSize: '0.84rem',
                  background: activeTab === 'settings-enum-values' ? '' : 'transparent',
                  border: 'none',
                  color: activeTab === 'settings-enum-values' ? '#fff' : 'var(--text-secondary-dark)'
                }}
              >
                🏷️ Reference Data
              </button>

              {showAdminsTab && (
                <button
                  onClick={() => setActiveTab('settings-admins')}
                  className={`btn ${activeTab === 'settings-admins' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    justifyContent: 'flex-start',
                    padding: '8px 14px',
                    fontSize: '0.84rem',
                    background: activeTab === 'settings-admins' ? '' : 'transparent',
                    border: 'none',
                    color: activeTab === 'settings-admins' ? '#fff' : 'var(--text-secondary-dark)'
                  }}
                >
                  👤 Admin Management
                </button>
              )}

              <button
                onClick={() => setActiveTab('settings-approval-workflows')}
                className={`btn ${activeTab === 'settings-approval-workflows' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  justifyContent: 'flex-start',
                  padding: '8px 14px',
                  fontSize: '0.84rem',
                  background: activeTab === 'settings-approval-workflows' ? '' : 'transparent',
                  border: 'none',
                  color: activeTab === 'settings-approval-workflows' ? '#fff' : 'var(--text-secondary-dark)'
                }}
              >
                ✅ Approval Workflows
              </button>

              <button
                onClick={() => setActiveTab('settings-users')}
                className={`btn ${activeTab === 'settings-users' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  justifyContent: 'flex-start',
                  padding: '8px 14px',
                  fontSize: '0.84rem',
                  background: activeTab === 'settings-users' ? '' : 'transparent',
                  border: 'none',
                  color: activeTab === 'settings-users' ? '#fff' : 'var(--text-secondary-dark)'
                }}
              >
                👥 Users
              </button>

              <button
                onClick={() => setActiveTab('settings-attendance-metrics')}
                className={`btn ${activeTab === 'settings-attendance-metrics' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  justifyContent: 'flex-start',
                  padding: '8px 14px',
                  fontSize: '0.84rem',
                  background: activeTab === 'settings-attendance-metrics' ? '' : 'transparent',
                  border: 'none',
                  color: activeTab === 'settings-attendance-metrics' ? '#fff' : 'var(--text-secondary-dark)'
                }}
              >
                📏 Attendance Metrics
              </button>

              <button
                onClick={() => setActiveTab('settings-report-config')}
                className={`btn ${activeTab === 'settings-report-config' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  justifyContent: 'flex-start',
                  padding: '8px 14px',
                  fontSize: '0.84rem',
                  background: activeTab === 'settings-report-config' ? '' : 'transparent',
                  border: 'none',
                  color: activeTab === 'settings-report-config' ? '#fff' : 'var(--text-secondary-dark)'
                }}
              >
                📊 Report Config
              </button>

            </div>
          )}
        </nav>

        {/* Logout Section */}
        <div style={{ padding: '0 12px' }}>
          <button 
            onClick={logout}
            className="btn btn-secondary"
            style={{ 
              width: '100%', 
              justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', 
              padding: '10px 16px', 
              fontSize: '0.9rem',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171'
            }}
            title="Log Out"
          >
            <span>🚪</span>{!isSidebarCollapsed && <span style={{ marginLeft: '8px' }}>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        
        {/* Top Header bar */}
        <header 
          style={{
            height: '72px',
            minHeight: '72px',
            maxHeight: '72px',
            borderBottom: '1px solid var(--border-dark)',
            backgroundColor: 'var(--glass-bg)',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              minWidth: 0,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
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
              }}
            >
              ≡
            </button>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                minWidth: 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                fontSize: '0.88rem',
                lineHeight: 1,
              }}
            >
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <NotificationBell />
            <button
              type="button"
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
            <div style={{ width: '1px', height: '24px', background: 'var(--border-dark)', margin: '0 4px' }} />
            <ThemeToggle iconOnly placement="header" />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.2 }}>{adminUser.name}</h4>
              <span style={{ marginTop: '2px', fontSize: '0.75rem', lineHeight: 1.2, color: 'var(--text-secondary-dark)' }}>{adminUser.email}</span>
              <span
                className={`badge ${isSuperAdmin ? 'badge-error' : isZoneAdmin ? 'badge-warning' : 'badge-info'}`}
                style={{ marginTop: '5px', padding: '3px 8px', fontSize: '0.7rem', lineHeight: 1.4 }}
              >
                🛡️ {userRole}
              </span>
            </div>
          </div>

          <ResetPasswordModal isOpen={showResetPassword} onClose={() => setShowResetPassword(false)} />
        </header>

        {/* Body content */}
        <div style={{ padding: '32px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          
          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <div className="animate-slide-up">
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Platform Overview</h2>
                <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px' }}>
                  Monitoring community directory health, pending validations, and administrative logs.
                </p>
              </div>

              {/* Grid Widgets */}
              <div className="dashboard-grid" style={{ marginBottom: '32px' }}>
                
                {/* Widget 1: Pending approvals */}
                <div 
                  className="widget-card glass-panel"
                  style={{ borderLeft: '4px solid var(--warning)' }}
                >
                  <div className="widget-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' }}>📝</div>
                  <div className="widget-value">{pendingApprovalsCount}</div>
                  <div className="widget-label" style={{ color: 'var(--text-secondary-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Pending Approvals</span>
                    {pendingApprovalsCount > 0 && (
                      <button 
                        onClick={() => setActiveTab('approvals')}
                        style={{ border: 'none', background: 'transparent', color: 'var(--warning)', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Review &rarr;
                      </button>
                    )}
                  </div>
                </div>

                {/* Widget 2: Helpdesk tickets */}
                <div 
                  className="widget-card glass-panel"
                  style={{ borderLeft: '4px solid var(--info)' }}
                >
                  <div className="widget-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--info)' }}>🎫</div>
                  <div className="widget-value">{openTicketsCount}</div>
                  <div className="widget-label" style={{ color: 'var(--text-secondary-dark)' }}>Active Helpdesk Tickets</div>
                </div>

                {/* Widget 3: Duplicate alerts */}
                <div 
                  className="widget-card glass-panel"
                  style={{ borderLeft: '4px solid var(--error)' }}
                >
                  <div className="widget-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)' }}>⚠️</div>
                  <div className="widget-value">5</div>
                  <div className="widget-label" style={{ color: 'var(--text-secondary-dark)' }}>Contact Duplicate Alerts</div>
                </div>

                {/* Widget 4: Total members */}
                <div 
                  className="widget-card glass-panel"
                  style={{ borderLeft: '4px solid var(--success)' }}
                >
                  <div className="widget-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>👥</div>
                  <div className="widget-value">{totalContactsCount}</div>
                  <div className="widget-label" style={{ color: 'var(--text-secondary-dark)' }}>Active Members Directory</div>
                </div>

              </div>

              {/* Layout split: recent activity and calendar */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '32px' }}>
                
                {/* Recent audit activity list */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🗂️</span> Recent Security Audits
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {recentLogs.map(log => {
                      const date = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      
                      let bColor = 'var(--info)';
                      if (log.action.includes('FAILURE')) bColor = 'var(--error)';
                      if (log.action.includes('SUCCESS') || log.action.includes('APPROVE') || log.action.includes('ENROLLED')) bColor = 'var(--success)';

                      return (
                        <div 
                          key={log.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            backgroundColor: 'var(--panel-soft-bg)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-dark)'
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)' }}>{date} &bull; {log.actorName}</span>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '2px' }}>{log.action.replace(/_/g, ' ')}</h4>
                          </div>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: bColor }} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upcoming programs list */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📅</span> Active Programs Schedule
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {programs.map(prog => (
                      <div 
                        key={prog.id}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: 'var(--panel-soft-bg)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-dark)'
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)', fontWeight: 600 }}>Program</span>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginTop: '2px' }}>{prog.title}</h4>
                        <p style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: '4px', fontWeight: 600 }}>📅 {prog.startDate}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

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

          {/* TAB 3: APPROVALS */}
          {activeTab === 'approvals' && <EditRequestsList />}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === 'logs' && showLogsTab && <AuditLogTable />}

          {/* TAB 5: IMPORT RECONCILIATION */}
          {activeTab === 'imports' && showOpsTab && <ImportReconciliationPanel />}

          {/* TAB 6: HELPDESK TICKET ACTIVITY */}
          {activeTab === 'ticket-activity' && showOpsTab && <TicketActivityPanel />}

          {/* TAB 7: FRM OPERATIONS */}
          {activeTab === 'ops' && showOpsTab && (
            <div className="animate-slide-up" style={{ display: 'grid', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>FRM-008 Contact Sreny Metadata</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <input className="input" value={contactId} onChange={(e) => setContactId(e.target.value)} placeholder="contactId" />
                  <input className="input" value={srenyId} onChange={(e) => setSrenyId(e.target.value)} placeholder="srenyId" />
                  <textarea
                    className="input"
                    value={metadataJson}
                    onChange={(e) => setMetadataJson(e.target.value)}
                    rows={4}
                    style={{ resize: 'vertical' }}
                  />
                  <button className="btn btn-primary" onClick={runMetadataUpsert}>Run Metadata Upsert</button>
                  {metadataResponse && (
                    <pre style={{ margin: 0, padding: '12px', borderRadius: '8px', background: 'var(--panel-soft-bg)', overflowX: 'auto' }}>{metadataResponse}</pre>
                  )}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>FRM-017 Merge Propagation</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <button className="btn btn-primary" onClick={runMergeFlow}>Run Import + Merge Flow</button>
                  {importResponse && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary-dark)' }}>{importResponse}</div>
                  )}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>Core Business Persistence Readiness</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <button className="btn btn-secondary" onClick={loadPersistenceReadiness}>Load Persistence Readiness</button>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>{persistenceReadinessSummary}</div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>FRM-035 Metrics and Search</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={refreshMetrics}>Refresh Metrics</button>
                    <span className="badge badge-info">Total: {ticketMetrics?.total ?? 0}</span>
                    <span className="badge badge-warning">Open: {ticketMetrics?.open ?? 0}</span>
                    <span className="badge badge-info">In Progress: {ticketMetrics?.inProgress ?? 0}</span>
                    <span className="badge badge-success">Resolved: {ticketMetrics?.resolved ?? 0}</span>
                    <span className="badge">Closed: {ticketMetrics?.closed ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="search term" />
                    <button className="btn btn-primary" onClick={runTicketSearch}>Run Search</button>
                  </div>
                  {searchCount !== null && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary-dark)' }}>Matched tickets: {searchCount}</div>
                  )}

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
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>FR-JOB and FR-APR Ops</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                    <input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="job title" />
                    <button className="btn btn-primary" onClick={runJobFlow}>Run Job Listing + Activate Flow</button>
                  </div>
                  {jobResult && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary-dark)' }}>{jobResult}</div>}

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

          {activeTab === 'settings-approval-workflows' && (
            <ApprovalWorkflowPage
              onAdd={() => openApprovalWorkflowForm(null)}
              onEdit={(workflow: ApprovalWorkflowDefinitionApi) => openApprovalWorkflowForm(workflow)}
              editingWorkflowId={approvalWorkflowFormEdit?.id ?? null}
            />
          )}

          {activeTab === 'settings-approval-workflows-form' && (
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

          {activeTab === 'settings-report-config' && <ReportConfigSettingsPage />}

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
            © {currentYear} Abu Dhabi West
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
            Powered by <a style={{ color: 'var(--text-secondary-dark)', textDecoration: 'underline' }}>VGK Technologies</a>
          </span>
        </footer>
      </main>
    </div>
  );
};


