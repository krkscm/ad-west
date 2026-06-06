import type { LocationDefinitionApi, SreniDefinitionApi } from './backendApi';

export type SreniSection = 'calendar' | 'contacts' | 'attendance' | 'documents' | 'reports' | 'analytics';
export type SthanSection = 'calendar' | 'reports' | 'expenses' | 'contacts';

export interface AdminNavigationContext {
  srenis: SreniDefinitionApi[];
  locations: LocationDefinitionApi[];
  sthanSection?: SthanSection;
}

const STATIC_PATH_TO_TAB: Record<string, string> = {
  '/admin': 'dashboard',
  '/admin/dashboard': 'dashboard',
  '/admin/audit-logs': 'logs',
  '/admin/operations': 'ops',
  '/admin/general-services/insights': 'insights',
  '/admin/general-services/approvals': 'my-approvals',
  '/admin/general-services/contacts': 'governance-contacts',
  '/admin/general-services/responsibility-chart': 'settings-responsibility-chart',
  '/admin/general-services/reimbursements': 'member-services-reimbursements',
  '/admin/general-services/events': 'member-services-events',
  '/admin/general-services/notifications': 'member-services-notifications',
  '/admin/general-services/gmail': 'member-services-gmail',
  '/admin/helpdesk/tickets': 'helpdesk-tickets',
  '/admin/helpdesk/jobs': 'job-postings',
  '/admin/helpdesk/applications': 'job-applications',
  '/admin/settings/roles': 'settings-roles-definition',
  '/admin/settings/locations': 'settings-location-definition',
  '/admin/settings/sreni': 'settings-sreni-definition',
  '/admin/settings/permissions': 'settings-permissions',
  '/admin/settings/permission-sets': 'settings-permission-sets',
  '/admin/settings/reference-data': 'settings-enum-values',
  '/admin/settings/admins': 'settings-admins',
  '/admin/settings/admins/new': 'settings-admins-form',
  '/admin/settings/users': 'settings-users',
  '/admin/settings/users/new': 'settings-users-form',
  '/admin/settings/approval-workflows': 'settings-approval-workflows',
  '/admin/settings/approval-workflows/new': 'settings-approval-workflows-form',
  '/admin/settings/attendance-metrics': 'settings-attendance-metrics',
  '/admin/settings/report-config': 'settings-report-config',
  '/admin/settings/google': 'settings-google-integration',
  '/admin/settings/email': 'settings-smtp-integration',
};

const LEGACY_PATH_TO_CANONICAL: Record<string, string> = {
  '/admin/insights': '/admin/general-services/insights',
  '/admin/approvals': '/admin/general-services/approvals',
  '/admin/contacts': '/admin/general-services/contacts',
  '/admin/settings/responsibility-chart': '/admin/general-services/responsibility-chart',
  '/admin/member-services/reimbursements': '/admin/general-services/reimbursements',
  '/admin/member-services/events': '/admin/general-services/events',
  '/admin/member-services/notifications': '/admin/general-services/notifications',
  '/admin/member-services/gmail': '/admin/general-services/gmail',
  '/admin/gateway/tickets': '/admin/helpdesk/tickets',
  '/admin/gateway/jobs': '/admin/helpdesk/jobs',
  '/admin/gateway/applications': '/admin/helpdesk/applications',
};

const TAB_TO_STATIC_PATH: Record<string, string> = Object.fromEntries(
  Object.entries(STATIC_PATH_TO_TAB).map(([path, tab]) => [tab, path]),
);

const LEGACY_TAB_REDIRECTS: Record<string, string> = {
  'permission-sets': 'settings-permission-sets',
  users: 'settings-users',
  'approval-workflows': 'settings-approval-workflows',
  'responsibility-chart': 'settings-responsibility-chart',
  'ai-chatbot': 'insights',
};

const SRENI_SECTIONS: SreniSection[] = [
  'calendar',
  'contacts',
  'attendance',
  'documents',
  'reports',
  'analytics',
];

const STHAN_SECTIONS: SthanSection[] = ['calendar', 'reports', 'expenses', 'contacts'];

