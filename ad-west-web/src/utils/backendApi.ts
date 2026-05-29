import { api } from './api'

export interface AdminRoleAssignment {
  role: 'SUPER_ADMIN' | 'ZONE_ADMIN' | 'SRENY_ADMIN'
  scopeType: 'global' | 'zone' | 'sreny'
  scopeId?: string
  effectiveFrom?: string
  effectiveTo?: string
}

export interface AdminUserApi {
  id: string
  code: string
  name: string
  email: string
  active: boolean
  roleDefinitionId?: string
  roles: AdminRoleAssignment[]
  createdAt: string
  updatedAt?: string
}

export interface RoleDefinitionApi {
  id: string
  code: string
  name: string
  active: boolean
  level: 'ZONE' | 'STHAN'
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface AuditLogApi {
  id: string
  actorId: string
  actorType: 'admin' | 'member' | 'system'
  action: string
  targetType: string
  targetId: string
  details?: Record<string, unknown>
  timestamp: string
}

export interface ContactApi {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  zoneId: string
  srenyIds: string[]
  address?: string
  customMetadataBySreny?: Record<string, Record<string, string>>
  status: 'active' | 'deleted'
  createdAt: string
}

export interface SrenyApi {
  id: string
  zoneId: string
  name: string
}

export interface LocationDefinitionApi {
  id: string
  code?: string
  name: string
  level: 'ZONE' | 'STHAN'
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface PermissionApi {
  id: string
  locationId: string
  sreniId: string
  code: string
  name: string
  description?: string
  active: boolean
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

export interface PermissionSetApi {
  id: string
  name: string
  description?: string
  active: boolean
  permissionIds: string[]
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

export interface MenuItemApi {
  id: string
  key: string
  label: string
  parentKey: string | null
  icon: string | null
  sortOrder: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminMenuGrantsApi {
  adminUserId: string
  menuKeys: string[]
}

export interface SreniDefinitionApi {
  id: string
  code?: string
  name: string
  description?: string
  active: boolean
  createdBy?: string
  updatedBy?: string
  createdAt: string
  updatedAt: string
}

export interface SreniContactRowApi {
  id: string
  sreniId: string
  rowIndex: number
  /** All columns from the uploaded Excel sheet as key/value pairs */
  data: Record<string, string | number | boolean | null>
  sourceFile?: string
  uploadedBy?: string
  createdAt: string
  updatedAt: string
}

export interface CalendarEventApi {
  id: string
  sreniId: string
  title: string
  date: string
  startTime: string
  endTime: string
  color: string
  notes?: string
  scope: 'zone' | 'sthan'
  sthanIds: string[]
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

export interface AttendanceMetricApi {
  id: string
  sreniId: string
  name: string
  description?: string
  keys: string[]
  active: boolean
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

export interface EventAttendanceCaptureApi {
  id: string
  sreniId: string
  eventId: string
  metricId: string
  values: Record<string, string | number | boolean | null>
  capturedBy: string
  capturedAt: string
  updatedAt: string
}

export interface SreniAttendanceListingItemApi {
  event: CalendarEventApi
  metrics: Array<{
    metric: AttendanceMetricApi
    capture?: EventAttendanceCaptureApi
  }>
}

export interface UserApi {
  id: string
  code: string
  name: string
  phone?: string
  email?: string
  roleId?: string
  sthanId?: string
  permissionSetId?: string
  adminManagement?: string
  isSuperAdmin?: boolean
  active: boolean
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
  reportingToRoleIds?: string[]
}

export interface ReportMetricDefinitionApi {
  id: string
  name: string
  description?: string
  unit?: string
  inputType: 'number' | 'text'
  isRequired: boolean
  sortOrder: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface SreniMonthlyReportApi {
  id: string
  sreniId: string
  year: number
  month: number
  status: 'draft' | 'submitted'
  submittedBy?: string
  submittedAt?: string
  notes?: string
  entries: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface SreniReportParameterApi {
  id: string
  sreniId: string
  submissionType: 'monthly' | 'half_yearly' | 'yearly'
  name: string
  description?: string
  unit?: string
  inputType: 'number' | 'text'
  isRequired: boolean
  sortOrder: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface SreniReportApi {
  id: string
  sreniId: string
  submissionType: 'monthly' | 'half_yearly' | 'yearly'
  periodYear: number
  periodValue: number
  entries: Record<string, string>
  notes?: string
  submittedBy?: string
  submittedAt?: string
  createdAt: string
  updatedAt: string
}

export interface PaginatedUsersApi {
  items: UserApi[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ProgramApi {
  id: string
  title: string
  startDate: string
  endDate: string
  status: 'draft' | 'published' | 'archived'
}

export interface TicketApi {
  id: string
  contactId: string
  subject: string
  description: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'new' | 'in_progress' | 'resolved' | 'closed'
  createdAt: string
}

export interface HelpdeskMetricsApi {
  total: number
  open: number
  inProgress: number
  resolved: number
  closed: number
  byCategory: Record<string, number>
}

export interface ImportApi {
  id: string
  fileName: string
  fileType: string
  status: 'processing' | 'ready_for_review' | 'finalized' | 'failed'
  acceptedRows: number
  duplicateRows: number
  processedRows: number
  validationErrorRows: number
  failedReason?: string
}

export interface ImportReconciliationApi {
  importId: string
  status: 'processing' | 'ready_for_review' | 'finalized' | 'failed'
  totalDuplicates: number
  pendingDuplicates: number
  mergedDuplicates: number
  skippedDuplicates: number
  canFinalize: boolean
  issues: string[]
}

export interface DuplicateCandidateApi {
  id: string
  leftContactId: string
  rightContactId: string
  decision: 'pending' | 'merged' | 'skipped'
}

export interface TicketActivityApi {
  id: string
  ticketId: string
  action: 'created' | 'assigned' | 'status_updated' | 'comment_added'
  actorId: string
  details?: Record<string, string>
  createdAt: string
}

export interface CoreBusinessPersistenceReadinessApi {
  coreBusinessStore: 'in-memory' | 'db'
  authStoreMode: 'db' | 'in-memory'
  isProductionRuntime: boolean
  readyForUat: boolean
  blockers: string[]
  nextSteps: string[]
}

export interface MemberEditRequestApi {
  id: string
  memberId: string
  contactId?: string
  memberName?: string
  field: string
  currentValue: string
  requestedValue: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
}

export interface AttendanceReportApi {
  total: number
  present: number
  absent: number
  late: number
  excused: number
}

export interface DocumentFolderApi {
  id: string
  srenyId: string
  name: string
  parentFolderId?: string
  createdAt: string
}

export interface DocumentFileApi {
  id: string
  srenyId: string
  folderId?: string
  fileName: string
  fileType: string
  fileSize?: number
  category?: string
  description?: string
  accessLevel: 'sreny' | 'zone' | 'private'
  linkedEntityType?: string
  linkedEntityId?: string
  sourceDocumentId?: string
  version: number
  createdBy: string
  createdAt: string
}

export interface ReportTemplateApi {
  id: string
  srenyId: string
  name: string
  fields: Array<{
    key: string
    label: string
    type: 'text' | 'number' | 'date' | 'file' | 'dropdown'
    required?: boolean
    options?: string[]
  }>
  createdAt: string
}

export interface ReportSubmissionApi {
  id: string
  templateId: string
  submittedBy: string
  answers: Record<string, string>
  status: 'submitted' | 'approved' | 'rejected'
  submittedAt: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
}

export interface JobListingApi {
  id: string
  srenyId: string
  title: string
  organization: string
  location: string
  jobType: 'full_time' | 'part_time' | 'contract' | 'volunteer'
  description: string
  skills: string[]
  applyBy?: string
  status: 'draft' | 'active' | 'archived'
  createdBy: string
  createdAt: string
}

export interface JobInterestApi {
  id: string
  jobId: string
  memberId: string
  note?: string
  createdAt: string
}

export interface ResumeApi {
  id: string
  memberId: string
  fileName: string
  fileType: string
  summary?: string
  skills: string[]
  active: boolean
  createdAt: string
}

export interface ApprovalWorkflowApi {
  id: string
  name: string
  targetType: 'document_submission' | 'report_submission' | 'member_edit_request' | 'job_listing'
  steps: string[]
  createdAt: string
}

export type ApprovalWorkflowMode = string

export interface ApprovalWorkflowStageDefinitionApi {
  id: string
  workflowId: string
  stageOrder: number
  label: string
  approverPermissionSetId?: string
  approverRoleDefinitionIds?: string[]
  parentStageId?: string
  requiredCount: number
  createdAt: string
  updatedAt: string
}

export interface ApprovalWorkflowStageCoverageApi {
  stageId: string
  stageLabel: string
  stageOrder: number
  requiredCount: number
  approverRoleDefinitionIds: string[]
  eligibleApproverCount: number
  satisfiable: boolean
  details: Array<{ roleDefinitionId: string; roleName: string; eligibleCount: number }>
  notes?: string[]
}

export interface ApprovalWorkflowCoverageApi {
  workflowId: string
  workflowCode: string
  workflowName: string
  evaluatedAt: string
  stages: ApprovalWorkflowStageCoverageApi[]
}

export interface ApprovalWorkflowRuntimeDecisionApi {
  stageId: string
  actorId: string
  decision: 'approved' | 'rejected'
  note?: string
  createdAt: string
}

export interface ApprovalWorkflowRuntimeStageStateApi {
  stageId: string
  status: 'blocked' | 'pending' | 'approved' | 'rejected'
  approvals: string[]
  reviewedAt?: string
  reviewedBy?: string
}

export interface ApprovalWorkflowRuntimeItemApi {
  id: string
  workflowId: string
  targetId: string
  summary?: string
  status: 'pending' | 'approved' | 'rejected'
  submittedBy: string
  currentStageIds: string[]
  stageStates: ApprovalWorkflowRuntimeStageStateApi[]
  decisions: ApprovalWorkflowRuntimeDecisionApi[]
  createdAt: string
  updatedAt: string
}

export interface ApprovalWorkflowDefinitionApi {
  id: string
  code: string
  name: string
  description?: string
  approvalMode: ApprovalWorkflowMode
  isActive: boolean
  stages: ApprovalWorkflowStageDefinitionApi[]
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

export interface ApprovalItemApi {
  id: string
  workflowId: string
  targetId: string
  targetType?: 'report_submission' | 'calendar_event'
  summary?: string
  submittedBy: string
  status: 'pending' | 'approved' | 'rejected' | 'need_more_information'
  currentStepIndex: number
  dueAt?: string
  escalationCount?: number
  createdAt: string
  updatedAt: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
}

export interface ApprovalNotificationApi {
  id: string
  itemId: string
  workflowId: string
  event: 'submitted' | 'step_advanced' | 'approved' | 'rejected' | 'need_more_information' | 'resubmitted' | 'escalated'
  recipientUserId?: string
  recipientStep?: string
  message: string
  createdAt: string
}

export interface AdminLoginResponse {
  accessToken: string
}

export interface CaptchaChallengeResponse {
  captchaToken: string
  captchaImage: string
  expiresInSeconds: number
}

export interface EnumValueApi {
  id: string
  enumType: string
  value: string
  label: string
  sortOrder: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export const backendApi = {
  captchaChallenge: () => api.get<CaptchaChallengeResponse>('/auth/captcha'),

  login: (identifier: string, password: string, captchaToken: string, captchaAnswer: string) =>
    api.post<AdminLoginResponse>('/auth/login', { identifier, password, captchaToken, captchaAnswer }),

  adminLogout: () => api.post<{ success: boolean }>('/auth/admin/logout', {}),

  listAdminUsers: () => api.get<AdminUserApi[]>('/admin-users'),

  listAdminUsersPaginated: (params?: {
    page?: number
    pageSize?: number
    search?: string
  }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.pageSize) query.set('pageSize', String(params.pageSize))
    if (params?.search?.trim()) query.set('search', params.search.trim())

    const queryString = query.toString()
    return api.get<PaginatedResponse<AdminUserApi>>(`/admin-users/paginated${queryString ? `?${queryString}` : ''}`)
  },

  createAdminUser: (payload: {
    code: string
    name: string
    password: string
    roleDefinitionId: string
    active?: boolean
  }) => api.post<AdminUserApi>('/admin-users', payload),

  updateAdminProfile: (id: string, payload: { code?: string; name?: string; roleDefinitionId?: string }) =>
    api.patch<AdminUserApi>(`/admin-users/${id}`, payload),

  resetAdminPassword: (id: string, newPassword: string) =>
    api.post<{ success: boolean }>(`/admin-users/${id}/reset-password`, { newPassword }),

  updateAdminStatus: (id: string, active: boolean) =>
    api.patch<AdminUserApi>(`/admin-users/${id}/status`, { active }),

  deleteAdminUser: (id: string) =>
    api.delete<{ success: boolean }>(`/admin-users/${id}`),

  assignAdminRole: (id: string, payload: {
    role: AdminRoleAssignment['role']
    scopeType: AdminRoleAssignment['scopeType']
    scopeId?: string
    effectiveFrom?: string
    effectiveTo?: string
  }) => api.post<AdminUserApi>(`/admin-users/${id}/roles`, payload),

  listRoleDefinitions: (params?: {
    page?: number
    pageSize?: number
    search?: string
    active?: boolean
    level?: RoleDefinitionApi['level']
  }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.pageSize) query.set('pageSize', String(params.pageSize))
    if (params?.search?.trim()) query.set('search', params.search.trim())
    if (typeof params?.active === 'boolean') query.set('active', String(params.active))
    if (params?.level) query.set('level', params.level)

    const queryString = query.toString()
    return api.get<PaginatedResponse<RoleDefinitionApi>>(`/role-definitions${queryString ? `?${queryString}` : ''}`)
  },

  createRoleDefinition: (payload: {
    code: string
    name: string
    level: RoleDefinitionApi['level']
    active?: boolean
  }) => api.post<RoleDefinitionApi>('/role-definitions', payload),

  updateRoleDefinition: (id: string, payload: {
    code?: string
    name?: string
    level?: RoleDefinitionApi['level']
  }) => api.patch<RoleDefinitionApi>(`/role-definitions/${id}`, payload),

  updateRoleDefinitionStatus: (id: string, active: boolean) =>
    api.patch<RoleDefinitionApi>(`/role-definitions/${id}/status`, { active }),

  deleteRoleDefinition: (id: string) => api.delete<{ success: boolean }>(`/role-definitions/${id}`),

  listAuditLogs: (action?: string) =>
    api.get<AuditLogApi[]>(`/audit-logs${action ? `?action=${encodeURIComponent(action)}` : ''}`),

  listContacts: () => api.get<ContactApi[]>('/contacts'),

  listLocationDefinitions: () =>
    api.get<{ items: Array<{ id: string; code?: string; name: string; level: string; active: boolean; createdAt: string; updatedAt: string }> }>('/org/locations?page=1&pageSize=9999')
      .then((res) => res.items.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        level: r.level.toUpperCase() as 'ZONE' | 'STHAN',
        active: r.active,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }))),

  listLocationDefinitionsPaginated: (params?: { page?: number; pageSize?: number; search?: string; level?: string }) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params?.page ?? 1))
    qs.set('pageSize', String(params?.pageSize ?? 20))
    if (params?.search?.trim()) qs.set('search', params.search.trim())
    if (params?.level) qs.set('level', params.level.toLowerCase())
    return api.get<PaginatedResponse<{ id: string; code?: string; name: string; level: string; active: boolean; createdAt: string; updatedAt: string }>>(`/org/locations?${qs.toString()}`)
      .then((res) => ({
        ...res,
        items: res.items.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          level: r.level.toUpperCase() as 'ZONE' | 'STHAN',
          active: r.active,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
      }))
  },

  createLocationDefinition: (payload: { name: string; code?: string; level: 'ZONE' | 'STHAN' }) =>
    api.post<{ id: string; code?: string; name: string; level: string; active: boolean; createdAt: string; updatedAt: string }>(
      '/org/locations',
      { name: payload.name, code: payload.code, level: payload.level.toLowerCase() },
    ).then((r) => ({ id: r.id, code: r.code, name: r.name, level: r.level.toUpperCase() as 'ZONE' | 'STHAN', active: r.active, createdAt: r.createdAt, updatedAt: r.updatedAt })),

  updateLocationDefinition: (id: string, payload: { name?: string; code?: string; active?: boolean; level?: 'ZONE' | 'STHAN' }) =>
    api.patch<{ id: string; code?: string; name: string; level: string; active: boolean; createdAt: string; updatedAt: string }>(
      `/org/locations/${id}`,
      payload,
    ).then((r) => ({ id: r.id, code: r.code, name: r.name, level: r.level.toUpperCase() as 'ZONE' | 'STHAN', active: r.active, createdAt: r.createdAt, updatedAt: r.updatedAt })),

  deleteLocationDefinition: (id: string) => api.delete<void>(`/org/locations/${id}`),

  listSreniDefinitions: () =>
    api.get<{ items: SreniDefinitionApi[] }>('/org/sreni-definitions?page=1&pageSize=9999')
      .then((res) => res.items),

  listSreniDefinitionsPaginated: (params?: { page?: number; pageSize?: number; search?: string }) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params?.page ?? 1))
    qs.set('pageSize', String(params?.pageSize ?? 20))
    if (params?.search?.trim()) qs.set('search', params.search.trim())
    return api.get<PaginatedResponse<SreniDefinitionApi>>(`/org/sreni-definitions?${qs.toString()}`)
  },

  createSreniDefinition: (payload: { name: string; code?: string; description?: string }) =>
    api.post<SreniDefinitionApi>('/org/sreni-definitions', payload),

  updateSreniDefinition: (id: string, payload: { name?: string; code?: string; description?: string; active?: boolean }) =>
    api.patch<SreniDefinitionApi>(`/org/sreni-definitions/${id}`, payload),

  deleteSreniDefinition: (id: string) => api.delete<void>(`/org/sreni-definitions/${id}`),

  // Users
  listUsers: (params?: { page?: number; pageSize?: number; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params?.search) qs.set('search', params.search);
    const q = qs.toString();
    return api.get<PaginatedUsersApi>(`/org/users${q ? `?${q}` : ''}`);
  },
  createUser: (payload: { name: string; password: string; phone?: string; email?: string; roleId?: string; sthanId?: string; permissionSetId?: string; adminManagement?: string; isSuperAdmin?: boolean; reportingToRoleIds?: string[] }) =>
    api.post<UserApi>('/org/users', payload),
  updateUser: (id: string, payload: { name?: string; password?: string; phone?: string; email?: string; roleId?: string; sthanId?: string; permissionSetId?: string; adminManagement?: string; isSuperAdmin?: boolean; active?: boolean; reportingToRoleIds?: string[] }) =>
    api.patch<UserApi>(`/org/users/${id}`, payload),
  deleteUser: (id: string) => api.delete<void>(`/org/users/${id}`),
  changeOwnPassword: (currentPassword: string, newPassword: string) => api.post<void>('/org/users/me/change-password', { currentPassword, newPassword }),

  // Permissions
  listPermissions: () =>
    api.get<{ items: PermissionApi[] }>('/org/permissions?page=1&pageSize=9999')
      .then((res) => res.items),

  listPermissionsPaginated: (params?: { page?: number; pageSize?: number; search?: string; locationId?: string }) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params?.page ?? 1))
    qs.set('pageSize', String(params?.pageSize ?? 20))
    if (params?.search?.trim()) qs.set('search', params.search.trim())
    if (params?.locationId) qs.set('locationId', params.locationId)
    return api.get<PaginatedResponse<PermissionApi>>(`/org/permissions?${qs.toString()}`)
  },

