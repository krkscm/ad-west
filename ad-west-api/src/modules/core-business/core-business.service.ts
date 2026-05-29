import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import { CryptoService } from '@modules/user-management/services/crypto.service';
import { CORE_BUSINESS_STORE } from './constants';
import {
  AddMembershipDto,
  BulkAttendanceUploadDto,
  CreateContactDto,
  CreateDocumentDto,
  CreateDocumentFolderDto,
  CreateApprovalWorkflowDto,
  CreateProgramDto,
  CreateReportSubmissionDto,
  CreateReportTemplateDto,
  CreateRegistrationDto,
  CreateGovernanceAssignmentDto,
  CreateGovernanceStructureDto,
  CreateSessionDto,
  CreateSrenyDto,
  CreatePermissionDto,
  CreatePermissionSetDto,
  CreateSreniDefinitionDto,
  CreateCalendarEventDto,
  CreateAttendanceMetricDto,
  CreateLocationDto,
  CreateSthanDto,
  CreateTicketCommentDto,
  CreateTicketDto,
  CreateZoneDto,
  RecordAttendanceDto,
  ReviewApprovalItemDto,
  ResubmitApprovalItemDto,
  ReviewReportSubmissionDto,
  StartImportDto,
  SubmitApprovalItemDto,
  UpsertContactSrenyMetadataDto,
  UpdateContactDto,
  UpdateProgramDto,
  UpdateGovernanceAssignmentDto,
  UpdateGovernanceStructureDto,
  UpdateSessionDto,
  UpdatePermissionDto,
  UpdatePermissionSetDto,
  SetPermissionSetItemsDto,
  UpdateSrenyDto,
  UpdateSreniDefinitionDto,
  UpdateCalendarEventDto,
  UpdateAttendanceMetricDto,
  UpsertEventAttendanceCaptureDto,
  UpdateLocationDto,
  CreateUserDto,
  UpdateUserDto,
  UpdateSthanDto,
  UpdateTicketAssigneeDto,
  UpdateTicketStatusDto,
  UpdateZoneDto,
  CreateReportMetricDefinitionDto,
  UpdateReportMetricDefinitionDto,
  SubmitSreniMonthlyReportDto,
  CreateSreniReportParameterDto,
  UpdateSreniReportParameterDto,
  SubmitSreniReportDto,
} from './dto/core-business.dto';
import { ApprovalRuntimeService } from './services/approval-runtime.service';
import { AttendanceRuntimeService } from './services/attendance-runtime.service';
import { CalendarEventsRuntimeService } from './services/calendar-events-runtime.service';
import { DocumentReportRuntimeService } from './services/document-report-runtime.service';
import { SreniReportsRuntimeService } from './services/sreni-reports-runtime.service';
import { CoreBusinessStore } from './store/core-business-store.interface';
import { DataSource } from 'typeorm';

export type ProgramStatus = 'draft' | 'published' | 'archived';

export type TicketStatus = 'new' | 'in_progress' | 'resolved' | 'closed';

const TICKET_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  new: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['closed'],
  closed: [],
};

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

