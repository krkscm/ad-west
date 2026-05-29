export type ProgramStatus = 'draft' | 'published' | 'archived';

export interface ZoneRecord {
  id: string;
  name: string;
  code?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocationRecord {
  id: string;
  code?: string;
  name: string;
  level: 'zone' | 'sthan';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SrenyRecord {
  id: string;
  name: string;
  zoneId?: string;
  isServiceSreny: boolean;
  code?: string;
  description?: string;
  active: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SthanRecord {
  id: string;
  name: string;
  srenyId: string;
  phaseStatus: 'phase1_partial';
  fullIndependenceAvailable: false;
  pendingFeatureMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface GovernanceStructureRecord {
  id: string;
  srenyId: string;
  year: number;
  positions: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GovernanceAssignmentRecord {
  id: string;
  structureId: string;
  contactId: string;
  positionName: string;
  startDate: string;
  endDate?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DuplicateRecord {
  id: string;
  leftContactId: string;
  rightContactId: string;
  decision: 'pending' | 'merged' | 'skipped';
}

export interface ImportRecord {
  id: string;
  fileName: string;
  fileType: 'csv' | 'xlsx';
  status: 'processing' | 'ready_for_review' | 'finalized' | 'failed';
  acceptedRows: number;
  duplicateRows: number;
  processedRows: number;
  validationErrorRows: number;
  failedReason?: string;
  mappingProfileId?: string;
  hasHeader: boolean;
  createdAt: string;
  finalizedAt?: string;
  duplicates: DuplicateRecord[];
}

export interface ImportReconciliationRecord {
  importId: string;
  status: ImportRecord['status'];
  totalDuplicates: number;
  pendingDuplicates: number;
  mergedDuplicates: number;
  skippedDuplicates: number;
  canFinalize: boolean;
  issues: string[];
}

export interface CoreBusinessPersistenceReadinessRecord {
  coreBusinessStore: 'in-memory' | 'db';
  authStoreMode: 'db' | 'in-memory';
  isProductionRuntime: boolean;
  readyForUat: boolean;
  blockers: string[];
  nextSteps: string[];
}

export interface ProgramSessionRecord {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
}

export interface RegistrationRecord {
  id: string;
  programId: string;
  contactId: string;
  createdAt: string;
}

export interface ProgramRecord {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  capacity: number;
  status: ProgramStatus;
  sessions: ProgramSessionRecord[];
  registrations: RegistrationRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  contactId: string;
  state: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  recordedAt: string;
  recordedBy: string;
}

export interface TicketCommentRecord {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface TicketActivityRecord {
  id: string;
  ticketId: string;
  action: 'created' | 'assigned' | 'status_updated' | 'comment_added';
  actorId: string;
  details?: Record<string, string>;
  createdAt: string;
}

export interface TicketRecord {
  id: string;
  contactId: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  assigneeId?: string;
  comments: TicketCommentRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface EditRequestRecord {
  id: string;
  memberId: string;
  contactId?: string;
  memberName?: string;
  field: string;
  currentValue: string;
  requestedValue: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface DocumentFolderRecord {
  id: string;
  srenyId: string;
  name: string;
  parentFolderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  srenyId: string;
  folderId?: string;
  fileName: string;
  fileType: string;
  category?: string;
  description?: string;
  version: number;
  accessLevel: 'sreny' | 'zone' | 'private';
  linkedEntityType?: string;
  linkedEntityId?: string;
  uploadedBy: string;
  sourceDocumentId?: string;
  filePath?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportTemplateRecord {
  id: string;
  srenyId: string;
  name: string;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'file' | 'dropdown';
    required: boolean;
    options?: string[];
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ReportSubmissionRecord {
  id: string;
  templateId: string;
  submittedBy: string;
  answers: Record<string, string>;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalWorkflowRecord {
  id: string;
  name: string;
  targetType: 'document_submission' | 'report_submission';
  mode: 'single' | 'sequential' | 'parallel_any';
  steps: string[];
  escalationHours?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalAuditEntryRecord {
  id: string;
  action:
    | 'submitted'
    | 'step_advanced'
    | 'approved'
    | 'rejected'
    | 'need_more_information'
    | 'resubmitted'
    | 'escalated';
  actorId: string;
  stepIndex: number;
  note?: string;
  createdAt: string;
}

export interface ApprovalNotificationRecord {
  id: string;
  itemId: string;
  workflowId: string;
  channel: 'in_app';
  event:
    | 'submitted'
    | 'step_advanced'
    | 'approved'
    | 'rejected'
    | 'need_more_information'
    | 'resubmitted'
    | 'escalated';
  recipientUserId?: string;
  recipientStep?: string;
  message: string;
  createdAt: string;
}

export interface ApprovalItemRecord {
  id: string;
  workflowId: string;
  targetId: string;
  targetType?: 'report_submission' | 'calendar_event';
  summary?: string;
  status: 'pending' | 'approved' | 'rejected' | 'need_more_information';
  currentStepIndex: number;
  submittedBy: string;
  dueAt?: string;
  escalationCount: number;
  lastEscalatedAt?: string;
  auditTrail: ApprovalAuditEntryRecord[];
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord {
  id: string;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  roleId?: string;
  sthanId?: string;
  permissionSetId?: string;
  adminManagement?: string;
  passwordHash?: string;
  isSuperAdmin?: boolean;
  mustResetPassword?: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  reportingToRoleIds?: string[];
}

export interface ReportMetricDefinitionRecord {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  inputType: 'number' | 'text';
  isRequired: boolean;
  sortOrder: number;
  target?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SreniMonthlyReportRecord {
  id: string;
  sreniId: string;
  year: number;
  month: number;
  status: 'draft' | 'submitted';
  submittedBy?: string;
  submittedAt?: string;
  notes?: string;
  entries: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface SreniReportParameterRecord {
  id: string;
  sreniId: string;
  submissionType: 'monthly' | 'half_yearly' | 'yearly';
  name: string;
  description?: string;
  unit?: string;
  inputType: 'number' | 'text';
  isRequired: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SreniReportRecord {
  id: string;
  sreniId: string;
  submissionType: 'monthly' | 'half_yearly' | 'yearly';
  periodYear: number;
  periodValue: number;
  entries: Record<string, string>;
  notes?: string;
  submittedBy?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionRecord {
  id: string;
  locationId: string;
  sreniId: string;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface PermissionSetRecord {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  permissionIds: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface SreniContactRecord {
  id: string;
  sreniId: string;
  rowIndex: number;
  data: Record<string, string | number | boolean | null>;
  sourceFile?: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventRecord {
  id: string;
  sreniId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  color: string;
  notes?: string;
  scope: 'zone' | 'sthan';
  sthanIds: string[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface AttendanceMetricRecord {
  id: string;
  sreniId: string;
  name: string;
  description?: string;
  keys: string[];
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface EventAttendanceCaptureRecord {
  id: string;
  sreniId: string;
  eventId: string;
  metricId: string;
  values: Record<string, string | number | boolean | null>;
  capturedBy: string;
  capturedAt: string;
  updatedAt: string;
}

export interface ResponsibilityChartNodeRecord {
  userId: string;
  name: string;
  roleId?: string;
  reportingToRoleIds: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResponsibilityChartEdgeRecord {
  fromUserId: string;
  toUserId: string;
  viaRoleId: string;
}

export interface ResponsibilityChartRecord {
  year: number;
  availableYears: number[];
  nodes: ResponsibilityChartNodeRecord[];
  edges: ResponsibilityChartEdgeRecord[];
}