export const ADMIN_PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  logs: 'Audit Logs',
  ops: 'Operations',
  'my-approvals': 'My Approvals',
  insights: 'Insights',
  'governance-contacts': 'Contacts',
  'helpdesk-tickets': 'Helpdesk Tickets',
  'job-postings': 'Job Postings',
  'job-applications': 'Job Applications',
  'member-services-reimbursements': 'Reimbursements',
  'member-services-events': 'Special Events',
  'member-services-notifications': 'Notifications',
  'member-services-gmail': 'Gmail Workspace',
  'settings-roles-definition': 'Roles Definition',
  'settings-location-definition': 'Location Definition',
  'settings-sreni-definition': 'Sreni Definition',
  'settings-permissions': 'Permissions',
  'settings-permission-sets': 'Permission Sets',
  'settings-enum-values': 'Reference Data',
  'settings-admins': 'Admin Management',
  'settings-admins-form': 'Administrator Form',
  'settings-users': 'Users',
  'settings-users-form': 'User Form',
  'settings-approval-workflows': 'Approval Workflows',
  'settings-approval-workflows-form': 'Approval Workflow Form',
  'settings-attendance-metrics': 'Attendance Metrics',
  'settings-responsibility-chart': 'Responsibility Chart',
  'settings-report-config': 'Report Config',
  'settings-google-integration': 'Google Integration',
  'settings-smtp-integration': 'Email Integration',
};

const STHAN_SECTION_LABELS: Record<SthanSection, string> = {
  calendar: 'Calendar',
  reports: 'Reports',
  expenses: 'Expenses',
  contacts: 'Contacts',
};

export function normalizeAdminPathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '') || '/';
  if (trimmed === '/login') return '/admin/dashboard';
  return LEGACY_PATH_TO_CANONICAL[trimmed] ?? trimmed;
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function entitySlug(entity: { id: string; code?: string; name: string }): string {
  if (entity.code?.trim()) {
    return slugify(entity.code);
  }
  const fromName = slugify(entity.name);
  return fromName || entity.id;
}

export function parseSthanSectionFromPath(pathname: string): SthanSection | null {
  const path = normalizeAdminPathname(pathname);
  const match = path.match(/^\/admin\/sthan\/[^/]+\/(calendar|reports|expenses|contacts)$/);
  if (!match) return null;
  return match[1] as SthanSection;
}

export function resolveSreniIdFromSlug(slug: string, srenis: SreniDefinitionApi[]): string | null {
  const decoded = decodeURIComponent(slug);
  const byId = srenis.find((item) => item.id === decoded);
  if (byId) return byId.id;
  const bySlug = srenis.find((item) => entitySlug(item) === decoded);
  return bySlug?.id ?? null;
}

export function resolveLocationIdFromSlug(slug: string, locations: LocationDefinitionApi[]): string | null {
  const decoded = decodeURIComponent(slug);
  const byId = locations.find((item) => item.id === decoded);
  if (byId) return byId.id;
  const bySlug = locations.find((item) => entitySlug(item) === decoded);
  return bySlug?.id ?? null;
}

export function resolveAdminTabFromHash(hash: string, ctx: AdminNavigationContext): string | null {
  const normalizedHash = LEGACY_TAB_REDIRECTS[hash] ?? hash;
  if (Object.values(STATIC_PATH_TO_TAB).includes(normalizedHash)) {
    return normalizedHash;
  }

  for (const section of SRENI_SECTIONS) {
    const prefix = `sreni-${section}-`;
    if (normalizedHash.startsWith(prefix)) {
      const sreniId = normalizedHash.slice(prefix.length);
      if (resolveSreniIdFromSlug(sreniId, ctx.srenis) ?? sreniId) {
        return normalizedHash;
      }
    }
  }

  if (normalizedHash.startsWith('sthan-')) {
    const locationId = normalizedHash.slice('sthan-'.length);
    if (resolveLocationIdFromSlug(locationId, ctx.locations) ?? locationId) {
      return normalizedHash;
    }
  }

  return null;
}