export interface MembershipRecord {
  id: string;
  srenyId: string;
  createdAt: string;
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

export interface ContactRecord {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  zoneId: string;
  srenyIds: string[];
  address?: string;
  customMetadataBySreny: Record<string, Record<string, string>>;
  status: 'active' | 'deleted';
  memberships: MembershipRecord[];
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

interface CoreBusinessRuntimeSnapshot {
  version: 1;
  locations: LocationRecord[];
  zones: ZoneRecord[];
  srenies: SrenyRecord[];
  sthans: SthanRecord[];
  contacts: ContactRecord[];
  governanceStructures: GovernanceStructureRecord[];
  governanceAssignments: GovernanceAssignmentRecord[];
  imports: ImportRecord[];
  programs: ProgramRecord[];
  attendance: AttendanceRecord[];
  tickets: TicketRecord[];
  ticketActivity: TicketActivityRecord[];
  editRequests: EditRequestRecord[];
  documentFolders: DocumentFolderRecord[];
  documents: DocumentRecord[];
  reportTemplates: ReportTemplateRecord[];
  reportSubmissions: ReportSubmissionRecord[];
  approvalWorkflows: ApprovalWorkflowRecord[];
  approvalItems: ApprovalItemRecord[];
  approvalNotifications: ApprovalNotificationRecord[];
  permissions: PermissionRecord[];
  permissionSets: PermissionSetRecord[];
  users: UserRecord[];
  calendarEvents: CalendarEventRecord[];
  attendanceMetrics: AttendanceMetricRecord[];
  eventAttendanceCaptures: EventAttendanceCaptureRecord[];
}

const createFallbackCoreBusinessStore = (): CoreBusinessStore => ({
  getMode: () => 'in-memory',
  loadState: async () => null,
  saveState: async () => undefined,
});

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
  status: TicketStatus;
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
  /** All columns from the source Excel sheet, stored as key/value pairs */
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

type SreniContactCellValue = string | number | boolean | null;

const MASTER_SRENI_CONTACT_FIELDS: Array<{
  key: string;
  header: string;
  occurrence?: number;
}> = [
  { key: 'name', header: 'name' },
  { key: 'personalNumber', header: 'personal number' },
  { key: 'updatesAsPerAug2024', header: 'updates as per aug2024' },
  { key: 'ss', header: 'ss' },
  { key: 'companyMobileNo2', header: 'company mobile no 2' },
  { key: 'bhag', header: 'bhag' },
  { key: 'samithi', header: 'samithi' },
  { key: 'samithiStatus', header: 'samithi status' },
  { key: 'balabarathi', header: 'balabarathi' },
  { key: 'bbStatus', header: 'bb status' },
  { key: 'yoga', header: 'yoga', occurrence: 1 },
  { key: 'familyOrBachelor', header: 'family / bachelor' },
  { key: 'family', header: 'family' },
  { key: 'bachelor', header: 'bachelor' },
  { key: 'addressInUae', header: 'address in uae' },
  { key: 'company', header: 'company' },
  { key: 'profession', header: 'profession' },
  { key: 'wifeName', header: 'wifename' },
  { key: 'mobileNo4', header: 'mobileno4' },
  { key: 'landLine', header: 'land line' },
  { key: 'zoneOrLandmark', header: 'zone / land mark' },
  { key: 'district', header: 'district' },
  { key: 'company8', header: 'company8' },
  { key: 'profession7', header: 'profession7' },
  { key: 'yogaSecondary', header: 'yoga', occurrence: 2 },
];

const normalizeContactTemplateHeader = (value: unknown): string =>
  String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const normalizeSreniContactCell = (value: unknown): SreniContactCellValue => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean' || typeof value === 'number') return value;
  const asString = String(value).trim();
  return asString.length > 0 ? asString : null;
};

@Injectable()
export class CoreBusinessService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CoreBusinessService.name);
  private readonly store: CoreBusinessStore;
  private persistenceFlushInterval: ReturnType<typeof setInterval> | null = null;

  private readonly locations = new Map<string, LocationRecord>();
  private readonly zones = new Map<string, ZoneRecord>();
  private readonly srenies = new Map<string, SrenyRecord>();
  private readonly sthans = new Map<string, SthanRecord>();
  private readonly contacts = new Map<string, ContactRecord>();
  private readonly governanceStructures = new Map<string, GovernanceStructureRecord>();
  private readonly governanceAssignments = new Map<string, GovernanceAssignmentRecord>();
  private readonly imports = new Map<string, ImportRecord>();
  private readonly programs = new Map<string, ProgramRecord>();
  private readonly attendance = new Map<string, AttendanceRecord>();
  private readonly tickets = new Map<string, TicketRecord>();
  private readonly ticketActivity = new Map<string, TicketActivityRecord>();
  private readonly editRequests = new Map<string, EditRequestRecord>();
  private readonly documentFolders = new Map<string, DocumentFolderRecord>();
  private readonly documents = new Map<string, DocumentRecord>();
  private readonly reportTemplates = new Map<string, ReportTemplateRecord>();
  private readonly reportSubmissions = new Map<string, ReportSubmissionRecord>();
  /** Keyed by `${sreniId}:${rowId}` for flat iteration; grouped by sreniId for queries */
  private readonly sreniContacts = new Map<string, SreniContactRecord>();
  private readonly approvalWorkflows = new Map<string, ApprovalWorkflowRecord>();
  private readonly approvalItems = new Map<string, ApprovalItemRecord>();
  private readonly approvalNotifications = new Map<string, ApprovalNotificationRecord>();
  private approvalRuntimeService: ApprovalRuntimeService | null = null;
  private attendanceRuntimeService: AttendanceRuntimeService | null = null;
  private calendarEventsRuntimeService: CalendarEventsRuntimeService | null = null;
  private documentReportRuntimeService: DocumentReportRuntimeService | null = null;
  private sreniReportsRuntimeService: SreniReportsRuntimeService | null = null;
  private readonly permissions = new Map<string, PermissionRecord>();
  private readonly permissionSets = new Map<string, PermissionSetRecord>();
  private readonly users = new Map<string, UserRecord>();
  private readonly reportMetricDefinitions = new Map<string, ReportMetricDefinitionRecord>();
  private readonly sreniMonthlyReports = new Map<string, SreniMonthlyReportRecord>();
  private readonly sreniReportParameters = new Map<string, SreniReportParameterRecord>();
  private readonly sreniReports = new Map<string, SreniReportRecord>();
  private readonly calendarEvents = new Map<string, CalendarEventRecord>();
  private readonly attendanceMetrics = new Map<string, AttendanceMetricRecord>();
  private readonly eventAttendanceCaptures = new Map<string, EventAttendanceCaptureRecord>();
  private readonly runtimeMode: 'in-memory' | 'db';
  private importWorkflowLock: Promise<void> = Promise.resolve();
  private programPersistenceLock: Promise<void> = Promise.resolve();

  constructor(
    private readonly cryptoService: CryptoService,
    @Optional() @Inject(CORE_BUSINESS_STORE) store?: CoreBusinessStore,
    @Optional() @Inject(DataSource) private readonly dataSource?: DataSource,
  ) {
    this.store = store ?? createFallbackCoreBusinessStore();
    this.runtimeMode = this.store.getMode();

    if (this.runtimeMode === 'db') {
      return;
    }

    const now = new Date().toISOString();
    const zoneId = this.newId('zone');
    const srenyId = this.newId('sreny');
    const sthanId = this.newId('sthan');

    this.zones.set(zoneId, {
      id: zoneId,
      name: 'West Zone',
      code: 'WZ',
      createdAt: now,
      updatedAt: now,
    });

    this.srenies.set(srenyId, {
      id: srenyId,
      name: 'Default Service Sreny',
      zoneId,
      isServiceSreny: true,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    this.sthans.set(sthanId, {
      id: sthanId,
      name: 'Sunnyvale Sthan',
      srenyId,
      phaseStatus: 'phase1_partial',
      fullIndependenceAvailable: false,
      pendingFeatureMessage:
        'Sthan independent governance is planned for a future phase and is not available in the current release.',
      createdAt: now,
      updatedAt: now,
    });

    const contactId = this.newId('ct');
    this.contacts.set(contactId, {
      id: contactId,
      firstName: 'Demo',
      lastName: 'Member',
      email: 'member@adwest.local',
      phone: '971500000001',
      zoneId,
      srenyIds: [srenyId],
      address: 'ADWest Main Street',
      customMetadataBySreny: {
        [srenyId]: {
          membershipType: 'core',
        },
      },
      status: 'active',
      memberships: [
        {
          id: this.newId('ms'),
          srenyId,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    const structureId = this.newId('govs');
    this.governanceStructures.set(structureId, {
      id: structureId,
      srenyId,
      year: new Date().getUTCFullYear(),
      positions: ['President', 'Secretary', 'Treasurer'],
      archived: false,
      createdAt: now,
      updatedAt: now,
    });

    const assignmentId = this.newId('gova');
    this.governanceAssignments.set(assignmentId, {
      id: assignmentId,
      structureId,
      contactId,
      positionName: 'President',
      startDate: `${new Date().getUTCFullYear()}-01-01`,
      endDate: `${new Date().getUTCFullYear()}-12-31`,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });

    const workflowId = this.newId('apw');
    this.approvalWorkflows.set(workflowId, {
      id: workflowId,
      name: 'Default Report Submission Workflow',
      targetType: 'report_submission',
      mode: 'sequential',
      steps: ['Sreny Admin Review', 'Zone Admin Review'],
      escalationHours: 48,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    const templateId = this.newId('rpt');
    this.reportTemplates.set(templateId, {
      id: templateId,
      srenyId,
      name: 'Monthly Activity Report',
      fields: [
        { key: 'summary', label: 'Summary', type: 'text', required: true },
        { key: 'memberCount', label: 'Member Count', type: 'number', required: true },
      ],
      createdAt: now,
      updatedAt: now,
    });

  }

  async onModuleInit(): Promise<void> {
    if (this.runtimeMode !== 'db') {
      return;
    }

    if (this.dataSource) {
      try {
        await this.dataSource.query(
          `ALTER TABLE adwest.users ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT FALSE`,
        );
        await this.dataSource.query(
          `ALTER TABLE adwest.auth_member_users ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT FALSE`,
        );
        await this.dataSource.query(
          `ALTER TABLE adwest.users ADD COLUMN IF NOT EXISTS permission_set_id VARCHAR(64)`,
        );
        await this.dataSource.query(
          `ALTER TABLE adwest.users ADD COLUMN IF NOT EXISTS admin_management VARCHAR(60)`,
        );
        await this.dataSource.query(
          `ALTER TABLE adwest.users ADD COLUMN IF NOT EXISTS reporting_to_role_ids TEXT[] NOT NULL DEFAULT '{}'`,
        );
        await this.dataSource.query(
          `ALTER TABLE adwest.approval_items ADD COLUMN IF NOT EXISTS target_type VARCHAR(64)`,
        );
        await this.dataSource.query(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1
              FROM pg_constraint
              WHERE conname = 'chk_approval_items_status'
                AND conrelid = 'adwest.approval_items'::regclass
            ) THEN
              ALTER TABLE adwest.approval_items DROP CONSTRAINT chk_approval_items_status;
            END IF;
            ALTER TABLE adwest.approval_items
              ADD CONSTRAINT chk_approval_items_status
              CHECK (status IN ('pending', 'approved', 'rejected', 'need_more_information'));
          END $$;
        `);
        await this.dataSource.query(`
          CREATE TABLE IF NOT EXISTS adwest.report_metric_definitions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(200) NOT NULL,
            description TEXT,
            unit VARCHAR(50),
            input_type VARCHAR(20) NOT NULL DEFAULT 'number',
            is_required BOOLEAN NOT NULL DEFAULT false,
            sort_order INTEGER NOT NULL DEFAULT 0,
            active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )
        `);
        await this.dataSource.query(`
          CREATE TABLE IF NOT EXISTS adwest.sreni_monthly_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sreni_id VARCHAR(100) NOT NULL,
            report_year INTEGER NOT NULL,
            report_month INTEGER NOT NULL CHECK (report_month BETWEEN 1 AND 12),
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            submitted_by VARCHAR(200),
            submitted_at TIMESTAMPTZ,
            notes TEXT,
            entries JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE(sreni_id, report_year, report_month)
          )
        `);
        await this.dataSource.query(`
          CREATE TABLE IF NOT EXISTS adwest.sreni_report_parameters (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sreni_id VARCHAR(100) NOT NULL,
            submission_type VARCHAR(20) NOT NULL,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            unit VARCHAR(50),
            input_type VARCHAR(20) NOT NULL DEFAULT 'number',
            is_required BOOLEAN NOT NULL DEFAULT false,
            sort_order INTEGER NOT NULL DEFAULT 0,
            active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )
        `);
        await this.dataSource.query(`
          CREATE TABLE IF NOT EXISTS adwest.sreni_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sreni_id VARCHAR(100) NOT NULL,
            submission_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
            period_year INTEGER NOT NULL,
            period_value INTEGER NOT NULL,
            entries JSONB NOT NULL DEFAULT '{}',
            notes TEXT,
            submitted_by VARCHAR(200),
            submitted_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE(sreni_id, submission_type, period_year, period_value)
          )
        `);
        // Add Reports menu for any existing srenies that don't yet have one
        await this.dataSource.query(`
          INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
          SELECT gen_random_uuid()::text,
                 concat('sreni-', s.id, '-reports'),
                 'Reports',
                 concat('sreni-', s.id),
                 '📊',
                 50,
                 true,
                 now(),
                 now()
          FROM adwest.srenies s
          WHERE NOT EXISTS (
            SELECT 1 FROM adwest.menu_items m WHERE m.key = concat('sreni-', s.id, '-reports')
          )
        `);
        // Ensure settings-level Report Config menu item exists
        await this.dataSource.query(`
          INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
          VALUES ('menu_settings_report_config', 'settings-report-config', 'Report Config', 'settings', '📊', 85, true, now(), now())
          ON CONFLICT (id) DO NOTHING
        `);
      } catch (e) {
        this.logger.warn(`Schema migration warning: ${(e as Error).message}`);
      }
    }

    try {
      const snapshotJson = await this.store.loadState();
      if (snapshotJson) {
        this.hydrateRuntimeSnapshot(snapshotJson);
      } else if (this.dataSource) {
        await this.hydrateRuntimeStateFromDatabase();
        await this.flushStateToStore();
      } else {
        await this.flushStateToStore();
      }
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Core Business runtime snapshot from store: ${(error as Error).message}`,
      );
    }

    this.persistenceFlushInterval = setInterval(() => {
      void this.flushStateToStore();
    }, 1000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.persistenceFlushInterval) {
      clearInterval(this.persistenceFlushInterval);
      this.persistenceFlushInterval = null;
    }

    if (this.runtimeMode === 'db') {
      await this.flushStateToStore();
    }
  }

  listZones(): ZoneRecord[] {
    return Array.from(this.zones.values());
  }

  async createZone(dto: CreateZoneDto): Promise<ZoneRecord> {
    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const now = new Date().toISOString();
      const zone: ZoneRecord = {
        id: this.newId('zone'),
        name: dto.name,
        code: dto.code,
        createdAt: now,
        updatedAt: now,
      };
      this.zones.set(zone.id, zone);
      return zone;
    }

    const rows = (await this.dataSource.query(
      `
        INSERT INTO adwest.zones (name, code)
        VALUES ($1, $2)
        RETURNING id, code, name, created_at, updated_at
      `,
      [dto.name, dto.code ?? null],
    )) as Array<{ id: string; code?: string; name: string; created_at: string | Date; updated_at: string | Date }>;
    const row = rows[0];
    const zone: ZoneRecord = {
      id: row.id,
      name: row.name,
      code: row.code ?? undefined,
      createdAt: this.toIsoTimestamp(row.created_at),
      updatedAt: this.toIsoTimestamp(row.updated_at),
    };
    this.zones.set(zone.id, zone);
    return zone;
  }

  async updateZone(zoneId: string, dto: UpdateZoneDto): Promise<ZoneRecord> {
    const zone = this.findZone(zoneId);

    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const updated: ZoneRecord = {
        ...zone,
        name: dto.name ?? zone.name,
        code: dto.code !== undefined ? dto.code : zone.code,
        updatedAt: new Date().toISOString(),
      };
      this.zones.set(zoneId, updated);
      return updated;
    }

    const nextName = dto.name ?? zone.name;
    const nextCode = dto.code !== undefined ? dto.code : zone.code ?? null;
    const rows = (await this.dataSource.query(
      `UPDATE adwest.zones
       SET name = $2, code = $3, updated_at = now()
       WHERE id = $1
       RETURNING id, name, code, created_at, updated_at`,
      [zoneId, nextName, nextCode],
    )) as unknown as [Array<{ id: string; name: string; code: string | null; created_at: string | Date; updated_at: string | Date }>, number];
    const row = rows[0][0];
    const updated: ZoneRecord = {
      id: row.id,
      name: row.name,
      code: row.code ?? undefined,
      createdAt: this.toIsoTimestamp(row.created_at),
      updatedAt: this.toIsoTimestamp(row.updated_at),
    };
    this.zones.set(zoneId, updated);
    return updated;
  }

  async listLocationsFromDb(params: { page?: number; pageSize?: number; search?: string; level?: string }): Promise<{
    items: LocationRecord[]; total: number; page: number; pageSize: number; totalPages: number;
  }> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(1000, Math.max(1, params.pageSize ?? 20));
    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const q = (params.search ?? '').trim().toLowerCase();
      let all = Array.from(this.locations.values());
      if (params.level) all = all.filter((l) => l.level === params.level);
      if (q) all = all.filter((l) => l.name.toLowerCase().includes(q) || l.code?.toLowerCase().includes(q));
      all.sort((a, b) => a.name.localeCompare(b.name));
      const total = all.length;
      return { items: all.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
    }
    const searchParam = params.search?.trim() ? `%${params.search.trim()}%` : null;
    const levelParam = params.level ?? null;
    const [countRows, dataRows] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM adwest.locations WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1) AND ($2::text IS NULL OR level = $2)`,
        [searchParam, levelParam],
      ),
      this.dataSource.query(
        `SELECT id, code, name, level, active, created_at, updated_at FROM adwest.locations WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1) AND ($2::text IS NULL OR level = $2) ORDER BY name LIMIT $3 OFFSET $4`,
        [searchParam, levelParam, pageSize, (page - 1) * pageSize],
      ),
    ]);
    const total = (countRows as Array<{ total: number }>)[0].total;
    const items = (dataRows as Array<{ id: string; code: string | null; name: string; level: string; active: boolean; created_at: string | Date; updated_at: string | Date }>).map((r) => ({
      id: r.id, code: r.code ?? undefined, name: r.name, level: r.level as 'zone' | 'sthan', active: r.active,
      createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at),
    }));
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
  }

  async createLocation(dto: CreateLocationDto): Promise<LocationRecord> {
    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const now = new Date().toISOString();
      const record: LocationRecord = {
        id: this.newId('location'),
        code: dto.code,
        name: dto.name,
        level: dto.level,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      this.locations.set(record.id, record);
      return record;
    }

    const rows = (await this.dataSource.query(
      `INSERT INTO adwest.locations (code, name, level)
       VALUES ($1, $2, $3)
       RETURNING id, code, name, level, active, created_at, updated_at`,
      [dto.code ?? null, dto.name, dto.level],
    )) as Array<{ id: string; code: string | null; name: string; level: string; active: boolean; created_at: string | Date; updated_at: string | Date }>;
    const row = rows[0];
    const record: LocationRecord = {
      id: row.id,
      code: row.code ?? undefined,
      name: row.name,
      level: row.level as 'zone' | 'sthan',
      active: row.active,
      createdAt: this.toIsoTimestamp(row.created_at),
      updatedAt: this.toIsoTimestamp(row.updated_at),
    };
    this.locations.set(record.id, record);
    return record;
  }

  async updateLocation(locationId: string, dto: UpdateLocationDto): Promise<LocationRecord> {
    if (this.runtimeMode === 'db' && this.dataSource && !this.locations.has(locationId)) {
      const rows = await this.dataSource.query(
        'SELECT id, code, name, level, active, created_at, updated_at FROM adwest.locations WHERE id=$1',
        [locationId],
      ) as Array<{ id: string; code: string | null; name: string; level: string; active: boolean; created_at: string | Date; updated_at: string | Date }>;
      if (!rows.length) throw new NotFoundException('Location not found');
      const r = rows[0];
      this.locations.set(r.id, { id: r.id, code: r.code ?? undefined, name: r.name, level: r.level as 'zone' | 'sthan', active: r.active, createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at) });
    }
    const current = this.locations.get(locationId);
    if (!current) {
      throw new NotFoundException('Location not found');
    }

    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const updated: LocationRecord = {
        ...current,
        name: dto.name ?? current.name,
        code: dto.code !== undefined ? dto.code : current.code,
        active: dto.active !== undefined ? dto.active : current.active,
        level: dto.level ?? current.level,
        updatedAt: new Date().toISOString(),
      };
      this.locations.set(locationId, updated);
      return updated;
    }

    const nextName = dto.name ?? current.name;
    const nextCode = dto.code !== undefined ? dto.code : current.code ?? null;
    const nextActive = dto.active !== undefined ? dto.active : current.active;
    const nextLevel = dto.level ?? current.level;
    const rows = (await this.dataSource.query(
      `UPDATE adwest.locations
       SET name = $2, code = $3, active = $4, level = $5, updated_at = now()
       WHERE id = $1
       RETURNING id, code, name, level, active, created_at, updated_at`,
      [locationId, nextName, nextCode, nextActive, nextLevel],
    )) as unknown as [Array<{ id: string; code: string | null; name: string; level: string; active: boolean; created_at: string | Date; updated_at: string | Date }>, number];
    const row = rows[0][0];
    const updated: LocationRecord = {
      id: row.id,
      code: row.code ?? undefined,
      name: row.name,
      level: row.level as 'zone' | 'sthan',
      active: row.active,
      createdAt: this.toIsoTimestamp(row.created_at),
      updatedAt: this.toIsoTimestamp(row.updated_at),
    };
    this.locations.set(locationId, updated);
    return updated;
  }

  async deleteLocation(locationId: string): Promise<void> {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (this.runtimeMode === 'db' && this.dataSource && UUID_RE.test(locationId)) {
      const deleted = await this.dataSource.query('DELETE FROM adwest.locations WHERE id=$1 RETURNING id', [locationId]) as Array<{ id: string }>;
      if (!deleted.length) throw new NotFoundException('Location not found');
      this.locations.delete(locationId);
      return;
    }
    if (!this.locations.has(locationId)) throw new NotFoundException('Location not found');
    this.locations.delete(locationId);
  }

  listSrenies(zoneId?: string): SrenyRecord[] {
    const all = Array.from(this.srenies.values());
    return zoneId ? all.filter((item) => item.zoneId === zoneId) : all;
  }

  async createSreny(dto: CreateSrenyDto): Promise<SrenyRecord> {
    this.findZone(dto.zoneId);

    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const now = new Date().toISOString();

      if (dto.isServiceSreny) {
        this.clearServiceSrenyForZone(dto.zoneId);
      }

      const record: SrenyRecord = {
        id: this.newId('sreny'),
        name: dto.name,
        zoneId: dto.zoneId,
        isServiceSreny: dto.isServiceSreny ?? false,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      this.srenies.set(record.id, record);
      return record;
    }

    const rows = (await this.dataSource.query(
      `
        INSERT INTO adwest.srenies (zone_id, name, is_service_sreny)
        VALUES ($1, $2, $3)
        RETURNING id, zone_id, name, is_service_sreny, active, created_at, updated_at
      `,
      [dto.zoneId, dto.name, dto.isServiceSreny ?? false],
    )) as Array<{
      id: string;
      zone_id: string;
      name: string;
      is_service_sreny: boolean;
      active: boolean;
      created_at: string | Date;
      updated_at: string | Date;
    }>;
    const row = rows[0];
    const record: SrenyRecord = {
      id: row.id,
      name: row.name,
      zoneId: row.zone_id,
      isServiceSreny: row.is_service_sreny,
      active: row.active,
      createdAt: this.toIsoTimestamp(row.created_at),
      updatedAt: this.toIsoTimestamp(row.updated_at),
    };
    this.srenies.set(record.id, record);

    if (record.isServiceSreny) {
      await this.dataSource.query(
        `
          UPDATE adwest.srenies
          SET is_service_sreny = false,
              updated_at = now()
          WHERE zone_id = $1
            AND id <> $2
            AND is_service_sreny = true
        `,
        [dto.zoneId, record.id],
      );
    }

    return record;
  }

  async updateSreny(srenyId: string, dto: UpdateSrenyDto): Promise<SrenyRecord> {
    const current = this.findSreny(srenyId);
    const nextZoneId = dto.zoneId ?? current.zoneId;

    if (dto.zoneId) {
      this.findZone(dto.zoneId);
    }

    const nextServiceDesignation = dto.isServiceSreny ?? current.isServiceSreny;

    if (this.runtimeMode !== 'db' || !this.dataSource) {
      if (nextServiceDesignation && nextZoneId) {
        this.clearServiceSrenyForZone(nextZoneId, srenyId);
      }

      const updated: SrenyRecord = {
        ...current,
        ...dto,
        zoneId: nextZoneId,
        isServiceSreny: nextServiceDesignation,
        updatedAt: new Date().toISOString(),
      };
      this.srenies.set(srenyId, updated);
      return updated;
    }

    const nextName = dto.name ?? current.name;
    const rows = (await this.dataSource.query(
      `
        UPDATE adwest.srenies
        SET name = $2,
            zone_id = $3,
            is_service_sreny = $4,
            updated_at = now()
        WHERE id = $1
        RETURNING id, zone_id, name, description, code, active, is_service_sreny, created_by, updated_by, created_at, updated_at
      `,
      [srenyId, nextName, nextZoneId ?? null, nextServiceDesignation],
    )) as unknown as [Array<{
      id: string;
      zone_id: string | null;
      name: string;
      description: string | null;
      code: string | null;
      active: boolean;
      is_service_sreny: boolean;
      created_by: string | null;
      updated_by: string | null;
      created_at: string | Date;
      updated_at: string | Date;
    }>, number];
    const row = rows[0][0];
    const updated: SrenyRecord = {
      id: row.id,
      name: row.name,
      zoneId: row.zone_id ?? undefined,
      description: row.description ?? undefined,
      code: row.code ?? undefined,
      active: row.active,
      isServiceSreny: row.is_service_sreny,
      createdBy: row.created_by ?? undefined,
      updatedBy: row.updated_by ?? undefined,
      createdAt: this.toIsoTimestamp(row.created_at),
      updatedAt: this.toIsoTimestamp(row.updated_at),
    };
    this.srenies.set(srenyId, updated);

    if (nextServiceDesignation) {
      await this.dataSource.query(
        `
          UPDATE adwest.srenies
          SET is_service_sreny = false,
              updated_at = now()
          WHERE zone_id = $1
            AND id <> $2
            AND is_service_sreny = true
        `,
        [nextZoneId, srenyId],
      );
    }

    return updated;
  }

  listSreniDefinitions(): SrenyRecord[] {
    return Array.from(this.srenies.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async listSreniDefinitionsFromDb(params: { page?: number; pageSize?: number; search?: string }): Promise<{
    items: SrenyRecord[]; total: number; page: number; pageSize: number; totalPages: number;
  }> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(1000, Math.max(1, params.pageSize ?? 20));
    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const q = (params.search ?? '').trim().toLowerCase();
      let all = Array.from(this.srenies.values()).filter((s) => !s.zoneId);
      if (q) all = all.filter((s) => s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
      all.sort((a, b) => a.name.localeCompare(b.name));
      const total = all.length;
      return { items: all.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
    }
    const searchParam = params.search?.trim() ? `%${params.search.trim()}%` : null;
    const [countRows, dataRows] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM adwest.srenies WHERE zone_id IS NULL AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1 OR description ILIKE $1)`,
        [searchParam],
      ),
      this.dataSource.query(
        `SELECT id, name, description, code, active, is_service_sreny, created_by, updated_by, created_at, updated_at FROM adwest.srenies WHERE zone_id IS NULL AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1 OR description ILIKE $1) ORDER BY name LIMIT $2 OFFSET $3`,
        [searchParam, pageSize, (page - 1) * pageSize],
      ),
    ]);
    const total = (countRows as Array<{ total: number }>)[0].total;
    const items = (dataRows as Array<{
      id: string; name: string; description: string | null; code: string | null; active: boolean;
      is_service_sreny: boolean; created_by: string | null; updated_by: string | null;
      created_at: string | Date; updated_at: string | Date;
    }>).map((r) => ({
      id: r.id, name: r.name, description: r.description ?? undefined, code: r.code ?? undefined,
      active: r.active, isServiceSreny: r.is_service_sreny,
      createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined,
      createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at),
    }));
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
  }

  async createSreniDefinition(dto: CreateSreniDefinitionDto, actorEmail?: string): Promise<SrenyRecord> {
    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const now = new Date().toISOString();
      const record: SrenyRecord = {
        id: this.newId('sreny'),
        name: dto.name,
        code: dto.code,
        description: dto.description,
        isServiceSreny: false,
        active: true,
        createdBy: actorEmail,
        updatedBy: actorEmail,
        createdAt: now,
        updatedAt: now,
      };
      this.srenies.set(record.id, record);
      return record;
    }

    const rows = (await this.dataSource.query(
      `
        INSERT INTO adwest.srenies (name, code, description, is_service_sreny, active, created_by, updated_by)
        VALUES ($1, $2, $3, false, true, $4, $4)
        RETURNING id, name, description, code, active, is_service_sreny, created_by, updated_by, created_at, updated_at
      `,
      [dto.name, dto.code ?? null, dto.description ?? null, actorEmail ?? null],
    )) as Array<{
      id: string;
      name: string;
      description: string | null;
      code: string | null;
      active: boolean;
      is_service_sreny: boolean;
      created_by: string | null;
      updated_by: string | null;
      created_at: string | Date;
      updated_at: string | Date;
    }>;
    const row = rows[0];
    const record: SrenyRecord = {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      code: row.code ?? undefined,
      active: row.active,
      isServiceSreny: row.is_service_sreny,
      createdBy: row.created_by ?? undefined,
      updatedBy: row.updated_by ?? undefined,
      createdAt: this.toIsoTimestamp(row.created_at),
      updatedAt: this.toIsoTimestamp(row.updated_at),
    };
    this.srenies.set(record.id, record);

    // Auto-create sidebar menu entries for the new Sreni
    const menuNow = new Date().toISOString();
    await this.dataSource!.query(
      `INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, null, '🏘️', 1000, true, $3, $3)
       ON CONFLICT (key) DO NOTHING`,
      [`sreni-${record.id}`, record.name, menuNow],
    );
    await this.dataSource!.query(
      `INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, 'Calendar', $2, '📅', 10, true, $3, $3)
       ON CONFLICT (key) DO NOTHING`,
      [`sreni-${record.id}-calendar`, `sreni-${record.id}`, menuNow],
    );
    await this.dataSource!.query(
      `INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, 'Contacts', $2, '📋', 20, true, $3, $3)
       ON CONFLICT (key) DO NOTHING`,
      [`sreni-${record.id}-contacts`, `sreni-${record.id}`, menuNow],
    );
    await this.dataSource!.query(
      `INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, 'Attendance', $2, '✅', 30, true, $3, $3)
       ON CONFLICT (key) DO NOTHING`,
      [`sreni-${record.id}-attendance`, `sreni-${record.id}`, menuNow],
    );
    await this.dataSource!.query(
      `INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, 'Documents', $2, '📁', 40, true, $3, $3)
       ON CONFLICT (key) DO NOTHING`,
      [`sreni-${record.id}-documents`, `sreni-${record.id}`, menuNow],
    );
    await this.dataSource!.query(
      `INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, 'Reports', $2, '📊', 50, true, $3, $3)
       ON CONFLICT (key) DO NOTHING`,
      [`sreni-${record.id}-reports`, `sreni-${record.id}`, menuNow],
    );
    return record;
  }

  async updateSreniDefinition(sreniId: string, dto: UpdateSreniDefinitionDto, actorEmail?: string): Promise<SrenyRecord> {
    if (this.runtimeMode === 'db' && this.dataSource && !this.srenies.has(sreniId)) {
      const rows = await this.dataSource.query(
        'SELECT id, name, code, description, active, is_service_sreny, created_by, updated_by, created_at, updated_at FROM adwest.srenies WHERE id=$1',
        [sreniId],
      ) as Array<{ id: string; name: string; code: string | null; description: string | null; active: boolean; is_service_sreny: boolean; created_by: string | null; updated_by: string | null; created_at: string | Date; updated_at: string | Date }>;
      if (!rows.length) throw new NotFoundException('Sreni not found');
      const r = rows[0];
      this.srenies.set(r.id, { id: r.id, name: r.name, code: r.code ?? undefined, description: r.description ?? undefined, active: r.active, isServiceSreny: r.is_service_sreny, createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined, createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at) });
    }
    const current = this.srenies.get(sreniId);
    if (!current) throw new NotFoundException('Sreni not found');

    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const updated: SrenyRecord = {
        ...current,
        name: dto.name ?? current.name,
        code: dto.code !== undefined ? dto.code : current.code,
        description: dto.description !== undefined ? dto.description : current.description,
        active: dto.active !== undefined ? dto.active : current.active,
        updatedBy: actorEmail ?? current.updatedBy,
        updatedAt: new Date().toISOString(),
      };
      this.srenies.set(sreniId, updated);
      return updated;
    }

    const nextName = dto.name ?? current.name;
    const nextCode = dto.code !== undefined ? dto.code : current.code ?? null;
    const nextDescription = dto.description !== undefined ? dto.description : current.description ?? null;
    const nextActive = dto.active !== undefined ? dto.active : current.active;

    const rows = (await this.dataSource.query(
      `
        UPDATE adwest.srenies
        SET name        = $2,
            code        = $3,
            description = $4,
            active      = $5,
            updated_by  = $6,
            updated_at  = now()
        WHERE id = $1
        RETURNING id, name, description, code, active, is_service_sreny, created_by, updated_by, created_at, updated_at
      `,
      [sreniId, nextName, nextCode, nextDescription, nextActive, actorEmail ?? null],
    )) as unknown as [Array<{
      id: string;
      name: string;
      description: string | null;
      code: string | null;
      active: boolean;
      is_service_sreny: boolean;
      created_by: string | null;
      updated_by: string | null;
      created_at: string | Date;
      updated_at: string | Date;
    }>, number];
    const row = rows[0][0];
    const updated: SrenyRecord = {
      id: row.id,
      name: row.name,
      zoneId: current.zoneId,
      description: row.description ?? undefined,
      code: row.code ?? undefined,
      active: row.active,
      isServiceSreny: row.is_service_sreny,
      createdBy: row.created_by ?? undefined,
      updatedBy: row.updated_by ?? undefined,
      createdAt: this.toIsoTimestamp(row.created_at),
      updatedAt: this.toIsoTimestamp(row.updated_at),
    };
    this.srenies.set(sreniId, updated);

    // Sync menu item label and active state
    if (this.runtimeMode === 'db' && this.dataSource) {
      const menuNow = new Date().toISOString();
      await this.dataSource.query(
        `UPDATE adwest.menu_items SET label = $2, active = $3, updated_at = $4 WHERE key = $1`,
        [`sreni-${sreniId}`, updated.name, updated.active, menuNow],
      );
      await this.dataSource.query(
        `UPDATE adwest.menu_items SET active = $2, updated_at = $3 WHERE parent_key = $1`,
        [`sreni-${sreniId}`, updated.active, menuNow],
      );
    }

    return updated;
  }

  async deleteSreniDefinition(sreniId: string): Promise<void> {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (this.runtimeMode === 'db' && this.dataSource && UUID_RE.test(sreniId)) {
      await this.dataSource.query(`DELETE FROM adwest.menu_items WHERE key=$1 OR parent_key=$1`, [`sreni-${sreniId}`]);
      const deleted = await this.dataSource.query('DELETE FROM adwest.srenies WHERE id=$1 RETURNING id', [sreniId]) as Array<{ id: string }>;
      if (!deleted.length) throw new NotFoundException('Sreni not found');
      this.srenies.delete(sreniId);
      return;
    }
    if (!this.srenies.has(sreniId)) throw new NotFoundException('Sreni not found');
    this.srenies.delete(sreniId);
  }

  listSthans(srenyId?: string): SthanRecord[] {
    const all = Array.from(this.sthans.values());
    return srenyId ? all.filter((item) => item.srenyId === srenyId) : all;
  }

  createSthan(dto: CreateSthanDto): SthanRecord {
    this.findSreny(dto.srenyId);
    const now = new Date().toISOString();
    const record: SthanRecord = {
      id: this.newId('sthan'),
      name: dto.name,
      srenyId: dto.srenyId,
      phaseStatus: 'phase1_partial',
      fullIndependenceAvailable: false,
      pendingFeatureMessage:
        'Sthan independent governance is planned for a future phase and is not available in the current release.',
      createdAt: now,
      updatedAt: now,
    };
    this.sthans.set(record.id, record);
    return record;
  }

  updateSthan(sthanId: string, dto: UpdateSthanDto): SthanRecord {
    if (dto.srenyId) {
      this.findSreny(dto.srenyId);
    }

    const current = this.findSthan(sthanId);
    const updated: SthanRecord = {
      ...current,
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    this.sthans.set(sthanId, updated);
    return updated;
  }

  listGovernanceStructures(srenyId: string): GovernanceStructureRecord[] {
    this.findSreny(srenyId);
    return Array.from(this.governanceStructures.values())
      .filter((item) => item.srenyId === srenyId)
      .sort((a, b) => b.year - a.year);
  }

  createGovernanceStructure(
    srenyId: string,
    dto: CreateGovernanceStructureDto,
  ): GovernanceStructureRecord {
    this.findSreny(srenyId);
    const positions = this.normalizePositions(dto.positions);

    const existing = this.listGovernanceStructures(srenyId).find((item) => item.year === dto.year);
    if (existing) {
      throw new BadRequestException('Governance structure for this year already exists for the sreny');
    }

    const now = new Date().toISOString();
    const record: GovernanceStructureRecord = {
      id: this.newId('govs'),
      srenyId,
      year: dto.year,
      positions,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    this.governanceStructures.set(record.id, record);
    return record;
  }

  updateGovernanceStructure(
    srenyId: string,
    structureId: string,
    dto: UpdateGovernanceStructureDto,
  ): GovernanceStructureRecord {
    this.findSreny(srenyId);
    const structure = this.findGovernanceStructure(structureId);
    if (structure.srenyId !== srenyId) {
      throw new BadRequestException('Governance structure does not belong to specified sreny');
    }

    if (dto.positions) {
      structure.positions = this.normalizePositions(dto.positions);
    }

    if (dto.archived !== undefined) {
      structure.archived = dto.archived;
    }

    structure.updatedAt = new Date().toISOString();
    this.governanceStructures.set(structureId, structure);
    return structure;
  }

  listGovernanceAssignments(structureId: string): GovernanceAssignmentRecord[] {
    this.findGovernanceStructure(structureId);
    return Array.from(this.governanceAssignments.values()).filter(
      (item) => item.structureId === structureId,
    );
  }

  createGovernanceAssignment(
    structureId: string,
    dto: CreateGovernanceAssignmentDto,
  ): GovernanceAssignmentRecord {
    const structure = this.findGovernanceStructure(structureId);
    this.ensurePositionExists(structure, dto.positionName);
    this.ensureContactInSreny(dto.contactId, structure.srenyId);
    this.validateDateWindow(dto.startDate, dto.endDate);

    const now = new Date().toISOString();
    const assignment: GovernanceAssignmentRecord = {
      id: this.newId('gova'),
      structureId,
      contactId: dto.contactId,
      positionName: dto.positionName.trim(),
      startDate: dto.startDate,
      endDate: dto.endDate,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    this.governanceAssignments.set(assignment.id, assignment);
    return assignment;
  }

  updateGovernanceAssignment(
    structureId: string,
    assignmentId: string,
    dto: UpdateGovernanceAssignmentDto,
  ): GovernanceAssignmentRecord {
    const structure = this.findGovernanceStructure(structureId);
    const assignment = this.findGovernanceAssignment(assignmentId);
    if (assignment.structureId !== structureId) {
      throw new BadRequestException('Governance assignment does not belong to specified structure');
    }

    const nextPositionName = dto.positionName?.trim() ?? assignment.positionName;
    this.ensurePositionExists(structure, nextPositionName);

    const nextContactId = dto.contactId ?? assignment.contactId;
    this.ensureContactInSreny(nextContactId, structure.srenyId);

    const nextStartDate = dto.startDate ?? assignment.startDate;
    const nextEndDate = dto.endDate === undefined ? assignment.endDate : dto.endDate;
    this.validateDateWindow(nextStartDate, nextEndDate);

    assignment.positionName = nextPositionName;
    assignment.contactId = nextContactId;
    assignment.startDate = nextStartDate;
    assignment.endDate = nextEndDate;

    if (dto.archived !== undefined) {
      assignment.archived = dto.archived;
    }

    assignment.updatedAt = new Date().toISOString();
    this.governanceAssignments.set(assignment.id, assignment);
    return assignment;
  }

  listContacts(search?: string): ContactRecord[] {
    const rows = Array.from(this.contacts.values());
    if (!search) {
      return rows;
    }

    const term = search.toLowerCase();
    return rows.filter((item) =>
      [
        item.firstName,
        item.lastName,
        item.email ?? '',
        item.phone ?? '',
      ].some((value) => value.toLowerCase().includes(term)),
    );
  }

  createContact(dto: CreateContactDto): ContactRecord {
    this.findZone(dto.zoneId);

    const now = new Date().toISOString();
    const memberships = (dto.srenyIds ?? []).map((srenyId) => {
      this.findSreny(srenyId);
      return {
        id: this.newId('ms'),
        srenyId,
        createdAt: now,
      };
    });

    const contact: ContactRecord = {
      id: this.newId('ct'),
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      zoneId: dto.zoneId,
      srenyIds: dto.srenyIds ?? [],
      address: dto.address,
      customMetadataBySreny: this.normalizeCustomMetadata(
        dto.customMetadataBySreny,
        dto.srenyIds ?? [],
      ),
      status: 'active',
      memberships,
      createdAt: now,
      updatedAt: now,
    };

    this.contacts.set(contact.id, contact);
    this.scheduleContactStatePersistence(contact.id);
    return contact;
  }

  getContact(contactId: string): ContactRecord {
    return this.findContact(contactId);
  }

  updateContact(contactId: string, dto: UpdateContactDto): ContactRecord {
    const current = this.findContact(contactId);

    if (dto.srenyIds) {
      dto.srenyIds.forEach((id) => this.findSreny(id));
    }

    const updated: ContactRecord = {
      ...current,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    if (dto.srenyIds) {
      updated.memberships = dto.srenyIds.map((srenyId) => ({
        id: this.newId('ms'),
        srenyId,
        createdAt: new Date().toISOString(),
      }));

      updated.customMetadataBySreny = this.pruneMetadataByMembership(
        updated.customMetadataBySreny,
        dto.srenyIds,
      );
    }

    if (dto.customMetadataBySreny) {
      updated.customMetadataBySreny = this.normalizeCustomMetadata(
        dto.customMetadataBySreny,
        updated.srenyIds,
      );
    }

    this.contacts.set(contactId, updated);
    this.scheduleContactStatePersistence(contactId);
    return updated;
  }

  softDeleteContact(contactId: string): { success: boolean } {
    const current = this.findContact(contactId);
    this.contacts.set(contactId, {
      ...current,
      status: 'deleted',
      updatedAt: new Date().toISOString(),
    });
    this.scheduleContactStatePersistence(contactId);
    return { success: true };
  }

  addMembership(contactId: string, dto: AddMembershipDto): ContactRecord {
    const current = this.findContact(contactId);
    this.findSreny(dto.srenyId);
    const already = current.memberships.find((m) => m.srenyId === dto.srenyId);
    if (!already) {
      current.memberships.push({
        id: this.newId('ms'),
        srenyId: dto.srenyId,
        createdAt: new Date().toISOString(),
      });
      current.srenyIds = current.memberships.map((item) => item.srenyId);
      current.updatedAt = new Date().toISOString();
      this.contacts.set(contactId, current);
    }

    if (!current.customMetadataBySreny[dto.srenyId]) {
      current.customMetadataBySreny[dto.srenyId] = {};
    }

    this.scheduleContactStatePersistence(contactId);

    return current;
  }

  upsertContactSrenyMetadata(
    contactId: string,
    srenyId: string,
    dto: UpsertContactSrenyMetadataDto,
  ): ContactRecord {
    const contact = this.findContact(contactId);
    this.findSreny(srenyId);

    if (!contact.srenyIds.includes(srenyId)) {
      throw new BadRequestException('Contact must belong to the target sreny');
    }

    contact.customMetadataBySreny[srenyId] = this.normalizeMetadataFields(dto.metadata);
    contact.updatedAt = new Date().toISOString();
    this.contacts.set(contactId, contact);
    this.scheduleContactStatePersistence(contactId);
    return contact;
  }

  removeMembership(contactId: string, membershipId: string): { success: boolean } {
    const current = this.findContact(contactId);
    current.memberships = current.memberships.filter((item) => item.id !== membershipId);
    current.srenyIds = current.memberships.map((item) => item.srenyId);
    current.customMetadataBySreny = this.pruneMetadataByMembership(
      current.customMetadataBySreny,
      current.srenyIds,
    );
    current.updatedAt = new Date().toISOString();
    this.contacts.set(contactId, current);
    this.scheduleContactStatePersistence(contactId);
    return { success: true };
  }

  startImport(dto: StartImportDto): ImportRecord {
    const now = new Date().toISOString();
    const importId = this.newId('imp');
    const contactIds = Array.from(this.contacts.keys());

    const record: ImportRecord = {
      id: importId,
      fileName: dto.fileName,
      fileType: dto.fileType,
      status: 'ready_for_review',
      acceptedRows: 12,
      duplicateRows: contactIds.length > 1 ? 1 : 0,
      processedRows: 13,
      validationErrorRows: 1,
      mappingProfileId: dto.mappingProfileId,
      hasHeader: dto.hasHeader ?? true,
      createdAt: now,
      duplicates:
        contactIds.length > 1
          ? [
              {
                id: this.newId('dup'),
                leftContactId: contactIds[0],
                rightContactId: contactIds[1],
                decision: 'pending',
              },
            ]
          : [],
    };

    this.imports.set(importId, record);
    this.scheduleImportStatePersistence(importId);
    return record;
  }

  listImports(status?: string): ImportRecord[] {
    const rows = Array.from(this.imports.values());
    const filtered = status ? rows.filter((row) => row.status === status) : rows;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getPersistenceReadiness(): CoreBusinessPersistenceReadinessRecord {
    const coreBusinessStore = this.store.getMode();
    const authStoreMode = process.env.ENABLE_DB_PERSISTENCE === 'true' ? 'db' : 'in-memory';
    const isProductionRuntime = process.env.NODE_ENV === 'production';
    const blockers: string[] = [];

    if (coreBusinessStore !== 'db') {
      blockers.push('Core Business runtime state is not configured for DB-backed persistence');
    }

    if (authStoreMode !== 'db') {
      blockers.push('Auth store is not running in DB persistence mode');
    }

    const nextSteps = blockers.length
      ? [
          'Set ENABLE_DB_PERSISTENCE=true for API runtime',
          'Run PostgreSQL migration for Core Business runtime state store',
          'Run Core Business regression suite in DB mode before UAT gate',
        ]
      : ['Persistence blockers are cleared for current runtime configuration'];

    return {
      coreBusinessStore,
      authStoreMode,
      isProductionRuntime,
      readyForUat: blockers.length === 0,
      blockers,
      nextSteps,
    };
  }

  getImport(importId: string): ImportRecord {
    return this.findImport(importId);
  }

  listImportDuplicates(importId: string): DuplicateRecord[] {
    return this.findImport(importId).duplicates;
  }

  getImportReconciliation(importId: string): ImportReconciliationRecord {
    const record = this.findImport(importId);
    const pendingDuplicates = record.duplicates.filter((item) => item.decision === 'pending').length;
    const mergedDuplicates = record.duplicates.filter((item) => item.decision === 'merged').length;
    const skippedDuplicates = record.duplicates.filter((item) => item.decision === 'skipped').length;
    const issues: string[] = [];

    if (pendingDuplicates > 0) {
      issues.push('Duplicate review is incomplete');
    }

    if (record.status === 'finalized') {
      issues.push('Import already finalized');
    }

    if (record.status === 'failed') {
      issues.push(record.failedReason ?? 'Import is marked as failed');
    }

    return {
      importId: record.id,
      status: record.status,
      totalDuplicates: record.duplicates.length,
      pendingDuplicates,
      mergedDuplicates,
      skippedDuplicates,
      canFinalize: record.status === 'ready_for_review' && pendingDuplicates === 0,
      issues,
    };
  }

  async mergeDuplicate(importId: string, duplicateId: string): Promise<{ success: boolean }> {
    return this.withImportWorkflowLock(async () => {
      const record = this.findImport(importId);
      const duplicate = record.duplicates.find((item) => item.id === duplicateId);
      if (!duplicate) {
        throw new NotFoundException('Duplicate item not found');
      }

      this.propagateMergeAcrossRelations(duplicate.leftContactId, duplicate.rightContactId);
      duplicate.decision = 'merged';
      await this.persistImportState(record);
      return { success: true };
    });
  }

  skipDuplicate(importId: string, duplicateId: string): { success: boolean } {
    const record = this.findImport(importId);
    const duplicate = record.duplicates.find((item) => item.id === duplicateId);
    if (!duplicate) {
      throw new NotFoundException('Duplicate item not found');
    }

    duplicate.decision = 'skipped';
    this.scheduleImportStatePersistence(importId);
    return { success: true };
  }

  async finalizeImport(importId: string): Promise<ImportRecord> {
    return this.withImportWorkflowLock(async () => {
      const record = this.findImport(importId);
      const reconciliation = this.getImportReconciliation(importId);
      if (!reconciliation.canFinalize) {
        throw new BadRequestException(
          `Import cannot be finalized: ${reconciliation.issues.join('; ')}`,
        );
      }

      record.status = 'finalized';
      record.finalizedAt = new Date().toISOString();
      record.failedReason = undefined;
      await this.persistImportState(record);
      return record;
    });
  }

  markImportFailed(importId: string, reason: string): ImportRecord {
    const record = this.findImport(importId);
    if (record.status === 'finalized') {
      throw new BadRequestException('Finalized imports cannot be marked failed');
    }

    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      throw new BadRequestException('Failure reason is required');
    }

    record.status = 'failed';
    record.failedReason = normalizedReason;
    this.scheduleImportStatePersistence(importId);
    return record;
  }

  listPrograms(): ProgramRecord[] {
    return Array.from(this.programs.values());
  }

  createProgram(dto: CreateProgramDto): ProgramRecord {
    this.validateDateWindow(dto.startDate, dto.endDate);
    const now = new Date().toISOString();
    const program: ProgramRecord = {
      id: this.newId('prg'),
      title: dto.title,
      description: dto.description,
      startDate: dto.startDate,
      endDate: dto.endDate,
      capacity: dto.capacity,
      status: 'draft',
      sessions: [],
      registrations: [],
      createdAt: now,
      updatedAt: now,
    };
    this.programs.set(program.id, program);
    this.scheduleProgramStatePersistence(program.id);
    return program;
  }

  getProgram(programId: string): ProgramRecord {
    return this.findProgram(programId);
  }

  updateProgram(programId: string, dto: UpdateProgramDto): ProgramRecord {
    const program = this.findProgram(programId);
    const nextStartDate = dto.startDate ?? program.startDate;
    const nextEndDate = dto.endDate ?? program.endDate;
    this.validateDateWindow(nextStartDate, nextEndDate);

    const updated: ProgramRecord = {
      ...program,
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    this.programs.set(programId, updated);
    this.scheduleProgramStatePersistence(programId);
    return updated;
  }

  publishProgram(programId: string): ProgramRecord {
    const program = this.findProgram(programId);
    if (program.status === 'archived') {
      throw new BadRequestException('Archived programs cannot be published');
    }

    if (program.sessions.length === 0) {
      throw new BadRequestException('Program must include at least one session before publish');
    }

    program.status = 'published';
    program.updatedAt = new Date().toISOString();
    this.scheduleProgramStatePersistence(programId);
    return program;
  }

  archiveProgram(programId: string): ProgramRecord {
    const program = this.findProgram(programId);
    program.status = 'archived';
    program.updatedAt = new Date().toISOString();
    this.scheduleProgramStatePersistence(programId);
    return program;
  }

  createSession(programId: string, dto: CreateSessionDto): ProgramSessionRecord {
    const program = this.findProgram(programId);
    this.validateDateWindow(dto.startAt, dto.endAt);
    this.ensureSessionWithinProgramWindow(program, dto.startAt, dto.endAt);

    const session: ProgramSessionRecord = {
      id: this.newId('ses'),
      name: dto.name,
      startAt: dto.startAt,
      endAt: dto.endAt,
    };

    program.sessions.push(session);
    program.updatedAt = new Date().toISOString();
    this.scheduleProgramStatePersistence(programId);
    return session;
  }

  updateSession(
    programId: string,
    sessionId: string,
    dto: UpdateSessionDto,
  ): ProgramSessionRecord {
    const program = this.findProgram(programId);
    const session = program.sessions.find((item) => item.id === sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (dto.name) {
      session.name = dto.name;
    }

    const nextStartAt = dto.startAt ?? session.startAt;
    const nextEndAt = dto.endAt ?? session.endAt;
    this.validateDateWindow(nextStartAt, nextEndAt);
    this.ensureSessionWithinProgramWindow(program, nextStartAt, nextEndAt);

    session.startAt = nextStartAt;
    session.endAt = nextEndAt;

    program.updatedAt = new Date().toISOString();
    this.scheduleProgramStatePersistence(programId);
    return session;
  }

  createRegistration(programId: string, dto: CreateRegistrationDto): RegistrationRecord {
    this.findContact(dto.contactId);
    const program = this.findProgram(programId);

    const alreadyRegistered = program.registrations.some(
      (registration) => registration.contactId === dto.contactId,
    );
    if (alreadyRegistered) {
      throw new BadRequestException('Contact is already registered for this program');
    }

    if (program.registrations.length >= program.capacity) {
      throw new BadRequestException('Program capacity reached');
    }

    const registration: RegistrationRecord = {
      id: this.newId('reg'),
      programId,
      contactId: dto.contactId,
      createdAt: new Date().toISOString(),
    };
    program.registrations.push(registration);
    program.updatedAt = new Date().toISOString();
    this.scheduleProgramStatePersistence(programId);
    return registration;
  }

  cancelRegistration(programId: string, registrationId: string): { success: boolean } {
    const program = this.findProgram(programId);
    program.registrations = program.registrations.filter((item) => item.id !== registrationId);
    program.updatedAt = new Date().toISOString();
    this.scheduleProgramStatePersistence(programId);
    return { success: true };
  }

  recordAttendance(
    sessionId: string,
    dto: RecordAttendanceDto,
    principal: AuthPrincipal,
  ): AttendanceRecord {
    this.findSession(sessionId);
    this.findContact(dto.contactId);

    const record: AttendanceRecord = {
      id: this.newId('att'),
      sessionId,
      contactId: dto.contactId,
      state: dto.state,
      notes: dto.notes,
      recordedAt: new Date().toISOString(),
      recordedBy: principal.userId,
    };

    this.attendance.set(record.id, record);
    this.scheduleAttendanceStatePersistence(record.id);
    return record;
  }

  bulkUploadAttendance(
    sessionId: string,
    dto: BulkAttendanceUploadDto,
  ): { success: boolean; processed: number; sourceFileName?: string } {
    this.findSession(sessionId);

    const lateCount = dto.lateCount ?? 0;
    const excusedCount = dto.excusedCount ?? 0;
    const processed = dto.presentCount + dto.absentCount + lateCount + excusedCount;

    if (processed <= 0) {
      throw new BadRequestException('Attendance upload must include at least one record');
    }

    return {
      success: true,
      processed,
      sourceFileName: dto.sourceFileName,
    };
  }

  getSessionAttendance(sessionId: string): AttendanceRecord[] {
    this.findSession(sessionId);
    return Array.from(this.attendance.values()).filter((item) => item.sessionId === sessionId);
  }

  getAttendanceReport(sessionId?: string): {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  } {
    const items = Array.from(this.attendance.values()).filter((item) =>
      sessionId ? item.sessionId === sessionId : true,
    );

    return {
      total: items.length,
      present: items.filter((item) => item.state === 'present').length,
      absent: items.filter((item) => item.state === 'absent').length,
      late: items.filter((item) => item.state === 'late').length,
      excused: items.filter((item) => item.state === 'excused').length,
    };
  }

  exportAttendanceReport(sessionId?: string): { format: string; rows: number } {
    const report = this.getAttendanceReport(sessionId);
    return {
      format: 'csv',
      rows: report.total,
    };
  }

  createTicket(dto: CreateTicketDto, principal: AuthPrincipal): TicketRecord {
    const now = new Date().toISOString();
    const ticket: TicketRecord = {
      id: this.newId('tkt'),
      contactId: principal.userId,
      subject: dto.subject,
      description: dto.description,
      category: dto.category,
      priority: dto.priority,
      status: 'new',
      comments: [],
      createdAt: now,
      updatedAt: now,
    };

    this.tickets.set(ticket.id, ticket);
    this.scheduleTicketStatePersistence(ticket.id);
    this.appendTicketActivity(ticket.id, 'created', principal.userId, {
      status: ticket.status,
      priority: ticket.priority,
    });
    return ticket;
  }

  listTickets(status?: string, search?: string): TicketRecord[] {
    const rows = Array.from(this.tickets.values());
    let filtered = status ? rows.filter((item) => item.status === status) : rows;

    if (search) {
      const term = search.trim().toLowerCase();
      filtered = filtered.filter((ticket) => {
        const commentBody = ticket.comments.map((comment) => comment.body).join(' ');
        const haystack = [
          ticket.subject,
          ticket.description,
          ticket.category,
          ticket.priority,
          ticket.status,
          ticket.contactId,
          commentBody,
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(term);
      });
    }

    return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getTicketMetrics(): {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    byCategory: Record<string, number>;
  } {
    const rows = Array.from(this.tickets.values());
    const byCategory: Record<string, number> = {};

    for (const row of rows) {
      byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
    }

    return {
      total: rows.length,
      open: rows.filter((item) => item.status === 'new').length,
      inProgress: rows.filter((item) => item.status === 'in_progress').length,
      resolved: rows.filter((item) => item.status === 'resolved').length,
      closed: rows.filter((item) => item.status === 'closed').length,
      byCategory,
    };
  }

  getTicket(ticketId: string): TicketRecord {
    return this.findTicket(ticketId);
  }

  listTicketActivity(ticketId: string): TicketActivityRecord[] {
    this.findTicket(ticketId);
    return Array.from(this.ticketActivity.values())
      .filter((entry) => entry.ticketId === ticketId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  updateTicketStatus(ticketId: string, dto: UpdateTicketStatusDto): TicketRecord {
    const ticket = this.findTicket(ticketId);
    if (dto.status === ticket.status) {
      return ticket;
    }

    const allowed = TICKET_STATUS_TRANSITIONS[ticket.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${ticket.status} to ${dto.status}`,
      );
    }

    if (!ticket.assigneeId && (dto.status === 'in_progress' || dto.status === 'resolved' || dto.status === 'closed')) {
      throw new BadRequestException('Ticket must be assigned before moving to active or closed states');
    }

    ticket.status = dto.status;
    ticket.updatedAt = new Date().toISOString();
    this.scheduleTicketStatePersistence(ticket.id);
    this.appendTicketActivity(ticket.id, 'status_updated', ticket.assigneeId ?? 'system', {
      status: ticket.status,
    });
    return ticket;
  }

  updateTicketAssignee(ticketId: string, dto: UpdateTicketAssigneeDto): TicketRecord {
    const ticket = this.findTicket(ticketId);
    const normalizedAssignee = dto.assigneeId.trim();
    if (!normalizedAssignee) {
      throw new BadRequestException('assigneeId is required');
    }

    ticket.assigneeId = normalizedAssignee;
    ticket.updatedAt = new Date().toISOString();
    this.scheduleTicketStatePersistence(ticket.id);
    this.appendTicketActivity(ticket.id, 'assigned', normalizedAssignee, {
      assigneeId: normalizedAssignee,
    });
    return ticket;
  }

  addTicketComment(
    ticketId: string,
    dto: CreateTicketCommentDto,
    principal: AuthPrincipal,
  ): TicketCommentRecord {
    const ticket = this.findTicket(ticketId);
    const comment: TicketCommentRecord = {
      id: this.newId('tcm'),
      authorId: principal.userId,
      body: dto.body,
      createdAt: new Date().toISOString(),
    };

    ticket.comments.push(comment);
    ticket.updatedAt = new Date().toISOString();
    this.scheduleTicketStatePersistence(ticket.id);
    this.appendTicketActivity(ticket.id, 'comment_added', principal.userId, {
      commentId: comment.id,
    });
    return comment;
  }

  listMyTickets(principal: AuthPrincipal): TicketRecord[] {
    return Array.from(this.tickets.values()).filter(
      (item) => item.contactId === principal.userId,
    );
  }

  getMyProfile(principal: AuthPrincipal): ContactRecord | null {
    const profile = Array.from(this.contacts.values()).find(
      (item) => item.email?.toLowerCase() === principal.email?.toLowerCase(),
    );

    return profile ?? null;
  }

  createEditRequest(
    dto: { field: string; currentValue: string; requestedValue: string },
    principal: AuthPrincipal,
  ): EditRequestRecord {
    const profile = this.getMyProfile(principal);
    if (!profile) {
      throw new BadRequestException('Member profile was not found for edit request');
    }

    const canonicalField = this.toCanonicalEditableField(dto.field);
    const currentProfileValue = this.readEditableFieldValue(profile, canonicalField);
    const providedCurrentValue = dto.currentValue.trim();
    if (providedCurrentValue !== currentProfileValue) {
      throw new BadRequestException('Current value does not match latest profile value');
    }

    const requestedValue = dto.requestedValue.trim();
    if (!requestedValue) {
      throw new BadRequestException('Requested value is required');
    }

    if (requestedValue === currentProfileValue) {
      throw new BadRequestException('Requested value must differ from current value');
    }

    const request: EditRequestRecord = {
      id: this.newId('edr'),
      memberId: principal.userId,
      contactId: profile.id,
      memberName: `${profile.firstName} ${profile.lastName}`,
      field: canonicalField,
      currentValue: currentProfileValue,
      requestedValue,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.editRequests.set(request.id, request);
    return request;
  }

  listMyEditRequests(principal: AuthPrincipal): EditRequestRecord[] {
    return Array.from(this.editRequests.values()).filter(
      (item) => item.memberId === principal.userId,
    );
  }

  listEditRequests(status?: string): EditRequestRecord[] {
    const rows = Array.from(this.editRequests.values());
    const filtered = status
      ? rows.filter((item) => item.status === status)
      : rows;

    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  approveEditRequest(
    requestId: string,
    principal: AuthPrincipal,
    dto?: { note?: string },
  ): EditRequestRecord {
    const request = this.findEditRequest(requestId);
    if (request.status !== 'pending') {
      throw new BadRequestException('Edit request is already reviewed');
    }

    request.status = 'approved';
    request.reviewedBy = principal.userId;
    request.reviewedAt = new Date().toISOString();
    request.reviewNote = dto?.note;

    this.applyApprovedProfileUpdate(request);
    this.editRequests.set(request.id, request);
    return request;
  }

  rejectEditRequest(
    requestId: string,
    principal: AuthPrincipal,
    dto?: { note?: string },
  ): EditRequestRecord {
    const request = this.findEditRequest(requestId);
    if (request.status !== 'pending') {
      throw new BadRequestException('Edit request is already reviewed');
    }

    request.status = 'rejected';
    request.reviewedBy = principal.userId;
    request.reviewedAt = new Date().toISOString();
    request.reviewNote = dto?.note;

    this.editRequests.set(request.id, request);
    return request;
  }

  listMyPrograms(principal: AuthPrincipal): ProgramRecord[] {
    const contact = this.getMyProfile(principal);
    if (!contact) {
      return [];
    }

    return Array.from(this.programs.values()).filter((program) =>
      program.registrations.some((registration) => registration.contactId === contact.id),
    );
  }

  listMyHelpdeskTickets(principal: AuthPrincipal): TicketRecord[] {
    return this.listMyTickets(principal);
  }

  listDocumentFolders(srenyId?: string): DocumentFolderRecord[] {
    return this.getDocumentReportRuntime().listDocumentFolders(srenyId);
  }

  createDocumentFolder(dto: CreateDocumentFolderDto): DocumentFolderRecord {
    return this.getDocumentReportRuntime().createDocumentFolder(dto);
  }

  listDocuments(srenyId?: string, search?: string): DocumentRecord[] {
    return this.getDocumentReportRuntime().listDocuments(srenyId, search);
  }

  createDocument(dto: CreateDocumentDto, principal: AuthPrincipal): DocumentRecord {
    return this.getDocumentReportRuntime().createDocument(dto, principal);
  }

  createDocumentVersion(
    documentId: string,
    dto: CreateDocumentDto,
    principal: AuthPrincipal,
  ): DocumentRecord {
    return this.getDocumentReportRuntime().createDocumentVersion(documentId, dto, principal);
  }

  uploadDocument(
    sreniId: string,
    file: Express.Multer.File,
    description: string | undefined,
    principal: AuthPrincipal,
  ): DocumentRecord {
    return this.getDocumentReportRuntime().uploadDocument(sreniId, file, description, principal);
  }

  downloadDocument(documentId: string): { record: DocumentRecord; filePath: string } {
    return this.getDocumentReportRuntime().downloadDocument(documentId);
  }

  deleteDocument(documentId: string): void {
    this.getDocumentReportRuntime().deleteDocument(documentId);
  }

  listReportTemplates(srenyId?: string): ReportTemplateRecord[] {
    return this.getDocumentReportRuntime().listReportTemplates(srenyId);
  }

  createReportTemplate(dto: CreateReportTemplateDto): ReportTemplateRecord {
    return this.getDocumentReportRuntime().createReportTemplate(dto);
  }

  createReportSubmission(
    dto: CreateReportSubmissionDto,
    principal: AuthPrincipal,
  ): ReportSubmissionRecord {
    return this.getDocumentReportRuntime().createReportSubmission(dto, principal);
  }

  listReportSubmissions(status?: string): ReportSubmissionRecord[] {
    return this.getDocumentReportRuntime().listReportSubmissions(status);
  }

  listMyReportSubmissions(principal: AuthPrincipal): ReportSubmissionRecord[] {
    return this.getDocumentReportRuntime().listMyReportSubmissions(principal);
  }

  reviewReportSubmission(
    submissionId: string,
    dto: ReviewReportSubmissionDto,
    principal: AuthPrincipal,
  ): ReportSubmissionRecord {
    return this.getDocumentReportRuntime().reviewReportSubmission(submissionId, dto, principal);
  }

  private getDocumentReportRuntime(): DocumentReportRuntimeService {
    if (!this.documentReportRuntimeService) {
      this.documentReportRuntimeService = new DocumentReportRuntimeService({
        documentFolders: this.documentFolders,
        documents: this.documents,
        reportTemplates: this.reportTemplates,
        reportSubmissions: this.reportSubmissions,
        newId: (prefix) => this.newId(prefix),
        ensureSreny: (srenyId) => {
          this.findSreny(srenyId);
        },
        findDocumentFolder: (folderId) => this.findDocumentFolder(folderId),
        findDocument: (documentId) => this.findDocument(documentId),
        findReportTemplate: (templateId) => this.findReportTemplate(templateId),
        findReportSubmission: (submissionId) => this.findReportSubmission(submissionId),
        scheduleDocumentStatePersistence: (entityId) => this.scheduleDocumentStatePersistence(entityId),
        scheduleReportTemplateStatePersistence: (templateId) => this.scheduleReportTemplateStatePersistence(templateId),
        scheduleReportSubmissionStatePersistence: (submissionId) => this.scheduleReportSubmissionStatePersistence(submissionId),
      });
    }
    return this.documentReportRuntimeService;
  }

  listApprovalWorkflows(): ApprovalWorkflowRecord[] {
    return Array.from(this.approvalWorkflows.values());
  }

  createApprovalWorkflow(dto: CreateApprovalWorkflowDto): ApprovalWorkflowRecord {
    const steps = Array.from(new Set(dto.steps.map((item) => item.trim()).filter((item) => item.length > 0)));
    if (!steps.length) {
      throw new BadRequestException('Approval workflow must have at least one step');
    }

    const mode = dto.mode ?? 'sequential';
    if (mode === 'single' && steps.length > 1) {
      throw new BadRequestException('Single approval mode supports exactly one step');
    }

    if (dto.escalationHours !== undefined && (dto.escalationHours < 1 || dto.escalationHours > 240)) {
      throw new BadRequestException('escalationHours must be between 1 and 240');
    }

    const now = new Date().toISOString();
    const workflow: ApprovalWorkflowRecord = {
      id: this.newId('apw'),
      name: dto.name.trim(),
      targetType: dto.targetType,
      mode,
      steps,
      escalationHours: dto.escalationHours,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    this.approvalWorkflows.set(workflow.id, workflow);
    this.scheduleApprovalWorkflowStatePersistence(workflow.id);
    return workflow;
  }

  submitApprovalItem(dto: SubmitApprovalItemDto, principal: AuthPrincipal): ApprovalItemRecord {
    return this.getApprovalRuntime().submitApprovalItem(dto, principal);
  }

  listApprovalItems(status?: string): ApprovalItemRecord[] {
    return this.getApprovalRuntime().listApprovalItems(status);
  }

  listApprovalNotifications(itemId?: string): ApprovalNotificationRecord[] {
    return this.getApprovalRuntime().listApprovalNotifications(itemId);
  }

  listMyApprovalActions(principal: AuthPrincipal, status?: string): ApprovalItemRecord[] {
    return this.getApprovalRuntime().listMyApprovalActions(principal, status);
  }

  listMyApprovalNotifications(principal: AuthPrincipal, itemId?: string): ApprovalNotificationRecord[] {
    return this.getApprovalRuntime().listMyApprovalNotifications(principal, itemId);
  }

  reviewApprovalItem(
    itemId: string,
    dto: ReviewApprovalItemDto,
    principal: AuthPrincipal,
  ): ApprovalItemRecord {
    return this.getApprovalRuntime().reviewApprovalItem(itemId, dto, principal);
  }

  resubmitApprovalItem(
    itemId: string,
    dto: ResubmitApprovalItemDto,
    principal: AuthPrincipal,
  ): ApprovalItemRecord {
    return this.getApprovalRuntime().resubmitApprovalItem(itemId, dto, principal);
  }

  private createReportingApprovalRequest(
    payload: { targetId: string; targetType: 'report_submission' | 'calendar_event'; summary: string },
    principal: AuthPrincipal,
  ): void {
    this.getApprovalRuntime().createReportingApprovalRequest(payload, principal);
  }

  private isTargetApproved(targetType: 'report_submission' | 'calendar_event', targetId: string): boolean {
    return this.getApprovalRuntime().isTargetApproved(targetType, targetId);
  }

  private getApprovalRuntime(): ApprovalRuntimeService {
    if (!this.approvalRuntimeService) {
      this.approvalRuntimeService = new ApprovalRuntimeService({
        approvalWorkflows: this.approvalWorkflows,
        approvalItems: this.approvalItems,
        approvalNotifications: this.approvalNotifications,
        users: this.users,
        newId: (prefix) => this.newId(prefix),
        findApprovalWorkflow: (workflowId) => this.findApprovalWorkflow(workflowId),
        findApprovalItem: (itemId) => this.findApprovalItem(itemId),
        scheduleApprovalItemStatePersistence: (itemId) => this.scheduleApprovalItemStatePersistence(itemId),
        scheduleApprovalWorkflowStatePersistence: (workflowId) => this.scheduleApprovalWorkflowStatePersistence(workflowId),
      });
    }
    return this.approvalRuntimeService;
  }

  private findZone(zoneId: string): ZoneRecord {
    const zone = this.zones.get(zoneId);
    if (!zone) {
      throw new NotFoundException('Zone not found');
    }
    return zone;
  }

  private findSreny(srenyId: string): SrenyRecord {
    const record = this.srenies.get(srenyId);
    if (!record) {
      throw new NotFoundException('Sreny not found');
    }
    return record;
  }

  private findSthan(sthanId: string): SthanRecord {
    const record = this.sthans.get(sthanId);
    if (!record) {
      throw new NotFoundException('Sthan not found');
    }
    return record;
  }

  private findGovernanceStructure(structureId: string): GovernanceStructureRecord {
    const structure = this.governanceStructures.get(structureId);
    if (!structure) {
      throw new NotFoundException('Governance structure not found');
    }
    return structure;
  }

  private findGovernanceAssignment(assignmentId: string): GovernanceAssignmentRecord {
    const assignment = this.governanceAssignments.get(assignmentId);
    if (!assignment) {
      throw new NotFoundException('Governance assignment not found');
    }
    return assignment;
  }

  private findContact(contactId: string): ContactRecord {
    const contact = this.contacts.get(contactId);
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    return contact;
  }

  private findImport(importId: string): ImportRecord {
    const record = this.imports.get(importId);
    if (!record) {
      throw new NotFoundException('Import not found');
    }
    return record;
  }

  private findProgram(programId: string): ProgramRecord {
    const program = this.programs.get(programId);
    if (!program) {
      throw new NotFoundException('Program not found');
    }
    return program;
  }

  private findSession(sessionId: string): ProgramSessionRecord {
    const programs = Array.from(this.programs.values());
    for (const program of programs) {
      const session = program.sessions.find((item) => item.id === sessionId);
      if (session) {
        return session;
      }
    }

    throw new NotFoundException('Session not found');
  }

  private findTicket(ticketId: string): TicketRecord {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  private findEditRequest(requestId: string): EditRequestRecord {
    const request = this.editRequests.get(requestId);
    if (!request) {
      throw new NotFoundException('Edit request not found');
    }
    return request;
  }

  private findDocumentFolder(folderId: string): DocumentFolderRecord {
    const folder = this.documentFolders.get(folderId);
    if (!folder) {
      throw new NotFoundException('Document folder not found');
    }
    return folder;
  }

  private findDocument(documentId: string): DocumentRecord {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  private findReportTemplate(templateId: string): ReportTemplateRecord {
    const template = this.reportTemplates.get(templateId);
    if (!template) {
      throw new NotFoundException('Report template not found');
    }
    return template;
  }

  private findReportSubmission(submissionId: string): ReportSubmissionRecord {
    const submission = this.reportSubmissions.get(submissionId);
    if (!submission) {
      throw new NotFoundException('Report submission not found');
    }
    return submission;
  }

  private findApprovalWorkflow(workflowId: string): ApprovalWorkflowRecord {
    const workflow = this.approvalWorkflows.get(workflowId);
    if (!workflow) {
      throw new NotFoundException('Approval workflow not found');
    }
    return workflow;
  }

  private findApprovalItem(itemId: string): ApprovalItemRecord {
    const item = this.approvalItems.get(itemId);
    if (!item) {
      throw new NotFoundException('Approval item not found');
    }
    return item;
  }

  private applyApprovedProfileUpdate(request: EditRequestRecord): void {
    if (!request.contactId) {
      return;
    }

    const contact = this.contacts.get(request.contactId);
    if (!contact) {
      return;
    }

    if (request.field === 'firstName') {
      contact.firstName = request.requestedValue;
    } else if (request.field === 'lastName') {
      contact.lastName = request.requestedValue;
    } else if (request.field === 'address') {
      contact.address = request.requestedValue;
    } else if (request.field === 'phonePrimary' || request.field === 'phone') {
      contact.phone = request.requestedValue;
    } else if (request.field === 'emailPrimary' || request.field === 'email') {
      contact.email = request.requestedValue;
    }

    contact.updatedAt = new Date().toISOString();
    this.contacts.set(contact.id, contact);
  }

  private newId(prefix: string): string {
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${random}`;
  }

  private clearServiceSrenyForZone(zoneId: string, excludeSrenyId?: string): void {
    for (const [id, sreny] of this.srenies.entries()) {
      if (sreny.zoneId !== zoneId) {
        continue;
      }

      if (excludeSrenyId && id === excludeSrenyId) {
        continue;
      }

      if (!sreny.isServiceSreny) {
        continue;
      }

      this.srenies.set(id, {
        ...sreny,
        isServiceSreny: false,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  private normalizeCustomMetadata(
    raw: Record<string, Record<string, string>> | undefined,
    allowedSrenyIds: string[],
  ): Record<string, Record<string, string>> {
    if (!raw) {
      return {};
    }

    const allowed = new Set(allowedSrenyIds);
    const result: Record<string, Record<string, string>> = {};

    for (const [srenyId, metadata] of Object.entries(raw)) {
      if (!allowed.has(srenyId)) {
        throw new BadRequestException('Custom metadata keys must match the contact sreny memberships');
      }

      this.findSreny(srenyId);
      result[srenyId] = this.normalizeMetadataFields(metadata);
    }

    return result;
  }

  private normalizeMetadataFields(metadata: Record<string, unknown>): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(metadata)) {
      const safeKey = key.trim();
      if (!safeKey) {
        continue;
      }

      normalized[safeKey] = String(value ?? '').trim();
    }

    return normalized;
  }

  private pruneMetadataByMembership(
    metadataBySreny: Record<string, Record<string, string>>,
    activeSrenyIds: string[],
  ): Record<string, Record<string, string>> {
    const active = new Set(activeSrenyIds);
    const result: Record<string, Record<string, string>> = {};

    for (const [srenyId, metadata] of Object.entries(metadataBySreny)) {
      if (active.has(srenyId)) {
        result[srenyId] = metadata;
      }
    }

    return result;
  }

  private propagateMergeAcrossRelations(survivorId: string, mergedId: string): void {
    const survivor = this.findContact(survivorId);
    const merged = this.findContact(mergedId);

    survivor.srenyIds = Array.from(new Set([...survivor.srenyIds, ...merged.srenyIds]));
    survivor.memberships = this.mergeMemberships(survivor.memberships, merged.memberships);
    survivor.customMetadataBySreny = {
      ...merged.customMetadataBySreny,
      ...survivor.customMetadataBySreny,
    };
    survivor.updatedAt = new Date().toISOString();
    this.contacts.set(survivor.id, survivor);

    for (const program of this.programs.values()) {
      for (const registration of program.registrations) {
        if (registration.contactId === mergedId) {
          registration.contactId = survivorId;
        }
      }

      const deduped = new Map<string, RegistrationRecord>();
      for (const registration of program.registrations) {
        if (!deduped.has(registration.contactId)) {
          deduped.set(registration.contactId, registration);
        }
      }
      program.registrations = Array.from(deduped.values());
      program.updatedAt = new Date().toISOString();
    }

    for (const attendance of this.attendance.values()) {
      if (attendance.contactId === mergedId) {
        attendance.contactId = survivorId;
      }
    }

    for (const ticket of this.tickets.values()) {
      if (ticket.contactId === mergedId) {
        ticket.contactId = survivorId;
      }
      ticket.updatedAt = new Date().toISOString();
    }

    for (const request of this.editRequests.values()) {
      if (request.contactId === mergedId) {
        request.contactId = survivorId;
      }
    }

    for (const assignment of this.governanceAssignments.values()) {
      if (assignment.contactId === mergedId) {
        assignment.contactId = survivorId;
        assignment.updatedAt = new Date().toISOString();
      }
    }

    merged.status = 'deleted';
    merged.updatedAt = new Date().toISOString();
    this.contacts.set(merged.id, merged);
  }

  private mergeMemberships(
    survivor: MembershipRecord[],
    merged: MembershipRecord[],
  ): MembershipRecord[] {
    const index = new Map<string, MembershipRecord>();

    for (const item of [...survivor, ...merged]) {
      if (!index.has(item.srenyId)) {
        index.set(item.srenyId, item);
      }
    }

    return Array.from(index.values());
  }

  private normalizePositions(positions: string[]): string[] {
    const normalized = positions.map((value) => value.trim()).filter((value) => value.length > 0);
    const unique = Array.from(new Set(normalized));

    if (unique.length === 0) {
      throw new BadRequestException('At least one governance position is required');
    }

    return unique;
  }

  private ensurePositionExists(structure: GovernanceStructureRecord, positionName: string): void {
    const normalized = positionName.trim().toLowerCase();
    const hasPosition = structure.positions.some((position) => position.toLowerCase() === normalized);
    if (!hasPosition) {
      throw new BadRequestException('Position is not part of the governance structure');
    }
  }

  private ensureContactInSreny(contactId: string, srenyId: string): void {
    const contact = this.findContact(contactId);
    const inSreny = contact.srenyIds.includes(srenyId);
    if (!inSreny) {
      throw new BadRequestException('Governance assignee must belong to the selected sreny');
    }
  }

  private validateDateWindow(startDate: string, endDate?: string): void {
    const startMs = Date.parse(startDate);
    if (Number.isNaN(startMs)) {
      throw new BadRequestException('startDate must be a valid date');
    }

    if (!endDate) {
      return;
    }

    const endMs = Date.parse(endDate);
    if (Number.isNaN(endMs)) {
      throw new BadRequestException('endDate must be a valid date');
    }

    if (endMs < startMs) {
      throw new BadRequestException('endDate cannot be earlier than startDate');
    }
  }

  private ensureSessionWithinProgramWindow(
    program: ProgramRecord,
    sessionStartAt: string,
    sessionEndAt: string,
  ): void {
    const sessionStartMs = Date.parse(sessionStartAt);
    const sessionEndMs = Date.parse(sessionEndAt);
    const programStartMs = Date.parse(program.startDate);
    const programEndMs = Date.parse(program.endDate);

    if (
      Number.isNaN(sessionStartMs) ||
      Number.isNaN(sessionEndMs) ||
      Number.isNaN(programStartMs) ||
      Number.isNaN(programEndMs)
    ) {
      throw new BadRequestException('Program and session dates must be valid');
    }

    if (sessionStartMs < programStartMs || sessionEndMs > programEndMs) {
      throw new BadRequestException('Session must be scheduled within the program date window');
    }
  }

  private appendTicketActivity(
    ticketId: string,
    action: TicketActivityRecord['action'],
    actorId: string,
    details?: Record<string, string>,
  ): void {
    const record: TicketActivityRecord = {
      id: this.newId('tka'),
      ticketId,
      action,
      actorId,
      details,
      createdAt: new Date().toISOString(),
    };

    this.ticketActivity.set(record.id, record);
  }

  private toCanonicalEditableField(field: string): 'firstName' | 'lastName' | 'address' | 'phone' | 'email' {
    const normalized = field.trim();
    if (normalized === 'firstName') {
      return 'firstName';
    }

    if (normalized === 'lastName') {
      return 'lastName';
    }

    if (normalized === 'address') {
      return 'address';
    }

    if (normalized === 'phone' || normalized === 'phonePrimary') {
      return 'phone';
    }

    if (normalized === 'email' || normalized === 'emailPrimary') {
      return 'email';
    }

    throw new BadRequestException('Requested field is not editable in self-service');
  }

  private readEditableFieldValue(
    profile: ContactRecord,
    field: 'firstName' | 'lastName' | 'address' | 'phone' | 'email',
  ): string {
    if (field === 'firstName') {
      return profile.firstName ?? '';
    }

    if (field === 'lastName') {
      return profile.lastName ?? '';
    }

    if (field === 'address') {
      return profile.address ?? '';
    }

    if (field === 'phone') {
      return profile.phone ?? '';
    }

    return profile.email ?? '';
  }

  private async withImportWorkflowLock<T>(work: () => T | Promise<T>): Promise<T> {
    const previousLock = this.importWorkflowLock;
    let releaseLock: () => void = () => undefined;

    this.importWorkflowLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    await previousLock;

    try {
      return await work();
    } finally {
      releaseLock();
    }
  }

  private buildRuntimeSnapshot(): CoreBusinessRuntimeSnapshot {
    return {
      version: 1,
      locations: Array.from(this.locations.values()),
      zones: Array.from(this.zones.values()),
      srenies: Array.from(this.srenies.values()),
      sthans: Array.from(this.sthans.values()),
      contacts: Array.from(this.contacts.values()),
      governanceStructures: Array.from(this.governanceStructures.values()),
      governanceAssignments: Array.from(this.governanceAssignments.values()),
      imports: Array.from(this.imports.values()),
      programs: Array.from(this.programs.values()),
      attendance: Array.from(this.attendance.values()),
      tickets: Array.from(this.tickets.values()),
      ticketActivity: Array.from(this.ticketActivity.values()),
      editRequests: Array.from(this.editRequests.values()),
      documentFolders: Array.from(this.documentFolders.values()),
      documents: Array.from(this.documents.values()),
      reportTemplates: Array.from(this.reportTemplates.values()),
      reportSubmissions: Array.from(this.reportSubmissions.values()),
      approvalWorkflows: Array.from(this.approvalWorkflows.values()),
      approvalItems: Array.from(this.approvalItems.values()),
      approvalNotifications: Array.from(this.approvalNotifications.values()),
      permissions: Array.from(this.permissions.values()),
      permissionSets: Array.from(this.permissionSets.values()),
      users: Array.from(this.users.values()),
      calendarEvents: Array.from(this.calendarEvents.values()),
      attendanceMetrics: Array.from(this.attendanceMetrics.values()),
      eventAttendanceCaptures: Array.from(this.eventAttendanceCaptures.values()),
    };
  }

  private hydrateRuntimeSnapshot(snapshotJson: string): void {
    const parsed = JSON.parse(snapshotJson) as CoreBusinessRuntimeSnapshot;
    if (parsed.version !== 1) {
      throw new BadRequestException('Unsupported Core Business runtime snapshot version');
    }

    this.loadMap(this.locations, parsed.locations ?? []);
    this.loadMap(this.zones, parsed.zones);
    this.loadMap(this.srenies, parsed.srenies);
    this.loadMap(this.sthans, parsed.sthans);
    this.loadMap(this.contacts, parsed.contacts);
    this.loadMap(this.governanceStructures, parsed.governanceStructures);
    this.loadMap(this.governanceAssignments, parsed.governanceAssignments);
    this.loadMap(this.imports, parsed.imports);
    this.loadMap(this.programs, parsed.programs);
    this.loadMap(this.attendance, parsed.attendance);
    this.loadMap(this.tickets, parsed.tickets);
    this.loadMap(this.ticketActivity, parsed.ticketActivity);
    this.loadMap(this.editRequests, parsed.editRequests);
    this.loadMap(this.documentFolders, parsed.documentFolders);
    this.loadMap(this.documents, parsed.documents);
    this.loadMap(this.reportTemplates, parsed.reportTemplates);
    this.loadMap(this.reportSubmissions, parsed.reportSubmissions);
    this.loadMap(this.approvalWorkflows, parsed.approvalWorkflows);
    this.loadMap(this.approvalItems, parsed.approvalItems);
    this.loadMap(this.approvalNotifications, parsed.approvalNotifications);
    this.loadMap(this.permissions, parsed.permissions ?? []);
    this.loadMap(this.permissionSets, parsed.permissionSets ?? []);
    this.loadMap(this.users, parsed.users ?? []);
    this.loadMap(this.calendarEvents, parsed.calendarEvents ?? []);
    this.loadMap(this.attendanceMetrics, parsed.attendanceMetrics ?? []);
    this.loadMap(this.eventAttendanceCaptures, parsed.eventAttendanceCaptures ?? []);
  }

  private async hydrateRuntimeStateFromDatabase(): Promise<void> {
    const [
      locationRows,
      zoneRows,
      _srenyRows,
      contactRows,
      _membershipRows,
      metadataRows,
      importBatchRows,
      dedupCandidateRows,
      programRows,
      sessionRows,
      registrationRows,
      attendanceRows,
      ticketRows,
      ticketCommentRows,
      documentFolderRows,
      documentRows,
      reportTemplateRows,
      reportTemplateFieldRows,
      reportSubmissionRows,
      approvalWorkflowRows,
      approvalWorkflowStepRows,
      approvalItemRows,
      permissionRows,
      permissionSetRows,
      permissionSetItemRows,
      userRows,
      sreniContactRows,
      calendarEventRows,
      attendanceMetricRows,
      eventAttendanceCaptureRows,
    ] = await Promise.all([
      this.dataSource!.query(
        'SELECT id, code, name, level, active, created_at, updated_at FROM adwest.locations ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, code, name, created_at, updated_at FROM adwest.zones ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, zone_id, name, description, code, active, is_service_sreny, created_by, updated_by, created_at, updated_at FROM adwest.srenies ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, zone_id, first_name, last_name, email_primary, phone_primary, address, status, created_at, updated_at FROM adwest.contacts ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT contact_id, sreny_id, joined_date, created_at FROM adwest.sreny_memberships ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT contact_id, sreny_id, metadata FROM adwest.contact_sreny_metadata ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, zone_id, filename, status, summary, created_at FROM adwest.import_batches ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, batch_id, incoming, matched_contact_id, resolution, created_at FROM adwest.dedup_candidates ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, sreny_id, name, category, start_date, end_date, venue, max_participants, status, description, created_at, updated_at FROM adwest.programs ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, program_id, date, start_time, end_time, venue, created_at, updated_at FROM adwest.program_sessions ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, program_id, contact_id, status, registered_at, created_at, updated_at FROM adwest.registrations ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, session_id, contact_id, status, method, marked_by, marked_at, created_at, updated_at FROM adwest.attendance ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, contact_id, zone_id, category, subject, description, priority, status, assigned_to, created_at, updated_at FROM adwest.helpdesk_tickets ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, ticket_id, author_id, author_type, body, created_at FROM adwest.ticket_comments ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, sreny_id, parent_folder_id, name, created_at, updated_at FROM adwest.document_folders ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, sreny_id, folder_id, source_document_id, file_name, file_type, category, description, version, access_level, linked_entity_type, linked_entity_id, uploaded_by, created_at, updated_at FROM adwest.documents ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, sreny_id, name, created_at, updated_at FROM adwest.report_templates ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, template_id, field_key, label, field_type, required, options, display_order, created_at, updated_at FROM adwest.report_template_fields ORDER BY template_id ASC, display_order ASC',
      ),
      this.dataSource!.query(
        'SELECT id, template_id, submitted_by, answers, status, reviewed_by, reviewed_at, review_note, created_at, updated_at FROM adwest.report_submissions ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, name, target_type, mode, escalation_hours, active, created_at, updated_at FROM adwest.approval_workflows ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, workflow_id, step_name, step_order, created_at, updated_at FROM adwest.approval_workflow_steps ORDER BY workflow_id ASC, step_order ASC',
      ),
      this.dataSource!.query(
        'SELECT id, workflow_id, target_id, target_type, summary, status, current_step_index, submitted_by, due_at, escalation_count, last_escalated_at, audit_trail, reviewed_by, reviewed_at, review_note, created_at, updated_at FROM adwest.approval_items ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, location_id, sreni_id, code, name, description, active, created_at, updated_at, created_by, updated_by FROM adwest.permissions ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, name, description, active, created_at, updated_at, created_by, updated_by FROM adwest.permission_sets ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT permission_set_id, permission_id FROM adwest.permission_set_items',
      ),
      this.dataSource!.query(
        'SELECT id, code, name, phone, email, role_id, sthan_id, permission_set_id, admin_management, password_hash, is_super_admin, must_reset_password, active, created_at, updated_at, created_by, updated_by FROM adwest.users ORDER BY created_at ASC',
      ),
      this.dataSource!.query(
        'SELECT id, sreni_id, row_index, data, source_file, uploaded_by, created_at, updated_at FROM adwest.sreni_contacts ORDER BY sreni_id ASC, row_index ASC',
      ).catch(() => [] as unknown[]),
      this.dataSource!.query(
        'SELECT id, sreni_id, title, event_date, start_time, end_time, color, notes, scope, sthan_ids, created_by, updated_by, created_at, updated_at FROM adwest.sreni_calendar_events ORDER BY event_date ASC, start_time ASC',
      ).catch(() => [] as unknown[]),
      this.dataSource!.query(
        'SELECT id, sreni_id, name, description, metric_keys, active, created_by, updated_by, created_at, updated_at FROM adwest.sreni_attendance_metrics ORDER BY sreni_id ASC, name ASC',
      ).catch(() => [] as unknown[]),
      this.dataSource!.query(
        'SELECT id, sreni_id, event_id, metric_id, values_json, captured_by, captured_at, updated_at FROM adwest.sreni_event_attendance_captures ORDER BY captured_at ASC',
      ).catch(() => [] as unknown[]),
    ]);

    this.locations.clear();
    this.zones.clear();
    this.srenies.clear();
    this.contacts.clear();
    this.imports.clear();
    this.programs.clear();
    this.attendance.clear();
    this.tickets.clear();
    this.documentFolders.clear();
    this.documents.clear();
    this.reportTemplates.clear();
    this.reportSubmissions.clear();
    this.approvalWorkflows.clear();
    this.approvalItems.clear();
    this.permissions.clear();
    this.permissionSets.clear();
    this.sreniContacts.clear();
    this.calendarEvents.clear();
    this.attendanceMetrics.clear();
    this.eventAttendanceCaptures.clear();

    for (const row of locationRows as Array<{ id: string; code: string | null; name: string; level: string; active: boolean; created_at: string | Date; updated_at: string | Date }>) {
      this.locations.set(row.id, {
        id: row.id,
        code: row.code ?? undefined,
        name: row.name,
        level: row.level as 'zone' | 'sthan',
        active: row.active,
        createdAt: this.toIsoTimestamp(row.created_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      });
    }

    for (const row of zoneRows as Array<{ id: string; code?: string; name: string; created_at: string | Date; updated_at: string | Date }>) {
      this.zones.set(row.id, {
        id: row.id,
        code: row.code ?? undefined,
        name: row.name,
        createdAt: this.toIsoTimestamp(row.created_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      });
    }

    const metadataByContact = new Map<string, Record<string, Record<string, string>>>();
    const membershipsByContact = new Map<string, MembershipRecord[]>();

    for (const row of metadataRows as Array<{ contact_id: string; sreny_id: string; metadata: Record<string, unknown> }>) {
      const contactMetadata = metadataByContact.get(row.contact_id) ?? {};
      contactMetadata[row.sreny_id] = Object.fromEntries(
        Object.entries(row.metadata ?? {}).map(([key, value]) => [key, String(value ?? '')]),
      );
      metadataByContact.set(row.contact_id, contactMetadata);
    }

    for (const row of contactRows as Array<{
      id: string;
      zone_id: string;
      first_name: string;
      last_name: string;
      email_primary?: string;
      phone_primary?: string;
      address?: string;
      status: string;
      created_at: string | Date;
      updated_at: string | Date;
    }>) {
      const memberships = membershipsByContact.get(row.id) ?? [];
      const srenyIds = memberships.map((item) => item.srenyId);

      this.contacts.set(row.id, {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email_primary ?? undefined,
        phone: row.phone_primary ?? undefined,
        zoneId: row.zone_id,
        srenyIds,
        address: row.address ?? undefined,
        customMetadataBySreny: metadataByContact.get(row.id) ?? {},
        status: row.status === 'deleted' ? 'deleted' : 'active',
        memberships,
        createdAt: this.toIsoTimestamp(row.created_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      });
    }

    const duplicatesByBatch = new Map<string, DuplicateRecord[]>();
    for (const row of importBatchRows as Array<{
      id: string;
      zone_id: string;
      filename: string;
      status: ImportRecord['status'];
      summary: Record<string, unknown>;
      created_at: string | Date;
    }>) {
      duplicatesByBatch.set(row.id, []);
      const summary = row.summary ?? {};
      this.imports.set(row.id, {
        id: row.id,
        fileName: row.filename,
        fileType: (summary.fileType as 'csv' | 'xlsx') ?? 'csv',
        status: row.status,
        acceptedRows: Number(summary.acceptedRows ?? 0),
        duplicateRows: Number(summary.duplicateRows ?? 0),
        processedRows: Number(summary.processedRows ?? 0),
        validationErrorRows: Number(summary.validationErrorRows ?? 0),
        failedReason: (summary.failedReason as string | undefined) ?? undefined,
        mappingProfileId: (summary.mappingProfileId as string | undefined) ?? undefined,
        hasHeader: Boolean(summary.hasHeader ?? true),
        createdAt: this.toIsoTimestamp(row.created_at),
        finalizedAt: (summary.finalizedAt as string | undefined) ?? undefined,
        duplicates: [],
      });
    }

    for (const row of dedupCandidateRows as Array<{
      id: string;
      batch_id: string;
      incoming: Record<string, unknown>;
      matched_contact_id?: string | null;
      resolution: DuplicateRecord['decision'];
      created_at: string | Date;
    }>) {
      const duplicates = duplicatesByBatch.get(row.batch_id) ?? [];
      duplicates.push({
        id: row.id,
        leftContactId: String(row.incoming.leftContactId ?? ''),
        rightContactId: String(row.incoming.rightContactId ?? ''),
        decision: row.resolution,
      });
      duplicatesByBatch.set(row.batch_id, duplicates);
    }

    for (const importRecord of this.imports.values()) {
      importRecord.duplicates = duplicatesByBatch.get(importRecord.id) ?? [];
      importRecord.duplicateRows = importRecord.duplicates.length;
    }

    const programsById = new Map<string, ProgramRecord>();
    for (const row of programRows as Array<{
      id: string;
      sreny_id: string;
      name: string;
      category?: string | null;
      start_date: string | Date;
      end_date: string | Date;
      venue?: string | null;
      max_participants?: number | null;
      status: ProgramStatus;
      description?: string | null;
      created_at: string | Date;
      updated_at: string | Date;
    }>) {
      const program: ProgramRecord = {
        id: row.id,
        title: row.name,
        description: row.description ?? undefined,
        startDate: this.toDateOnly(row.start_date),
        endDate: this.toDateOnly(row.end_date),
        capacity: Number(row.max_participants ?? 0),
        status: row.status,
        sessions: [],
        registrations: [],
        createdAt: this.toIsoTimestamp(row.created_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      };
      programsById.set(program.id, program);
      this.programs.set(program.id, program);
    }

    for (const row of sessionRows as Array<{
      id: string;
      program_id: string;
      date: string | Date;
      start_time: string | Date;
      end_time: string | Date;
      venue?: string | null;
      created_at: string | Date;
      updated_at: string | Date;
    }>) {
      const program = programsById.get(row.program_id);
      if (!program) {
        continue;
      }

      program.sessions.push({
        id: row.id,
        name: row.venue ?? 'Session',
        startAt: this.combineDateAndTime(row.date, row.start_time),
        endAt: this.combineDateAndTime(row.date, row.end_time),
      });
    }

    for (const row of registrationRows as Array<{
      id: string;
      program_id: string;
      contact_id: string;
      status: string;
      registered_at: string | Date;
    }>) {
      const program = programsById.get(row.program_id);
      if (!program) {
        continue;
      }

      program.registrations.push({
        id: row.id,
        programId: row.program_id,
        contactId: row.contact_id,
        createdAt: this.toIsoTimestamp(row.registered_at),
      });
    }

    for (const row of attendanceRows as Array<{
      id: string;
      session_id: string;
      contact_id: string;
      status: AttendanceRecord['state'];
      method?: string | null;
      marked_by?: string | null;
      marked_at: string | Date;
    }>) {
      this.attendance.set(row.id, {
        id: row.id,
        sessionId: row.session_id,
        contactId: row.contact_id,
        state: row.status,
        notes: row.method ?? undefined,
        recordedAt: this.toIsoTimestamp(row.marked_at),
        recordedBy: row.marked_by ?? 'system',
      });
    }

    const commentsByTicket = new Map<string, TicketCommentRecord[]>();
    for (const row of ticketCommentRows as Array<{
      id: string;
      ticket_id: string;
      author_id?: string | null;
      author_type: string;
      body: string;
      created_at: string | Date;
    }>) {
      const comments = commentsByTicket.get(row.ticket_id) ?? [];
      comments.push({
        id: row.id,
        authorId: row.author_id ?? 'system',
        body: row.body,
        createdAt: this.toIsoTimestamp(row.created_at),
      });
      commentsByTicket.set(row.ticket_id, comments);
    }

    for (const row of ticketRows as Array<{
      id: string;
      contact_id: string;
      zone_id: string;
      category: string;
      subject: string;
      description: string;
      priority: TicketRecord['priority'];
      status: TicketStatus;
      assigned_to?: string | null;
      created_at: string | Date;
      updated_at: string | Date;
    }>) {
      this.tickets.set(row.id, {
        id: row.id,
        contactId: row.contact_id,
        subject: row.subject,
        description: row.description,
        category: row.category,
        priority: row.priority,
        status: row.status,
        assigneeId: row.assigned_to ?? undefined,
        comments: commentsByTicket.get(row.id) ?? [],
        createdAt: this.toIsoTimestamp(row.created_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      });
    }

    for (const row of documentFolderRows as Array<{
      id: string;
      sreny_id: string;
      parent_folder_id?: string | null;
      name: string;
      created_at: string | Date;
      updated_at: string | Date;
    }>) {
      this.documentFolders.set(row.id, {
        id: row.id,
        srenyId: row.sreny_id,
        parentFolderId: row.parent_folder_id ?? undefined,
        name: row.name,
        createdAt: this.toIsoTimestamp(row.created_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      });
    }

    for (const row of documentRows as Array<{
      id: string;
      sreny_id: string;
      folder_id?: string | null;
      source_document_id?: string | null;
      file_name: string;
      file_type: string;
      category?: string | null;
      description?: string | null;
      version: number;
      access_level: DocumentRecord['accessLevel'];
      linked_entity_type?: string | null;
      linked_entity_id?: string | null;
      uploaded_by: string;
      created_at: string | Date;
      updated_at: string | Date;
    }>) {
      this.documents.set(row.id, {
        id: row.id,
        srenyId: row.sreny_id,
        folderId: row.folder_id ?? undefined,
        fileName: row.file_name,
        fileType: row.file_type,
        category: row.category ?? undefined,
        description: row.description ?? undefined,
        version: Number(row.version ?? 1),
        accessLevel: row.access_level,
        linkedEntityType: row.linked_entity_type ?? undefined,
        linkedEntityId: row.linked_entity_id ?? undefined,
        uploadedBy: row.uploaded_by,
        sourceDocumentId: row.source_document_id ?? undefined,
        createdAt: this.toIsoTimestamp(row.created_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      });
    }

    const fieldsByTemplate = new Map<string, ReportTemplateRecord['fields']>();
    for (const row of reportTemplateFieldRows as Array<{
      id: string;
      template_id: string;
      field_key: string;
      label: string;
      field_type: 'text' | 'number' | 'date' | 'file' | 'dropdown';
      required: boolean;
      options?: string[] | null;
      display_order: number;
      created_at: string | Date;
      updated_at: string | Date;
    }>) {
      const fields = fieldsByTemplate.get(row.template_id) ?? [];
      fields.push({
        key: row.field_key,
        label: row.label,
        type: row.field_type,
        required: Boolean(row.required),
        options: Array.isArray(row.options) ? row.options : undefined,
      });
      fieldsByTemplate.set(row.template_id, fields);
    }

    for (const row of reportTemplateRows as Array<{
      id: string;
      sreny_id: string;
      name: string;
      created_at: string | Date;
      updated_at: string | Date;
    }>) {
      this.reportTemplates.set(row.id, {
        id: row.id,
        srenyId: row.sreny_id,
        name: row.name,
        fields: fieldsByTemplate.get(row.id) ?? [],
        createdAt: this.toIsoTimestamp(row.created_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      });
    }

    for (const row of reportSubmissionRows as Array<{
      id: string;
      template_id: string;
      submitted_by: string;
      answers: Record<string, string>;
      status: ReportSubmissionRecord['status'];
      reviewed_by?: string | null;
      reviewed_at?: string | Date | null;
      review_note?: string | null;
      created_at: string | Date;
      updated_at: string | Date;
    }>) {
      this.reportSubmissions.set(row.id, {
        id: row.id,
        templateId: row.template_id,
        submittedBy: row.submitted_by,
        answers: Object.fromEntries(
          Object.entries(row.answers ?? {}).map(([key, value]) => [key, String(value ?? '')]),
        ),
        status: row.status,
        reviewedBy: row.reviewed_by ?? undefined,
        reviewedAt: row.reviewed_at ? this.toIsoTimestamp(row.reviewed_at) : undefined,
        reviewNote: row.review_note ?? undefined,
        createdAt: this.toIsoTimestamp(row.created_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      });
    }

    const stepsByWorkflow = new Map<string, string[]>();
    for (const row of approvalWorkflowStepRows as Array<{
      id: string;
      workflow_id: string;
      step_name: string;
      step_order: number;
      created_at: string | Date;
      updated_at: string | Date;
    }>) {
      const steps = stepsByWorkflow.get(row.workflow_id) ?? [];
      steps.push(row.step_name);
      stepsByWorkflow.set(row.workflow_id, steps);
    }

    for (const row of approvalWorkflowRows as Array<{
      id: string;
      name: string;
      target_type: ApprovalWorkflowRecord['targetType'];
      mode?: ApprovalWorkflowRecord['mode'] | null;
      escalation_hours?: number | null;
      active: boolean;
      created_at: string | Date;
      updated_at: string | Date;
    }>) {
      this.approvalWorkflows.set(row.id, {
        id: row.id,
        name: row.name,
        targetType: row.target_type,
        mode: row.mode ?? 'sequential',
        steps: stepsByWorkflow.get(row.id) ?? ['Default Review'],
        escalationHours:
          row.escalation_hours === null || row.escalation_hours === undefined
            ? undefined
            : Number(row.escalation_hours),
        active: Boolean(row.active),
        createdAt: this.toIsoTimestamp(row.created_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      });
    }

    for (const row of approvalItemRows as Array<{
      id: string;
      workflow_id: string;
      target_id: string;
      target_type?: ApprovalItemRecord['targetType'] | null;
      summary?: string | null;
      status: ApprovalItemRecord['status'];
      current_step_index: number;
      submitted_by: string;
      due_at?: string | Date | null;
      escalation_count?: number | null;
      last_escalated_at?: string | Date | null;
      audit_trail?: Array<Record<string, unknown>> | null;
      reviewed_by?: string | null;
      reviewed_at?: string | Date | null;
      review_note?: string | null;
      created_at: string | Date;
      updated_at: string | Date;
    }>) {
      const auditTrailRows = Array.isArray(row.audit_trail) ? row.audit_trail : [];
      this.approvalItems.set(row.id, {
        id: row.id,
        workflowId: row.workflow_id,
        targetId: row.target_id,
        targetType: row.target_type ?? undefined,
        summary: row.summary ?? undefined,
        status: row.status,
        currentStepIndex: Number(row.current_step_index ?? 0),
        submittedBy: row.submitted_by,
        dueAt: row.due_at ? this.toIsoTimestamp(row.due_at) : undefined,
        escalationCount: Number(row.escalation_count ?? 0),
        lastEscalatedAt: row.last_escalated_at
          ? this.toIsoTimestamp(row.last_escalated_at)
          : undefined,
        auditTrail: auditTrailRows.map((entry, index) => ({
          id: String(entry.id ?? this.newId(`apat_h${index}`)),
          action: (entry.action as ApprovalAuditEntryRecord['action']) ?? 'submitted',
          actorId: String(entry.actorId ?? entry.actor_id ?? 'system'),
          stepIndex: Number(entry.stepIndex ?? entry.step_index ?? 0),
          note:
            entry.note === undefined || entry.note === null
              ? undefined
              : String(entry.note),
          createdAt: this.toIsoTimestamp(
            (entry.createdAt ?? entry.created_at ?? row.created_at) as string | Date,
          ),
        })),
        reviewedBy: row.reviewed_by ?? undefined,
        reviewedAt: row.reviewed_at ? this.toIsoTimestamp(row.reviewed_at) : undefined,
        reviewNote: row.review_note ?? undefined,
        createdAt: this.toIsoTimestamp(row.created_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      });
    }

    for (const row of permissionRows as Array<{
      id: string; location_id: string; sreni_id: string; code: string; name: string;
      description: string | null; active: boolean;
      created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null;
    }>) {
      this.permissions.set(row.id, {
        id: row.id, locationId: row.location_id, sreniId: row.sreni_id,
        code: row.code, name: row.name,
        description: row.description ?? undefined,
        active: row.active,
        createdAt: this.toIsoTimestamp(row.created_at), updatedAt: this.toIsoTimestamp(row.updated_at),
        createdBy: row.created_by ?? undefined, updatedBy: row.updated_by ?? undefined,
      });
    }

    const permItemsBySet = new Map<string, string[]>();
    for (const row of permissionSetItemRows as Array<{ permission_set_id: string; permission_id: string }>) {
      const ids = permItemsBySet.get(row.permission_set_id) ?? [];
      ids.push(row.permission_id);
      permItemsBySet.set(row.permission_set_id, ids);
    }

    for (const row of permissionSetRows as Array<{
      id: string; name: string; description: string | null; active: boolean;
      created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null;
    }>) {
      this.permissionSets.set(row.id, {
        id: row.id, name: row.name, description: row.description ?? undefined,
        active: row.active, permissionIds: permItemsBySet.get(row.id) ?? [],
        createdAt: this.toIsoTimestamp(row.created_at), updatedAt: this.toIsoTimestamp(row.updated_at),
        createdBy: row.created_by ?? undefined, updatedBy: row.updated_by ?? undefined,
      });
    }

    for (const row of userRows as Array<{
      id: string; code: string; name: string; phone: string | null; email: string | null;
      role_id: string | null; sthan_id: string | null; permission_set_id: string | null; admin_management: string | null;
      password_hash: string | null; is_super_admin: boolean; must_reset_password: boolean; active: boolean;
      created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null;
    }>) {
      this.users.set(row.id, {
        id: row.id, code: row.code, name: row.name,
        phone: row.phone ?? undefined, email: row.email ?? undefined,
        roleId: row.role_id ?? undefined, sthanId: row.sthan_id ?? undefined,
        permissionSetId: row.permission_set_id ?? undefined,
        adminManagement: row.admin_management ?? undefined,
        passwordHash: row.password_hash ?? undefined,
        isSuperAdmin: row.is_super_admin,
        mustResetPassword: row.must_reset_password,
        active: row.active,
        createdAt: this.toIsoTimestamp(row.created_at), updatedAt: this.toIsoTimestamp(row.updated_at),
        createdBy: row.created_by ?? undefined, updatedBy: row.updated_by ?? undefined,
      });
    }

    for (const row of sreniContactRows as Array<{
      id: string; sreni_id: string; row_index: number;
      data: Record<string, string | number | boolean | null>;
      source_file: string | null; uploaded_by: string | null;
      created_at: string | Date; updated_at: string | Date;
    }>) {
      const r: SreniContactRecord = {
        id: row.id,
        sreniId: row.sreni_id,
        rowIndex: row.row_index,
        data: row.data ?? {},
        sourceFile: row.source_file ?? undefined,
        uploadedBy: row.uploaded_by ?? undefined,
        createdAt: this.toIsoTimestamp(row.created_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      };
      this.sreniContacts.set(`${r.sreniId}:${r.id}`, r);
    }

    for (const row of calendarEventRows as Array<{
      id: string; sreni_id: string; title: string; event_date: string | Date;
      start_time: string; end_time: string; color: string; notes: string | null;
      scope: 'zone' | 'sthan'; sthan_ids: string[] | null;
      created_by: string; updated_by: string;
      created_at: string | Date; updated_at: string | Date;
    }>) {
      this.calendarEvents.set(row.id, {
        id: row.id,
        sreniId: row.sreni_id,
        title: row.title,
        date: this.toDateOnly(row.event_date),
        startTime: String(row.start_time).slice(0, 5),
        endTime: String(row.end_time).slice(0, 5),
        color: row.color,
        notes: row.notes ?? undefined,
        scope: row.scope,
        sthanIds: Array.isArray(row.sthan_ids) ? row.sthan_ids : [],
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: this.toIsoTimestamp(row.created_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      });
    }

    for (const row of attendanceMetricRows as Array<{
      id: string; sreni_id: string; name: string; description: string | null;
      metric_keys: string[] | null; active: boolean; created_by: string; updated_by: string;
      created_at: string | Date; updated_at: string | Date;
    }>) {
      this.attendanceMetrics.set(row.id, {
        id: row.id,
        sreniId: row.sreni_id,
        name: row.name,
        description: row.description ?? undefined,
        keys: Array.isArray(row.metric_keys) ? row.metric_keys : [],
        active: row.active,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: this.toIsoTimestamp(row.created_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      });
    }

    for (const row of eventAttendanceCaptureRows as Array<{
      id: string; sreni_id: string; event_id: string; metric_id: string;
      values_json: Record<string, string | number | boolean | null> | null;
      captured_by: string; captured_at: string | Date; updated_at: string | Date;
    }>) {
      this.eventAttendanceCaptures.set(row.id, {
        id: row.id,
        sreniId: row.sreni_id,
        eventId: row.event_id,
        metricId: row.metric_id,
        values: row.values_json ?? {},
        capturedBy: row.captured_by,
        capturedAt: this.toIsoTimestamp(row.captured_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      });
    }
  }

  private loadMap<T extends { id: string }>(target: Map<string, T>, rows: T[]): void {
    target.clear();
    for (const row of rows) {
      target.set(row.id, row);
    }
  }

  private async flushStateToStore(): Promise<void> {
    if (this.store.getMode() !== 'db') {
      return;
    }

    try {
      await this.store.saveState(JSON.stringify(this.buildRuntimeSnapshot()));
    } catch (error) {
      this.logger.warn(`Failed to flush Core Business runtime snapshot: ${(error as Error).message}`);
    }
  }

  private scheduleContactStatePersistence(contactId: string): void {
    if (this.runtimeMode !== 'db' || !this.dataSource) {
      return;
    }

    const contact = this.contacts.get(contactId);
    if (!contact) {
      return;
    }

    const snapshot = this.cloneContact(contact);
    void this.persistContactState(snapshot).catch((error) => {
      this.logger.warn(
        `Failed to persist Core Business contact ${contactId}: ${(error as Error).message}`,
      );
    });
  }

  private scheduleImportStatePersistence(importId: string): void {
    if (this.runtimeMode !== 'db' || !this.dataSource) {
      return;
    }

    const record = this.imports.get(importId);
    if (!record) {
      return;
    }

    const snapshot = this.cloneImportRecord(record);
    void this.persistImportState(snapshot).catch((error) => {
      this.logger.warn(
        `Failed to persist Core Business import ${importId}: ${(error as Error).message}`,
      );
    });
  }

  private async persistImportState(record: ImportRecord): Promise<void> {
    if (!this.dataSource || this.runtimeMode !== 'db') {
      return;
    }

    const summary = {
      fileType: record.fileType,
      acceptedRows: record.acceptedRows,
      duplicateRows: record.duplicateRows,
      processedRows: record.processedRows,
      validationErrorRows: record.validationErrorRows,
      mappingProfileId: record.mappingProfileId,
      hasHeader: record.hasHeader,
      finalizedAt: record.finalizedAt,
      failedReason: record.failedReason,
    };

    await this.dataSource.query(
      `
        INSERT INTO adwest.import_batches (
          id,
          zone_id,
          filename,
          status,
          summary,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6)
        ON CONFLICT (id) DO UPDATE SET
          filename = EXCLUDED.filename,
          status = EXCLUDED.status,
          summary = EXCLUDED.summary
      `,
      [
        record.id,
        this.listZones()[0]?.id ?? this.contacts.values().next().value?.zoneId ?? null,
        record.fileName,
        record.status,
        JSON.stringify(summary),
        record.createdAt,
      ],
    );

    await this.dataSource.query('DELETE FROM adwest.dedup_candidates WHERE batch_id = $1', [
      record.id,
    ]);

    for (const duplicate of record.duplicates) {
      await this.dataSource.query(
        `
          INSERT INTO adwest.dedup_candidates (
            id,
            batch_id,
            incoming,
            matched_contact_id,
            resolution,
            created_at
          )
          VALUES ($1, $2, $3::jsonb, $4, $5, now())
        `,
        [
          duplicate.id,
          record.id,
          JSON.stringify({
            leftContactId: duplicate.leftContactId,
            rightContactId: duplicate.rightContactId,
          }),
          duplicate.decision === 'merged' ? duplicate.leftContactId : null,
          duplicate.decision,
        ],
      );
    }
  }

  private scheduleProgramStatePersistence(programId: string): void {
    if (this.runtimeMode !== 'db' || !this.dataSource) {
      return;
    }

    const program = this.programs.get(programId);
    if (!program) {
      return;
    }

    const snapshot = this.cloneProgram(program);
    void this.withProgramPersistenceLock(() => this.persistProgramState(snapshot)).catch((error) => {
      this.logger.warn(
        `Failed to persist Core Business program ${programId}: ${(error as Error).message}`,
      );
    });
  }

  private async persistProgramState(program: ProgramRecord): Promise<void> {
    if (!this.dataSource || this.runtimeMode !== 'db') {
      return;
    }

    const srenyId = this.listSrenies()[0]?.id;
    if (!srenyId) {
      return;
    }

    await this.dataSource.query(
      `
        INSERT INTO adwest.programs (
          id,
          sreny_id,
          name,
          start_date,
          end_date,
          max_participants,
          status,
          description,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          sreny_id = EXCLUDED.sreny_id,
          name = EXCLUDED.name,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          max_participants = EXCLUDED.max_participants,
          status = EXCLUDED.status,
          description = EXCLUDED.description,
          updated_at = EXCLUDED.updated_at
      `,
      [
        program.id,
        srenyId,
        program.title,
        this.toDateOnly(program.startDate),
        this.toDateOnly(program.endDate),
        program.capacity,
        program.status,
        program.description ?? null,
        program.createdAt,
        program.updatedAt,
      ],
    );

    await this.dataSource.query('DELETE FROM adwest.program_sessions WHERE program_id = $1', [
      program.id,
    ]);
    for (const session of program.sessions) {
      await this.dataSource.query(
        `
          INSERT INTO adwest.program_sessions (
            id,
            program_id,
            date,
            start_time,
            end_time,
            venue,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3::date, $4::time, $5::time, $6, now(), now())
        `,
        [
          session.id,
          program.id,
          this.toDateOnly(session.startAt),
          this.toTimeOnly(session.startAt),
          this.toTimeOnly(session.endAt),
          session.name,
        ],
      );
    }

    await this.dataSource.query('DELETE FROM adwest.registrations WHERE program_id = $1', [
      program.id,
    ]);
    for (const registration of program.registrations) {
      await this.dataSource.query(
        `
          INSERT INTO adwest.registrations (
            id,
            program_id,
            contact_id,
            status,
            registered_at,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, 'registered', $4, now(), now())
        `,
        [registration.id, program.id, registration.contactId, registration.createdAt],
      );
    }
  }

  private scheduleAttendanceStatePersistence(attendanceId: string): void {
    if (this.runtimeMode !== 'db' || !this.dataSource) {
      return;
    }

    const record = this.attendance.get(attendanceId);
    if (!record) {
      return;
    }

    const snapshot = { ...record };
    void this.persistAttendanceState(snapshot).catch((error) => {
      this.logger.warn(
        `Failed to persist Core Business attendance ${attendanceId}: ${(error as Error).message}`,
      );
    });
  }

  private scheduleTicketStatePersistence(ticketId: string): void {
    if (this.runtimeMode !== 'db' || !this.dataSource) {
      return;
    }

    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      return;
    }

    const snapshot = this.cloneTicket(ticket);
    void this.persistTicketState(snapshot).catch((error) => {
      this.logger.warn(
        `Failed to persist Core Business ticket ${ticketId}: ${(error as Error).message}`,
      );
    });
  }

  private scheduleDocumentStatePersistence(entityId: string): void {
    if (this.runtimeMode !== 'db' || !this.dataSource) {
      return;
    }

    const folder = this.documentFolders.get(entityId);
    if (folder) {
      void this.persistDocumentFolderState(folder).catch((error) => {
        this.logger.warn(
          `Failed to persist Core Business document folder ${entityId}: ${(error as Error).message}`,
        );
      });
      return;
    }

    const document = this.documents.get(entityId);
    if (!document) {
      return;
    }

    const snapshot = this.cloneDocument(document);
    void this.persistDocumentState(snapshot).catch((error) => {
      this.logger.warn(
        `Failed to persist Core Business document ${entityId}: ${(error as Error).message}`,
      );
    });
  }

  private scheduleReportTemplateStatePersistence(templateId: string): void {
    if (this.runtimeMode !== 'db' || !this.dataSource) {
      return;
    }

    const template = this.reportTemplates.get(templateId);
    if (!template) {
      return;
    }

    const snapshot = this.cloneReportTemplate(template);
    void this.persistReportTemplateState(snapshot).catch((error) => {
      this.logger.warn(
        `Failed to persist Core Business report template ${templateId}: ${(error as Error).message}`,
      );
    });
  }

  private scheduleReportSubmissionStatePersistence(submissionId: string): void {
    if (this.runtimeMode !== 'db' || !this.dataSource) {
      return;
    }

    const submission = this.reportSubmissions.get(submissionId);
    if (!submission) {
      return;
    }

    const snapshot = this.cloneReportSubmission(submission);
    void this.persistReportSubmissionState(snapshot).catch((error) => {
      this.logger.warn(
        `Failed to persist Core Business report submission ${submissionId}: ${(error as Error).message}`,
      );
    });
  }

  private scheduleApprovalWorkflowStatePersistence(workflowId: string): void {
    if (this.runtimeMode !== 'db' || !this.dataSource) {
      return;
    }

    const workflow = this.approvalWorkflows.get(workflowId);
    if (!workflow) {
      return;
    }

    const snapshot = this.cloneApprovalWorkflow(workflow);
    void this.persistApprovalWorkflowState(snapshot).catch((error) => {
      this.logger.warn(
        `Failed to persist Core Business approval workflow ${workflowId}: ${(error as Error).message}`,
      );
    });
  }

  private scheduleApprovalItemStatePersistence(itemId: string): void {
    if (this.runtimeMode !== 'db' || !this.dataSource) {
      return;
    }

    const item = this.approvalItems.get(itemId);
    if (!item) {
      return;
    }

    const snapshot = this.cloneApprovalItem(item);
    void this.persistApprovalItemState(snapshot).catch((error) => {
      this.logger.warn(
        `Failed to persist Core Business approval item ${itemId}: ${(error as Error).message}`,
      );
    });
  }

  private async persistReportTemplateState(template: ReportTemplateRecord): Promise<void> {
    if (!this.dataSource || this.runtimeMode !== 'db') {
      return;
    }

    await this.dataSource.query(
      `
        INSERT INTO adwest.report_templates (
          id,
          sreny_id,
          name,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          sreny_id = EXCLUDED.sreny_id,
          name = EXCLUDED.name,
          updated_at = EXCLUDED.updated_at
      `,
      [template.id, template.srenyId, template.name, template.createdAt, template.updatedAt],
    );

    await this.dataSource.query('DELETE FROM adwest.report_template_fields WHERE template_id = $1', [
      template.id,
    ]);

    for (const [index, field] of template.fields.entries()) {
      await this.dataSource.query(
        `
          INSERT INTO adwest.report_template_fields (
            id,
            template_id,
            field_key,
            label,
            field_type,
            required,
            options,
            display_order,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
        `,
        [
          this.newId('rtf'),
          template.id,
          field.key,
          field.label,
          field.type,
          field.required,
          JSON.stringify(field.options ?? []),
          index,
          template.createdAt,
          template.updatedAt,
        ],
      );
    }
  }

  private async persistReportSubmissionState(submission: ReportSubmissionRecord): Promise<void> {
    if (!this.dataSource || this.runtimeMode !== 'db') {
      return;
    }

    await this.dataSource.query(
      `
        INSERT INTO adwest.report_submissions (
          id,
          template_id,
          submitted_by,
          answers,
          status,
          reviewed_by,
          reviewed_at,
          review_note,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          template_id = EXCLUDED.template_id,
          submitted_by = EXCLUDED.submitted_by,
          answers = EXCLUDED.answers,
          status = EXCLUDED.status,
          reviewed_by = EXCLUDED.reviewed_by,
          reviewed_at = EXCLUDED.reviewed_at,
          review_note = EXCLUDED.review_note,
          updated_at = EXCLUDED.updated_at
      `,
      [
        submission.id,
        submission.templateId,
        submission.submittedBy,
        JSON.stringify(submission.answers),
        submission.status,
        submission.reviewedBy ?? null,
        submission.reviewedAt ?? null,
        submission.reviewNote ?? null,
        submission.createdAt,
        submission.updatedAt,
      ],
    );
  }

  private async persistApprovalWorkflowState(workflow: ApprovalWorkflowRecord): Promise<void> {
    if (!this.dataSource || this.runtimeMode !== 'db') {
      return;
    }

    await this.dataSource.query(
      `
        INSERT INTO adwest.approval_workflows (
          id,
          name,
          target_type,
          mode,
          escalation_hours,
          active,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          target_type = EXCLUDED.target_type,
          mode = EXCLUDED.mode,
          escalation_hours = EXCLUDED.escalation_hours,
          active = EXCLUDED.active,
          updated_at = EXCLUDED.updated_at
      `,
      [
        workflow.id,
        workflow.name,
        workflow.targetType,
        workflow.mode,
        workflow.escalationHours ?? null,
        workflow.active,
        workflow.createdAt,
        workflow.updatedAt,
      ],
    );

    await this.dataSource.query('DELETE FROM adwest.approval_workflow_steps WHERE workflow_id = $1', [
      workflow.id,
    ]);

    for (const [index, step] of workflow.steps.entries()) {
      await this.dataSource.query(
        `
          INSERT INTO adwest.approval_workflow_steps (
            id,
            workflow_id,
            step_name,
            step_order,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [this.newId('apws'), workflow.id, step, index, workflow.createdAt, workflow.updatedAt],
      );
    }
  }

  private async persistApprovalItemState(item: ApprovalItemRecord): Promise<void> {
    if (!this.dataSource || this.runtimeMode !== 'db') {
      return;
    }

    await this.dataSource.query(
      `
        INSERT INTO adwest.approval_items (
          id,
          workflow_id,
          target_id,
          target_type,
          summary,
          status,
          current_step_index,
          submitted_by,
          due_at,
          escalation_count,
          last_escalated_at,
          audit_trail,
          reviewed_by,
          reviewed_at,
          review_note,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          workflow_id = EXCLUDED.workflow_id,
          target_id = EXCLUDED.target_id,
          target_type = EXCLUDED.target_type,
          summary = EXCLUDED.summary,
          status = EXCLUDED.status,
          current_step_index = EXCLUDED.current_step_index,
          submitted_by = EXCLUDED.submitted_by,
          due_at = EXCLUDED.due_at,
          escalation_count = EXCLUDED.escalation_count,
          last_escalated_at = EXCLUDED.last_escalated_at,
          audit_trail = EXCLUDED.audit_trail,
          reviewed_by = EXCLUDED.reviewed_by,
          reviewed_at = EXCLUDED.reviewed_at,
          review_note = EXCLUDED.review_note,
          updated_at = EXCLUDED.updated_at
      `,
      [
        item.id,
        item.workflowId,
        item.targetId,
        item.targetType ?? null,
        item.summary ?? null,
        item.status,
        item.currentStepIndex,
        item.submittedBy,
        item.dueAt ?? null,
        item.escalationCount,
        item.lastEscalatedAt ?? null,
        JSON.stringify(item.auditTrail),
        item.reviewedBy ?? null,
        item.reviewedAt ?? null,
        item.reviewNote ?? null,
        item.createdAt,
        item.updatedAt,
      ],
    );
  }

  private async persistDocumentFolderState(folder: DocumentFolderRecord): Promise<void> {
    if (!this.dataSource || this.runtimeMode !== 'db') {
      return;
    }

    await this.dataSource.query(
      `
        INSERT INTO adwest.document_folders (
          id,
          sreny_id,
          parent_folder_id,
          name,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          sreny_id = EXCLUDED.sreny_id,
          parent_folder_id = EXCLUDED.parent_folder_id,
          name = EXCLUDED.name,
          updated_at = EXCLUDED.updated_at
      `,
      [folder.id, folder.srenyId, folder.parentFolderId ?? null, folder.name, folder.createdAt, folder.updatedAt],
    );
  }

  private async persistDocumentState(document: DocumentRecord): Promise<void> {
    if (!this.dataSource || this.runtimeMode !== 'db') {
      return;
    }

    await this.dataSource.query(
      `
        INSERT INTO adwest.documents (
          id,
          sreny_id,
          folder_id,
          source_document_id,
          file_name,
          file_type,
          category,
          description,
          version,
          access_level,
          linked_entity_type,
          linked_entity_id,
          uploaded_by,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          sreny_id = EXCLUDED.sreny_id,
          folder_id = EXCLUDED.folder_id,
          source_document_id = EXCLUDED.source_document_id,
          file_name = EXCLUDED.file_name,
          file_type = EXCLUDED.file_type,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          version = EXCLUDED.version,
          access_level = EXCLUDED.access_level,
          linked_entity_type = EXCLUDED.linked_entity_type,
          linked_entity_id = EXCLUDED.linked_entity_id,
          uploaded_by = EXCLUDED.uploaded_by,
          updated_at = EXCLUDED.updated_at
      `,
      [
        document.id,
        document.srenyId,
        document.folderId ?? null,
        document.sourceDocumentId ?? null,
        document.fileName,
        document.fileType,
        document.category ?? null,
        document.description ?? null,
        document.version,
        document.accessLevel,
        document.linkedEntityType ?? null,
        document.linkedEntityId ?? null,
        document.uploadedBy,
        document.createdAt,
        document.updatedAt,
      ],
    );
  }

  private async persistTicketState(ticket: TicketRecord): Promise<void> {
    if (!this.dataSource || this.runtimeMode !== 'db') {
      return;
    }

    this.findContact(ticket.contactId);
    const zoneId = this.contacts.get(ticket.contactId)?.zoneId;
    if (!zoneId) {
      return;
    }

    await this.dataSource.query(
      `
        INSERT INTO adwest.helpdesk_tickets (
          id,
          contact_id,
          zone_id,
          category,
          subject,
          description,
          priority,
          status,
          assigned_to,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          contact_id = EXCLUDED.contact_id,
          zone_id = EXCLUDED.zone_id,
          category = EXCLUDED.category,
          subject = EXCLUDED.subject,
          description = EXCLUDED.description,
          priority = EXCLUDED.priority,
          status = EXCLUDED.status,
          assigned_to = EXCLUDED.assigned_to,
          updated_at = EXCLUDED.updated_at
      `,
      [
        ticket.id,
        ticket.contactId,
        zoneId,
        ticket.category,
        ticket.subject,
        ticket.description,
        ticket.priority,
        ticket.status,
        ticket.assigneeId ?? null,
        ticket.createdAt,
        ticket.updatedAt,
      ],
    );

    await this.dataSource.query('DELETE FROM adwest.ticket_comments WHERE ticket_id = $1', [ticket.id]);
    for (const comment of ticket.comments) {
      await this.dataSource.query(
        `
          INSERT INTO adwest.ticket_comments (
            id,
            ticket_id,
            author_id,
            author_type,
            body,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [comment.id, ticket.id, comment.authorId, 'member', comment.body, comment.createdAt],
      );
    }
  }

  private async persistAttendanceState(record: AttendanceRecord): Promise<void> {
    if (!this.dataSource || this.runtimeMode !== 'db') {
      return;
    }

    await this.dataSource.query(
      `
        INSERT INTO adwest.attendance (
          id,
          session_id,
          contact_id,
          status,
          method,
          marked_by,
          marked_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $7)
        ON CONFLICT (session_id, contact_id) DO UPDATE SET
          status = EXCLUDED.status,
          method = EXCLUDED.method,
          marked_by = EXCLUDED.marked_by,
          marked_at = EXCLUDED.marked_at,
          updated_at = EXCLUDED.updated_at
      `,
      [
        record.id,
        record.sessionId,
        record.contactId,
        record.state,
        record.notes ?? null,
        record.recordedBy,
        record.recordedAt,
      ],
    );
  }

  private async withProgramPersistenceLock<T>(work: () => T | Promise<T>): Promise<T> {
    const prior = this.programPersistenceLock;
    let release!: () => void;
    this.programPersistenceLock = new Promise<void>((resolve) => {
      release = resolve;
    });

    await prior;
    try {
      return await work();
    } finally {
      release();
    }
  }

  private async persistContactState(contact: ContactRecord): Promise<void> {
    if (!this.dataSource || this.runtimeMode !== 'db') {
      return;
    }

    await this.dataSource.query(
      `
        INSERT INTO adwest.contacts (
          id,
          zone_id,
          first_name,
          last_name,
          phone_primary,
          email_primary,
          address,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
        ON CONFLICT (id) DO UPDATE SET
          zone_id = EXCLUDED.zone_id,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          phone_primary = EXCLUDED.phone_primary,
          email_primary = EXCLUDED.email_primary,
          address = EXCLUDED.address,
          status = EXCLUDED.status,
          updated_at = now()
      `,
      [
        contact.id,
        contact.zoneId,
        contact.firstName,
        contact.lastName,
        contact.phone ?? null,
        contact.email ?? null,
        contact.address ?? null,
        contact.status,
      ],
    );

    await this.dataSource.query('DELETE FROM adwest.sreny_memberships WHERE contact_id = $1', [
      contact.id,
    ]);

    for (const membership of contact.memberships) {
      await this.dataSource.query(
        `
          INSERT INTO adwest.sreny_memberships (contact_id, sreny_id, joined_date, status)
          VALUES ($1, $2, $3::date, 'active')
        `,
        [contact.id, membership.srenyId, this.toDateOnly(membership.createdAt)],
      );
    }

    await this.dataSource.query(
      'DELETE FROM adwest.contact_sreny_metadata WHERE contact_id = $1',
      [contact.id],
    );

    for (const [srenyId, metadata] of Object.entries(contact.customMetadataBySreny)) {
      if (!contact.srenyIds.includes(srenyId)) {
        continue;
      }

      await this.dataSource.query(
        `
          INSERT INTO adwest.contact_sreny_metadata (contact_id, sreny_id, metadata)
          VALUES ($1, $2, $3::jsonb)
        `,
        [contact.id, srenyId, JSON.stringify(metadata)],
      );
    }
  }

  private toIsoTimestamp(value: string | Date): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }

  private toDateOnly(value: string | Date): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
  }

  private toTimeOnly(value: string): string {
    return value.includes('T') ? value.slice(11, 19) : value.slice(0, 8);
  }

  private combineDateAndTime(dateValue: string | Date, timeValue: string | Date): string {
    const date = this.toDateOnly(dateValue instanceof Date ? dateValue.toISOString() : dateValue);
    const time =
      timeValue instanceof Date ? timeValue.toISOString().slice(11, 19) : timeValue.slice(0, 8);
    return new Date(`${date}T${time}`).toISOString();
  }

  private cloneContact(contact: ContactRecord): ContactRecord {
    return JSON.parse(JSON.stringify(contact)) as ContactRecord;
  }

  private cloneImportRecord(record: ImportRecord): ImportRecord {
    return JSON.parse(JSON.stringify(record)) as ImportRecord;
  }

  private cloneProgram(program: ProgramRecord): ProgramRecord {
    return JSON.parse(JSON.stringify(program)) as ProgramRecord;
  }

  private cloneDocument(document: DocumentRecord): DocumentRecord {
    return JSON.parse(JSON.stringify(document)) as DocumentRecord;
  }

  private cloneReportTemplate(template: ReportTemplateRecord): ReportTemplateRecord {
    return JSON.parse(JSON.stringify(template)) as ReportTemplateRecord;
  }

  private cloneReportSubmission(submission: ReportSubmissionRecord): ReportSubmissionRecord {
    return JSON.parse(JSON.stringify(submission)) as ReportSubmissionRecord;
  }

  private cloneApprovalWorkflow(workflow: ApprovalWorkflowRecord): ApprovalWorkflowRecord {
    return JSON.parse(JSON.stringify(workflow)) as ApprovalWorkflowRecord;
  }

  private cloneApprovalItem(item: ApprovalItemRecord): ApprovalItemRecord {
    return JSON.parse(JSON.stringify(item)) as ApprovalItemRecord;
  }

  private cloneTicket(ticket: TicketRecord): TicketRecord {
    return JSON.parse(JSON.stringify(ticket)) as TicketRecord;
  }

  // ── Permissions ────────────────────────────────────────────────────────────

  listPermissions(): PermissionRecord[] {
    return Array.from(this.permissions.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async listPermissionsFromDb(params: { page?: number; pageSize?: number; search?: string; locationId?: string }): Promise<{
    items: PermissionRecord[]; total: number; page: number; pageSize: number; totalPages: number;
  }> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(1000, Math.max(1, params.pageSize ?? 20));
    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const q = (params.search ?? '').trim().toLowerCase();
      let all = Array.from(this.permissions.values());
      if (params.locationId) all = all.filter((p) => p.locationId === params.locationId);
      if (q) all = all.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
      all.sort((a, b) => a.name.localeCompare(b.name));
      const total = all.length;
      return { items: all.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
    }
    const searchParam = params.search?.trim() ? `%${params.search.trim()}%` : null;
    const locationParam = params.locationId ?? null;
    const [countRows, dataRows] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM adwest.permissions WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1) AND ($2::text IS NULL OR location_id = $2)`,
        [searchParam, locationParam],
      ),
      this.dataSource.query(
        `SELECT id, location_id, sreni_id, code, name, description, active, created_at, updated_at, created_by, updated_by FROM adwest.permissions WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1) AND ($2::text IS NULL OR location_id = $2) ORDER BY name LIMIT $3 OFFSET $4`,
        [searchParam, locationParam, pageSize, (page - 1) * pageSize],
      ),
    ]);
    const total = (countRows as Array<{ total: number }>)[0].total;
    const items = (dataRows as Array<{
      id: string; location_id: string; sreni_id: string; code: string; name: string;
      description: string | null; active: boolean; created_at: string | Date; updated_at: string | Date;
      created_by: string | null; updated_by: string | null;
    }>).map((r) => ({
      id: r.id, locationId: r.location_id, sreniId: r.sreni_id, code: r.code, name: r.name,
      description: r.description ?? undefined, active: r.active,
      createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined,
    }));
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
  }

  async createPermission(dto: CreatePermissionDto, actorEmail?: string): Promise<PermissionRecord> {
    const dupPair = Array.from(this.permissions.values()).find(
      (p) => p.locationId === dto.locationId && p.sreniId === dto.sreniId,
    );
    if (dupPair) throw new BadRequestException('A permission for this location and sreni already exists');

    const dupCode = Array.from(this.permissions.values()).find((p) => p.code === dto.code);
    if (dupCode) throw new BadRequestException(`Permission code "${dto.code}" already exists`);

    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const now = new Date().toISOString();
      const record: PermissionRecord = {
        id: this.newId('perm'),
        locationId: dto.locationId, sreniId: dto.sreniId,
        code: dto.code, name: dto.name,
        description: dto.description,
        active: true, createdAt: now, updatedAt: now,
        createdBy: actorEmail, updatedBy: actorEmail,
      };
      this.permissions.set(record.id, record);
      return record;
    }

    const rows = (await this.dataSource.query(
      `INSERT INTO adwest.permissions (location_id, sreni_id, code, name, description, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $6)
       RETURNING id, location_id, sreni_id, code, name, description, active, created_at, updated_at, created_by, updated_by`,
      [dto.locationId, dto.sreniId, dto.code, dto.name, dto.description ?? null, actorEmail ?? null],
    )) as Array<{ id: string; location_id: string; sreni_id: string; code: string; name: string; description: string | null; active: boolean; created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null }>;
    const r = rows[0];
    const record: PermissionRecord = {
      id: r.id, locationId: r.location_id, sreniId: r.sreni_id,
      code: r.code, name: r.name,
      description: r.description ?? undefined,
      active: r.active, createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined,
    };
    this.permissions.set(record.id, record);
    return record;
  }

  async updatePermission(permId: string, dto: UpdatePermissionDto, actorEmail?: string): Promise<PermissionRecord> {
    if (this.runtimeMode === 'db' && this.dataSource && !this.permissions.has(permId)) {
      const rows = await this.dataSource.query(
        'SELECT id, location_id, sreni_id, code, name, description, active, created_by, updated_by, created_at, updated_at FROM adwest.permissions WHERE id=$1',
        [permId],
      ) as Array<{ id: string; location_id: string; sreni_id: string; code: string; name: string; description: string | null; active: boolean; created_by: string | null; updated_by: string | null; created_at: string | Date; updated_at: string | Date }>;
      if (!rows.length) throw new NotFoundException('Permission not found');
      const r = rows[0];
      this.permissions.set(r.id, { id: r.id, locationId: r.location_id, sreniId: r.sreni_id, code: r.code, name: r.name, description: r.description ?? undefined, active: r.active, createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined, createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at) });
    }
    const current = this.permissions.get(permId);
    if (!current) throw new NotFoundException('Permission not found');

    if (dto.code && dto.code !== current.code) {
      const clash = Array.from(this.permissions.values()).find((p) => p.code === dto.code && p.id !== permId);
      if (clash) throw new BadRequestException(`Permission code "${dto.code}" already exists`);
    }

    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const updated: PermissionRecord = {
        ...current,
        code: dto.code ?? current.code,
        name: dto.name ?? current.name,
        description: dto.description !== undefined ? dto.description : current.description,
        active: dto.active !== undefined ? dto.active : current.active,
        updatedBy: actorEmail, updatedAt: new Date().toISOString(),
      };
      this.permissions.set(permId, updated);
      return updated;
    }

    const rows = (await this.dataSource.query(
      `UPDATE adwest.permissions
       SET code=$2, name=$3, description=$4, active=$5, updated_by=$6, updated_at=now()
       WHERE id=$1
       RETURNING id, location_id, sreni_id, code, name, description, active, created_at, updated_at, created_by, updated_by`,
      [permId, dto.code ?? current.code, dto.name ?? current.name,
       dto.description !== undefined ? dto.description : current.description ?? null,
       dto.active !== undefined ? dto.active : current.active, actorEmail ?? null],
    )) as unknown as [Array<{ id: string; location_id: string; sreni_id: string; code: string; name: string; description: string | null; active: boolean; created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null }>, number];
    const r = rows[0][0];
    const updated: PermissionRecord = {
      id: r.id, locationId: r.location_id, sreniId: r.sreni_id,
      code: r.code, name: r.name,
      description: r.description ?? undefined,
      active: r.active, createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined,
    };
    this.permissions.set(permId, updated);
    return updated;
  }

  async deletePermission(permId: string): Promise<void> {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (this.runtimeMode === 'db' && this.dataSource && UUID_RE.test(permId)) {
      const deleted = await this.dataSource.query('DELETE FROM adwest.permissions WHERE id=$1 RETURNING id', [permId]) as Array<{ id: string }>;
      if (!deleted.length) throw new NotFoundException('Permission not found');
      this.permissions.delete(permId);
      return;
    }
    if (!this.permissions.has(permId)) throw new NotFoundException('Permission not found');
    this.permissions.delete(permId);
  }

  // ── Permission sets ────────────────────────────────────────────────────────

  listPermissionSets(): PermissionSetRecord[] {
    return Array.from(this.permissionSets.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async listPermissionSetsFromDb(params: { page?: number; pageSize?: number; search?: string }): Promise<{
    items: PermissionSetRecord[]; total: number; page: number; pageSize: number; totalPages: number;
  }> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(1000, Math.max(1, params.pageSize ?? 20));
    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const q = (params.search ?? '').trim().toLowerCase();
      let all = Array.from(this.permissionSets.values());
      if (q) all = all.filter((s) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
      all.sort((a, b) => a.name.localeCompare(b.name));
      const total = all.length;
      return { items: all.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
    }
    const searchParam = params.search?.trim() ? `%${params.search.trim()}%` : null;
    const [countRows, dataRows] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM adwest.permission_sets WHERE ($1::text IS NULL OR name ILIKE $1 OR description ILIKE $1)`,
        [searchParam],
      ),
      this.dataSource.query(
        `SELECT ps.id, ps.name, ps.description, ps.active, ps.created_at, ps.updated_at, ps.created_by, ps.updated_by,
          COALESCE(json_agg(psi.permission_id) FILTER (WHERE psi.permission_id IS NOT NULL), '[]') AS permission_ids
         FROM adwest.permission_sets ps
         LEFT JOIN adwest.permission_set_items psi ON ps.id = psi.permission_set_id
         WHERE ($1::text IS NULL OR ps.name ILIKE $1 OR ps.description ILIKE $1)
         GROUP BY ps.id ORDER BY ps.name LIMIT $2 OFFSET $3`,
        [searchParam, pageSize, (page - 1) * pageSize],
      ),
    ]);
    const total = (countRows as Array<{ total: number }>)[0].total;
    const items = (dataRows as Array<{
      id: string; name: string; description: string | null; active: boolean;
      created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null;
      permission_ids: string[];
    }>).map((r) => ({
      id: r.id, name: r.name, description: r.description ?? undefined,
      active: r.active, permissionIds: r.permission_ids ?? [],
      createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined,
    }));
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
  }

  async createPermissionSet(dto: CreatePermissionSetDto, actorEmail?: string): Promise<PermissionSetRecord> {
    const clash = Array.from(this.permissionSets.values()).find((s) => s.name === dto.name);
    if (clash) throw new BadRequestException(`Permission set "${dto.name}" already exists`);

    const permIds = dto.permissionIds ?? [];
    for (const pid of permIds) {
      if (!this.permissions.has(pid)) throw new BadRequestException(`Permission ${pid} not found`);
    }

    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const now = new Date().toISOString();
      const record: PermissionSetRecord = {
        id: this.newId('pset'), name: dto.name, description: dto.description,
        active: true, permissionIds: permIds, createdAt: now, updatedAt: now,
        createdBy: actorEmail, updatedBy: actorEmail,
      };
      this.permissionSets.set(record.id, record);
      return record;
    }

    const rows = (await this.dataSource.query(
      `INSERT INTO adwest.permission_sets (name, description, created_by, updated_by)
       VALUES ($1, $2, $3, $3)
       RETURNING id, name, description, active, created_at, updated_at, created_by, updated_by`,
      [dto.name, dto.description ?? null, actorEmail ?? null],
    )) as Array<{ id: string; name: string; description: string | null; active: boolean; created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null }>;
    const r = rows[0];

    if (permIds.length > 0) {
      const values = permIds.map((_, i) => `($1, $${i + 2})`).join(', ');
      await this.dataSource.query(
        `INSERT INTO adwest.permission_set_items (permission_set_id, permission_id) VALUES ${values}`,
        [r.id, ...permIds],
      );
    }

    const record: PermissionSetRecord = {
      id: r.id, name: r.name, description: r.description ?? undefined,
      active: r.active, permissionIds: permIds,
      createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined,
    };
    this.permissionSets.set(record.id, record);
    return record;
  }

  async updatePermissionSet(setId: string, dto: UpdatePermissionSetDto, actorEmail?: string): Promise<PermissionSetRecord> {
    if (this.runtimeMode === 'db' && this.dataSource && !this.permissionSets.has(setId)) {
      const rows = await this.dataSource.query(
        `SELECT ps.id, ps.name, ps.description, ps.active, ps.created_by, ps.updated_by, ps.created_at, ps.updated_at,
          COALESCE(json_agg(psi.permission_id) FILTER (WHERE psi.permission_id IS NOT NULL), '[]') AS permission_ids
         FROM adwest.permission_sets ps
         LEFT JOIN adwest.permission_set_items psi ON ps.id = psi.permission_set_id
         WHERE ps.id=$1 GROUP BY ps.id`,
        [setId],
      ) as Array<{ id: string; name: string; description: string | null; active: boolean; created_by: string | null; updated_by: string | null; created_at: string | Date; updated_at: string | Date; permission_ids: string[] }>;
      if (!rows.length) throw new NotFoundException('Permission set not found');
      const r = rows[0];
      this.permissionSets.set(r.id, { id: r.id, name: r.name, description: r.description ?? undefined, active: r.active, permissionIds: r.permission_ids, createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined, createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at) });
    }
    const current = this.permissionSets.get(setId);
    if (!current) throw new NotFoundException('Permission set not found');

    if (dto.name && dto.name !== current.name) {
      const clash = Array.from(this.permissionSets.values()).find((s) => s.name === dto.name && s.id !== setId);
      if (clash) throw new BadRequestException(`Permission set "${dto.name}" already exists`);
    }

    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const updated: PermissionSetRecord = {
        ...current,
        name: dto.name ?? current.name,
        description: dto.description !== undefined ? dto.description : current.description,
        active: dto.active !== undefined ? dto.active : current.active,
        updatedBy: actorEmail, updatedAt: new Date().toISOString(),
      };
      this.permissionSets.set(setId, updated);
      return updated;
    }

    const rows = (await this.dataSource.query(
      `UPDATE adwest.permission_sets
       SET name=$2, description=$3, active=$4, updated_by=$5, updated_at=now()
       WHERE id=$1
       RETURNING id, name, description, active, created_at, updated_at, created_by, updated_by`,
      [setId, dto.name ?? current.name,
       dto.description !== undefined ? dto.description : current.description ?? null,
       dto.active !== undefined ? dto.active : current.active, actorEmail ?? null],
    )) as unknown as [Array<{ id: string; name: string; description: string | null; active: boolean; created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null }>, number];
    const r = rows[0][0];
    const updated: PermissionSetRecord = {
      id: r.id, name: r.name, description: r.description ?? undefined,
      active: r.active, permissionIds: current.permissionIds,
      createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined,
    };
    this.permissionSets.set(setId, updated);
    return updated;
  }

  async setPermissionSetItems(setId: string, dto: SetPermissionSetItemsDto, actorEmail?: string): Promise<PermissionSetRecord> {
    if (this.runtimeMode === 'db' && this.dataSource && !this.permissionSets.has(setId)) {
      const rows = await this.dataSource.query('SELECT id, name FROM adwest.permission_sets WHERE id=$1', [setId]) as Array<{ id: string }>;
      if (!rows.length) throw new NotFoundException('Permission set not found');
    }
    const current = this.permissionSets.get(setId);
    if (!current) throw new NotFoundException('Permission set not found');
    for (const pid of dto.permissionIds) {
      if (!this.permissions.has(pid)) throw new BadRequestException(`Permission ${pid} not found`);
    }

    if (this.runtimeMode === 'db' && this.dataSource) {
      await this.dataSource.query('DELETE FROM adwest.permission_set_items WHERE permission_set_id=$1', [setId]);
      if (dto.permissionIds.length > 0) {
        const values = dto.permissionIds.map((_, i) => `($1, $${i + 2})`).join(', ');
        await this.dataSource.query(
          `INSERT INTO adwest.permission_set_items (permission_set_id, permission_id) VALUES ${values}`,
          [setId, ...dto.permissionIds],
        );
      }
      await this.dataSource.query(
        'UPDATE adwest.permission_sets SET updated_by=$2, updated_at=now() WHERE id=$1',
        [setId, actorEmail ?? null],
      );
    }

    const updated: PermissionSetRecord = { ...current, permissionIds: dto.permissionIds, updatedBy: actorEmail, updatedAt: new Date().toISOString() };
    this.permissionSets.set(setId, updated);
    return updated;
  }

  async deletePermissionSet(setId: string): Promise<void> {
    if (this.runtimeMode === 'db' && this.dataSource && !this.permissionSets.has(setId)) {
      const deleted = await this.dataSource.query('DELETE FROM adwest.permission_sets WHERE id=$1 RETURNING id', [setId]) as Array<{ id: string }>;
      if (!deleted.length) throw new NotFoundException('Permission set not found');
      this.permissionSets.delete(setId);
      return;
    }
    if (!this.permissionSets.has(setId)) throw new NotFoundException('Permission set not found');
    this.permissionSets.delete(setId);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  private generateUserCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'USR-';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  listUsers(params: { page?: number; pageSize?: number; search?: string }): {
    items: UserRecord[]; total: number; page: number; pageSize: number; totalPages: number;
  } {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const q = (params.search ?? '').trim().toLowerCase();
    const all = Array.from(this.users.values())
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q) || u.code.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = all.length;
    const items = all.slice((page - 1) * pageSize, page * pageSize);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async listUsersFromDb(params: { page?: number; pageSize?: number; search?: string }): Promise<{
    items: UserRecord[]; total: number; page: number; pageSize: number; totalPages: number;
  }> {
    if (this.runtimeMode !== 'db' || !this.dataSource) return this.listUsers(params);
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const search = (params.search ?? '').trim();
    const searchParam = search ? `%${search}%` : null;
    const [countRows, dataRows] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM adwest.users
         WHERE ($1::text IS NULL OR name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR code ILIKE $1)`,
        [searchParam],
      ),
      this.dataSource.query(
        `SELECT id, code, name, phone, email, role_id, sthan_id, permission_set_id, admin_management, is_super_admin, must_reset_password, active, created_at, updated_at, created_by, updated_by
         FROM adwest.users
         WHERE ($1::text IS NULL OR name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR code ILIKE $1)
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [searchParam, pageSize, (page - 1) * pageSize],
      ),
    ]);
    const total = (countRows as Array<{ total: number }>)[0].total;
    const items = (dataRows as Array<{
      id: string; code: string; name: string; phone: string | null; email: string | null;
      role_id: string | null; sthan_id: string | null; permission_set_id: string | null; admin_management: string | null;
      is_super_admin: boolean; must_reset_password: boolean; active: boolean;
      created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null;
    }>).map((r) => ({
      id: r.id, code: r.code, name: r.name,
      phone: r.phone ?? undefined, email: r.email ?? undefined,
      roleId: r.role_id ?? undefined, sthanId: r.sthan_id ?? undefined,
      permissionSetId: r.permission_set_id ?? undefined, adminManagement: r.admin_management ?? undefined,
      isSuperAdmin: r.is_super_admin, mustResetPassword: r.must_reset_password,
      active: r.active,
      createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined,
    }));
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createUser(dto: CreateUserDto, actorEmail?: string): Promise<UserRecord> {
    if (dto.email) {
      const dup = Array.from(this.users.values()).find((u) => u.email === dto.email);
      if (dup) throw new BadRequestException(`Email "${dto.email}" is already in use`);
    }
    let code: string;
    do { code = this.generateUserCode(); } while (Array.from(this.users.values()).some((u) => u.code === code));

    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const now = new Date().toISOString();
      const passwordHash = this.cryptoService.hashPassword(dto.password);
      const record: UserRecord = {
        id: this.newId('usr'), code, name: dto.name,
        phone: dto.phone, email: dto.email,
        roleId: dto.roleId, sthanId: dto.sthanId,
        permissionSetId: dto.permissionSetId, adminManagement: dto.adminManagement,
        passwordHash,
        isSuperAdmin: dto.isSuperAdmin ?? false,
        mustResetPassword: true,
        active: true, createdAt: now, updatedAt: now,
        createdBy: actorEmail, updatedBy: actorEmail,
      };
      this.users.set(record.id, record);
      return record;
    }

    const passwordHash = this.cryptoService.hashPassword(dto.password);

    const rows = (await this.dataSource.query(
      `INSERT INTO adwest.users (code, name, phone, email, role_id, sthan_id, permission_set_id, admin_management, password_hash, is_super_admin, must_reset_password, reporting_to_role_ids, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, $12, $12)
       RETURNING id, code, name, phone, email, role_id, sthan_id, permission_set_id, admin_management, password_hash, is_super_admin, must_reset_password, active, reporting_to_role_ids, created_at, updated_at, created_by, updated_by`,
      [code, dto.name, dto.phone ?? null, dto.email ?? null, dto.roleId ?? null, dto.sthanId ?? null, dto.permissionSetId ?? null, dto.adminManagement ?? null, passwordHash, dto.isSuperAdmin ?? false, dto.reportingToRoleIds ?? [], actorEmail ?? null],
    )) as Array<{ id: string; code: string; name: string; phone: string | null; email: string | null; role_id: string | null; sthan_id: string | null; permission_set_id: string | null; admin_management: string | null; password_hash: string | null; is_super_admin: boolean; must_reset_password: boolean; active: boolean; reporting_to_role_ids: string[]; created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null }>;
    const r = rows[0];
    const record: UserRecord = {
      id: r.id, code: r.code, name: r.name,
      phone: r.phone ?? undefined, email: r.email ?? undefined,
      roleId: r.role_id ?? undefined, sthanId: r.sthan_id ?? undefined,
      permissionSetId: r.permission_set_id ?? undefined, adminManagement: r.admin_management ?? undefined,
      passwordHash: r.password_hash ?? undefined,
      isSuperAdmin: r.is_super_admin,
      mustResetPassword: r.must_reset_password,
      active: r.active,
      reportingToRoleIds: r.reporting_to_role_ids ?? [],
      createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined,
    };
    this.users.set(record.id, record);

    await this.dataSource.query(
      `INSERT INTO adwest.auth_member_users (id, full_name, email, phone, password_hash, failed_attempts, locked_until, active, must_reset_password)
       VALUES ($1, $2, $3, $4, $5, 0, NULL, true, true)
       ON CONFLICT (id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         password_hash = EXCLUDED.password_hash,
         active = EXCLUDED.active,
         must_reset_password = EXCLUDED.must_reset_password`,
      [record.id, record.name, record.email ?? null, record.phone ?? null, passwordHash],
    );

    return record;
  }

  async updateUser(userId: string, dto: UpdateUserDto, actorEmail?: string): Promise<UserRecord> {
    if (this.runtimeMode === 'db' && this.dataSource && !this.users.has(userId)) {
      const rows = await this.dataSource.query(
        'SELECT id, code, name, phone, email, role_id, sthan_id, permission_set_id, admin_management, password_hash, is_super_admin, must_reset_password, active, created_by, updated_by, created_at, updated_at FROM adwest.users WHERE id=$1',
        [userId],
      ) as Array<{ id: string; code: string; name: string; phone: string | null; email: string | null; role_id: string | null; sthan_id: string | null; permission_set_id: string | null; admin_management: string | null; password_hash: string | null; is_super_admin: boolean; must_reset_password: boolean; active: boolean; created_by: string | null; updated_by: string | null; created_at: string | Date; updated_at: string | Date }>;
      if (!rows.length) throw new NotFoundException('User not found');
      const r = rows[0];
      this.users.set(r.id, { id: r.id, code: r.code, name: r.name, phone: r.phone ?? undefined, email: r.email ?? undefined, roleId: r.role_id ?? undefined, sthanId: r.sthan_id ?? undefined, permissionSetId: r.permission_set_id ?? undefined, adminManagement: r.admin_management ?? undefined, passwordHash: r.password_hash ?? undefined, isSuperAdmin: r.is_super_admin, mustResetPassword: r.must_reset_password, active: r.active, createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined, createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at) });
    }
    const current = this.users.get(userId);
    if (!current) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== current.email) {
      const dup = Array.from(this.users.values()).find((u) => u.email === dto.email && u.id !== userId);
      if (dup) throw new BadRequestException(`Email "${dto.email}" is already in use`);
    }

    const newPasswordHash = dto.password !== undefined ? this.cryptoService.hashPassword(dto.password) : undefined;
    const nextMustReset = dto.password !== undefined ? false : current.mustResetPassword;

    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const updated: UserRecord = {
        ...current,
        name: dto.name ?? current.name,
        phone: dto.phone !== undefined ? dto.phone : current.phone,
        email: dto.email !== undefined ? dto.email : current.email,
        roleId: dto.roleId !== undefined ? dto.roleId : current.roleId,
        sthanId: dto.sthanId !== undefined ? dto.sthanId : current.sthanId,
        permissionSetId: dto.permissionSetId !== undefined ? dto.permissionSetId : current.permissionSetId,
        adminManagement: dto.adminManagement !== undefined ? dto.adminManagement : current.adminManagement,
        passwordHash: newPasswordHash ?? current.passwordHash,
        isSuperAdmin: dto.isSuperAdmin !== undefined ? dto.isSuperAdmin : current.isSuperAdmin,
        mustResetPassword: nextMustReset,
        active: dto.active !== undefined ? dto.active : current.active,
        updatedBy: actorEmail, updatedAt: new Date().toISOString(),
      };
      this.users.set(userId, updated);
      return updated;
    }

    const rows = (await this.dataSource.query(
      `UPDATE adwest.users
       SET name=$2, phone=$3, email=$4, role_id=$5, sthan_id=$6, permission_set_id=$7, admin_management=$8, password_hash=$9, is_super_admin=$10, active=$11, must_reset_password=$12, reporting_to_role_ids=$13, updated_by=$14, updated_at=now()
       WHERE id=$1
       RETURNING id, code, name, phone, email, role_id, sthan_id, permission_set_id, admin_management, password_hash, is_super_admin, must_reset_password, active, reporting_to_role_ids, created_at, updated_at, created_by, updated_by`,
      [userId,
       dto.name ?? current.name,
       dto.phone !== undefined ? dto.phone : current.phone ?? null,
       dto.email !== undefined ? dto.email : current.email ?? null,
       dto.roleId !== undefined ? dto.roleId : current.roleId ?? null,
       dto.sthanId !== undefined ? dto.sthanId : current.sthanId ?? null,
       dto.permissionSetId !== undefined ? dto.permissionSetId : current.permissionSetId ?? null,
       dto.adminManagement !== undefined ? dto.adminManagement : current.adminManagement ?? null,
       newPasswordHash ?? current.passwordHash ?? null,
       dto.isSuperAdmin !== undefined ? dto.isSuperAdmin : current.isSuperAdmin ?? false,
       dto.active !== undefined ? dto.active : current.active,
       nextMustReset ?? false,
       dto.reportingToRoleIds !== undefined ? dto.reportingToRoleIds : current.reportingToRoleIds ?? [],
       actorEmail ?? null],
    )) as unknown as [Array<{ id: string; code: string; name: string; phone: string | null; email: string | null; role_id: string | null; sthan_id: string | null; permission_set_id: string | null; admin_management: string | null; password_hash: string | null; is_super_admin: boolean; must_reset_password: boolean; active: boolean; reporting_to_role_ids: string[]; created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null }>, number];
    const r = rows[0][0];
    const updated: UserRecord = {
      id: r.id, code: r.code, name: r.name,
      phone: r.phone ?? undefined, email: r.email ?? undefined,
      roleId: r.role_id ?? undefined, sthanId: r.sthan_id ?? undefined,
      permissionSetId: r.permission_set_id ?? undefined, adminManagement: r.admin_management ?? undefined,
      passwordHash: r.password_hash ?? undefined,
      isSuperAdmin: r.is_super_admin,
      mustResetPassword: r.must_reset_password,
      active: r.active,
      reportingToRoleIds: r.reporting_to_role_ids ?? [],
      createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined,
    };
    this.users.set(userId, updated);

    await this.dataSource.query(
      `UPDATE adwest.auth_member_users
       SET full_name=$2, email=$3, phone=$4, password_hash=$5, active=$6, must_reset_password=$7
       WHERE id=$1`,
      [
        userId,
        updated.name,
        updated.email ?? null,
        updated.phone ?? null,
        updated.passwordHash ?? current.passwordHash ?? null,
        updated.active,
        nextMustReset ?? false,
      ],
    );

    return updated;
  }

  async deleteUser(userId: string): Promise<void> {
    if (!this.users.has(userId)) throw new NotFoundException('User not found');
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (this.runtimeMode === 'db' && this.dataSource && UUID_RE.test(userId)) {
      await this.dataSource.query('DELETE FROM adwest.users WHERE id=$1', [userId]);
    }
    this.users.delete(userId);
  }

  async changeOwnPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    if (this.runtimeMode === 'db' && this.dataSource) {
      const rows = await this.dataSource.query(
        `SELECT password_hash, must_reset_password FROM adwest.users WHERE id=$1`,
        [userId],
      ) as Array<{ password_hash: string | null; must_reset_password: boolean }>;
      if (!rows.length || !rows[0].password_hash) throw new UnauthorizedException('User not found');
      if (!rows[0].must_reset_password && !this.cryptoService.verifyPassword(currentPassword, rows[0].password_hash)) {
        throw new UnauthorizedException('Current password is incorrect');
      }
      const passwordHash = this.cryptoService.hashPassword(newPassword);
      await this.dataSource.query(
        `UPDATE adwest.users SET password_hash=$2, must_reset_password=false, updated_at=now() WHERE id=$1`,
        [userId, passwordHash],
      );
      await this.dataSource.query(
        `UPDATE adwest.auth_member_users SET password_hash=$2, must_reset_password=false WHERE id=$1`,
        [userId, passwordHash],
      );
      return;
    }
    const current = this.users.get(userId);
    if (!current) throw new UnauthorizedException('User not found');
    if (!this.cryptoService.verifyPassword(currentPassword, current.passwordHash ?? '')) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = this.cryptoService.hashPassword(newPassword);
    this.users.set(userId, { ...current, passwordHash, mustResetPassword: false, updatedAt: new Date().toISOString() });
  }

  // ── Sreni Calendar Events ────────────────────────────────────────────────

  listSreniCalendarEvents(
    sreniId: string,
    principal: AuthPrincipal,
    accessibleSthanIds: string[] = [],
  ): CalendarEventRecord[] {
    return this.getCalendarEventsRuntime().listSreniCalendarEvents(sreniId, principal, accessibleSthanIds);
  }

  createSreniCalendarEvent(
    sreniId: string,
    dto: CreateCalendarEventDto,
    principal: AuthPrincipal,
  ): CalendarEventRecord {
    return this.getCalendarEventsRuntime().createSreniCalendarEvent(sreniId, dto, principal);
  }

  updateSreniCalendarEvent(
    sreniId: string,
    eventId: string,
    dto: UpdateCalendarEventDto,
    principal: AuthPrincipal,
  ): CalendarEventRecord {
    return this.getCalendarEventsRuntime().updateSreniCalendarEvent(sreniId, eventId, dto, principal);
  }

  deleteSreniCalendarEvent(
    sreniId: string,
    eventId: string,
    principal: AuthPrincipal,
  ): { success: boolean; deletedBy: string } {
    return this.getCalendarEventsRuntime().deleteSreniCalendarEvent(sreniId, eventId, principal);
  }

  private getCalendarEventsRuntime(): CalendarEventsRuntimeService {
    if (!this.calendarEventsRuntimeService) {
      this.calendarEventsRuntimeService = new CalendarEventsRuntimeService({
        runtimeMode: this.runtimeMode,
        dataSource: this.dataSource ?? undefined,
        calendarEvents: this.calendarEvents,
        sreniExists: (sreniId) => this.srenies.has(sreniId),
        hasZoneRights: (principal) => this.hasZoneRights(principal),
        newId: (prefix) => this.newId(prefix),
        createReportingApprovalRequest: (payload, principal) => this.createReportingApprovalRequest(payload, principal),
        logWarning: (message) => this.logger.warn(message),
      });
    }
    return this.calendarEventsRuntimeService;
  }

  async listAttendanceMetricsFromDb(params: { page?: number; pageSize?: number; search?: string; sreniId?: string }): Promise<{
    items: AttendanceMetricRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(1000, Math.max(1, params.pageSize ?? 20));

    if (this.runtimeMode !== 'db' || !this.dataSource) {
      const search = (params.search ?? '').trim().toLowerCase();
      let all = Array.from(this.attendanceMetrics.values());
      if (params.sreniId) all = all.filter((item) => item.sreniId === params.sreniId);
      if (search) all = all.filter((item) => item.name.toLowerCase().includes(search) || (item.description ?? '').toLowerCase().includes(search));
      all.sort((a, b) => a.name.localeCompare(b.name));
      const total = all.length;
      return { items: all.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
    }

    const searchParam = params.search?.trim() ? `%${params.search.trim()}%` : null;
    const sreniFilter = params.sreniId?.trim() ? params.sreniId.trim() : null;
    const [countRows, dataRows] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM adwest.sreni_attendance_metrics
         WHERE ($1::text IS NULL OR sreni_id = $1)
           AND ($2::text IS NULL OR name ILIKE $2 OR description ILIKE $2)`,
        [sreniFilter, searchParam],
      ),
      this.dataSource.query(
        `SELECT id, sreni_id, name, description, metric_keys, active, created_by, updated_by, created_at, updated_at
         FROM adwest.sreni_attendance_metrics
         WHERE ($1::text IS NULL OR sreni_id = $1)
           AND ($2::text IS NULL OR name ILIKE $2 OR description ILIKE $2)
         ORDER BY name ASC
         LIMIT $3 OFFSET $4`,
        [sreniFilter, searchParam, pageSize, (page - 1) * pageSize],
      ),
    ]);

    const total = (countRows as Array<{ total: number }>)[0].total;
    const items = (dataRows as Array<{
      id: string;
      sreni_id: string;
      name: string;
      description: string | null;
      metric_keys: string[] | null;
      active: boolean;
      created_by: string;
      updated_by: string;
      created_at: string | Date;
      updated_at: string | Date;
    }>).map((row) => ({
      id: row.id,
      sreniId: row.sreni_id,
      name: row.name,
      description: row.description ?? undefined,
      keys: Array.isArray(row.metric_keys) ? row.metric_keys : [],
      active: row.active,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: this.toIsoTimestamp(row.created_at),
      updatedAt: this.toIsoTimestamp(row.updated_at),
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
  }

  async createAttendanceMetric(dto: CreateAttendanceMetricDto, principal?: AuthPrincipal): Promise<AttendanceMetricRecord> {
    if (this.runtimeMode === 'db' && this.dataSource) {
      const exists = await this.dataSource.query(
        'SELECT id FROM adwest.srenies WHERE id=$1 LIMIT 1',
        [dto.sreniId],
      ) as Array<{ id: string }>;
      if (!exists.length) throw new NotFoundException('Sreni not found');
    } else if (!this.srenies.has(dto.sreniId)) {
      throw new NotFoundException('Sreni not found');
    }
    const actor = principal?.email ?? principal?.userId ?? 'system';
    const now = new Date().toISOString();
    const keys = Array.from(new Set((dto.keys ?? []).map((k) => k.trim()).filter((k) => k.length > 0)));
    if (!keys.length) throw new BadRequestException('At least one attendance metric key is required');

    if (this.runtimeMode === 'db' && this.dataSource) {
      const rows = await this.dataSource.query(
        `INSERT INTO adwest.sreni_attendance_metrics
          (sreni_id, name, description, metric_keys, active, created_by, updated_by)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $6)
         RETURNING id, sreni_id, name, description, metric_keys, active, created_by, updated_by, created_at, updated_at`,
        [dto.sreniId, dto.name.trim(), dto.description?.trim() || null, JSON.stringify(keys), dto.active ?? true, actor],
      ) as Array<{ id: string; sreni_id: string; name: string; description: string | null; metric_keys: string[] | null; active: boolean; created_by: string; updated_by: string; created_at: string | Date; updated_at: string | Date }>;
      const row = rows[0];
      const metric: AttendanceMetricRecord = {
        id: row.id,
        sreniId: row.sreni_id,
        name: row.name,
        description: row.description ?? undefined,
        keys: Array.isArray(row.metric_keys) ? row.metric_keys : keys,
        active: row.active,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: this.toIsoTimestamp(row.created_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      };
      this.attendanceMetrics.set(metric.id, metric);
      return metric;
    }

    const metric: AttendanceMetricRecord = {
      id: this.newId('atm'),
      sreniId: dto.sreniId,
      name: dto.name.trim(),
      description: dto.description?.trim() || undefined,
      keys,
      active: dto.active ?? true,
      createdBy: actor,
      updatedBy: actor,
      createdAt: now,
      updatedAt: now,
    };
    this.attendanceMetrics.set(metric.id, metric);
    return metric;
  }

  async updateAttendanceMetric(metricId: string, dto: UpdateAttendanceMetricDto, principal?: AuthPrincipal): Promise<AttendanceMetricRecord> {
    let current = this.attendanceMetrics.get(metricId);

    if (this.runtimeMode === 'db' && this.dataSource) {
      const rows = await this.dataSource.query(
        `SELECT id, sreni_id, name, description, metric_keys, active, created_by, updated_by, created_at, updated_at
         FROM adwest.sreni_attendance_metrics
         WHERE id=$1
         LIMIT 1`,
        [metricId],
      ) as Array<{ id: string; sreni_id: string; name: string; description: string | null; metric_keys: string[] | null; active: boolean; created_by: string; updated_by: string; created_at: string | Date; updated_at: string | Date }>;

      if (!rows.length) {
        throw new NotFoundException('Attendance metric not found');
      }

      const row = rows[0];
      current = {
        id: row.id,
        sreniId: row.sreni_id,
        name: row.name,
        description: row.description ?? undefined,
        keys: Array.isArray(row.metric_keys) ? row.metric_keys : [],
        active: row.active,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: this.toIsoTimestamp(row.created_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      };
      this.attendanceMetrics.set(current.id, current);
    }

    if (!current) throw new NotFoundException('Attendance metric not found');

    const actor = principal?.email ?? principal?.userId ?? 'system';
    const nextKeys = dto.keys !== undefined
      ? Array.from(new Set((dto.keys ?? []).map((k) => k.trim()).filter((k) => k.length > 0)))
      : current.keys;
    if (!nextKeys.length) throw new BadRequestException('At least one attendance metric key is required');

    if (this.runtimeMode === 'db' && this.dataSource) {
      const rows = await this.dataSource.query(
        `UPDATE adwest.sreni_attendance_metrics
         SET name=$2,
             description=$3,
             metric_keys=$4::jsonb,
             active=$5,
             updated_by=$6,
             updated_at=now()
         WHERE id=$1
         RETURNING id, sreni_id, name, description, metric_keys, active, created_by, updated_by, created_at, updated_at`,
        [metricId, dto.name?.trim() ?? current.name, dto.description !== undefined ? (dto.description.trim() || null) : (current.description ?? null), JSON.stringify(nextKeys), dto.active !== undefined ? dto.active : current.active, actor],
      ) as Array<{ id: string; sreni_id: string; name: string; description: string | null; metric_keys: string[] | null; active: boolean; created_by: string; updated_by: string; created_at: string | Date; updated_at: string | Date }>;
      if (!rows.length) {
        throw new NotFoundException('Attendance metric not found');
      }
      const row = rows[0];
      const updated: AttendanceMetricRecord = {
        id: row.id,
        sreniId: row.sreni_id,
        name: row.name,
        description: row.description ?? undefined,
        keys: Array.isArray(row.metric_keys) ? row.metric_keys : nextKeys,
        active: row.active,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: this.toIsoTimestamp(row.created_at),
        updatedAt: this.toIsoTimestamp(row.updated_at),
      };
      this.attendanceMetrics.set(updated.id, updated);
      return updated;
    }

    const updated: AttendanceMetricRecord = {
      ...current,
      name: dto.name !== undefined ? dto.name.trim() : current.name,
      description: dto.description !== undefined ? (dto.description.trim() || undefined) : current.description,
      keys: nextKeys,
      active: dto.active !== undefined ? dto.active : current.active,
      updatedBy: actor,
      updatedAt: new Date().toISOString(),
    };
    this.attendanceMetrics.set(metricId, updated);
    return updated;
  }

  async deleteAttendanceMetric(metricId: string): Promise<{ success: boolean; deletedId: string }> {
    if (!this.attendanceMetrics.has(metricId)) throw new NotFoundException('Attendance metric not found');
    if (this.runtimeMode === 'db' && this.dataSource) {
      await this.dataSource.query('DELETE FROM adwest.sreni_attendance_metrics WHERE id=$1', [metricId]);
    }
    this.attendanceMetrics.delete(metricId);
    for (const [captureId, capture] of this.eventAttendanceCaptures.entries()) {
      if (capture.metricId === metricId) this.eventAttendanceCaptures.delete(captureId);
    }
    return { success: true, deletedId: metricId };
  }

  listSreniAttendanceListing(
    sreniId: string,
    principal: AuthPrincipal,
    accessibleSthanIds: string[] = [],
  ): Array<{ event: CalendarEventRecord; metrics: Array<{ metric: AttendanceMetricRecord; capture?: EventAttendanceCaptureRecord }> }> {
    return this.getAttendanceRuntime().listSreniAttendanceListing(sreniId, principal, accessibleSthanIds);
  }

  async upsertEventAttendanceCapture(
    sreniId: string,
    eventId: string,
    dto: UpsertEventAttendanceCaptureDto,
    principal: AuthPrincipal,
  ): Promise<EventAttendanceCaptureRecord> {
    return this.getAttendanceRuntime().upsertEventAttendanceCapture(sreniId, eventId, dto, principal);
  }

  private getAttendanceRuntime(): AttendanceRuntimeService {
    if (!this.attendanceRuntimeService) {
      this.attendanceRuntimeService = new AttendanceRuntimeService({
        calendarEvents: this.calendarEvents,
        attendanceMetrics: this.attendanceMetrics,
        eventAttendanceCaptures: this.eventAttendanceCaptures,
        runtimeMode: this.runtimeMode,
        dataSource: this.dataSource ?? undefined,
        newId: (prefix) => this.newId(prefix),
        hasZoneRights: (principal) => this.hasZoneRights(principal),
        toIsoTimestamp: (value) => this.toIsoTimestamp(value),
        listSreniCalendarEvents: (sreniId, principal, accessibleSthanIds) =>
          this.listSreniCalendarEvents(sreniId, principal, accessibleSthanIds),
        isTargetApproved: (targetType, targetId) => this.isTargetApproved(targetType, targetId),
      });
    }
    return this.attendanceRuntimeService;
  }
  private hasZoneRights(principal: AuthPrincipal): boolean {
    if ((principal.roleAssignments ?? []).some((assignment) => assignment.scopeType === 'zone' || assignment.scopeType === 'global')) {
      return true;
    }
    // Backward compatibility for legacy tokens that may not include roleAssignments.
    if ((principal.roles as string[]).includes('SUPER_ADMIN') || (principal.roles as string[]).includes('ZONE_ADMIN')) {
      return true;
    }
    return false;
  }

  // ── Sreni Contact List ─────────────────────────────────────────────────────

  listSreniContacts(
    sreniId: string,
    page = 1,
    pageSize = 50,
  ): { items: SreniContactRecord[]; total: number; page: number; pageSize: number; totalPages: number } {
    const all = Array.from(this.sreniContacts.values())
      .filter((c) => c.sreniId === sreniId)
      .sort((a, b) => a.rowIndex - b.rowIndex);
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const items = all.slice(start, start + pageSize);
    return { items, total, page, pageSize, totalPages };
  }

  async uploadSreniContacts(
    sreniId: string,
    fileBuffer: Buffer,
    originalName: string,
    uploadedBy?: string,
  ): Promise<{ inserted: number; sreniId: string }> {
    // Dynamic import of xlsx (SheetJS) — avoids bundling issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx') as typeof import('xlsx');

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('Excel file has no sheets');
    const sheet = workbook.Sheets[sheetName];

    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      blankrows: false,
      raw: false,
    }) as unknown[][];

    if (grid.length <= 1) {
      return { inserted: 0, sreniId };
    }

    const headerRow = grid[0] ?? [];
    const normalizedHeaders = headerRow.map((cell) => normalizeContactTemplateHeader(cell));
    const normalizedHeaderSet = new Set(normalizedHeaders.filter((h) => h.length > 0));

    const missingHeaders = Array.from(new Set(MASTER_SRENI_CONTACT_FIELDS.map((f) => f.header)))
      .filter((header) => !normalizedHeaderSet.has(header));

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        'Uploaded file does not match the master contact template headers. '
        + `Missing header(s): ${missingHeaders.join(', ')}`,
      );
    }

    const headerBuckets = new Map<string, number[]>();
    normalizedHeaders.forEach((header, index) => {
      if (!header) return;
      const bucket = headerBuckets.get(header) ?? [];
      bucket.push(index);
      headerBuckets.set(header, bucket);
    });

    const parsedRows = grid.slice(1).map((rawRow) => {
      const data: Record<string, SreniContactCellValue> = {};
      for (const field of MASTER_SRENI_CONTACT_FIELDS) {
        const occurrence = (field.occurrence ?? 1) - 1;
        const sourceIndexes = headerBuckets.get(field.header) ?? [];
        const sourceIndex = sourceIndexes[occurrence];
        data[field.key] = sourceIndex === undefined
          ? null
          : normalizeSreniContactCell(rawRow[sourceIndex]);
      }
      return data;
    }).filter((row) => Object.values(row).some((value) => value !== null));

    if (parsedRows.length === 0) {
      return { inserted: 0, sreniId };
    }

    const now = new Date().toISOString();

    // Clear existing contacts for this sreni first (re-upload replaces)
    for (const [key, c] of this.sreniContacts) {
      if (c.sreniId === sreniId) this.sreniContacts.delete(key);
    }

    const records: SreniContactRecord[] = parsedRows.map((row, idx) => {
      const id = this.newId('sc');
      return {
        id,
        sreniId,
        rowIndex: idx + 1,
        data: row,
        sourceFile: originalName,
        uploadedBy,
        createdAt: now,
        updatedAt: now,
      };
    });

    for (const r of records) {
      this.sreniContacts.set(`${sreniId}:${r.id}`, r);
    }

    // Persist to DB if available
    if (this.runtimeMode === 'db' && this.dataSource) {
      await this.dataSource.query(
        `DELETE FROM adwest.sreni_contacts WHERE sreni_id = $1`,
        [sreniId],
      );
      for (const r of records) {
        await this.dataSource.query(
          `INSERT INTO adwest.sreni_contacts (id, sreni_id, row_index, data, source_file, uploaded_by)
           VALUES (gen_random_uuid(), $1, $2, $3::jsonb, $4, $5)`,
          [sreniId, r.rowIndex, JSON.stringify(r.data), r.sourceFile ?? null, r.uploadedBy ?? null],
        );
      }
    }

    return { inserted: records.length, sreniId };
  }

  async clearSreniContacts(sreniId: string): Promise<{ deleted: number; sreniId: string }> {
    let deleted = 0;
    for (const [key, c] of this.sreniContacts) {
      if (c.sreniId === sreniId) {
        this.sreniContacts.delete(key);
        deleted++;
      }
    }
    if (this.runtimeMode === 'db' && this.dataSource) {
      await this.dataSource.query(
        `DELETE FROM adwest.sreni_contacts WHERE sreni_id = $1`,
        [sreniId],
      );
    }
    return { deleted, sreniId };
  }

  // ── Report Metric Definitions ───────────────────────────────────────────────

  async listReportMetricDefinitions(): Promise<ReportMetricDefinitionRecord[]> {
    if (this.runtimeMode === 'db' && this.dataSource) {
      const rows = await this.dataSource.query(
        `SELECT id, name, description, unit, input_type, is_required, sort_order, active, created_at, updated_at
         FROM adwest.report_metric_definitions ORDER BY sort_order ASC, created_at ASC`,
      ) as Array<{ id: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; active: boolean; created_at: string | Date; updated_at: string | Date }>;
      return rows.map((r) => ({
        id: r.id, name: r.name, description: r.description ?? undefined, unit: r.unit ?? undefined,
        inputType: r.input_type as 'number' | 'text', isRequired: r.is_required, sortOrder: r.sort_order,
        active: r.active, createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at),
      }));
    }
    return Array.from(this.reportMetricDefinitions.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async createReportMetricDefinition(dto: CreateReportMetricDefinitionDto): Promise<ReportMetricDefinitionRecord> {
    if (this.runtimeMode === 'db' && this.dataSource) {
      const rows = await this.dataSource.query(
        `INSERT INTO adwest.report_metric_definitions (name, description, unit, input_type, is_required, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, description, unit, input_type, is_required, sort_order, active, created_at, updated_at`,
        [dto.name, dto.description ?? null, dto.unit ?? null, dto.inputType, dto.isRequired ?? false, dto.sortOrder ?? 0],
      ) as Array<{ id: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; active: boolean; created_at: string | Date; updated_at: string | Date }>;
      const r = rows[0];
      return { id: r.id, name: r.name, description: r.description ?? undefined, unit: r.unit ?? undefined, inputType: r.input_type as 'number' | 'text', isRequired: r.is_required, sortOrder: r.sort_order, active: r.active, createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at) };
    }
    const record: ReportMetricDefinitionRecord = {
      id: this.newId('rmd'), name: dto.name, description: dto.description, unit: dto.unit,
      inputType: dto.inputType, isRequired: dto.isRequired ?? false, sortOrder: dto.sortOrder ?? 0,
      active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    this.reportMetricDefinitions.set(record.id, record);
    return record;
  }

  async updateReportMetricDefinition(metricId: string, dto: UpdateReportMetricDefinitionDto): Promise<ReportMetricDefinitionRecord> {
    if (this.runtimeMode === 'db' && this.dataSource) {
      const existing = await this.dataSource.query(
        `SELECT id FROM adwest.report_metric_definitions WHERE id=$1`, [metricId],
      ) as Array<{ id: string }>;
      if (!existing.length) throw new NotFoundException('Report metric not found');
      const rows = await this.dataSource.query(
        `UPDATE adwest.report_metric_definitions
         SET name=COALESCE($2, name), description=COALESCE($3, description), unit=COALESCE($4, unit),
             input_type=COALESCE($5, input_type), is_required=COALESCE($6, is_required),
             sort_order=COALESCE($7, sort_order), active=COALESCE($8, active), updated_at=now()
         WHERE id=$1
         RETURNING id, name, description, unit, input_type, is_required, sort_order, active, created_at, updated_at`,
        [metricId, dto.name ?? null, dto.description ?? null, dto.unit ?? null,
         dto.inputType ?? null, dto.isRequired ?? null, dto.sortOrder ?? null, dto.active ?? null],
      ) as Array<{ id: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; active: boolean; created_at: string | Date; updated_at: string | Date }>;
      const r = rows[0];
      return { id: r.id, name: r.name, description: r.description ?? undefined, unit: r.unit ?? undefined, inputType: r.input_type as 'number' | 'text', isRequired: r.is_required, sortOrder: r.sort_order, active: r.active, createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at) };
    }
    const current = this.reportMetricDefinitions.get(metricId);
    if (!current) throw new NotFoundException('Report metric not found');
    const updated = { ...current, ...dto, updatedAt: new Date().toISOString() };
    this.reportMetricDefinitions.set(metricId, updated);
    return updated;
  }

  async deleteReportMetricDefinition(metricId: string): Promise<void> {
    if (this.runtimeMode === 'db' && this.dataSource) {
      await this.dataSource.query(`DELETE FROM adwest.report_metric_definitions WHERE id=$1`, [metricId]);
      return;
    }
    this.reportMetricDefinitions.delete(metricId);
  }

  // ── Sreni Monthly Reports ───────────────────────────────────────────────────

  async listSreniMonthlyReports(sreniId: string): Promise<SreniMonthlyReportRecord[]> {
    if (this.runtimeMode === 'db' && this.dataSource) {
      const rows = await this.dataSource.query(
        `SELECT id, sreni_id, report_year, report_month, status, submitted_by, submitted_at, notes, entries, created_at, updated_at
         FROM adwest.sreni_monthly_reports WHERE sreni_id=$1 ORDER BY report_year DESC, report_month DESC`,
        [sreniId],
      ) as Array<{ id: string; sreni_id: string; report_year: number; report_month: number; status: string; submitted_by: string | null; submitted_at: string | Date | null; notes: string | null; entries: Record<string, string>; created_at: string | Date; updated_at: string | Date }>;
      return rows.map((r) => ({
        id: r.id, sreniId: r.sreni_id, year: r.report_year, month: r.report_month,
        status: r.status as 'draft' | 'submitted', submittedBy: r.submitted_by ?? undefined,
        submittedAt: r.submitted_at ? this.toIsoTimestamp(r.submitted_at) : undefined,
        notes: r.notes ?? undefined, entries: r.entries ?? {},
        createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at),
      }));
    }
    return Array.from(this.sreniMonthlyReports.values()).filter((r) => r.sreniId === sreniId).sort((a, b) => b.year - a.year || b.month - a.month);
  }

  async listAllMonthlyReports(): Promise<SreniMonthlyReportRecord[]> {
    if (this.runtimeMode === 'db' && this.dataSource) {
      const rows = await this.dataSource.query(
        `SELECT id, sreni_id, report_year, report_month, status, submitted_by, submitted_at, notes, entries, created_at, updated_at
         FROM adwest.sreni_monthly_reports ORDER BY report_year DESC, report_month DESC, sreni_id`,
      ) as Array<{ id: string; sreni_id: string; report_year: number; report_month: number; status: string; submitted_by: string | null; submitted_at: string | Date | null; notes: string | null; entries: Record<string, string>; created_at: string | Date; updated_at: string | Date }>;
      return rows.map((r) => ({
        id: r.id, sreniId: r.sreni_id, year: r.report_year, month: r.report_month,
        status: r.status as 'draft' | 'submitted', submittedBy: r.submitted_by ?? undefined,
        submittedAt: r.submitted_at ? this.toIsoTimestamp(r.submitted_at) : undefined,
        notes: r.notes ?? undefined, entries: r.entries ?? {},
        createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at),
      }));
    }
    return Array.from(this.sreniMonthlyReports.values()).sort((a, b) => b.year - a.year || b.month - a.month);
  }

  async upsertSreniMonthlyReport(sreniId: string, dto: SubmitSreniMonthlyReportDto, submittedBy?: string): Promise<SreniMonthlyReportRecord> {
    const now = new Date().toISOString();
    if (this.runtimeMode === 'db' && this.dataSource) {
      const rows = await this.dataSource.query(
        `INSERT INTO adwest.sreni_monthly_reports (sreni_id, report_year, report_month, status, submitted_by, submitted_at, notes, entries)
         VALUES ($1, $2, $3, 'submitted', $4, now(), $5, $6)
         ON CONFLICT (sreni_id, report_year, report_month) DO UPDATE
           SET status='submitted', submitted_by=$4, submitted_at=now(), notes=$5, entries=$6, updated_at=now()
         RETURNING id, sreni_id, report_year, report_month, status, submitted_by, submitted_at, notes, entries, created_at, updated_at`,
        [sreniId, dto.year, dto.month, submittedBy ?? null, dto.notes ?? null, JSON.stringify(dto.entries)],
      ) as Array<{ id: string; sreni_id: string; report_year: number; report_month: number; status: string; submitted_by: string | null; submitted_at: string | Date | null; notes: string | null; entries: Record<string, string>; created_at: string | Date; updated_at: string | Date }>;
      const r = rows[0];
      const record: SreniMonthlyReportRecord = {
        id: r.id, sreniId: r.sreni_id, year: r.report_year, month: r.report_month,
        status: r.status as 'draft' | 'submitted', submittedBy: r.submitted_by ?? undefined,
        submittedAt: r.submitted_at ? this.toIsoTimestamp(r.submitted_at) : undefined,
        notes: r.notes ?? undefined, entries: r.entries ?? {},
        createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at),
      };
      this.sreniMonthlyReports.set(record.id, record);
      return record;
    }
    const existing = Array.from(this.sreniMonthlyReports.values()).find((r) => r.sreniId === sreniId && r.year === dto.year && r.month === dto.month);
    if (existing) {
      const updated: SreniMonthlyReportRecord = { ...existing, status: 'submitted', submittedBy, submittedAt: now, notes: dto.notes, entries: dto.entries, updatedAt: now };
      this.sreniMonthlyReports.set(existing.id, updated);
      return updated;
    }
    const record: SreniMonthlyReportRecord = {
      id: this.newId('smr'), sreniId, year: dto.year, month: dto.month, status: 'submitted',
      submittedBy, submittedAt: now, notes: dto.notes, entries: dto.entries, createdAt: now, updatedAt: now,
    };
    this.sreniMonthlyReports.set(record.id, record);
    return record;
  }

  // ── Sreni Report Parameters ─────────────────────────────────────────────────

  async listSreniReportParameters(sreniId: string, submissionType?: string): Promise<SreniReportParameterRecord[]> {
    if (this.runtimeMode === 'db' && this.dataSource) {
      const params: unknown[] = [sreniId];
      const typeClause = submissionType ? ` AND submission_type=$2` : '';
      if (submissionType) params.push(submissionType);
      const rows = await this.dataSource.query(
        `SELECT id, sreni_id, submission_type, name, description, unit, input_type, is_required, sort_order, active, created_at, updated_at
         FROM adwest.sreni_report_parameters WHERE sreni_id=$1${typeClause} ORDER BY sort_order ASC, created_at ASC`,
        params,
      ) as Array<{ id: string; sreni_id: string; submission_type: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; active: boolean; created_at: string | Date; updated_at: string | Date }>;
      return rows.map((r) => ({
        id: r.id, sreniId: r.sreni_id, submissionType: r.submission_type as 'monthly' | 'half_yearly' | 'yearly',
        name: r.name, description: r.description ?? undefined, unit: r.unit ?? undefined,
        inputType: r.input_type as 'number' | 'text', isRequired: r.is_required, sortOrder: r.sort_order,
        active: r.active, createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at),
      }));
    }
    let items = Array.from(this.sreniReportParameters.values()).filter((p) => p.sreniId === sreniId);
    if (submissionType) items = items.filter((p) => p.submissionType === submissionType);
    return items.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async createSreniReportParameter(sreniId: string, submissionType: string, dto: CreateSreniReportParameterDto): Promise<SreniReportParameterRecord> {
    if (this.runtimeMode === 'db' && this.dataSource) {
      const rows = await this.dataSource.query(
        `INSERT INTO adwest.sreni_report_parameters (sreni_id, submission_type, name, description, unit, input_type, is_required, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, sreni_id, submission_type, name, description, unit, input_type, is_required, sort_order, active, created_at, updated_at`,
        [sreniId, submissionType, dto.name, dto.description ?? null, dto.unit ?? null, dto.inputType, dto.isRequired ?? false, dto.sortOrder ?? 0],
      ) as Array<{ id: string; sreni_id: string; submission_type: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; active: boolean; created_at: string | Date; updated_at: string | Date }>;
      const r = rows[0];
      return { id: r.id, sreniId: r.sreni_id, submissionType: r.submission_type as 'monthly' | 'half_yearly' | 'yearly', name: r.name, description: r.description ?? undefined, unit: r.unit ?? undefined, inputType: r.input_type as 'number' | 'text', isRequired: r.is_required, sortOrder: r.sort_order, active: r.active, createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at) };
    }
    const record: SreniReportParameterRecord = {
      id: this.newId('srp'), sreniId, submissionType: submissionType as 'monthly' | 'half_yearly' | 'yearly',
      name: dto.name, description: dto.description, unit: dto.unit, inputType: dto.inputType,
      isRequired: dto.isRequired ?? false, sortOrder: dto.sortOrder ?? 0, active: true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    this.sreniReportParameters.set(record.id, record);
    return record;
  }

  async updateSreniReportParameter(parameterId: string, dto: UpdateSreniReportParameterDto): Promise<SreniReportParameterRecord> {
    if (this.runtimeMode === 'db' && this.dataSource) {
      await this.dataSource.query(
        `UPDATE adwest.sreni_report_parameters
         SET name=COALESCE($2, name), description=COALESCE($3, description), unit=COALESCE($4, unit),
             input_type=COALESCE($5, input_type), is_required=COALESCE($6, is_required),
             sort_order=COALESCE($7, sort_order), active=COALESCE($8, active), updated_at=now()
         WHERE id=$1`,
        [parameterId, dto.name ?? null, dto.description ?? null, dto.unit ?? null, dto.inputType ?? null, dto.isRequired ?? null, dto.sortOrder ?? null, dto.active ?? null],
      );
      const rows = await this.dataSource.query(
        `SELECT id, sreni_id, submission_type, name, description, unit, input_type, is_required, sort_order, active, created_at, updated_at
         FROM adwest.sreni_report_parameters WHERE id=$1`,
        [parameterId],
      ) as Array<{ id: string; sreni_id: string; submission_type: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; active: boolean; created_at: string | Date; updated_at: string | Date }>;
      if (!rows.length) throw new NotFoundException('Report parameter not found');
      const r = rows[0];
      return { id: r.id, sreniId: r.sreni_id, submissionType: r.submission_type as 'monthly' | 'half_yearly' | 'yearly', name: r.name, description: r.description ?? undefined, unit: r.unit ?? undefined, inputType: r.input_type as 'number' | 'text', isRequired: r.is_required, sortOrder: r.sort_order, active: r.active, createdAt: this.toIsoTimestamp(r.created_at), updatedAt: this.toIsoTimestamp(r.updated_at) };
    }
    const current = this.sreniReportParameters.get(parameterId);
    if (!current) throw new NotFoundException('Report parameter not found');
    const updated = { ...current, ...dto, updatedAt: new Date().toISOString() };
    this.sreniReportParameters.set(parameterId, updated);
    return updated;
  }

  async deleteSreniReportParameter(parameterId: string): Promise<{ success: boolean }> {
    if (this.runtimeMode === 'db' && this.dataSource) {
      await this.dataSource.query(`DELETE FROM adwest.sreni_report_parameters WHERE id=$1`, [parameterId]);
      return { success: true };
    }
    this.sreniReportParameters.delete(parameterId);
    return { success: true };
  }

  // ── Sreni Reports (new generic) ─────────────────────────────────────────────

  async listSreniReports(sreniId: string, submissionType?: string): Promise<SreniReportRecord[]> {
    return this.getSreniReportsRuntime().listSreniReports(sreniId, submissionType);
  }

  async upsertSreniReport(
    sreniId: string,
    dto: SubmitSreniReportDto,
    submittedBy?: string,
    principal?: AuthPrincipal,
  ): Promise<SreniReportRecord> {
    return this.getSreniReportsRuntime().upsertSreniReport(sreniId, dto, submittedBy, principal);
  }

  private getSreniReportsRuntime(): SreniReportsRuntimeService {
    if (!this.sreniReportsRuntimeService) {
      this.sreniReportsRuntimeService = new SreniReportsRuntimeService({
        runtimeMode: this.runtimeMode,
        dataSource: this.dataSource ?? undefined,
        sreniReports: this.sreniReports,
        toIsoTimestamp: (value) => this.toIsoTimestamp(value),
        newId: (prefix) => this.newId(prefix),
        createReportingApprovalRequest: (payload, principal) => this.createReportingApprovalRequest(payload, principal),
      });
    }
    return this.sreniReportsRuntimeService;
  }
}





