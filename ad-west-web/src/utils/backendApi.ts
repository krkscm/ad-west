import { api } from './api'
import { normalizeApiBaseUrl } from './apiBaseUrl'
import { appendSortQuery } from './tableListQuery'

export type ListSortParams = {
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

const CONTACT_UPLOAD_TIMEOUT_MS = 180_000

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
  level: 'ZONE' | 'STHAN' | 'DIVISION'
  canApproveReimbursements: boolean
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

export interface DateRangeQuery {
  fromDate?: string
  toDate?: string
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

export interface TableLayoutColumnConfig {
  key: string
  visible: boolean
}

export interface TableLayoutApi {
  id: string
  tableKey: string
  name: string
  columns: TableLayoutColumnConfig[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TableLayoutsResponseApi {
  layouts: TableLayoutApi[]
  activeId: string | null
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
  level: 'ZONE' | 'STHAN' | 'DIVISION'
  parentId?: string
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
  joinUsVisible: boolean
  showInUploadExcel?: boolean
  gadaAssignmentEnabled?: boolean
  enrollmentScope?: string
  primaryContactStrategy?: string
  createdBy?: string
  updatedBy?: string
  createdAt: string
  updatedAt: string
}

export type HouseholdResolverKey = 'household_head' | 'female_participants' | 'enrolled_children'

export interface SthanBasicApi {
  id: string
  name: string
}

export interface SreniDivisionApi {
  id: string
  sreniId: string
  name: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export type GadaContactListFilter = 'all' | 'unassigned' | 'mine'

export interface JoinUsSubmissionApi {
  id: string
  name: string
  mobileNo?: string
  email?: string
  familyOrBachelor?: string
  interestedSreniId: string
  interestedSreniName: string
  reviewStatus: 'pending' | 'completed'
  sthanId?: string
  divisionId?: string
  submittedAt: string
  reviewedAt?: string
  data: Record<string, string | number | boolean | null>
}

export interface SreniGadanayakApi {
  id: string
  sreniId: string
  sthanId: string
  sthanName?: string
  userId: string
  userName: string
  userEmail?: string
  active: boolean
  createdAt: string
}

export interface SreniContactRowApi {
  id: string
  sreniId: string
  sreniName?: string
  rowIndex: number
  data: Record<string, string | number | boolean | null>
  zoneLocationId?: string
  sthanLocationId?: string
  divisionLocationId?: string
  divisionId?: string
  sthanId?: string
  gadanayakUserId?: string
  gadanayakUserName?: string
  active: boolean
  /** True when this contact belongs to another Sreni but is tagged to the current one */
  isTagged?: boolean
  childCount?: number
  childrenDivisionSummary?: string
  participantCount?: number
  memberSrenis?: Array<{ sreniId: string; sreniName: string }>
  sourceFile?: string
  uploadedBy?: string
  createdAt: string
  updatedAt: string
}

export interface SreniContactsListApi extends PaginatedResponse<SreniContactRowApi> {
  enrollmentScope?: string
  primaryContactStrategy?: string
  resolverKey?: HouseholdResolverKey
  participantTotal?: number
  gadaAssignmentEnabled?: boolean
  canManageGadaAssignments?: boolean
}

export interface SreniParticipantStatsApi {
  strategy: string
  resolverKey?: HouseholdResolverKey
  householdCount: number
  participantCount: number
}

export interface SreniParticipantApi {
  memberId?: string
  contactId: string
  sreniId: string
  name: string
  role: 'head' | 'spouse' | 'child' | 'other'
  phone?: string
  email?: string
  gender?: string
  dateOfBirth?: string
  divisionId?: string
  divisionName?: string
  householdPhone?: string
  householdName?: string
  usesHouseholdPhone?: boolean
}

export interface HouseholdMemberEnrollmentApi {
  id: string
  memberId: string
  sreniId: string
  divisionId?: string
  divisionName?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface HouseholdMemberApi {
  id: string
  contactId: string
  role: 'head' | 'spouse' | 'child' | 'other'
  source: 'import' | 'manual'
  name: string
  phone?: string
  email?: string
  gender?: string
  dateOfBirth?: string
  sortOrder: number
  active: boolean
  enrollments?: HouseholdMemberEnrollmentApi[]
  createdAt: string
  updatedAt: string
}

export interface SevaContributionDocumentApi {
  id: string
  contributionId: string
  fileName: string
  fileType?: string
  fileSize?: number
  uploadedBy?: string
  createdAt: string
}

export interface SevaContributionApi {
  id: string
  contactId: string
  activityDate: string
  sevaActivity?: string
  details?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
  documents: SevaContributionDocumentApi[]
}

export interface ContactSreniTagApi {
  id: string
  contactId: string
  sreniId: string
  divisionId?: string
  createdAt: string
  updatedAt: string
}

export type MemberContactUploadActionApi = 'insert' | 'update' | 'skip'

export interface MemberContactParsedRowApi {
  rowIndex: number
  data: Record<string, string | number | boolean | null>
  errors: string[]
}

export interface MemberContactDuplicateMatchApi {
  kind: 'household' | 'child'
  rowIndex: number
  matchKey: string
  existingContactId: string
  existingData: Record<string, string | number | boolean | null>
  incomingData: Record<string, string | number | boolean | null>
  childSlot?: number
  parentContactId?: string
  sreniId?: string
  sreniName?: string
  childName?: string
  childDob?: string
}

export interface MemberContactPreviewResultApi {
  rows: MemberContactParsedRowApi[]
  duplicates: MemberContactDuplicateMatchApi[]
  withinFileDuplicates: Array<{ rowIndexA: number; rowIndexB: number; matchKey: string }>
  sreniColumns: Array<{ sreniId: string; sreniName: string; primaryContactStrategy: string | null }>
  validRowCount: number
  errorRowCount: number
}

export interface MemberContactCommitDecisionApi {
  rowIndex: number
  action: MemberContactUploadActionApi
  data?: Record<string, string | number | boolean | null>
}

export interface MemberContactCommitResultApi {
  inserted: number
  updated: number
  skipped: number
  childRowsCreated: number
  childRowsUpdated: number
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

export interface AnalyticsStudioLayoutApi {
  id: string
  sreniId: string
  userId: string
  layoutType: 'details' | 'pivot'
  name: string
  config: Record<string, unknown>
  createdAt: string
  updatedAt: string
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
  gender?: 'male' | 'female'
}

export interface ResponsibilityChartNodeApi {
  userId: string
  name: string
  roleId?: string
  reportingToRoleIds: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ResponsibilityChartEdgeApi {
  fromUserId: string
  toUserId: string
  viaRoleId: string
}

export interface ResponsibilityChartApi {
  year: number
  availableYears: number[]
  nodes: ResponsibilityChartNodeApi[]
  edges: ResponsibilityChartEdgeApi[]
}

export interface ReportMetricDefinitionApi {
  id: string
  name: string
  description?: string
  unit?: string
  inputType: 'number' | 'text'
  isRequired: boolean
  sortOrder: number
  target?: number
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

export interface CoreBusinessPersistenceReadinessApi {
  coreBusinessStore: 'in-memory' | 'db'
  authStoreMode: 'db' | 'in-memory'
  isProductionRuntime: boolean
  readyForUat: boolean
  blockers: string[]
  nextSteps: string[]
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

export interface ApprovalWorkflowApi {
  id: string
  name: string
  targetType: 'document_submission' | 'report_submission'
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

export interface GoogleProfileApi {
  name: string
  email: string
  picture?: string
}

export interface GmailInboxEmailApi {
  id: string
  subject: string
  from: string
  date: string
  snippet: string
}

export interface GoogleIntegrationConfigApi {
  clientId: string
  redirectUri: string
  oauthScopes: string
  webAppOrigin: string
  enabled: boolean
  hasClientSecret: boolean
  updatedAt?: string
}

export interface SmtpIntegrationConfigApi {
  host: string
  port: number
  username: string
  fromName: string
  encryption: string
  imapHost: string
  imapPort: number
  enabled: boolean
  hasPassword: boolean
  updatedAt?: string
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
  parentValue: string | null
  createdAt: string
  updatedAt: string
}

// ─── Public Gateway types ─────────────────────────────────────────────────────

export type TicketCategory = 'general' | 'technical' | 'financial' | 'membership' | 'other'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type JobType = 'full_time' | 'part_time' | 'volunteer' | 'contract'
export type ApplicationStatus = 'new' | 'under_review' | 'shortlisted' | 'rejected' | 'accepted'

export type ReimbursementCategory = 'travel' | 'food' | 'accommodation' | 'event_supplies' | 'printing' | 'other'
export type ReimbursementStatus = 'draft' | 'submitted' | 'pending_review' | 'approved' | 'rejected'
export type FormFieldType = 'text' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'checkbox' | 'textarea'
export type NotificationTarget = 'all' | 'admin' | 'member'

export interface ReimbursementApi {
  id: string
  submittedBy: string
  category: ReimbursementCategory
  description: string
  amount: number
  currency: string
  receiptUrl?: string
  receiptOriginalName?: string
  status: ReimbursementStatus
  reviewerNotes?: string
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}

export interface EventFormFieldApi {
  id: string
  eventId: string
  fieldType: FormFieldType
  label: string
  placeholder?: string
  options?: string[]
  isRequired: boolean
  sortOrder: number
}

export interface SpecialEventApi {
  id: string
  title: string
  description?: string
  dateTime: string
  endDateTime?: string
  venue?: string
  isPublic: boolean
  registrationEnabled: boolean
  sreniIds: string[]
  formFields: EventFormFieldApi[]
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface EventRegistrationApi {
  id: string
  eventId: string
  formData: Record<string, unknown>
  submittedAt: string
}

export interface AppNotificationApi {
  id: string
  title: string
  message: string
  validFrom: string
  validTo: string
  target: NotificationTarget
  isActive: boolean
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface HelpdeskTicketApi {
  id: string
  name: string
  phone: string
  email?: string
  category: TicketCategory
  subject: string
  description: string
  status: TicketStatus
  assignedTo?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface JobPostingApi {
  id: string
  title: string
  description: string
  requirements?: string
  location?: string
  type: JobType
  isActive: boolean
  expiresAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface JobApplicationApi {
  id: string
  jobId: string
  jobTitle: string
  name: string
  phone: string
  email?: string
  resumeUrl?: string
  resumeFileName?: string
  resumeMimeType?: string
  resumeSizeBytes?: number
  coverLetter?: string
  status: ApplicationStatus
  notes?: string
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}

export interface JobApplicationActivityApi {
  id: string
  applicationId: string
  action: string
  fromStatus?: string
  toStatus?: string
  comment?: string
  actorId?: string
  actorLabel?: string
  createdAt: string
}

export interface PublicSreniOptionApi {
  id: string
  name: string
  code?: string
}

export interface PublicSreniContactRegistrationApi {
  id: string
  sreniId: string
  rowIndex: number
  createdAt: string
}

// ─── Sthan types ─────────────────────────────────────────────────────────────

export interface SthanReportMetricApi {
  id: string
  locationId: string
  name: string
  description?: string
  unit?: string
  inputType: 'number' | 'text'
  isRequired: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface SthanReportApi {
  id: string
  locationId: string
  periodYear: number
  periodMonth: number
  entries: Record<string, string>
  notes?: string
  submittedBy?: string
  submittedAt?: string
  createdAt: string
  updatedAt: string
}

export interface SthanCalendarEventApi {
  id: string
  locationId: string
  title: string
  date: string
  startTime: string
  endTime: string
  color: string
  notes?: string
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
  source?: 'local' | 'sreni'
  sreniId?: string
  scope?: 'zone' | 'sthan'
  readOnly?: boolean
}

export type SthanExpenseCategory = 'travel' | 'food' | 'accommodation' | 'event_supplies' | 'printing' | 'other'
export type SthanExpenseStatus = 'draft' | 'submitted' | 'pending_review' | 'approved' | 'rejected'

export interface SthanExpenseApi {
  id: string
  locationId: string
  submittedBy?: string
  category: SthanExpenseCategory
  description: string
  amount: number
  currency: string
  receiptUrl?: string
  receiptOriginalName?: string
  status: SthanExpenseStatus
  reviewerNotes?: string
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}

export interface SthanContactRowApi {
  id: string
  locationId: string
  rowIndex: number
  data: Record<string, string | number | boolean | null>
  zoneLocationId?: string
  sthanLocationId?: string
  divisionLocationId?: string
  sourceFile?: string
  uploadedBy?: string
  createdAt: string
  updatedAt: string
}

const withDateRangeQuery = (basePath: string, range?: DateRangeQuery, extra?: Record<string, string | undefined>) => {
  const query = new URLSearchParams()
  if (range?.fromDate) query.set('fromDate', range.fromDate)
  if (range?.toDate) query.set('toDate', range.toDate)

  if (extra) {
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, value)
      }
    })
  }

  const queryString = query.toString()
  return `${basePath}${queryString ? `?${queryString}` : ''}`
}

export const backendApi = {
  captchaChallenge: () =>
    api.get<CaptchaChallengeResponse>('/auth/captcha', {
      retry: { attempts: 3, delayMs: 1000 },
    }),

  login: (identifier: string, password: string, captchaToken: string, captchaAnswer: string) =>
    api.post<AdminLoginResponse>('/auth/login', { identifier, password, captchaToken, captchaAnswer }),

  forgotPassword: (email: string) =>
    api.post<{ success: boolean }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<{ success: boolean }>('/auth/reset-password', { token, newPassword }),

  buildGoogleStartUrl: (returnOrigin: string) =>
    `${normalizeApiBaseUrl(import.meta.env.VITE_API_URL)}/auth/google/start?returnOrigin=${encodeURIComponent(returnOrigin)}`,

  adminLogout: () => api.post<{ success: boolean }>('/auth/admin/logout', {}),

  gmailInbox: (maxResults = 10) =>
    api.get<{ emails: GmailInboxEmailApi[] }>(`/gmail/inbox?maxResults=${maxResults}`),

  gmailSend: (payload: { to: string; subject: string; body: string }) =>
    api.post<{ success: boolean; messageId: string }>('/gmail/send', payload),

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
    filters?: string
  } & ListSortParams) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.pageSize) query.set('pageSize', String(params.pageSize))
    if (params?.search?.trim()) query.set('search', params.search.trim())
    if (typeof params?.active === 'boolean') query.set('active', String(params.active))
    if (params?.level) query.set('level', params.level)
    if (params?.filters) query.set('filters', params.filters)
    appendSortQuery(query, params)

    const queryString = query.toString()
    return api.get<PaginatedResponse<RoleDefinitionApi>>(`/role-definitions${queryString ? `?${queryString}` : ''}`)
  },

  createRoleDefinition: (payload: {
    code: string
    name: string
    level: RoleDefinitionApi['level']
    active?: boolean
    canApproveReimbursements?: boolean
  }) => api.post<RoleDefinitionApi>('/role-definitions', payload),

  updateRoleDefinition: (id: string, payload: {
    code?: string
    name?: string
    level?: RoleDefinitionApi['level']
    canApproveReimbursements?: boolean
  }) => api.patch<RoleDefinitionApi>(`/role-definitions/${id}`, payload),

  updateRoleDefinitionStatus: (id: string, active: boolean) =>
    api.patch<RoleDefinitionApi>(`/role-definitions/${id}/status`, { active }),

  deleteRoleDefinition: (id: string) => api.delete<{ success: boolean }>(`/role-definitions/${id}`),

  listAuditLogs: (action?: string) =>
    api.get<AuditLogApi[]>(`/audit-logs${action ? `?action=${encodeURIComponent(action)}` : ''}`),

  listContacts: () => api.get<ContactApi[]>('/contacts'),

  listLocationDefinitions: () =>
    api.get<{ items: Array<{ id: string; code?: string; name: string; level: string; parentId?: string; active: boolean; createdAt: string; updatedAt: string }> }>('/org/locations?page=1&pageSize=9999')
      .then((res) => res.items.map((r) => ({
        id: r.id, code: r.code, name: r.name,
        level: r.level.toUpperCase() as 'ZONE' | 'STHAN' | 'DIVISION',
        parentId: r.parentId, active: r.active, createdAt: r.createdAt, updatedAt: r.updatedAt,
      }))),

  listLocationDefinitionsPaginated: (params?: { page?: number; pageSize?: number; search?: string; level?: string; filters?: string } & ListSortParams) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params?.page ?? 1))
    qs.set('pageSize', String(params?.pageSize ?? 10))
    if (params?.search?.trim()) qs.set('search', params.search.trim())
    if (params?.level) qs.set('level', params.level.toLowerCase())
    if (params?.filters) qs.set('filters', params.filters)
    appendSortQuery(qs, params)
    return api.get<PaginatedResponse<{ id: string; code?: string; name: string; level: string; parentId?: string; active: boolean; createdAt: string; updatedAt: string }>>(`/org/locations?${qs.toString()}`)
      .then((res) => ({
        ...res,
        items: res.items.map((r) => ({
          id: r.id, code: r.code, name: r.name,
          level: r.level.toUpperCase() as 'ZONE' | 'STHAN' | 'DIVISION',
          parentId: r.parentId, active: r.active, createdAt: r.createdAt, updatedAt: r.updatedAt,
        })),
      }))
  },

  createLocationDefinition: (payload: { name: string; code?: string; level: 'ZONE' | 'STHAN' | 'DIVISION'; parentId?: string | null }) =>
    api.post<{ id: string; code?: string; name: string; level: string; parentId?: string; active: boolean; createdAt: string; updatedAt: string }>(
      '/org/locations',
      { name: payload.name, code: payload.code, level: payload.level.toLowerCase(), parentId: payload.parentId ?? null },
    ).then((r) => ({ id: r.id, code: r.code, name: r.name, level: r.level.toUpperCase() as 'ZONE' | 'STHAN' | 'DIVISION', parentId: r.parentId, active: r.active, createdAt: r.createdAt, updatedAt: r.updatedAt })),

  updateLocationDefinition: (id: string, payload: { name?: string; code?: string; active?: boolean; level?: 'ZONE' | 'STHAN' | 'DIVISION'; parentId?: string | null }) =>
    api.patch<{ id: string; code?: string; name: string; level: string; parentId?: string; active: boolean; createdAt: string; updatedAt: string }>(
      `/org/locations/${id}`,
      { ...payload, level: payload.level?.toLowerCase() },
    ).then((r) => ({ id: r.id, code: r.code, name: r.name, level: r.level.toUpperCase() as 'ZONE' | 'STHAN' | 'DIVISION', parentId: r.parentId, active: r.active, createdAt: r.createdAt, updatedAt: r.updatedAt })),

  deleteLocationDefinition: (id: string) => api.delete<void>(`/org/locations/${id}`),

  listSreniDefinitions: () =>
    api.get<{ items: SreniDefinitionApi[] }>('/org/sreni-definitions?page=1&pageSize=9999')
      .then((res) => res.items),

  listSreniDefinitionsPaginated: (params?: { page?: number; pageSize?: number; search?: string; filters?: string } & ListSortParams) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params?.page ?? 1))
    qs.set('pageSize', String(params?.pageSize ?? 10))
    if (params?.search?.trim()) qs.set('search', params.search.trim())
    if (params?.filters) qs.set('filters', params.filters)
    appendSortQuery(qs, params)
    return api.get<PaginatedResponse<SreniDefinitionApi>>(`/org/sreni-definitions?${qs.toString()}`)
  },

  createSreniDefinition: (payload: {
    name: string
    code?: string
    description?: string
    joinUsVisible?: boolean
    showInUploadExcel?: boolean
    gadaAssignmentEnabled?: boolean
    enrollmentScope?: string
    primaryContactStrategy?: string
  }) =>
    api.post<SreniDefinitionApi>('/org/sreni-definitions', payload),

  updateSreniDefinition: (id: string, payload: {
    name?: string
    code?: string
    description?: string
    active?: boolean
    joinUsVisible?: boolean
    showInUploadExcel?: boolean
    gadaAssignmentEnabled?: boolean
    enrollmentScope?: string
    primaryContactStrategy?: string
  }) =>
    api.patch<SreniDefinitionApi>(`/org/sreni-definitions/${id}`, payload),

  deleteSreniDefinition: (id: string) => api.delete<void>(`/org/sreni-definitions/${id}`),

  // Users
  listUsers: (params?: { page?: number; pageSize?: number; search?: string; filters?: string } & ListSortParams) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params?.search) qs.set('search', params.search);
    if (params?.filters) qs.set('filters', params.filters);
    appendSortQuery(qs, params);
    const q = qs.toString();
    return api.get<PaginatedUsersApi>(`/org/users${q ? `?${q}` : ''}`);
  },
  getResponsibilityChart: (year?: number) =>
    api.get<ResponsibilityChartApi>(`/org/responsibility-chart${year ? `?year=${encodeURIComponent(String(year))}` : ''}`),
  createUser: (payload: { name: string; password: string; phone?: string; email?: string; roleId?: string; sthanId?: string; permissionSetId?: string; adminManagement?: string; isSuperAdmin?: boolean; reportingToRoleIds?: string[]; gender?: 'male' | 'female' }) =>
    api.post<UserApi>('/org/users', payload),
  updateUser: (id: string, payload: { name?: string; password?: string; phone?: string; email?: string; roleId?: string; sthanId?: string; permissionSetId?: string; adminManagement?: string; isSuperAdmin?: boolean; active?: boolean; reportingToRoleIds?: string[]; gender?: 'male' | 'female' }) =>
    api.patch<UserApi>(`/org/users/${id}`, payload),
  deleteUser: (id: string) => api.delete<void>(`/org/users/${id}`),
  changeOwnPassword: (currentPassword: string, newPassword: string) => api.post<void>('/org/users/me/change-password', { currentPassword, newPassword }),

  // Permissions
  listPermissions: () =>
    api.get<{ items: PermissionApi[] }>('/org/permissions?page=1&pageSize=9999')
      .then((res) => res.items),

  listPermissionsPaginated: (params?: { page?: number; pageSize?: number; search?: string; locationId?: string; filters?: string } & ListSortParams) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params?.page ?? 1))
    qs.set('pageSize', String(params?.pageSize ?? 10))
    if (params?.search?.trim()) qs.set('search', params.search.trim())
    if (params?.locationId) qs.set('locationId', params.locationId)
    if (params?.filters) qs.set('filters', params.filters)
    appendSortQuery(qs, params)
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

  listPermissionSetsPaginated: (params?: { page?: number; pageSize?: number; search?: string; filters?: string } & ListSortParams) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params?.page ?? 1))
    qs.set('pageSize', String(params?.pageSize ?? 10))
    if (params?.search?.trim()) qs.set('search', params.search.trim())
    if (params?.filters) qs.set('filters', params.filters)
    appendSortQuery(qs, params)
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

  getCoreBusinessPersistenceReadiness: () =>
    api.get<CoreBusinessPersistenceReadinessApi>('/core/persistence/readiness'),

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

  listApprovalWorkflows: () => api.get<ApprovalWorkflowApi[]>('/approvals/workflows'),

  createApprovalWorkflow: (payload: {
    name: string
    targetType: 'document_submission' | 'report_submission'
    steps: string[]
  }) => api.post<ApprovalWorkflowApi>('/approvals/workflows', payload),

  listApprovalItems: (status?: string) =>
    api.get<ApprovalItemApi[]>(`/approvals/items${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  listMyApprovalActions: (status?: string) =>
    api.get<ApprovalWorkflowRuntimeItemApi[]>(`/settings/approval-workflows/runtime/my-items${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  listMyApprovalNotifications: (_itemId?: string) =>
    api.get<ApprovalNotificationApi[]>('/settings/approval-workflows/runtime/my-notifications'),

  submitApprovalItem: (payload: { workflowId: string; targetId: string; summary?: string }) =>
    api.post<ApprovalItemApi>('/approvals/items', payload),

  reviewApprovalItem: (itemId: string, payload: { decision: 'approved' | 'rejected' | 'need_more_information'; note?: string }) =>
    api.post<ApprovalItemApi>(`/approvals/items/${itemId}/review`, payload),

  resubmitApprovalItem: (itemId: string, payload: { note?: string }) =>
    api.post<ApprovalItemApi>(`/approvals/items/${itemId}/resubmit`, payload),

  listMemberReportTemplates: (token: string) => api.get<ReportTemplateApi[]>('/members/me/reports/templates', { token }),

  listMemberReportSubmissions: (token: string) => api.get<ReportSubmissionApi[]>('/members/me/reports/submissions', { token }),

  createMemberReportSubmission: (payload: { templateId: string; answers: Record<string, string> }, token: string) =>
    api.post<ReportSubmissionApi>('/members/me/reports/submissions', payload, { token }),

  // Menu Management
  listMenuItems: (activeOnly?: boolean, scope?: 'all') => {
    const query = new URLSearchParams()
    if (activeOnly) query.set('activeOnly', 'true')
    if (scope) query.set('scope', scope)
    const queryString = query.toString()
    return api.get<MenuItemApi[]>(`/menu-items${queryString ? `?${queryString}` : ''}`)
  },

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
    filters?: string
  } & ListSortParams) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params?.page ?? 1))
    qs.set('pageSize', String(params?.pageSize ?? 10))
    if (params?.search?.trim()) qs.set('search', params.search.trim())
    if (typeof params?.isActive === 'boolean') qs.set('isActive', String(params.isActive))
    if (params?.approvalMode) qs.set('approvalMode', params.approvalMode)
    if (params?.filters) qs.set('filters', params.filters)
    appendSortQuery(qs, params)
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

  createEnumValue: (payload: { enumType: string; value: string; label: string; sortOrder?: number; active?: boolean; parentValue?: string | null }) =>
    api.post<EnumValueApi>('/settings/enum-values', payload),

  updateEnumValue: (id: string, payload: { value?: string; label?: string; sortOrder?: number; active?: boolean; parentValue?: string | null }) =>
    api.patch<EnumValueApi>(`/settings/enum-values/${id}`, payload),

  deleteEnumValue: (id: string) =>
    api.delete<{ success: boolean }>(`/settings/enum-values/${id}`),

  // Google Integration Settings
  getGoogleIntegrationConfig: () =>
    api.get<GoogleIntegrationConfigApi>('/settings/google-integration-config'),

  updateGoogleIntegrationConfig: (payload: {
    clientId?: string
    clientSecret?: string
    redirectUri?: string
    oauthScopes?: string
    webAppOrigin?: string
    enabled?: boolean
    clearClientSecret?: boolean
  }) =>
    api.patch<GoogleIntegrationConfigApi>('/settings/google-integration-config', payload),

  // SMTP / Email Integration Settings
  getSmtpIntegrationConfig: () =>
    api.get<SmtpIntegrationConfigApi>('/settings/smtp-integration-config'),

  updateSmtpIntegrationConfig: (payload: {
    host?: string
    port?: number
    username?: string
    password?: string
    fromName?: string
    encryption?: string
    imapHost?: string
    imapPort?: number
    enabled?: boolean
    clearPassword?: boolean
  }) =>
    api.patch<SmtpIntegrationConfigApi>('/settings/smtp-integration-config', payload),

  listJoinUsSubmissions: (params?: {
    page?: number
    pageSize?: number
    status?: 'pending' | 'completed' | 'all'
    sreniId?: string
    search?: string
    filters?: string
  } & ListSortParams) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params?.page ?? 1))
    qs.set('pageSize', String(params?.pageSize ?? 10))
    qs.set('status', params?.status ?? 'pending')
    if (params?.sreniId) qs.set('sreniId', params.sreniId)
    if (params?.search?.trim()) qs.set('search', params.search.trim())
    if (params?.filters) qs.set('filters', params.filters)
    appendSortQuery(qs, params)
    return api.get<{
      items: JoinUsSubmissionApi[]
      total: number
      page: number
      pageSize: number
      totalPages: number
      pendingCount: number
    }>(`/org/join-us-submissions?${qs}`)
  },

  completeJoinUsReview: (
    contactId: string,
    payload: {
      sreniId: string
      sthanId: string
      zoneId?: string
      divisionId?: string | null
      reviewNote?: string
      currentStatus?: string
    },
  ) =>
    api.post<SreniContactRowApi>(`/org/join-us-submissions/${encodeURIComponent(contactId)}/complete-review`, payload),

  // All contacts (across all Srenis)
  listAllContacts: (
    page = 1,
    pageSize = 10,
    filters?: { sreniId?: string; sthanId?: string; search?: string; filters?: string } & ListSortParams,
  ) => {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (filters?.sreniId) qs.set('sreniId', filters.sreniId)
    if (filters?.sthanId) qs.set('sthanId', filters.sthanId)
    if (filters?.search?.trim()) qs.set('search', filters.search.trim())
    if (filters?.filters) qs.set('filters', filters.filters)
    appendSortQuery(qs, filters)
    return api.get<PaginatedResponse<SreniContactRowApi>>(`/org/contacts?${qs}`)
  },

  // Sreni Contact List
  listSreniContacts: (
    sreniId: string,
    page = 1,
    pageSize = 10,
    gadaOptions?: { filter?: GadaContactListFilter; gadanayakUserId?: string; search?: string; filters?: string } & ListSortParams,
  ) => {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (gadaOptions?.filter) qs.set('gadaFilter', gadaOptions.filter)
    if (gadaOptions?.gadanayakUserId) qs.set('gadanayakUserId', gadaOptions.gadanayakUserId)
    if (gadaOptions?.search?.trim()) qs.set('search', gadaOptions.search.trim())
    if (gadaOptions?.filters) qs.set('filters', gadaOptions.filters)
    appendSortQuery(qs, gadaOptions)
    return api.get<SreniContactsListApi>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts?${qs}`,
    )
  },

  listSreniGadanayaks: (sreniId: string, sthanId?: string) => {
    const qs = sthanId ? `?sthanId=${encodeURIComponent(sthanId)}` : ''
    return api.get<SreniGadanayakApi[]>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/gadanayaks${qs}`,
    )
  },

  listEligibleGadanayakUsers: (sreniId: string, sthanId: string) =>
    api.get<Array<{ id: string; name: string; email?: string }>>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/gadanayak-eligible-users?sthanId=${encodeURIComponent(sthanId)}`,
    ),

  registerSreniGadanayak: (sreniId: string, sthanId: string, userId: string) =>
    api.post<SreniGadanayakApi>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/gadanayaks`,
      { sthanId, userId },
    ),

  removeSreniGadanayak: (sreniId: string, gadanayakId: string) =>
    api.delete<void>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/gadanayaks/${encodeURIComponent(gadanayakId)}`,
    ),

  assignContactGada: (sreniId: string, contactId: string, gadanayakUserId: string) =>
    api.patch<{ contactId: string; gadanayakUserId: string; gadanayakUserName?: string }>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/${encodeURIComponent(contactId)}/gada`,
      { gadanayakUserId },
    ),

  unassignContactGada: (sreniId: string, contactId: string) =>
    api.delete<void>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/${encodeURIComponent(contactId)}/gada`,
    ),

  bulkAssignContactGada: (sreniId: string, contactIds: string[], gadanayakUserId: string) =>
    api.post<{ assigned: number }>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/gada/bulk`,
      { contactIds, gadanayakUserId },
    ),

  previewMemberContactUpload: (file: File, context?: { sreniId?: string; locationId?: string }) => {
    const form = new FormData()
    form.append('file', file)
    const path = context?.sreniId
      ? `/org/sreni-definitions/${encodeURIComponent(context.sreniId)}/contacts/upload/preview`
      : context?.locationId
        ? `/org/locations/${encodeURIComponent(context.locationId)}/contacts/upload/preview`
        : '/org/contacts/upload/preview'
    return api.postForm<MemberContactPreviewResultApi>(path, form, { timeoutMs: CONTACT_UPLOAD_TIMEOUT_MS })
  },

  commitMemberContactUpload: (
    decisions: MemberContactCommitDecisionApi[],
    sourceFile?: string,
  ) =>
    api.post<MemberContactCommitResultApi>('/org/contacts/upload/commit', {
      decisions,
      sourceFile,
    }, { timeoutMs: CONTACT_UPLOAD_TIMEOUT_MS }),

  downloadMemberContactTemplate: () =>
    api.getBlob('/org/contacts/upload-template'),

  clearSreniContacts: (sreniId: string) =>
    api.delete<{ deleted: number; sreniId: string }>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts`,
    ),

  updateHouseholdContact: (contactId: string, data: Record<string, string | number | boolean | null>) =>
    api.patch<SreniContactRowApi>(
      `/org/contacts/${encodeURIComponent(contactId)}`,
      { data },
    ),

  updateSreniContact: (sreniId: string, contactId: string, data: Record<string, string | number | boolean | null>) =>
    api.patch<SreniContactRowApi>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/${encodeURIComponent(contactId)}`,
      { data },
    ),

  assignContactDivision: (sreniId: string, contactId: string, divisionId: string | null) =>
    api.patch<SreniContactRowApi>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/${encodeURIComponent(contactId)}/division`,
      { divisionId },
    ),

  assignContactSthan: (sreniId: string, contactId: string, sthanId: string | null) =>
    api.patch<SreniContactRowApi>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/${encodeURIComponent(contactId)}/sthan`,
      { sthanId },
    ),

  toggleContactActive: (sreniId: string, contactId: string, active: boolean) =>
    api.patch<SreniContactRowApi>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/${encodeURIComponent(contactId)}/active`,
      { active },
    ),

  deleteContact: (sreniId: string, contactId: string) =>
    api.delete<{ deleted: boolean }>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/${encodeURIComponent(contactId)}`,
    ),

  listHouseholdMembers: (sreniId: string, contactId: string) =>
    api.get<HouseholdMemberApi[]>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/${encodeURIComponent(contactId)}/members`,
    ),

  createHouseholdMember: (
    sreniId: string,
    contactId: string,
    payload: { name: string; role?: 'child' | 'other'; gender?: string; dateOfBirth?: string; divisionId?: string },
  ) =>
    api.post<HouseholdMemberApi>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/${encodeURIComponent(contactId)}/members`,
      payload,
    ),

  updateHouseholdMember: (
    sreniId: string,
    contactId: string,
    memberId: string,
    payload: { name?: string; gender?: string; dateOfBirth?: string; divisionId?: string | null; active?: boolean },
  ) =>
    api.patch<HouseholdMemberApi>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/${encodeURIComponent(contactId)}/members/${encodeURIComponent(memberId)}`,
      payload,
    ),

  deleteHouseholdMember: (sreniId: string, contactId: string, memberId: string) =>
    api.delete<void>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/${encodeURIComponent(contactId)}/members/${encodeURIComponent(memberId)}`,
    ),

  listSevaContributions: (sreniId: string, contactId: string) =>
    api.get<SevaContributionApi[]>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/${encodeURIComponent(contactId)}/seva-contributions`,
    ),

  createSevaContribution: (
    sreniId: string,
    contactId: string,
    payload: { activityDate: string; sevaActivity?: string; details?: string },
  ) =>
    api.post<SevaContributionApi>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/${encodeURIComponent(contactId)}/seva-contributions`,
      payload,
    ),

  updateSevaContribution: (
    sreniId: string,
    contactId: string,
    contributionId: string,
    payload: { activityDate?: string; sevaActivity?: string; details?: string },
  ) =>
    api.patch<SevaContributionApi>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/${encodeURIComponent(contactId)}/seva-contributions/${encodeURIComponent(contributionId)}`,
      payload,
    ),

  deleteSevaContribution: (sreniId: string, contactId: string, contributionId: string) =>
    api.delete<void>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/${encodeURIComponent(contactId)}/seva-contributions/${encodeURIComponent(contributionId)}`,
    ),

  uploadSevaContributionDocuments: (sreniId: string, contactId: string, contributionId: string, files: File[]) => {
    const form = new FormData()
    for (const file of files) {
      form.append('files', file)
    }
    return api.postForm<SevaContributionDocumentApi[]>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/${encodeURIComponent(contactId)}/seva-contributions/${encodeURIComponent(contributionId)}/documents`,
      form,
    )
  },

  downloadSevaContributionDocument: async (documentId: string, fileName: string) => {
    const blob = await api.getBlob(`/org/seva-contribution-documents/${encodeURIComponent(documentId)}/download`)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(url)
  },

  deleteSevaContributionDocument: (documentId: string) =>
    api.delete<void>(`/org/seva-contribution-documents/${encodeURIComponent(documentId)}`),

  getSreniParticipantStats: (sreniId: string) =>
    api.get<SreniParticipantStatsApi>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/participants/stats`,
    ),

  listSreniParticipants: (sreniId: string, page = 1, pageSize = 500) =>
    api.get<PaginatedResponse<SreniParticipantApi>>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/participants?page=${page}&pageSize=${pageSize}`,
    ),

  listContactParticipants: (sreniId: string, contactId: string) =>
    api.get<SreniParticipantApi[]>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/contacts/${encodeURIComponent(contactId)}/participants`,
    ),

  listSthans: (srenyId?: string) =>
    api.get<SthanBasicApi[]>(`/org/sthans${srenyId ? `?srenyId=${encodeURIComponent(srenyId)}` : ''}`),


  // Contact Sreni Tags (multi-sreni assignment)
  listContactSreniTagsBatch: (contactIds: string[]) => {
    if (!contactIds.length) return Promise.resolve({} as Record<string, ContactSreniTagApi[]>);
    const qs = new URLSearchParams({ contactIds: contactIds.join(',') });
    return api.get<Record<string, ContactSreniTagApi[]>>(`/org/contacts/sreni-tags?${qs.toString()}`);
  },

  listContactSreniTags: (contactId: string) =>
    api.get<ContactSreniTagApi[]>(`/org/contacts/${encodeURIComponent(contactId)}/sreni-tags`),

  setContactSreniTags: (contactId: string, tags: Array<{ sreniId: string; divisionId?: string | null }>) =>
    api.put<ContactSreniTagApi[]>(`/org/contacts/${encodeURIComponent(contactId)}/sreni-tags`, { tags }),

  // Sreni Divisions
  listSreniDivisions: (sreniId: string) =>
    api.get<SreniDivisionApi[]>(`/org/sreni-definitions/${encodeURIComponent(sreniId)}/divisions`),

  createSreniDivision: (sreniId: string, payload: { name: string; displayOrder?: number }) =>
    api.post<SreniDivisionApi>(`/org/sreni-definitions/${encodeURIComponent(sreniId)}/divisions`, payload),

  updateSreniDivision: (sreniId: string, divisionId: string, payload: { name?: string; displayOrder?: number }) =>
    api.patch<SreniDivisionApi>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/divisions/${encodeURIComponent(divisionId)}`,
      payload,
    ),

  deleteSreniDivision: (sreniId: string, divisionId: string) =>
    api.delete<{ deleted: boolean }>(
      `/org/sreni-definitions/${encodeURIComponent(sreniId)}/divisions/${encodeURIComponent(divisionId)}`,
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
  listAttendanceMetricsPaginated: (params?: { page?: number; pageSize?: number; search?: string; sreniId?: string; filters?: string } & ListSortParams) => {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize))
    if (params?.search) qs.set('search', params.search)
    if (params?.sreniId) qs.set('sreniId', params.sreniId)
    if (params?.filters) qs.set('filters', params.filters)
    appendSortQuery(qs, params)
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

  listAnalyticsStudioLayouts: (sreniId: string, layoutType?: 'details' | 'pivot') => {
    const qs = new URLSearchParams()
    if (layoutType) qs.set('layoutType', layoutType)
    const q = qs.toString()
    return api.get<AnalyticsStudioLayoutApi[]>(
      `/programs/sreni-definitions/${encodeURIComponent(sreniId)}/analytics-layouts${q ? `?${q}` : ''}`,
    )
  },

  saveAnalyticsStudioLayout: (sreniId: string, payload: {
    layoutType: 'details' | 'pivot'
    name: string
    config: Record<string, unknown>
  }) => api.post<AnalyticsStudioLayoutApi>(
    `/programs/sreni-definitions/${encodeURIComponent(sreniId)}/analytics-layouts`,
    payload,
  ),

  deleteAnalyticsStudioLayout: (sreniId: string, layoutId: string) =>
    api.delete<{ success: boolean }>(
      `/programs/sreni-definitions/${encodeURIComponent(sreniId)}/analytics-layouts/${encodeURIComponent(layoutId)}`,
    ),

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
  createReportMetricDefinition: (payload: { name: string; inputType: 'number' | 'text'; description?: string; unit?: string; isRequired?: boolean; sortOrder?: number; target?: number }) =>
    api.post<ReportMetricDefinitionApi>('/settings/report-metrics', payload),
  updateReportMetricDefinition: (id: string, payload: { name?: string; inputType?: 'number' | 'text'; description?: string; unit?: string; isRequired?: boolean; sortOrder?: number; target?: number; active?: boolean }) =>
    api.patch<ReportMetricDefinitionApi>(`/settings/report-metrics/${id}`, payload),
  deleteReportMetricDefinition: (id: string) =>
    api.delete<void>(`/settings/report-metrics/${id}`),

  // Sreni Monthly Reports (legacy)
  listSreniMonthlyReports: (sreniId: string) =>
    api.get<SreniMonthlyReportApi[]>(`/org/sreni-definitions/${encodeURIComponent(sreniId)}/reports`),
  listAllMonthlyReports: (range?: DateRangeQuery) =>
    api.get<SreniMonthlyReportApi[]>(withDateRangeQuery('/org/reports', range)),
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

  // ─── Public Gateway — Helpdesk (admin) ───────────────────────────────────
  listHelpdeskTickets: (status?: string, range?: DateRangeQuery) => {
    const path = withDateRangeQuery('/gateway/helpdesk/tickets', range, { status })
    return api.get<{ items: HelpdeskTicketApi[] }>(path)
  },
  getHelpdeskTicket: (id: string) =>
    api.get<HelpdeskTicketApi>(`/gateway/helpdesk/tickets/${id}`),
  updateHelpdeskTicket: (id: string, payload: { status?: TicketStatus; assignedTo?: string; notes?: string }) =>
    api.patch<HelpdeskTicketApi>(`/gateway/helpdesk/tickets/${id}`, payload),

  // ─── Public Gateway — Jobs (admin) ───────────────────────────────────────
  listJobPostings: (range?: DateRangeQuery) =>
    api.get<{ items: JobPostingApi[] }>(withDateRangeQuery('/gateway/jobs', range)),
  createJobPosting: (payload: { title: string; description: string; requirements?: string; location?: string; type?: JobType; expiresAt?: string }) =>
    api.post<JobPostingApi>('/gateway/jobs', payload),
  updateJobPosting: (id: string, payload: { title?: string; description?: string; requirements?: string; location?: string; type?: JobType; isActive?: boolean; expiresAt?: string }) =>
    api.patch<JobPostingApi>(`/gateway/jobs/${id}`, payload),
  deleteJobPosting: (id: string) =>
    api.delete<{ success: boolean }>(`/gateway/jobs/${id}`),
  listAllJobApplications: (range?: DateRangeQuery) =>
    api.get<{ items: JobApplicationApi[] }>(withDateRangeQuery('/gateway/jobs/applications', range)),
  listJobApplicationsForPosting: (jobId: string) =>
    api.get<{ items: JobApplicationApi[] }>(`/gateway/jobs/${jobId}/applications`),
  downloadJobApplicationResume: (id: string) =>
    api.getBlob(`/gateway/jobs/applications/${id}/resume`),
  updateJobApplication: (id: string, payload: { status?: ApplicationStatus; notes?: string; followUpNote?: string }) =>
    api.patch<JobApplicationApi>(`/gateway/jobs/applications/${id}`, payload),
  listJobApplicationActivities: (id: string) =>
    api.get<{ items: JobApplicationActivityApi[] }>(`/gateway/jobs/applications/${id}/activities`),

  // ─── Public Gateway — Public endpoints (no auth) ─────────────────────────
  publicListActiveJobs: () =>
    api.get<{ items: JobPostingApi[] }>('/public/jobs'),
  publicSubmitHelpdeskTicket: (payload: { name: string; phone: string; email?: string; category?: TicketCategory; subject: string; description: string }) =>
    api.post<HelpdeskTicketApi>('/public/helpdesk/tickets', payload),
  publicSubmitJobPosting: (payload: { contactName: string; contactPhone: string; contactEmail?: string; title: string; description: string; requirements?: string; location?: string; type?: JobType }) =>
    api.post<JobPostingApi>('/public/jobs', payload),
  publicListSreniContactOptions: () =>
    api.get<{ items: PublicSreniOptionApi[] }>('/public/sreni-contacts/srenies'),

  publicJoinUsFormOptions: () =>
    api.get<{
      mapsApiKey?: string
      bloodGroups: Array<{ value: string; label: string }>
      livingTypes: Array<{ value: string; label: string }>
      childGrades: Array<{ value: string; label: string }>
    }>('/public/sreni-contacts/form-options'),

  publicRegisterSreniContact: (payload: {
    sreniId: string
    name: string
    mobileNo: string
    dateOfBirth: string
    familyOrBachelor: string
    email?: string
    bloodGroup?: string
    altMobileNo?: string
    profession?: string
    company?: string
    jobTitle?: string
    spouseName?: string
    spouseDateOfBirth?: string
    spouseMobileNo?: string
    spouseEmail?: string
    spouseBloodGroup?: string
    spouseProfession?: string
    spouseCompany?: string
    child1Name?: string
    child1Dob?: string
    child1Grade?: string
    child2Name?: string
    child2Dob?: string
    child2Grade?: string
    child3Name?: string
    child3Dob?: string
    child3Grade?: string
    addressInUae?: string
    landLineNo?: string
    home?: string
    addressInIndia?: string
    districtIndia?: string
    googleMapLink?: string
    remarks?: string
    captchaToken: string
    captchaAnswer: string
    website?: string
  }) =>
    api.post<PublicSreniContactRegistrationApi>('/public/sreni-contacts/register', payload),

  // ─── Member Services — Reimbursements ────────────────────────────────────
  listReimbursements: (params?: { submittedBy?: string; status?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string>).toString() : ''
    return api.get<{ items: ReimbursementApi[] }>(`/member-services/reimbursements${qs}`)
  },
  listMyReimbursements: () => api.get<{ items: ReimbursementApi[] }>('/member-services/reimbursements/my'),
  getReimbursementAccess: () => api.get<{ canReview: boolean }>('/member-services/reimbursements/access'),
  listReimbursementReviewQueue: () => api.get<{ items: ReimbursementApi[] }>('/member-services/reimbursements/review-queue'),
  createReimbursement: (payload: { category: ReimbursementCategory; description: string; amount: number; currency?: string; asDraft?: boolean; receiptFile?: File }) => {
    const form = new FormData()
    form.append('category', payload.category)
    form.append('description', payload.description)
    form.append('amount', String(payload.amount))
    if (payload.currency) form.append('currency', payload.currency)
    if (payload.asDraft) form.append('asDraft', 'true')
    if (payload.receiptFile) form.append('receipt', payload.receiptFile)
    return api.postForm<ReimbursementApi>('/member-services/reimbursements', form)
  },
  submitReimbursement: (id: string) => api.patch<ReimbursementApi>(`/member-services/reimbursements/${id}/submit`, {}),
  reviewReimbursement: (id: string, payload: { status: ReimbursementStatus; reviewerNotes?: string }) =>
    api.patch<ReimbursementApi>(`/member-services/reimbursements/${id}/review`, payload),
  deleteReimbursement: (id: string) => api.delete<{ success: boolean }>(`/member-services/reimbursements/${id}`),

  // ─── Member Services — Special Events ────────────────────────────────────
  listSpecialEvents: (range?: DateRangeQuery) =>
    api.get<{ items: SpecialEventApi[] }>(withDateRangeQuery('/member-services/events', range)),
  getSpecialEvent: (id: string) => api.get<SpecialEventApi>(`/member-services/events/${id}`),
  createSpecialEvent: (payload: Omit<SpecialEventApi, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) =>
    api.post<SpecialEventApi>('/member-services/events', payload),
  updateSpecialEvent: (id: string, payload: Partial<Omit<SpecialEventApi, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>) =>
    api.patch<SpecialEventApi>(`/member-services/events/${id}`, payload),
  deleteSpecialEvent: (id: string) => api.delete<{ success: boolean }>(`/member-services/events/${id}`),
  listEventRegistrations: (eventId: string) =>
    api.get<{ items: EventRegistrationApi[] }>(`/member-services/events/${eventId}/registrations`),
  publicGetEventRegistrationInfo: (eventId: string) =>
    api.get<SpecialEventApi>(`/public/events/${eventId}/registration-info`),
  publicRegisterForEvent: (eventId: string, payload: { formData: Record<string, unknown> }) =>
    api.post<EventRegistrationApi>(`/public/events/${eventId}/register`, payload),
  publicGetEventsForSreni: (sreniId: string) =>
    api.get<{ items: SpecialEventApi[] }>(`/public/events/sreni/${sreniId}`),

  // ─── Member Services — Notifications ─────────────────────────────────────
  listNotifications: (activeOnly?: boolean) =>
    api.get<{ items: AppNotificationApi[] }>(`/member-services/notifications${activeOnly ? '?activeOnly=true' : ''}`),
  createNotification: (payload: { title: string; message: string; validFrom?: string; validTo: string; target?: NotificationTarget }) =>
    api.post<AppNotificationApi>('/member-services/notifications', payload),
  updateNotification: (id: string, payload: Partial<{ title: string; message: string; validFrom: string; validTo: string; target: NotificationTarget; isActive: boolean }>) =>
    api.patch<AppNotificationApi>(`/member-services/notifications/${id}`, payload),
  deleteNotification: (id: string) => api.delete<{ success: boolean }>(`/member-services/notifications/${id}`),
  publicApplyForJob: (jobId: string, payload: { name: string; phone: string; email?: string; coverLetter?: string; resumeFile?: File }) => {
    const form = new FormData()
    form.append('name', payload.name)
    form.append('phone', payload.phone)
    if (payload.email) form.append('email', payload.email)
    if (payload.coverLetter) form.append('coverLetter', payload.coverLetter)
    if (payload.resumeFile) form.append('resume', payload.resumeFile)
    return api.postForm<JobApplicationApi>(`/public/jobs/${jobId}/apply`, form)
  },

  // ─── Location Report Metrics (shared across all sthans, in Report Config) ──
  listLocationReportMetrics: () =>
    api.get<ReportMetricDefinitionApi[]>('/settings/location-report-metrics'),
  createLocationReportMetric: (payload: { name: string; inputType: 'number' | 'text'; isRequired: boolean; sortOrder: number; description?: string; unit?: string }) =>
    api.post<ReportMetricDefinitionApi>('/settings/location-report-metrics', payload),
  updateLocationReportMetric: (metricId: string, payload: { name?: string; description?: string; unit?: string; inputType?: 'number' | 'text'; isRequired?: boolean; sortOrder?: number }) =>
    api.patch<ReportMetricDefinitionApi>(`/settings/location-report-metrics/${encodeURIComponent(metricId)}`, payload),

  // ─── Sthan — Reports ─────────────────────────────────────────────────────
  listSthanReports: (locationId: string) =>
    api.get<SthanReportApi[]>(`/org/locations/${encodeURIComponent(locationId)}/sthan-reports`),
  upsertSthanReport: (locationId: string, payload: { periodYear: number; periodMonth: number; entries: Record<string, string>; notes?: string }) =>
    api.post<SthanReportApi>(`/org/locations/${encodeURIComponent(locationId)}/sthan-reports`, payload),

  // ─── Sthan — Expenses ────────────────────────────────────────────────────
  listSthanExpenses: (locationId: string, status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : ''
    return api.get<SthanExpenseApi[]>(`/org/locations/${encodeURIComponent(locationId)}/expenses${qs}`)
  },
  createSthanExpense: (locationId: string, payload: { category: SthanExpenseCategory; description: string; amount: number; currency?: string; asDraft?: boolean }) =>
    api.post<SthanExpenseApi>(`/org/locations/${encodeURIComponent(locationId)}/expenses`, payload),
  reviewSthanExpense: (locationId: string, expenseId: string, payload: { status: 'approved' | 'rejected' | 'pending_review'; reviewerNotes?: string }) =>
    api.patch<SthanExpenseApi>(`/org/locations/${encodeURIComponent(locationId)}/expenses/${encodeURIComponent(expenseId)}/review`, payload),
  deleteSthanExpense: (locationId: string, expenseId: string) =>
    api.delete<void>(`/org/locations/${encodeURIComponent(locationId)}/expenses/${encodeURIComponent(expenseId)}`),

  // ─── Sthan — Contacts ────────────────────────────────────────────────────
  listSthanContacts: (locationId: string, page = 1, pageSize = 10, options?: { search?: string; filters?: string } & ListSortParams) => {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (options?.search?.trim()) qs.set('search', options.search.trim())
    if (options?.filters) qs.set('filters', options.filters)
    appendSortQuery(qs, options)
    return api.get<{ items: SthanContactRowApi[]; total: number; totalPages: number }>(
      `/org/locations/${encodeURIComponent(locationId)}/contacts?${qs}`,
    )
  },
  clearSthanContacts: (locationId: string) =>
    api.delete<{ deleted: number }>(`/org/locations/${encodeURIComponent(locationId)}/contacts`),

  updateSthanContact: (locationId: string, contactId: string, data: Record<string, string | number | boolean | null>) =>
    api.patch<SthanContactRowApi>(
      `/org/locations/${encodeURIComponent(locationId)}/contacts/${encodeURIComponent(contactId)}`,
      { data },
    ),

  // ─── Sthan — Calendar ──────────────────────────────────────────────────────
  listSthanCalendarEvents: (locationId: string) =>
    api.get<SthanCalendarEventApi[]>(`/org/locations/${encodeURIComponent(locationId)}/calendar-events`),
  createSthanCalendarEvent: (locationId: string, payload: {
    title: string
    date: string
    startTime: string
    endTime: string
    color?: string
    notes?: string
  }) => api.post<SthanCalendarEventApi>(`/org/locations/${encodeURIComponent(locationId)}/calendar-events`, payload),
  updateSthanCalendarEvent: (locationId: string, eventId: string, payload: {
    title?: string
    date?: string
    startTime?: string
    endTime?: string
    color?: string
    notes?: string
  }) => api.patch<SthanCalendarEventApi>(
    `/org/locations/${encodeURIComponent(locationId)}/calendar-events/${encodeURIComponent(eventId)}`,
    payload,
  ),
  deleteSthanCalendarEvent: (locationId: string, eventId: string) =>
    api.delete<{ success: boolean; deletedBy: string }>(
      `/org/locations/${encodeURIComponent(locationId)}/calendar-events/${encodeURIComponent(eventId)}`,
    ),

  // ─── Table Layouts ────────────────────────────────────────────────────────
  listTableLayouts: (tableKey: string) =>
    api.get<TableLayoutsResponseApi>(`/settings/table-layouts?tableKey=${encodeURIComponent(tableKey)}`),

  createTableLayout: (payload: { tableKey: string; name: string; columns: TableLayoutColumnConfig[]; setActive?: boolean }) =>
    api.post<TableLayoutApi>('/settings/table-layouts', payload),

  updateTableLayout: (id: string, payload: { name?: string; columns?: TableLayoutColumnConfig[] }) =>
    api.patch<TableLayoutApi>(`/settings/table-layouts/${encodeURIComponent(id)}`, payload),

  deleteTableLayout: (id: string) =>
    api.delete<{ success: boolean }>(`/settings/table-layouts/${encodeURIComponent(id)}`),

  setActiveTableLayout: (tableKey: string, layoutId: string | null) =>
    api.put<void>(`/settings/table-layouts/active?tableKey=${encodeURIComponent(tableKey)}`, { layoutId }),
}

export function toUiRole(role: AdminRoleAssignment['role']): 'Super Admin' | 'Zone Admin' | 'Sreny Admin' {
  const normalized = String(role ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  if (normalized === 'SUPERADMIN') return 'Super Admin'
  if (normalized === 'ZONEADMIN') return 'Zone Admin'
  return 'Sreny Admin'
}

export function toApiRole(role: 'Super Admin' | 'Zone Admin' | 'Sreny Admin'): AdminRoleAssignment['role'] {
  if (role === 'Super Admin') return 'SUPER_ADMIN'
  if (role === 'Zone Admin') return 'ZONE_ADMIN'
  return 'SRENY_ADMIN'
}