export function resolveAdminTabFromPath(pathname: string, ctx: AdminNavigationContext): string | null {
  const path = normalizeAdminPathname(pathname);

  if (STATIC_PATH_TO_TAB[path]) {
    return STATIC_PATH_TO_TAB[path];
  }

  const sreniMatch = path.match(/^\/admin\/sreni\/([^/]+)\/(calendar|contacts|attendance|documents|reports|analytics)$/);
  if (sreniMatch) {
    const sreniId = resolveSreniIdFromSlug(sreniMatch[1], ctx.srenis);
    if (sreniId) {
      return `sreni-${sreniMatch[2]}-${sreniId}`;
    }
    return null;
  }

  const sthanMatch = path.match(/^\/admin\/sthan\/([^/]+)(?:\/(calendar|reports|expenses|contacts))?$/);
  if (sthanMatch) {
    const locationId = resolveLocationIdFromSlug(sthanMatch[1], ctx.locations);
    if (locationId) {
      return `sthan-${locationId}`;
    }
    return null;
  }

  if (path === '/' || path === '/portal') {
    return 'dashboard';
  }

  return null;
}

export function adminTabToPath(tab: string, ctx: AdminNavigationContext): string {
  if (TAB_TO_STATIC_PATH[tab]) {
    return TAB_TO_STATIC_PATH[tab];
  }

  for (const section of SRENI_SECTIONS) {
    const prefix = `sreni-${section}-`;
    if (tab.startsWith(prefix)) {
      const sreniId = tab.slice(prefix.length);
      const sreni = ctx.srenis.find((item) => item.id === sreniId);
      const slug = sreni ? entitySlug(sreni) : sreniId;
      return `/admin/sreni/${encodeURIComponent(slug)}/${section}`;
    }
  }

  if (tab.startsWith('sthan-')) {
    const locationId = tab.slice('sthan-'.length);
    const location = ctx.locations.find((item) => item.id === locationId);
    const slug = location ? entitySlug(location) : locationId;
    const section = ctx.sthanSection && STHAN_SECTIONS.includes(ctx.sthanSection)
      ? ctx.sthanSection
      : 'calendar';
    return `/admin/sthan/${encodeURIComponent(slug)}/${section}`;
  }

  return '/admin/dashboard';
}

export function getAdminPageTitle(tab: string, ctx: AdminNavigationContext): string {
  for (const section of SRENI_SECTIONS) {
    const prefix = `sreni-${section}-`;
    if (tab.startsWith(prefix)) {
      const sreniId = tab.slice(prefix.length);
      const sreni = ctx.srenis.find((item) => item.id === sreniId);
      const sectionLabel = section === 'analytics' ? 'Analytics Studio' : section.charAt(0).toUpperCase() + section.slice(1);
      return sreni ? `${sreni.name} · ${sectionLabel}` : sectionLabel;
    }
  }

  if (tab.startsWith('sthan-')) {
    const locationId = tab.slice('sthan-'.length);
    const location = ctx.locations.find((item) => item.id === locationId);
    const section = ctx.sthanSection ?? parseSthanSectionFromPath(window.location.pathname) ?? 'calendar';
    const sectionLabel = STHAN_SECTION_LABELS[section];
    return location ? `${location.name} · ${sectionLabel}` : sectionLabel;
  }

  return ADMIN_PAGE_TITLES[tab] ?? 'Dashboard';
}

export function navigateToAdminTab(
  tab: string,
  ctx: AdminNavigationContext,
  options?: { replace?: boolean },
): void {
  const path = adminTabToPath(tab, ctx);
  const method = options?.replace ? 'replaceState' : 'pushState';
  window.history[method]({ adminTab: tab, sthanSection: ctx.sthanSection }, '', path);
  document.title = `${getAdminPageTitle(tab, ctx)} | AD West Admin`;
}

export function navigateToSthanSection(
  locationId: string,
  section: SthanSection,
  ctx: AdminNavigationContext,
  options?: { replace?: boolean },
): void {
  navigateToAdminTab(`sthan-${locationId}`, { ...ctx, sthanSection: section }, options);
}

export function getInitialAdminTab(ctx: AdminNavigationContext): string {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash) {
    return resolveAdminTabFromHash(hash, ctx) ?? 'dashboard';
  }
  return resolveAdminTabFromPath(window.location.pathname, ctx) ?? 'dashboard';
}

export function getInitialSthanSection(): SthanSection {
  return parseSthanSectionFromPath(window.location.pathname) ?? 'calendar';
}
