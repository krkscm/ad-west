import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import { CryptoService } from '@modules/user-management/services/crypto.service';
import { CORE_BUSINESS_STORE } from './constants';
import {
  BulkAttendanceUploadDto,
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
  CreateZoneDto,
  RecordAttendanceDto,
  ReviewApprovalItemDto,
  ResubmitApprovalItemDto,
  ReviewReportSubmissionDto,
  SubmitApprovalItemDto,
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
  UpdateZoneDto,
  CreateReportMetricDefinitionDto,
  UpdateReportMetricDefinitionDto,
  SubmitSreniMonthlyReportDto,
  CreateSreniReportParameterDto,
  UpdateSreniReportParameterDto,
  SubmitSreniReportDto,
} from './dto/core-business.dto';
import { ApprovalRuntimeService } from './services/approval-runtime.service';
import { AttendanceRuntimeService, type AttendanceRuntimeContext } from './services/attendance-runtime.service';
import { CalendarEventsRuntimeService, type CalendarEventsRuntimeContext } from './services/calendar-events-runtime.service';
import { CoreBusinessAccessUtilsService } from './services/core-business-access-utils.service';
import { CoreBusinessDbBootstrapService } from './services/core-business-db-bootstrap.service';
import { CoreBusinessDbHydrationService } from './services/core-business-db-hydration.service';
import { CoreBusinessDomainUtilsService } from './services/core-business-domain-utils.service';
import { CoreBusinessPersistenceRuntimeService } from './services/core-business-persistence-runtime.service';
import { CoreBusinessReadinessService } from './services/core-business-readiness.service';
import { CoreBusinessRuntimeSnapshotService } from './services/core-business-runtime-snapshot.service';
import { DocumentReportRuntimeService } from './services/document-report-runtime.service';
import { PermissionsRuntimeService } from './services/permissions-runtime.service';
import { ProgramRuntimeService, type ProgramRuntimeContext } from './services/program-runtime.service';
import { ResponsibilityChartRuntimeService } from './services/responsibility-chart-runtime.service';
import { OrgRuntimeService, type OrgRuntimeContext } from './services/org-runtime.service';
import { SreniAdminRuntimeService } from './services/sreni-admin-runtime.service';
import { SreniReportsRuntimeService } from './services/sreni-reports-runtime.service';
import { UserAdminRuntimeService } from './services/user-admin-runtime.service';
import { CoreBusinessStore } from './store/core-business-store.interface';
import { DataSource } from 'typeorm';

import type {
  ApprovalItemRecord,
  ApprovalNotificationRecord,
  ApprovalWorkflowRecord,
  AttendanceMetricRecord,
  AttendanceRecord,
  CalendarEventRecord,
  CoreBusinessPersistenceReadinessRecord,
  DocumentFolderRecord,
  DocumentRecord,
  EditRequestRecord,
  EventAttendanceCaptureRecord,
  GovernanceAssignmentRecord,
  GovernanceStructureRecord,
  ImportRecord,
  LocationRecord,
  PermissionRecord,
  PermissionSetRecord,
  ProgramRecord,
  ProgramSessionRecord,
  ResponsibilityChartRecord,
  ReportMetricDefinitionRecord,
  ReportSubmissionRecord,
  ReportTemplateRecord,
  RegistrationRecord,
  SreniContactRecord,
  SreniMonthlyReportRecord,
  SreniReportParameterRecord,
  SreniReportRecord,
  SrenyRecord,
  SthanRecord,
  TicketActivityRecord,
  TicketRecord,
  UserRecord,
  ZoneRecord,
} from './core-business.types';

export type {
  ApprovalItemRecord,
  ApprovalNotificationRecord,
  ApprovalWorkflowRecord,
  AttendanceMetricRecord,
  AttendanceRecord,
  CalendarEventRecord,
  CoreBusinessPersistenceReadinessRecord,
  DocumentFolderRecord,
  DocumentRecord,
  EditRequestRecord,
  EventAttendanceCaptureRecord,
  GovernanceAssignmentRecord,
  GovernanceStructureRecord,
  ImportRecord,
  ImportReconciliationRecord,
  LocationRecord,
  PermissionRecord,
  PermissionSetRecord,
  ProgramRecord,
  ProgramSessionRecord,
  ProgramStatus,
  ResponsibilityChartEdgeRecord,
  ResponsibilityChartNodeRecord,
  ResponsibilityChartRecord,
  ReportMetricDefinitionRecord,
  ReportSubmissionRecord,
  ReportTemplateRecord,
  RegistrationRecord,
  SreniContactRecord,
  SreniMonthlyReportRecord,
  SreniReportParameterRecord,
  SreniReportRecord,
  SrenyRecord,
  SthanRecord,
  TicketActivityRecord,
  TicketCommentRecord,
  TicketRecord,
  UserRecord,
  ZoneRecord,
} from './core-business.types';

const createFallbackCoreBusinessStore = (): CoreBusinessStore => ({
  getMode: () => 'in-memory',
  loadState: async () => null,
  saveState: async () => undefined,
});

const SNAPSHOT_FLUSH_INTERVAL_MS = Number(process.env.CORE_RUNTIME_SNAPSHOT_FLUSH_MS || 0);