  createPermission: (payload: { locationId: string; sreniId: string; code: string; name: string; description?: string }) =>
    api.post<PermissionApi>('/org/permissions', payload),
  updatePermission: (id: string, payload: { code?: string; name?: string; description?: string; active?: boolean }) =>
    api.patch<PermissionApi>(`/org/permissions/${id}`, payload),
  deletePermission: (id: string) => api.delete<void>(`/org/permissions/${id}`),

  // Permission Sets
  listPermissionSets: () =>
    api.get<{ items: PermissionSetApi[] }>('/org/permission-sets?page=1&pageSize=9999')
      .then((res) => res.items),

  listPermissionSetsPaginated: (params?: { page?: number; pageSize?: number; search?: string }) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params?.page ?? 1))
    qs.set('pageSize', String(params?.pageSize ?? 20))
    if (params?.search?.trim()) qs.set('search', params.search.trim())
    return api.get<PaginatedResponse<PermissionSetApi>>(`/org/permission-sets?${qs.toString()}`)
  },

  createPermissionSet: (payload: { name: string; description?: string; permissionIds?: string[] }) =>
    api.post<PermissionSetApi>('/org/permission-sets', payload),
  updatePermissionSet: (id: string, payload: { name?: string; description?: string; active?: boolean }) =>
    api.patch<PermissionSetApi>(`/org/permission-sets/${id}`, payload),
  setPermissionSetItems: (id: string, permissionIds: string[]) =>
    api.put<PermissionSetApi>(`/org/permission-sets/${id}/permissions`, { permissionIds }),
  deletePermissionSet: (id: string) => api.delete<void>(`/org/permission-sets/${id}`),

  listSrenies: (zoneId?: string) =>
    api.get<SrenyApi[]>(`/org/srenies${zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ''}`),

  upsertContactSrenyMetadata: (
    contactId: string,
    srenyId: string,
    metadata: Record<string, string>,
  ) => api.patch<ContactApi>(`/contacts/${contactId}/srenies/${srenyId}/metadata`, { metadata }),

  getCoreBusinessPersistenceReadiness: () =>
    api.get<CoreBusinessPersistenceReadinessApi>('/core/persistence/readiness'),

  listPrograms: () => api.get<ProgramApi[]>('/programs'),

  listHelpdeskTickets: (status?: string, search?: string) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    const query = params.toString()
    return api.get<TicketApi[]>(`/helpdesk/tickets${query ? `?${query}` : ''}`)
  },

  getHelpdeskTicketMetrics: () => api.get<HelpdeskMetricsApi>('/helpdesk/tickets/metrics'),

  startContactImport: (payload: { fileName: string; fileType: 'csv' | 'xlsx'; hasHeader: boolean }) =>
    api.post<ImportApi>('/imports/contacts', payload),

  listImports: (status?: 'processing' | 'ready_for_review' | 'finalized' | 'failed') =>
    api.get<ImportApi[]>(`/imports${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  listImportDuplicates: (importId: string) =>
    api.get<DuplicateCandidateApi[]>(`/imports/${importId}/duplicates`),

  getImportReconciliation: (importId: string) =>
    api.get<ImportReconciliationApi>(`/imports/${importId}/reconciliation`),

  mergeDuplicate: (importId: string, duplicateId: string) =>
    api.post<{ success: boolean }>(`/imports/${importId}/duplicates/${duplicateId}/merge`, {}),

  finalizeImport: (importId: string) =>
    api.post<ImportApi>(`/imports/${importId}/finalize`, {}),

  markImportFailed: (importId: string, reason: string) =>
    api.post<ImportApi>(`/imports/${importId}/fail`, { reason }),

  listHelpdeskTicketActivity: (ticketId: string) =>
    api.get<TicketActivityApi[]>(`/helpdesk/tickets/${ticketId}/activity`),

  listAdminEditRequests: (status?: 'pending' | 'approved' | 'rejected') =>
    api.get<MemberEditRequestApi[]>(`/edit-requests${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  approveAdminEditRequest: (requestId: string, note?: string) =>
    api.post<MemberEditRequestApi>(`/edit-requests/${requestId}/approve`, note ? { note } : {}),

  rejectAdminEditRequest: (requestId: string, note?: string) =>
    api.post<MemberEditRequestApi>(`/edit-requests/${requestId}/reject`, note ? { note } : {}),

  createMemberEditRequest: (payload: { field: string; currentValue: string; requestedValue: string }, token: string) =>
    api.post<MemberEditRequestApi>('/members/me/edit-requests', payload, { token }),

  listMemberEditRequests: (token: string) =>
    api.get<MemberEditRequestApi[]>('/members/me/edit-requests', { token }),

  getMemberProfile: (token: string) => api.get<ContactApi | null>('/members/me/profile', { token }),

  listMemberPrograms: (token: string) => api.get<ProgramApi[]>('/members/me/programs', { token }),

  listMemberTickets: (token: string) => api.get<TicketApi[]>('/members/me/helpdesk-tickets', { token }),

  createMemberTicket: (
    payload: { subject: string; description: string; category: string; priority: 'low' | 'medium' | 'high' | 'critical' },
    token: string,
  ) => api.post<TicketApi>('/helpdesk/tickets', payload, { token }),

  getAttendanceReport: () => api.get<AttendanceReportApi>('/attendance/reports'),

  listDocumentFolders: (srenyId?: string) =>
    api.get<DocumentFolderApi[]>(`/documents/folders${srenyId ? `?srenyId=${encodeURIComponent(srenyId)}` : ''}`),

  createDocumentFolder: (payload: { srenyId: string; name: string; parentFolderId?: string }) =>
    api.post<DocumentFolderApi>('/documents/folders', payload),

  listDocumentFiles: (srenyId?: string, search?: string) => {
    const params = new URLSearchParams()
    if (srenyId) params.set('srenyId', srenyId)
    if (search) params.set('search', search)
    const query = params.toString()
    return api.get<DocumentFileApi[]>(`/documents/files${query ? `?${query}` : ''}`)
  },

  uploadSreniDocument: (sreniId: string, file: File, description?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (description) form.append('description', description)
    return api.postForm<DocumentFileApi>(`/documents/sreni/${encodeURIComponent(sreniId)}/upload`, form)
  },

  downloadSreniDocument: (documentId: string): string =>
    `/api/v1/documents/files/${encodeURIComponent(documentId)}/download`,

  deleteSreniDocument: (documentId: string) =>
    api.delete<{ success: boolean }>(`/documents/files/${encodeURIComponent(documentId)}`),

  createDocumentFile: (payload: {
    srenyId: string
    folderId?: string
    fileName: string
    fileType: string
    category?: string
    description?: string
    accessLevel: 'sreny' | 'zone' | 'private'
    linkedEntityType?: string
    linkedEntityId?: string
  }) => api.post<DocumentFileApi>('/documents/files', payload),

  createDocumentVersion: (documentId: string, payload: {
    fileName: string
    fileType: string
    category?: string
    description?: string
    accessLevel?: 'sreny' | 'zone' | 'private'
  }) => api.post<DocumentFileApi>(`/documents/files/${documentId}/new-version`, payload),

  listReportTemplates: (srenyId?: string) =>
    api.get<ReportTemplateApi[]>(`/reports/templates${srenyId ? `?srenyId=${encodeURIComponent(srenyId)}` : ''}`),

  createReportTemplate: (payload: {
    srenyId: string
    name: string
    fields: Array<{
      key: string
      label: string
      type: 'text' | 'number' | 'date' | 'file' | 'dropdown'
      required?: boolean
      options?: string[]
    }>
  }) => api.post<ReportTemplateApi>('/reports/templates', payload),

  listReportSubmissions: (status?: string) =>
    api.get<ReportSubmissionApi[]>(`/reports/submissions${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  reviewReportSubmission: (submissionId: string, payload: { decision: 'approved' | 'rejected'; note?: string }) =>
    api.post<ReportSubmissionApi>(`/reports/submissions/${submissionId}/review`, payload),

  listJobListings: (status?: string) =>
    api.get<JobListingApi[]>(`/jobs/listings${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  createJobListing: (payload: {
    srenyId: string
    title: string
    organization: string
    location: string
    jobType: 'full_time' | 'part_time' | 'contract' | 'volunteer'
    description: string
    skills: string[]
    applyBy?: string
  }) => api.post<JobListingApi>('/jobs/listings', payload),

  updateJobListingStatus: (jobId: string, status: 'draft' | 'active' | 'archived') =>
    api.patch<JobListingApi>(`/jobs/listings/${jobId}/status`, { status }),

  listResumes: (search?: string) =>
    api.get<ResumeApi[]>(`/jobs/resumes${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  listApprovalWorkflows: () => api.get<ApprovalWorkflowApi[]>('/approvals/workflows'),

  createApprovalWorkflow: (payload: {
    name: string
    targetType: 'document_submission' | 'report_submission' | 'member_edit_request' | 'job_listing'
    steps: string[]
  }) => api.post<ApprovalWorkflowApi>('/approvals/workflows', payload),

  listApprovalItems: (status?: string) =>
    api.get<ApprovalItemApi[]>(`/approvals/items${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  listMyApprovalActions: (status?: string) =>
    api.get<ApprovalItemApi[]>(`/approvals/my-actions${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  listMyApprovalNotifications: (itemId?: string) =>
    api.get<ApprovalNotificationApi[]>(`/approvals/my-notifications${itemId ? `?itemId=${encodeURIComponent(itemId)}` : ''}`),

  submitApprovalItem: (payload: { workflowId: string; targetId: string; summary?: string }) =>
    api.post<ApprovalItemApi>('/approvals/items', payload),

  reviewApprovalItem: (itemId: string, payload: { decision: 'approved' | 'rejected' | 'need_more_information'; note?: string }) =>
    api.post<ApprovalItemApi>(`/approvals/items/${itemId}/review`, payload),

  resubmitApprovalItem: (itemId: string, payload: { note?: string }) =>
    api.post<ApprovalItemApi>(`/approvals/items/${itemId}/resubmit`, payload),

  listMemberJobs: (token: string) => api.get<JobListingApi[]>('/members/me/jobs', { token }),

  expressMemberJobInterest: (jobId: string, note: string | undefined, token: string) =>
    api.post<JobInterestApi>(`/members/me/jobs/${jobId}/interest`, note ? { note } : {}, { token }),

  listMemberResumes: (token: string) => api.get<ResumeApi[]>('/members/me/resumes', { token }),

  uploadMemberResume: (payload: {
    fileName: string
    fileType: string
    summary?: string
    skills?: string[]
  }, token: string) => api.post<ResumeApi>('/members/me/resumes', payload, { token }),

  listMemberReportTemplates: (token: string) => api.get<ReportTemplateApi[]>('/members/me/reports/templates', { token }),

  listMemberReportSubmissions: (token: string) => api.get<ReportSubmissionApi[]>('/members/me/reports/submissions', { token }),

  createMemberReportSubmission: (payload: { templateId: string; answers: Record<string, string> }, token: string) =>
    api.post<ReportSubmissionApi>('/members/me/reports/submissions', payload, { token }),

  // Menu Management
  listMenuItems: (activeOnly?: boolean) =>
    api.get<MenuItemApi[]>(`/menu-items${activeOnly ? '?activeOnly=true' : ''}`),

  createMenuItem: (payload: { key: string; label: string; parentKey?: string; icon?: string; sortOrder?: number; active?: boolean }) =>
    api.post<MenuItemApi>('/menu-items', payload),

  updateMenuItem: (id: string, payload: { label?: string; parentKey?: string | null; icon?: string | null; sortOrder?: number; active?: boolean }) =>
    api.patch<MenuItemApi>(`/menu-items/${id}`, payload),

  deleteMenuItem: (id: string) => api.delete<{ success: boolean }>(`/menu-items/${id}`),

  getAdminMenuGrants: (adminUserId: string) =>
    api.get<AdminMenuGrantsApi>(`/menu-items/grants/${adminUserId}`),

  setAdminMenuGrants: (adminUserId: string, menuKeys: string[]) =>
    api.put<AdminMenuGrantsApi>(`/menu-items/grants/${adminUserId}`, { menuKeys }),

  // Approval Workflow Definitions (Settings)
  listApprovalWorkflowDefinitions: (params?: {
    page?: number
    pageSize?: number
    search?: string
    isActive?: boolean
    approvalMode?: ApprovalWorkflowMode
  }) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params?.page ?? 1))
    qs.set('pageSize', String(params?.pageSize ?? 20))
    if (params?.search?.trim()) qs.set('search', params.search.trim())
    if (typeof params?.isActive === 'boolean') qs.set('isActive', String(params.isActive))
    if (params?.approvalMode) qs.set('approvalMode', params.approvalMode)
    return api.get<PaginatedResponse<ApprovalWorkflowDefinitionApi>>(`/settings/approval-workflows?${qs.toString()}`)
  },

  createApprovalWorkflowDefinition: (payload: {
    code: string
    name: string
    description?: string
    approvalMode: ApprovalWorkflowMode
    isActive?: boolean
    stages?: Array<{ label: string; approverPermissionSetId?: string; approverRoleDefinitionIds?: string[]; parentStageId?: string; requiredCount?: number }>
  }) => api.post<ApprovalWorkflowDefinitionApi>('/settings/approval-workflows', payload),

  updateApprovalWorkflowDefinition: (id: string, payload: {
    name?: string
    description?: string
    approvalMode?: ApprovalWorkflowMode
    isActive?: boolean
  }) => api.patch<ApprovalWorkflowDefinitionApi>(`/settings/approval-workflows/${id}`, payload),

  updateApprovalWorkflowDefinitionStatus: (id: string, isActive: boolean) =>
    api.patch<ApprovalWorkflowDefinitionApi>(`/settings/approval-workflows/${id}/status`, { isActive }),

  deleteApprovalWorkflowDefinition: (id: string) =>
    api.delete<{ success: boolean }>(`/settings/approval-workflows/${id}`),

  listApprovalWorkflowStages: (workflowId: string) =>
    api.get<ApprovalWorkflowStageDefinitionApi[]>(`/settings/approval-workflows/${workflowId}/stages`),

  addApprovalWorkflowStage: (workflowId: string, payload: {
    label: string
    approverPermissionSetId?: string
    approverRoleDefinitionIds?: string[]
    parentStageId?: string
    requiredCount?: number
  }) => api.post<ApprovalWorkflowStageDefinitionApi>(`/settings/approval-workflows/${workflowId}/stages`, payload),

  updateApprovalWorkflowStage: (workflowId: string, stageId: string, payload: {
    stageOrder?: number
    label?: string
    approverPermissionSetId?: string
    approverRoleDefinitionIds?: string[]
    parentStageId?: string
    requiredCount?: number
  }) => api.patch<ApprovalWorkflowStageDefinitionApi>(`/settings/approval-workflows/${workflowId}/stages/${stageId}`, payload),

  evaluateApprovalWorkflowCoverage: (workflowId: string) =>
    api.get<ApprovalWorkflowCoverageApi>(`/settings/approval-workflows/${workflowId}/coverage`),

  listApprovalWorkflowRuntimeItems: (params?: { workflowId?: string; status?: 'pending' | 'approved' | 'rejected' }) => {
    const qs = new URLSearchParams()
    if (params?.workflowId) qs.set('workflowId', params.workflowId)
    if (params?.status) qs.set('status', params.status)
    const q = qs.toString()
    return api.get<ApprovalWorkflowRuntimeItemApi[]>(`/settings/approval-workflows/runtime/items${q ? `?${q}` : ''}`)
  },

  getApprovalWorkflowRuntimeItem: (itemId: string) =>
    api.get<ApprovalWorkflowRuntimeItemApi>(`/settings/approval-workflows/runtime/items/${itemId}`),

  submitApprovalWorkflowRuntimeItem: (workflowId: string, payload: { targetId: string; summary?: string }) =>
    api.post<ApprovalWorkflowRuntimeItemApi>(`/settings/approval-workflows/${workflowId}/runtime/items`, payload),

  reviewApprovalWorkflowRuntimeItem: (itemId: string, payload: { stageId: string; decision: 'approved' | 'rejected'; note?: string }) =>
    api.post<ApprovalWorkflowRuntimeItemApi>(`/settings/approval-workflows/runtime/items/${itemId}/review`, payload),

  deleteApprovalWorkflowStage: (workflowId: string, stageId: string) =>
    api.delete<{ success: boolean }>(`/settings/approval-workflows/${workflowId}/stages/${stageId}`),

  // Enum Values (Reference Data)
  listEnumValues: (enumType?: string, activeOnly?: boolean) => {
    const qs = new URLSearchParams()
    if (enumType) qs.set('enumType', enumType)
    if (activeOnly) qs.set('activeOnly', 'true')
    const q = qs.toString()
    return api.get<EnumValueApi[]>(`/settings/enum-values${q ? `?${q}` : ''}`)
  },

  listEnumTypes: () =>
    api.get<string[]>('/settings/enum-values/types'),

  createEnumValue: (payload: { enumType: string; value: string; label: string; sortOrder?: number; active?: boolean }) =>
    api.post<EnumValueApi>('/settings/enum-values', payload),

  updateEnumValue: (id: string, payload: { value?: string; label?: string; sortOrder?: number; active?: boolean }) =>
    api.patch<EnumValueApi>(`/settings/enum-values/${id}`, payload),

  deleteEnumValue: (id: string) =>
    api.delete<{ success: boolean }>(`/settings/enum-values/${id}`),

  // Sreni Contact List
  listSreniContacts: (sreniId: string, page = 1, pageSize = 50) =>
    api.get<PaginatedResponse<SreniContactRowApi>>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts?page=${page}&pageSize=${pageSize}`,
    ),

  uploadSreniContacts: (sreniId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.postForm<{ inserted: number; sreniId: string }>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/upload`,
      form,
    )
  },

  clearSreniContacts: (sreniId: string) =>
    api.delete<{ deleted: number; sreniId: string }>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts`,
    ),

  // Sreni Calendar Events
  listSreniCalendarEvents: (sreniId: string, accessibleSthanIds?: string[]) => {
    const qs = new URLSearchParams()
    if (accessibleSthanIds && accessibleSthanIds.length > 0) {
      qs.set('accessibleSthanIds', accessibleSthanIds.join(','))
    }
    const q = qs.toString()
    return api.get<CalendarEventApi[]>(
      `/programs/sreni-definitions/${encodeURIComponent(sreniId)}/calendar-events${q ? `?${q}` : ''}`,
    )
  },

  createSreniCalendarEvent: (sreniId: string, payload: {
    title: string
    date: string
    startTime: string
    endTime: string
    color?: string
    notes?: string
    scope: 'zone' | 'sthan'
    sthanIds?: string[]
  }) => api.post<CalendarEventApi>(`/programs/sreni-definitions/${encodeURIComponent(sreniId)}/calendar-events`, payload),

  updateSreniCalendarEvent: (sreniId: string, eventId: string, payload: {
    title?: string
    date?: string
    startTime?: string
    endTime?: string
    color?: string
    notes?: string
    scope?: 'zone' | 'sthan'
    sthanIds?: string[]
  }) => api.patch<CalendarEventApi>(`/programs/sreni-definitions/${encodeURIComponent(sreniId)}/calendar-events/${encodeURIComponent(eventId)}`, payload),

  deleteSreniCalendarEvent: (sreniId: string, eventId: string) =>
    api.delete<{ success: boolean; deletedBy: string }>(
      `/programs/sreni-definitions/${encodeURIComponent(sreniId)}/calendar-events/${encodeURIComponent(eventId)}`,
    ),

  // Attendance metrics
  listAttendanceMetricsPaginated: (params?: { page?: number; pageSize?: number; search?: string; sreniId?: string }) => {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize))
    if (params?.search) qs.set('search', params.search)
    if (params?.sreniId) qs.set('sreniId', params.sreniId)
    const q = qs.toString()
    return api.get<PaginatedResponse<AttendanceMetricApi>>(`/org/attendance-metrics${q ? `?${q}` : ''}`)
  },

  createAttendanceMetric: (payload: {
    sreniId: string
    name: string
    description?: string
    keys: string[]
    active?: boolean
  }) => api.post<AttendanceMetricApi>('/org/attendance-metrics', payload),

  updateAttendanceMetric: (metricId: string, payload: {
    name?: string
    description?: string
    keys?: string[]
    active?: boolean
  }) => api.patch<AttendanceMetricApi>(`/org/attendance-metrics/${encodeURIComponent(metricId)}`, payload),

  deleteAttendanceMetric: (metricId: string) =>
    api.delete<{ success: boolean; deletedId: string }>(`/org/attendance-metrics/${encodeURIComponent(metricId)}`),

  listSreniAttendanceListing: (sreniId: string, accessibleSthanIds?: string[]) => {
    const qs = new URLSearchParams()
    if (accessibleSthanIds && accessibleSthanIds.length > 0) {
      qs.set('accessibleSthanIds', accessibleSthanIds.join(','))
    }
    const q = qs.toString()
    return api.get<SreniAttendanceListingItemApi[]>(
      `/programs/sreni-definitions/${encodeURIComponent(sreniId)}/attendance-listing${q ? `?${q}` : ''}`,
    )
  },

  upsertEventAttendanceCapture: (sreniId: string, eventId: string, payload: {
    metricId: string
    values: Record<string, string | number | boolean | null>
  }) => api.put<EventAttendanceCaptureApi>(
    `/programs/sreni-definitions/${encodeURIComponent(sreniId)}/calendar-events/${encodeURIComponent(eventId)}/attendance-capture`,
    payload,
  ),

  // Report Metric Definitions
  listReportMetricDefinitions: () =>
    api.get<ReportMetricDefinitionApi[]>('/settings/report-metrics'),
  createReportMetricDefinition: (payload: { name: string; inputType: 'number' | 'text'; description?: string; unit?: string; isRequired?: boolean; sortOrder?: number }) =>
    api.post<ReportMetricDefinitionApi>('/settings/report-metrics', payload),
  updateReportMetricDefinition: (id: string, payload: { name?: string; inputType?: 'number' | 'text'; description?: string; unit?: string; isRequired?: boolean; sortOrder?: number; active?: boolean }) =>
    api.patch<ReportMetricDefinitionApi>(`/settings/report-metrics/${id}`, payload),
  deleteReportMetricDefinition: (id: string) =>
    api.delete<void>(`/settings/report-metrics/${id}`),

  // Sreni Monthly Reports (legacy)
  listSreniMonthlyReports: (sreniId: string) =>
    api.get<SreniMonthlyReportApi[]>(`/org/sreni-definitions/${encodeURIComponent(sreniId)}/reports`),
  listAllMonthlyReports: () =>
    api.get<SreniMonthlyReportApi[]>('/org/reports'),
  upsertSreniMonthlyReport: (sreniId: string, payload: { year: number; month: number; entries: Record<string, string>; notes?: string }) =>
    api.post<SreniMonthlyReportApi>(`/org/sreni-definitions/${encodeURIComponent(sreniId)}/reports`, payload),

  // Sreni Report Parameters (config)
  listSreniReportParameters: (sreniId: string, submissionType?: string) =>
    api.get<SreniReportParameterApi[]>(`/org/sreni-definitions/${encodeURIComponent(sreniId)}/report-config/parameters${submissionType ? `?submissionType=${submissionType}` : ''}`),
  createSreniReportParameter: (sreniId: string, submissionType: string, payload: { name: string; inputType: 'number' | 'text'; description?: string; unit?: string; isRequired?: boolean; sortOrder?: number }) =>
    api.post<SreniReportParameterApi>(`/org/sreni-definitions/${encodeURIComponent(sreniId)}/report-config/${submissionType}/parameters`, payload),
  updateSreniReportParameter: (sreniId: string, parameterId: string, payload: { name?: string; inputType?: 'number' | 'text'; description?: string; unit?: string; isRequired?: boolean; sortOrder?: number; active?: boolean }) =>
    api.patch<SreniReportParameterApi>(`/org/sreni-definitions/${encodeURIComponent(sreniId)}/report-config/parameters/${parameterId}`, payload),
  deleteSreniReportParameter: (sreniId: string, parameterId: string) =>
    api.delete<{ success: boolean }>(`/org/sreni-definitions/${encodeURIComponent(sreniId)}/report-config/parameters/${parameterId}`),

  // Sreni Reports v2
  listSreniReports: (sreniId: string, submissionType?: string) =>
    api.get<SreniReportApi[]>(`/org/sreni-definitions/${encodeURIComponent(sreniId)}/reports-v2${submissionType ? `?submissionType=${submissionType}` : ''}`),
  upsertSreniReport: (sreniId: string, payload: { submissionType: 'monthly' | 'half_yearly' | 'yearly'; periodYear: number; periodValue: number; entries: Record<string, string>; notes?: string }) =>
    api.post<SreniReportApi>(`/org/sreni-definitions/${encodeURIComponent(sreniId)}/reports-v2`, payload),
}

export function toUiRole(role: AdminRoleAssignment['role']): 'Super Admin' | 'Zone Admin' | 'Sreny Admin' {
  if (role === 'SUPER_ADMIN') return 'Super Admin'
  if (role === 'ZONE_ADMIN') return 'Zone Admin'
  return 'Sreny Admin'
}

export function toApiRole(role: 'Super Admin' | 'Zone Admin' | 'Sreny Admin'): AdminRoleAssignment['role'] {
  if (role === 'Super Admin') return 'SUPER_ADMIN'
  if (role === 'Zone Admin') return 'ZONE_ADMIN'
  return 'SRENY_ADMIN'
}