@Injectable()
export class CoreBusinessService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CoreBusinessService.name);
  private readonly store: CoreBusinessStore;
  private persistenceFlushInterval: ReturnType<typeof setInterval> | null = null;
  private lastPersistedSnapshot: string | null = null;
  private snapshotFlushInProgress = false;
  private snapshotDirty = true;

  private readonly locations = new Map<string, LocationRecord>();
  private readonly zones = new Map<string, ZoneRecord>();
  private readonly srenies = new Map<string, SrenyRecord>();
  private readonly sthans = new Map<string, SthanRecord>();
  private readonly governanceStructures = new Map<string, GovernanceStructureRecord>();
  private readonly governanceAssignments = new Map<string, GovernanceAssignmentRecord>();
  private readonly imports = new Map<string, ImportRecord>();
  private readonly programs = new Map<string, ProgramRecord>();
  private readonly sessions = new Map<string, { programId: string; session: ProgramSessionRecord }>();
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
  private coreBusinessAccessUtilsService: CoreBusinessAccessUtilsService | null = null;
  private coreBusinessDbBootstrapService: CoreBusinessDbBootstrapService | null = null;
  private coreBusinessDbHydrationService: CoreBusinessDbHydrationService | null = null;
  private coreBusinessDomainUtilsService: CoreBusinessDomainUtilsService | null = null;
  private coreBusinessPersistenceRuntimeService: CoreBusinessPersistenceRuntimeService | null = null;
  private coreBusinessReadinessService: CoreBusinessReadinessService | null = null;
  private coreBusinessRuntimeSnapshotService: CoreBusinessRuntimeSnapshotService | null = null;
  private documentReportRuntimeService: DocumentReportRuntimeService | null = null;
  private permissionsRuntimeService: PermissionsRuntimeService | null = null;
  private programRuntimeService: ProgramRuntimeService | null = null;
  private orgRuntimeService: OrgRuntimeService | null = null;
  private sreniAdminRuntimeService: SreniAdminRuntimeService | null = null;
  private sreniReportsRuntimeService: SreniReportsRuntimeService | null = null;
  private responsibilityChartRuntimeService: ResponsibilityChartRuntimeService | null = null;
  private userAdminRuntimeService: UserAdminRuntimeService | null = null;
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

    const userId = this.newId('usr');
    this.users.set(userId, {
      id: userId,
      code: 'USR-DEMO1',
      name: 'Demo Member',
      phone: '971500000001',
      email: 'member@adwest.local',
      active: true,
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
      contactId: userId,
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
      await this.getCoreBusinessDbBootstrap().ensureRuntimeSchema();
    }

    try {
      const snapshotJson = await this.store.loadState();
      if (snapshotJson) {
        this.getRuntimeSnapshotService().hydrateRuntimeSnapshot(snapshotJson);
        this.lastPersistedSnapshot = snapshotJson;
        this.snapshotDirty = false;
      } else if (this.dataSource) {
        await this.hydrateRuntimeStateFromDatabase();
        await this.flushStateToStore(true);
      } else {
        await this.flushStateToStore(true);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Core Business runtime snapshot from store: ${(error as Error).message}`,
      );
    }

    if (SNAPSHOT_FLUSH_INTERVAL_MS > 0) {
      this.persistenceFlushInterval = setInterval(() => {
        void this.flushStateToStore();
      }, SNAPSHOT_FLUSH_INTERVAL_MS);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.persistenceFlushInterval) {
      clearInterval(this.persistenceFlushInterval);
      this.persistenceFlushInterval = null;
    }

    if (this.runtimeMode === 'db') {
      await this.flushStateToStore(true);
    }
  }

  listZones(): ZoneRecord[] {
    return this.getOrgRuntime().listZones();
  }

  async createZone(dto: CreateZoneDto): Promise<ZoneRecord> {
    return this.getOrgRuntime().createZone(dto);
  }

  async updateZone(zoneId: string, dto: UpdateZoneDto): Promise<ZoneRecord> {
    return this.getOrgRuntime().updateZone(zoneId, dto);
  }

  async listLocationsFromDb(params: { page?: number; pageSize?: number; search?: string; level?: string }): Promise<{
    items: LocationRecord[]; total: number; page: number; pageSize: number; totalPages: number;
  }> {
    return this.getOrgRuntime().listLocationsFromDb(params);
  }

  async createLocation(dto: CreateLocationDto): Promise<LocationRecord> {
    return this.getOrgRuntime().createLocation(dto);
  }

  async updateLocation(locationId: string, dto: UpdateLocationDto): Promise<LocationRecord> {
    return this.getOrgRuntime().updateLocation(locationId, dto);
  }

  async deleteLocation(locationId: string): Promise<void> {
    return this.getOrgRuntime().deleteLocation(locationId);
  }

  listSrenies(zoneId?: string): SrenyRecord[] {
    return this.getOrgRuntime().listSrenies(zoneId);
  }

  async createSreny(dto: CreateSrenyDto): Promise<SrenyRecord> {
    return this.getOrgRuntime().createSreny(dto);
  }

  async updateSreny(srenyId: string, dto: UpdateSrenyDto): Promise<SrenyRecord> {
    return this.getOrgRuntime().updateSreny(srenyId, dto);
  }

  listSreniDefinitions(): SrenyRecord[] {
    return this.getOrgRuntime().listSreniDefinitions();
  }

  async listSreniDefinitionsFromDb(params: { page?: number; pageSize?: number; search?: string }): Promise<{
    items: SrenyRecord[]; total: number; page: number; pageSize: number; totalPages: number;
  }> {
    return this.getOrgRuntime().listSreniDefinitionsFromDb(params);
  }

  async createSreniDefinition(dto: CreateSreniDefinitionDto, actorEmail?: string): Promise<SrenyRecord> {
    return this.getOrgRuntime().createSreniDefinition(dto, actorEmail);
  }

  async updateSreniDefinition(sreniId: string, dto: UpdateSreniDefinitionDto, actorEmail?: string): Promise<SrenyRecord> {
    return this.getOrgRuntime().updateSreniDefinition(sreniId, dto, actorEmail);
  }

  async deleteSreniDefinition(sreniId: string): Promise<void> {
    return this.getOrgRuntime().deleteSreniDefinition(sreniId);
  }

  listSthans(srenyId?: string): SthanRecord[] {
    return this.getOrgRuntime().listSthans(srenyId);
  }

  createSthan(dto: CreateSthanDto): SthanRecord {
    return this.getOrgRuntime().createSthan(dto);
  }

  updateSthan(sthanId: string, dto: UpdateSthanDto): SthanRecord {
    return this.getOrgRuntime().updateSthan(sthanId, dto);
  }

  listGovernanceStructures(srenyId: string): GovernanceStructureRecord[] {
    return this.getOrgRuntime().listGovernanceStructures(srenyId);
  }

  createGovernanceStructure(
    srenyId: string,
    dto: CreateGovernanceStructureDto,
  ): GovernanceStructureRecord {
    return this.getOrgRuntime().createGovernanceStructure(srenyId, dto);
  }

  updateGovernanceStructure(
    srenyId: string,
    structureId: string,
    dto: UpdateGovernanceStructureDto,
  ): GovernanceStructureRecord {
    return this.getOrgRuntime().updateGovernanceStructure(srenyId, structureId, dto);
  }

  listGovernanceAssignments(structureId: string): GovernanceAssignmentRecord[] {
    return this.getOrgRuntime().listGovernanceAssignments(structureId);
  }

  createGovernanceAssignment(
    structureId: string,
    dto: CreateGovernanceAssignmentDto,
  ): GovernanceAssignmentRecord {
    return this.getOrgRuntime().createGovernanceAssignment(structureId, dto);
  }

  updateGovernanceAssignment(
    structureId: string,
    assignmentId: string,
    dto: UpdateGovernanceAssignmentDto,
  ): GovernanceAssignmentRecord {
    return this.getOrgRuntime().updateGovernanceAssignment(structureId, assignmentId, dto);
  }

  getPersistenceReadiness(): CoreBusinessPersistenceReadinessRecord {
    return this.getCoreBusinessReadinessService().getPersistenceReadiness(this.store.getMode());
  }

  listPrograms(): ProgramRecord[] {
    return this.getProgramRuntime().listPrograms();
  }

  createProgram(dto: CreateProgramDto): ProgramRecord {
    return this.getProgramRuntime().createProgram(dto);
  }

  getProgram(programId: string): ProgramRecord {
    return this.getProgramRuntime().getProgram(programId);
  }

  updateProgram(programId: string, dto: UpdateProgramDto): ProgramRecord {
    return this.getProgramRuntime().updateProgram(programId, dto);
  }

  publishProgram(programId: string): ProgramRecord {
    return this.getProgramRuntime().publishProgram(programId);
  }

  archiveProgram(programId: string): ProgramRecord {
    return this.getProgramRuntime().archiveProgram(programId);
  }

  createSession(programId: string, dto: CreateSessionDto): ProgramSessionRecord {
    return this.getProgramRuntime().createSession(programId, dto);
  }

  updateSession(
    programId: string,
    sessionId: string,
    dto: UpdateSessionDto,
  ): ProgramSessionRecord {
    return this.getProgramRuntime().updateSession(programId, sessionId, dto);
  }

  createRegistration(programId: string, dto: CreateRegistrationDto): RegistrationRecord {
    return this.getProgramRuntime().createRegistration(programId, dto);
  }

  cancelRegistration(programId: string, registrationId: string): { success: boolean } {
    return this.getProgramRuntime().cancelRegistration(programId, registrationId);
  }

  recordAttendance(
    sessionId: string,
    dto: RecordAttendanceDto,
    principal: AuthPrincipal,
  ): AttendanceRecord {
    return this.getProgramRuntime().recordAttendance(sessionId, dto, principal);
  }

  bulkUploadAttendance(
    sessionId: string,
    dto: BulkAttendanceUploadDto,
  ): { success: boolean; processed: number; sourceFileName?: string } {
    return this.getProgramRuntime().bulkUploadAttendance(sessionId, dto);
  }

  getSessionAttendance(sessionId: string): AttendanceRecord[] {
    return this.getProgramRuntime().getSessionAttendance(sessionId);
  }

  getAttendanceReport(sessionId?: string): {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  } {
    return this.getProgramRuntime().getAttendanceReport(sessionId);
  }

  exportAttendanceReport(sessionId?: string): { format: string; rows: number } {
    return this.getProgramRuntime().exportAttendanceReport(sessionId);
  }

  getMyProfile(principal: AuthPrincipal): UserRecord | null {
    return this.getProgramRuntime().getMyProfile(principal);
  }

  listMyPrograms(principal: AuthPrincipal): ProgramRecord[] {
    return this.getProgramRuntime().listMyPrograms(principal);
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
          this.getCoreBusinessDomainUtilsService().findSreny(srenyId);
        },
        findDocumentFolder: (folderId) => this.getCoreBusinessDomainUtilsService().findDocumentFolder(folderId),
        findDocument: (documentId) => this.getCoreBusinessDomainUtilsService().findDocument(documentId),
        findReportTemplate: (templateId) => this.getCoreBusinessDomainUtilsService().findReportTemplate(templateId),
        findReportSubmission: (submissionId) => this.getCoreBusinessDomainUtilsService().findReportSubmission(submissionId),
        canViewCreatorData: (principal, creatorUserId) =>
          this.getCoreBusinessAccessUtilsService().canViewCreatorData(principal, creatorUserId, this.users),
        scheduleDocumentStatePersistence: (entityId) => this.scheduleDocumentStatePersistence(entityId),
        scheduleReportTemplateStatePersistence: (templateId) => this.scheduleReportTemplateStatePersistence(templateId),
        scheduleReportSubmissionStatePersistence: (submissionId) => this.scheduleReportSubmissionStatePersistence(submissionId),
      });
    }
    return this.documentReportRuntimeService;
  }

  private getCoreBusinessDbBootstrap(): CoreBusinessDbBootstrapService {
    if (!this.coreBusinessDbBootstrapService) {
      this.coreBusinessDbBootstrapService = new CoreBusinessDbBootstrapService(
        this.dataSource!,
        (message) => this.logger.warn(message),
      );
    }
    return this.coreBusinessDbBootstrapService;
  }

  private getCoreBusinessDbHydrationService(): CoreBusinessDbHydrationService {
    if (!this.coreBusinessDbHydrationService) {
      this.coreBusinessDbHydrationService = new CoreBusinessDbHydrationService({
        dataSource: this.dataSource!,
        locations: this.locations,
        zones: this.zones,
        srenies: this.srenies,
        sthans: this.sthans,
        governanceStructures: this.governanceStructures,
        governanceAssignments: this.governanceAssignments,
        imports: this.imports,
        programs: this.programs,
        sessions: this.sessions,
        attendance: this.attendance,
        tickets: this.tickets,
        documentFolders: this.documentFolders,
        documents: this.documents,
        reportTemplates: this.reportTemplates,
        reportSubmissions: this.reportSubmissions,
        approvalWorkflows: this.approvalWorkflows,
        approvalItems: this.approvalItems,
        permissions: this.permissions,
        permissionSets: this.permissionSets,
        users: this.users,
        sreniContacts: this.sreniContacts,
        calendarEvents: this.calendarEvents,
        attendanceMetrics: this.attendanceMetrics,
        eventAttendanceCaptures: this.eventAttendanceCaptures,
        toIsoTimestamp: (value) => this.getCoreBusinessDomainUtilsService().toIsoTimestamp(value),
        toDateOnly: (value) => this.getCoreBusinessDomainUtilsService().toDateOnly(value),
        combineDateAndTime: (dateValue, timeValue) => this.getCoreBusinessDomainUtilsService().combineDateAndTime(dateValue, timeValue),
        newId: (prefix) => this.newId(prefix),
      });
    }
    return this.coreBusinessDbHydrationService;
  }

  private getCoreBusinessDomainUtilsService(): CoreBusinessDomainUtilsService {
    if (!this.coreBusinessDomainUtilsService) {
      this.coreBusinessDomainUtilsService = new CoreBusinessDomainUtilsService({
        zones: this.zones,
        srenies: this.srenies,
        sthans: this.sthans,
        governanceStructures: this.governanceStructures,
        governanceAssignments: this.governanceAssignments,
        users: this.users,
        programs: this.programs,
        sessions: this.sessions,
        documentFolders: this.documentFolders,
        documents: this.documents,
        reportTemplates: this.reportTemplates,
        reportSubmissions: this.reportSubmissions,
        approvalWorkflows: this.approvalWorkflows,
        approvalItems: this.approvalItems,
      });
    }
    return this.coreBusinessDomainUtilsService;
  }

  private getRuntimeSnapshotService(): CoreBusinessRuntimeSnapshotService {
    if (!this.coreBusinessRuntimeSnapshotService) {
      this.coreBusinessRuntimeSnapshotService = new CoreBusinessRuntimeSnapshotService({
        locations: this.locations,
        zones: this.zones,
        srenies: this.srenies,
        sthans: this.sthans,
        governanceStructures: this.governanceStructures,
        governanceAssignments: this.governanceAssignments,
        imports: this.imports,
        programs: this.programs,
        attendance: this.attendance,
        tickets: this.tickets,
        ticketActivity: this.ticketActivity,
        editRequests: this.editRequests,
        documentFolders: this.documentFolders,
        documents: this.documents,
        reportTemplates: this.reportTemplates,
        reportSubmissions: this.reportSubmissions,
        approvalWorkflows: this.approvalWorkflows,
        approvalItems: this.approvalItems,
        approvalNotifications: this.approvalNotifications,
        permissions: this.permissions,
        permissionSets: this.permissionSets,
        users: this.users,
        calendarEvents: this.calendarEvents,
        attendanceMetrics: this.attendanceMetrics,
        eventAttendanceCaptures: this.eventAttendanceCaptures,
      });
    }
    return this.coreBusinessRuntimeSnapshotService;
  }

  private getPersistenceRuntimeService(): CoreBusinessPersistenceRuntimeService {
    if (!this.coreBusinessPersistenceRuntimeService) {
      this.coreBusinessPersistenceRuntimeService = new CoreBusinessPersistenceRuntimeService({
        runtimeMode: this.runtimeMode,
        dataSource: this.dataSource,
        programs: this.programs,
        attendance: this.attendance,
        documentFolders: this.documentFolders,
        documents: this.documents,
        reportTemplates: this.reportTemplates,
        reportSubmissions: this.reportSubmissions,
        approvalWorkflows: this.approvalWorkflows,
        approvalItems: this.approvalItems,
        listSrenies: () => this.listSrenies(),
        toDateOnly: (value) => this.getCoreBusinessDomainUtilsService().toDateOnly(value),
        toTimeOnly: (value) => this.getCoreBusinessDomainUtilsService().toTimeOnly(value),
        newId: (prefix) => this.newId(prefix),
        logWarning: (message) => this.logger.warn(message),
      });
    }
    return this.coreBusinessPersistenceRuntimeService;
  }

  private getUserAdminRuntime(): UserAdminRuntimeService {
    if (!this.userAdminRuntimeService) {
      this.userAdminRuntimeService = new UserAdminRuntimeService({
        users: this.users,
        runtimeMode: this.runtimeMode,
        dataSource: this.dataSource,
        cryptoService: this.cryptoService,
        newId: (prefix) => this.newId(prefix),
        toIsoTimestamp: (value) => this.getCoreBusinessDomainUtilsService().toIsoTimestamp(value),
      });
    }
    return this.userAdminRuntimeService;
  }

  private getResponsibilityChartRuntime(): ResponsibilityChartRuntimeService {
    if (!this.responsibilityChartRuntimeService) {
      this.responsibilityChartRuntimeService = new ResponsibilityChartRuntimeService({
        users: this.users,
        runtimeMode: this.runtimeMode,
        dataSource: this.dataSource,
        toIsoTimestamp: (value) => this.getCoreBusinessDomainUtilsService().toIsoTimestamp(value),
      });
    }
    return this.responsibilityChartRuntimeService;
  }

  private getPermissionsRuntime(): PermissionsRuntimeService {
    if (!this.permissionsRuntimeService) {
      this.permissionsRuntimeService = new PermissionsRuntimeService({
        permissions: this.permissions,
        permissionSets: this.permissionSets,
        runtimeMode: this.runtimeMode,
        dataSource: this.dataSource,
        newId: (prefix) => this.newId(prefix),
        toIsoTimestamp: (value) => this.getCoreBusinessDomainUtilsService().toIsoTimestamp(value),
      });
    }
    return this.permissionsRuntimeService;
  }

  private getProgramRuntime(): ProgramRuntimeService {
    if (!this.programRuntimeService) {
      this.programRuntimeService = new ProgramRuntimeService(this.buildProgramRuntimeContext());
    }
    return this.programRuntimeService;
  }

  private getOrgRuntime(): OrgRuntimeService {
    if (!this.orgRuntimeService) {
      this.orgRuntimeService = new OrgRuntimeService(this.buildOrgRuntimeContext());
    }
    return this.orgRuntimeService;
  }

  private buildProgramRuntimeContext(): ProgramRuntimeContext {
    return {
      programs: this.programs,
      sessions: this.sessions,
      attendance: this.attendance,
      users: this.users,
      runtimeMode: this.runtimeMode,
      newId: (prefix) => this.newId(prefix),
      validateDateWindow: (startDate, endDate) => this.getCoreBusinessDomainUtilsService().validateDateWindow(startDate, endDate),
      ensureSessionWithinProgramWindow: (program, startAt, endAt) => this.getCoreBusinessDomainUtilsService().ensureSessionWithinProgramWindow(program, startAt, endAt),
      scheduleProgramStatePersistence: (programId) => this.scheduleProgramStatePersistence(programId),
      scheduleAttendanceStatePersistence: (attendanceId) => this.scheduleAttendanceStatePersistence(attendanceId),
      findProgram: (programId) => this.getCoreBusinessDomainUtilsService().findProgram(programId),
      findSession: (sessionId) => this.getCoreBusinessDomainUtilsService().findSession(sessionId),
      findUser: (userId) => this.getCoreBusinessDomainUtilsService().findUser(userId),
      getMyProfile: (principal) => this.getMyProfile(principal),
    };
  }

  private buildOrgRuntimeContext(): OrgRuntimeContext {
    return {
      zones: this.zones,
      locations: this.locations,
      srenies: this.srenies,
      sthans: this.sthans,
      governanceStructures: this.governanceStructures,
      governanceAssignments: this.governanceAssignments,
      runtimeMode: this.runtimeMode,
      dataSource: this.dataSource,
      newId: (prefix) => this.newId(prefix),
      toIsoTimestamp: (value) => this.getCoreBusinessDomainUtilsService().toIsoTimestamp(value),
      findZone: (zoneId) => this.getCoreBusinessDomainUtilsService().findZone(zoneId),
      findSreny: (srenyId) => this.getCoreBusinessDomainUtilsService().findSreny(srenyId),
      findSthan: (sthanId) => this.getCoreBusinessDomainUtilsService().findSthan(sthanId),
      findGovernanceStructure: (structureId) => this.getCoreBusinessDomainUtilsService().findGovernanceStructure(structureId),
      findGovernanceAssignment: (assignmentId) => this.getCoreBusinessDomainUtilsService().findGovernanceAssignment(assignmentId),
      validateDateWindow: (startDate, endDate) => this.getCoreBusinessDomainUtilsService().validateDateWindow(startDate, endDate),
      clearServiceSrenyForZone: (zoneId, excludeSrenyId) => this.getCoreBusinessDomainUtilsService().clearServiceSrenyForZone(zoneId, excludeSrenyId),
      normalizePositions: (positions) => this.getCoreBusinessDomainUtilsService().normalizePositions(positions),
      ensurePositionExists: (structure, positionName) => this.getCoreBusinessDomainUtilsService().ensurePositionExists(structure, positionName),
      ensureUserExists: (userId) => this.getCoreBusinessDomainUtilsService().ensureUserExists(userId),
    };
  }

  listApprovalWorkflows(): ApprovalWorkflowRecord[] {
    return this.getApprovalRuntime().listApprovalWorkflows();
  }

  createApprovalWorkflow(dto: CreateApprovalWorkflowDto): ApprovalWorkflowRecord {
    return this.getApprovalRuntime().createApprovalWorkflow(dto);
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
        findApprovalWorkflow: (workflowId) => this.getCoreBusinessDomainUtilsService().findApprovalWorkflow(workflowId),
        findApprovalItem: (itemId) => this.getCoreBusinessDomainUtilsService().findApprovalItem(itemId),
        scheduleApprovalItemStatePersistence: (itemId) => this.scheduleApprovalItemStatePersistence(itemId),
        scheduleApprovalWorkflowStatePersistence: (workflowId) => this.scheduleApprovalWorkflowStatePersistence(workflowId),
      });
    }
    return this.approvalRuntimeService;
  }

  private newId(prefix: string): string {
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${random}`;
  }

  private async hydrateRuntimeStateFromDatabase(): Promise<void> {
    return this.getCoreBusinessDbHydrationService().hydrateRuntimeStateFromDatabase();
  }

  private async flushStateToStore(force = false): Promise<void> {
    if (this.store.getMode() !== 'db') {
      return;
    }

    if (!force && !this.snapshotDirty) {
      return;
    }

    if (this.snapshotFlushInProgress) {
      return;
    }

    this.snapshotFlushInProgress = true;

    try {
      const snapshot = JSON.stringify(this.getRuntimeSnapshotService().buildRuntimeSnapshot());
      if (!force && snapshot === this.lastPersistedSnapshot) {
        return;
      }

      await this.store.saveState(snapshot);
      this.lastPersistedSnapshot = snapshot;
      this.snapshotDirty = false;
    } catch (error) {
      this.logger.warn(`Failed to flush Core Business runtime snapshot: ${(error as Error).message}`);
    } finally {
      this.snapshotFlushInProgress = false;
    }
  }

  private scheduleProgramStatePersistence(programId: string): void {
    this.snapshotDirty = true;
    this.getPersistenceRuntimeService().scheduleProgramStatePersistence(programId);
  }

  private scheduleAttendanceStatePersistence(attendanceId: string): void {
    this.snapshotDirty = true;
    this.getPersistenceRuntimeService().scheduleAttendanceStatePersistence(attendanceId);
  }

  private scheduleDocumentStatePersistence(entityId: string): void {
    this.snapshotDirty = true;
    this.getPersistenceRuntimeService().scheduleDocumentStatePersistence(entityId);
  }

  private scheduleReportTemplateStatePersistence(templateId: string): void {
    this.snapshotDirty = true;
    this.getPersistenceRuntimeService().scheduleReportTemplateStatePersistence(templateId);
  }

  private scheduleReportSubmissionStatePersistence(submissionId: string): void {
    this.snapshotDirty = true;
    this.getPersistenceRuntimeService().scheduleReportSubmissionStatePersistence(submissionId);
  }

  private scheduleApprovalWorkflowStatePersistence(workflowId: string): void {
    this.snapshotDirty = true;
    this.getPersistenceRuntimeService().scheduleApprovalWorkflowStatePersistence(workflowId);
  }

  private scheduleApprovalItemStatePersistence(itemId: string): void {
    this.snapshotDirty = true;
    this.getPersistenceRuntimeService().scheduleApprovalItemStatePersistence(itemId);
  }

  // ── Permissions ────────────────────────────────────────────────────────────

  listPermissions(): PermissionRecord[] {
    return this.getPermissionsRuntime().listPermissions();
  }

  async listPermissionsFromDb(params: { page?: number; pageSize?: number; search?: string; locationId?: string }): Promise<{
    items: PermissionRecord[]; total: number; page: number; pageSize: number; totalPages: number;
  }> {
    return this.getPermissionsRuntime().listPermissionsFromDb(params);
  }

  async createPermission(dto: CreatePermissionDto, actorEmail?: string): Promise<PermissionRecord> {
    return this.getPermissionsRuntime().createPermission(dto, actorEmail);
  }

  async updatePermission(permId: string, dto: UpdatePermissionDto, actorEmail?: string): Promise<PermissionRecord> {
    return this.getPermissionsRuntime().updatePermission(permId, dto, actorEmail);
  }

  async deletePermission(permId: string): Promise<void> {
    return this.getPermissionsRuntime().deletePermission(permId);
  }

  // ── Permission sets ────────────────────────────────────────────────────────

  listPermissionSets(): PermissionSetRecord[] {
    return this.getPermissionsRuntime().listPermissionSets();
  }

  async listPermissionSetsFromDb(params: { page?: number; pageSize?: number; search?: string }): Promise<{
    items: PermissionSetRecord[]; total: number; page: number; pageSize: number; totalPages: number;
  }> {
    return this.getPermissionsRuntime().listPermissionSetsFromDb(params);
  }

  async createPermissionSet(dto: CreatePermissionSetDto, actorEmail?: string): Promise<PermissionSetRecord> {
    return this.getPermissionsRuntime().createPermissionSet(dto, actorEmail);
  }

  async updatePermissionSet(setId: string, dto: UpdatePermissionSetDto, actorEmail?: string): Promise<PermissionSetRecord> {
    return this.getPermissionsRuntime().updatePermissionSet(setId, dto, actorEmail);
  }

  async setPermissionSetItems(setId: string, dto: SetPermissionSetItemsDto, actorEmail?: string): Promise<PermissionSetRecord> {
    return this.getPermissionsRuntime().setPermissionSetItems(setId, dto, actorEmail);
  }

  async deletePermissionSet(setId: string): Promise<void> {
    return this.getPermissionsRuntime().deletePermissionSet(setId);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  listUsers(params: { page?: number; pageSize?: number; search?: string }): {
    items: UserRecord[]; total: number; page: number; pageSize: number; totalPages: number;
  } {
    return this.getUserAdminRuntime().listUsers(params);
  }

  async listUsersFromDb(params: { page?: number; pageSize?: number; search?: string }): Promise<{
    items: UserRecord[]; total: number; page: number; pageSize: number; totalPages: number;
  }> {
    return this.getUserAdminRuntime().listUsersFromDb(params);
  }

  async getResponsibilityChart(year?: number): Promise<ResponsibilityChartRecord> {
    return this.getResponsibilityChartRuntime().getResponsibilityChart(year);
  }

  async createUser(dto: CreateUserDto, actorEmail?: string): Promise<UserRecord> {
    return this.getUserAdminRuntime().createUser(dto, actorEmail);
  }

  async updateUser(userId: string, dto: UpdateUserDto, actorEmail?: string): Promise<UserRecord> {
    return this.getUserAdminRuntime().updateUser(userId, dto, actorEmail);
  }

  async deleteUser(userId: string): Promise<void> {
    return this.getUserAdminRuntime().deleteUser(userId);
  }

  async changeOwnPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    return this.getUserAdminRuntime().changeOwnPassword(userId, currentPassword, newPassword);
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
      this.calendarEventsRuntimeService = new CalendarEventsRuntimeService(this.buildCalendarEventsRuntimeContext());
    }
    return this.calendarEventsRuntimeService;
  }

  private buildCalendarEventsRuntimeContext(): CalendarEventsRuntimeContext {
    return {
      runtimeMode: this.runtimeMode,
      dataSource: this.dataSource ?? undefined,
      calendarEvents: this.calendarEvents,
      sreniExists: (sreniId) => this.srenies.has(sreniId),
      hasZoneRights: (principal) => this.getCoreBusinessAccessUtilsService().hasZoneRights(principal),
      newId: (prefix) => this.newId(prefix),
      createReportingApprovalRequest: (payload, principal) => this.createReportingApprovalRequest(payload, principal),
      logWarning: (message) => this.logger.warn(message),
    };
  }

  async listAttendanceMetricsFromDb(params: { page?: number; pageSize?: number; search?: string; sreniId?: string }): Promise<{
    items: AttendanceMetricRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    return this.getAttendanceRuntime().listAttendanceMetricsFromDb(params);
  }

  async createAttendanceMetric(dto: CreateAttendanceMetricDto, principal?: AuthPrincipal): Promise<AttendanceMetricRecord> {
    return this.getAttendanceRuntime().createAttendanceMetric(dto, principal);
  }

  async updateAttendanceMetric(metricId: string, dto: UpdateAttendanceMetricDto, principal?: AuthPrincipal): Promise<AttendanceMetricRecord> {
    return this.getAttendanceRuntime().updateAttendanceMetric(metricId, dto, principal);
  }

  async deleteAttendanceMetric(metricId: string): Promise<{ success: boolean; deletedId: string }> {
    return this.getAttendanceRuntime().deleteAttendanceMetric(metricId);
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
      this.attendanceRuntimeService = new AttendanceRuntimeService(this.buildAttendanceRuntimeContext());
    }
    return this.attendanceRuntimeService;
  }

  private buildAttendanceRuntimeContext(): AttendanceRuntimeContext {
    return {
      calendarEvents: this.calendarEvents,
      attendanceMetrics: this.attendanceMetrics,
      eventAttendanceCaptures: this.eventAttendanceCaptures,
      runtimeMode: this.runtimeMode,
      dataSource: this.dataSource ?? undefined,
      newId: (prefix) => this.newId(prefix),
      hasZoneRights: (principal) => this.getCoreBusinessAccessUtilsService().hasZoneRights(principal),
      canViewCreatorData: (principal, creatorUserId) =>
        this.getCoreBusinessAccessUtilsService().canViewCreatorData(principal, creatorUserId, this.users),
      toIsoTimestamp: (value) => this.getCoreBusinessDomainUtilsService().toIsoTimestamp(value),
      listSreniCalendarEvents: (sreniId, principal, accessibleSthanIds) =>
        this.listSreniCalendarEvents(sreniId, principal, accessibleSthanIds),
      isTargetApproved: (targetType, targetId) => this.isTargetApproved(targetType, targetId),
    };
  }

  private getCoreBusinessReadinessService(): CoreBusinessReadinessService {
    if (!this.coreBusinessReadinessService) {
      this.coreBusinessReadinessService = new CoreBusinessReadinessService();
    }
    return this.coreBusinessReadinessService;
  }

  private getCoreBusinessAccessUtilsService(): CoreBusinessAccessUtilsService {
    if (!this.coreBusinessAccessUtilsService) {
      this.coreBusinessAccessUtilsService = new CoreBusinessAccessUtilsService();
    }
    return this.coreBusinessAccessUtilsService;
  }

  private getSreniAdminRuntime(): SreniAdminRuntimeService {
    if (!this.sreniAdminRuntimeService) {
      this.sreniAdminRuntimeService = new SreniAdminRuntimeService({
        sreniContacts: this.sreniContacts,
        reportMetricDefinitions: this.reportMetricDefinitions,
        sreniMonthlyReports: this.sreniMonthlyReports,
        sreniReportParameters: this.sreniReportParameters,
        runtimeMode: this.runtimeMode,
        dataSource: this.dataSource,
        newId: (prefix) => this.newId(prefix),
        toIsoTimestamp: (value) => this.getCoreBusinessDomainUtilsService().toIsoTimestamp(value),
      });
    }
    return this.sreniAdminRuntimeService;
  }

  // ── Sreni Contact List ─────────────────────────────────────────────────────

  listSreniContacts(
    sreniId: string,
    page = 1,
    pageSize = 50,
  ): { items: SreniContactRecord[]; total: number; page: number; pageSize: number; totalPages: number } {
    return this.getSreniAdminRuntime().listSreniContacts(sreniId, page, pageSize);
  }

  async uploadSreniContacts(
    sreniId: string,
    fileBuffer: Buffer,
    originalName: string,
    uploadedBy?: string,
  ): Promise<{ inserted: number; sreniId: string }> {
    return this.getSreniAdminRuntime().uploadSreniContacts(sreniId, fileBuffer, originalName, uploadedBy);
  }

  async clearSreniContacts(sreniId: string): Promise<{ deleted: number; sreniId: string }> {
    return this.getSreniAdminRuntime().clearSreniContacts(sreniId);
  }

  // ── Report Metric Definitions ───────────────────────────────────────────────

  async listReportMetricDefinitions(): Promise<ReportMetricDefinitionRecord[]> {
    return this.getSreniAdminRuntime().listReportMetricDefinitions();
  }

  async createReportMetricDefinition(dto: CreateReportMetricDefinitionDto): Promise<ReportMetricDefinitionRecord> {
    return this.getSreniAdminRuntime().createReportMetricDefinition(dto);
  }

  async updateReportMetricDefinition(metricId: string, dto: UpdateReportMetricDefinitionDto): Promise<ReportMetricDefinitionRecord> {
    return this.getSreniAdminRuntime().updateReportMetricDefinition(metricId, dto);
  }

  async deleteReportMetricDefinition(metricId: string): Promise<void> {
    return this.getSreniAdminRuntime().deleteReportMetricDefinition(metricId);
  }

  // ── Sreni Monthly Reports ───────────────────────────────────────────────────

  async listSreniMonthlyReports(sreniId: string): Promise<SreniMonthlyReportRecord[]> {
    return this.getSreniAdminRuntime().listSreniMonthlyReports(sreniId);
  }

  async listAllMonthlyReports(): Promise<SreniMonthlyReportRecord[]> {
    return this.getSreniAdminRuntime().listAllMonthlyReports();
  }

  async upsertSreniMonthlyReport(sreniId: string, dto: SubmitSreniMonthlyReportDto, submittedBy?: string): Promise<SreniMonthlyReportRecord> {
    return this.getSreniAdminRuntime().upsertSreniMonthlyReport(sreniId, dto, submittedBy);
  }

  // ── Sreni Report Parameters ─────────────────────────────────────────────────

  async listSreniReportParameters(sreniId: string, submissionType?: string): Promise<SreniReportParameterRecord[]> {
    return this.getSreniAdminRuntime().listSreniReportParameters(sreniId, submissionType);
  }

  async createSreniReportParameter(sreniId: string, submissionType: string, dto: CreateSreniReportParameterDto): Promise<SreniReportParameterRecord> {
    return this.getSreniAdminRuntime().createSreniReportParameter(sreniId, submissionType, dto);
  }

  async updateSreniReportParameter(parameterId: string, dto: UpdateSreniReportParameterDto): Promise<SreniReportParameterRecord> {
    return this.getSreniAdminRuntime().updateSreniReportParameter(parameterId, dto);
  }

  async deleteSreniReportParameter(parameterId: string): Promise<{ success: boolean }> {
    return this.getSreniAdminRuntime().deleteSreniReportParameter(parameterId);
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
        toIsoTimestamp: (value) => this.getCoreBusinessDomainUtilsService().toIsoTimestamp(value),
        newId: (prefix) => this.newId(prefix),
        createReportingApprovalRequest: (payload, principal) => this.createReportingApprovalRequest(payload, principal),
      });
    }
    return this.sreniReportsRuntimeService;
  }
}