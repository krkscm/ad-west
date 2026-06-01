import { DataSource } from 'typeorm';
import type {
  ApprovalAuditEntryRecord,
  ApprovalItemRecord,
  ApprovalWorkflowRecord,
  AttendanceMetricRecord,
  AttendanceRecord,
  CalendarEventRecord,
  DocumentFolderRecord,
  DocumentRecord,
  PermissionRecord,
  PermissionSetRecord,
  ProgramRecord,
  ProgramSessionRecord,
  ProgramStatus,
  ReportSubmissionRecord,
  ReportTemplateRecord,
  SreniContactRecord,
  TicketCommentRecord,
  TicketRecord,
  UserRecord,
  ZoneRecord,
  LocationRecord,
  SrenyRecord,
  SthanRecord,
  GovernanceStructureRecord,
  GovernanceAssignmentRecord,
  ImportRecord,
  EventAttendanceCaptureRecord,
  SreniDivisionRecord,
} from '../core-business.types';

export interface CoreBusinessDbHydrationContext {
  dataSource: DataSource;
  locations: Map<string, LocationRecord>;
  zones: Map<string, ZoneRecord>;
  srenies: Map<string, SrenyRecord>;
  sthans: Map<string, SthanRecord>;
  governanceStructures: Map<string, GovernanceStructureRecord>;
  governanceAssignments: Map<string, GovernanceAssignmentRecord>;
  imports: Map<string, ImportRecord>;
  programs: Map<string, ProgramRecord>;
  sessions: Map<string, { programId: string; session: ProgramSessionRecord }>;
  attendance: Map<string, AttendanceRecord>;
  tickets: Map<string, TicketRecord>;
  documentFolders: Map<string, DocumentFolderRecord>;
  documents: Map<string, DocumentRecord>;
  reportTemplates: Map<string, ReportTemplateRecord>;
  reportSubmissions: Map<string, ReportSubmissionRecord>;
  approvalWorkflows: Map<string, ApprovalWorkflowRecord>;
  approvalItems: Map<string, ApprovalItemRecord>;
  permissions: Map<string, PermissionRecord>;
  permissionSets: Map<string, PermissionSetRecord>;
  users: Map<string, UserRecord>;
  sreniDivisions: Map<string, SreniDivisionRecord>;
  sreniContacts: Map<string, SreniContactRecord>;
  calendarEvents: Map<string, CalendarEventRecord>;
  attendanceMetrics: Map<string, AttendanceMetricRecord>;
  eventAttendanceCaptures: Map<string, EventAttendanceCaptureRecord>;
  toIsoTimestamp(value: string | Date): string;
  toDateOnly(value: string | Date): string;
  combineDateAndTime(dateValue: string | Date, timeValue: string | Date): string;
  newId(prefix: string): string;
}

export class CoreBusinessDbHydrationService {
  constructor(private readonly ctx: CoreBusinessDbHydrationContext) {}

  async hydrateRuntimeStateFromDatabase(): Promise<void> {
    const [
      locationRows,
      zoneRows,
      srenyRows,
      _contactRows,
      _membershipRows,
      _metadataRows,
      _importBatchRows,
      _dedupCandidateRows,
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
      sreniDivisionRows,
      sreniContactRows,
      calendarEventRows,
      attendanceMetricRows,
      eventAttendanceCaptureRows,
    ] = await Promise.all([
      this.ctx.dataSource.query(
        'SELECT id, code, name, level, active, created_at, updated_at FROM adwest.locations ORDER BY created_at ASC',
      ),
      this.ctx.dataSource.query(
        'SELECT id, code, name, created_at, updated_at FROM adwest.zones ORDER BY created_at ASC',
      ),
      this.ctx.dataSource.query(
        'SELECT id, zone_id, name, description, code, active, is_service_sreny, join_us_visible, created_by, updated_by, created_at, updated_at FROM adwest.srenies ORDER BY created_at ASC',
      ),
      Promise.resolve([] as unknown[]),
      Promise.resolve([] as unknown[]),
      Promise.resolve([] as unknown[]),
      Promise.resolve([] as unknown[]),
      Promise.resolve([] as unknown[]),
      Promise.resolve([] as unknown[]), // programs — table dropped in 035
      Promise.resolve([] as unknown[]), // program_sessions — table dropped in 035
      Promise.resolve([] as unknown[]), // registrations — table dropped in 035
      Promise.resolve([] as unknown[]), // attendance — table dropped in 035
      Promise.resolve([] as unknown[]),
      Promise.resolve([] as unknown[]),
      this.ctx.dataSource.query(
        'SELECT id, sreny_id, parent_folder_id, name, created_at, updated_at FROM adwest.document_folders ORDER BY created_at ASC',
      ),
      this.ctx.dataSource.query(
        'SELECT id, sreny_id, folder_id, source_document_id, file_name, file_type, category, description, version, access_level, linked_entity_type, linked_entity_id, uploaded_by, created_at, updated_at FROM adwest.documents ORDER BY created_at ASC',
      ),
      this.ctx.dataSource.query(
        'SELECT id, sreny_id, name, created_at, updated_at FROM adwest.report_templates ORDER BY created_at ASC',
      ),
      this.ctx.dataSource.query(
        'SELECT id, template_id, field_key, label, field_type, required, options, display_order, created_at, updated_at FROM adwest.report_template_fields ORDER BY template_id ASC, display_order ASC',
      ),
      this.ctx.dataSource.query(
        'SELECT id, template_id, submitted_by, answers, status, reviewed_by, reviewed_at, review_note, created_at, updated_at FROM adwest.report_submissions ORDER BY created_at ASC',
      ),
      this.ctx.dataSource.query(
        'SELECT id, name, target_type, mode, escalation_hours, active, created_at, updated_at FROM adwest.approval_workflows ORDER BY created_at ASC',
      ),
      this.ctx.dataSource.query(
        'SELECT id, workflow_id, step_name, step_order, created_at, updated_at FROM adwest.approval_workflow_steps ORDER BY workflow_id ASC, step_order ASC',
      ),
      this.ctx.dataSource.query(
        'SELECT id, workflow_id, target_id, target_type, summary, status, current_step_index, submitted_by, due_at, escalation_count, last_escalated_at, audit_trail, reviewed_by, reviewed_at, review_note, created_at, updated_at FROM adwest.approval_items ORDER BY created_at ASC',
      ),
      this.ctx.dataSource.query(
        'SELECT id, location_id, sreni_id, code, name, description, active, created_at, updated_at, created_by, updated_by FROM adwest.permissions ORDER BY created_at ASC',
      ),
      this.ctx.dataSource.query(
        'SELECT id, name, description, active, created_at, updated_at, created_by, updated_by FROM adwest.permission_sets ORDER BY created_at ASC',
      ),
      this.ctx.dataSource.query('SELECT permission_set_id, permission_id FROM adwest.permission_set_items'),
      this.ctx.dataSource.query(
        'SELECT id, code, name, phone, email, role_id, sthan_id, permission_set_id, admin_management, password_hash, is_super_admin, must_reset_password, active, created_at, updated_at, created_by, updated_by FROM adwest.users ORDER BY created_at ASC',
      ),
      this.ctx.dataSource.query(
        'SELECT id, sreni_id, name, display_order, created_at, updated_at FROM adwest.sreni_divisions ORDER BY sreni_id ASC, display_order ASC, created_at ASC',
      ).catch(() => [] as unknown[]),
      this.ctx.dataSource.query(
        'SELECT id, sreni_id, row_index, data, division_id, sthan_id, source_file, uploaded_by, created_at, updated_at FROM adwest.sreni_contacts ORDER BY sreni_id ASC, row_index ASC',
      ).catch(() => [] as unknown[]),
      this.ctx.dataSource.query(
        'SELECT id, sreni_id, title, event_date, start_time, end_time, color, notes, scope, sthan_ids, created_by, updated_by, created_at, updated_at FROM adwest.sreni_calendar_events ORDER BY event_date ASC, start_time ASC',
      ).catch(() => [] as unknown[]),
      this.ctx.dataSource.query(
        'SELECT id, sreni_id, name, description, metric_keys, active, created_by, updated_by, created_at, updated_at FROM adwest.sreni_attendance_metrics ORDER BY sreni_id ASC, name ASC',
      ).catch(() => [] as unknown[]),
      this.ctx.dataSource.query(
        'SELECT id, sreni_id, event_id, metric_id, values_json, captured_by, captured_at, updated_at FROM adwest.sreni_event_attendance_captures ORDER BY captured_at ASC',
      ).catch(() => [] as unknown[]),
    ]);

    this.ctx.locations.clear();
    this.ctx.zones.clear();
    this.ctx.srenies.clear();
    this.ctx.imports.clear();
    this.ctx.programs.clear();
    this.ctx.sessions.clear();
    this.ctx.attendance.clear();
    this.ctx.tickets.clear();
    this.ctx.documentFolders.clear();
    this.ctx.documents.clear();
    this.ctx.reportTemplates.clear();
    this.ctx.reportSubmissions.clear();
    this.ctx.approvalWorkflows.clear();
    this.ctx.approvalItems.clear();
    this.ctx.permissions.clear();
    this.ctx.permissionSets.clear();
    this.ctx.sreniDivisions.clear();
    this.ctx.sreniContacts.clear();
    this.ctx.calendarEvents.clear();
    this.ctx.attendanceMetrics.clear();
    this.ctx.eventAttendanceCaptures.clear();

    for (const row of locationRows as Array<{ id: string; code: string | null; name: string; level: string; active: boolean; created_at: string | Date; updated_at: string | Date }>) {
      this.ctx.locations.set(row.id, {
        id: row.id,
        code: row.code ?? undefined,
        name: row.name,
        level: row.level as 'zone' | 'sthan',
        active: row.active,
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
      });
    }

    for (const row of zoneRows as Array<{ id: string; code?: string; name: string; created_at: string | Date; updated_at: string | Date }>) {
      this.ctx.zones.set(row.id, {
        id: row.id,
        code: row.code ?? undefined,
        name: row.name,
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
      });
    }

    for (const row of srenyRows as Array<{
      id: string; zone_id: string | null; name: string; description: string | null; code: string | null;
      active: boolean; is_service_sreny: boolean; join_us_visible?: boolean | null;
      created_by: string | null; updated_by: string | null;
      created_at: string | Date; updated_at: string | Date;
    }>) {
      this.ctx.srenies.set(row.id, {
        id: row.id,
        name: row.name,
        zoneId: row.zone_id ?? undefined,
        isServiceSreny: row.is_service_sreny,
        joinUsVisible: row.join_us_visible ?? false,
        code: row.code ?? undefined,
        description: row.description ?? undefined,
        active: row.active,
        createdBy: row.created_by ?? undefined,
        updatedBy: row.updated_by ?? undefined,
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
      });
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
        startDate: this.ctx.toDateOnly(row.start_date),
        endDate: this.ctx.toDateOnly(row.end_date),
        capacity: Number(row.max_participants ?? 0),
        status: row.status,
        sessions: [],
        registrations: [],
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
      };
      programsById.set(program.id, program);
      this.ctx.programs.set(program.id, program);
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

      const session = {
        id: row.id,
        name: row.venue ?? 'Session',
        startAt: this.ctx.combineDateAndTime(row.date, row.start_time),
        endAt: this.ctx.combineDateAndTime(row.date, row.end_time),
      };
      program.sessions.push(session);
      this.ctx.sessions.set(session.id, { programId: program.id, session });
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
        createdAt: this.ctx.toIsoTimestamp(row.registered_at),
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
      this.ctx.attendance.set(row.id, {
        id: row.id,
        sessionId: row.session_id,
        contactId: row.contact_id,
        state: row.status,
        notes: row.method ?? undefined,
        recordedAt: this.ctx.toIsoTimestamp(row.marked_at),
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
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
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
      status: 'new' | 'in_progress' | 'resolved' | 'closed';
      assigned_to?: string | null;
      created_at: string | Date;
      updated_at: string | Date;
    }>) {
      this.ctx.tickets.set(row.id, {
        id: row.id,
        contactId: row.contact_id,
        subject: row.subject,
        description: row.description,
        category: row.category,
        priority: row.priority,
        status: row.status,
        assigneeId: row.assigned_to ?? undefined,
        comments: commentsByTicket.get(row.id) ?? [],
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
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
      this.ctx.documentFolders.set(row.id, {
        id: row.id,
        srenyId: row.sreny_id,
        parentFolderId: row.parent_folder_id ?? undefined,
        name: row.name,
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
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
      this.ctx.documents.set(row.id, {
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
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
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
      this.ctx.reportTemplates.set(row.id, {
        id: row.id,
        srenyId: row.sreny_id,
        name: row.name,
        fields: fieldsByTemplate.get(row.id) ?? [],
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
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
      this.ctx.reportSubmissions.set(row.id, {
        id: row.id,
        templateId: row.template_id,
        submittedBy: row.submitted_by,
        answers: Object.fromEntries(
          Object.entries(row.answers ?? {}).map(([key, value]) => [key, String(value ?? '')]),
        ),
        status: row.status,
        reviewedBy: row.reviewed_by ?? undefined,
        reviewedAt: row.reviewed_at ? this.ctx.toIsoTimestamp(row.reviewed_at) : undefined,
        reviewNote: row.review_note ?? undefined,
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
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
      this.ctx.approvalWorkflows.set(row.id, {
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
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
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
      this.ctx.approvalItems.set(row.id, {
        id: row.id,
        workflowId: row.workflow_id,
        targetId: row.target_id,
        targetType: row.target_type ?? undefined,
        summary: row.summary ?? undefined,
        status: row.status,
        currentStepIndex: Number(row.current_step_index ?? 0),
        submittedBy: row.submitted_by,
        dueAt: row.due_at ? this.ctx.toIsoTimestamp(row.due_at) : undefined,
        escalationCount: Number(row.escalation_count ?? 0),
        lastEscalatedAt: row.last_escalated_at
          ? this.ctx.toIsoTimestamp(row.last_escalated_at)
          : undefined,
        auditTrail: auditTrailRows.map((entry, index) => ({
          id: String(entry.id ?? this.ctx.newId(`apat_h${index}`)),
          action: (entry.action as ApprovalAuditEntryRecord['action']) ?? 'submitted',
          actorId: String(entry.actorId ?? entry.actor_id ?? 'system'),
          stepIndex: Number(entry.stepIndex ?? entry.step_index ?? 0),
          note:
            entry.note === undefined || entry.note === null
              ? undefined
              : String(entry.note),
          createdAt: this.ctx.toIsoTimestamp(
            (entry.createdAt ?? entry.created_at ?? row.created_at) as string | Date,
          ),
        })),
        reviewedBy: row.reviewed_by ?? undefined,
        reviewedAt: row.reviewed_at ? this.ctx.toIsoTimestamp(row.reviewed_at) : undefined,
        reviewNote: row.review_note ?? undefined,
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
      });
    }

    for (const row of permissionRows as Array<{
      id: string; location_id: string; sreni_id: string; code: string; name: string;
      description: string | null; active: boolean;
      created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null;
    }>) {
      this.ctx.permissions.set(row.id, {
        id: row.id, locationId: row.location_id, sreniId: row.sreni_id,
        code: row.code, name: row.name,
        description: row.description ?? undefined,
        active: row.active,
        createdAt: this.ctx.toIsoTimestamp(row.created_at), updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
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
      this.ctx.permissionSets.set(row.id, {
        id: row.id, name: row.name, description: row.description ?? undefined,
        active: row.active, permissionIds: permItemsBySet.get(row.id) ?? [],
        createdAt: this.ctx.toIsoTimestamp(row.created_at), updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
        createdBy: row.created_by ?? undefined, updatedBy: row.updated_by ?? undefined,
      });
    }

    for (const row of userRows as Array<{
      id: string; code: string; name: string; phone: string | null; email: string | null;
      role_id: string | null; sthan_id: string | null; permission_set_id: string | null; admin_management: string | null;
      password_hash: string | null; is_super_admin: boolean; must_reset_password: boolean; active: boolean;
      created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null;
    }>) {
      this.ctx.users.set(row.id, {
        id: row.id, code: row.code, name: row.name,
        phone: row.phone ?? undefined, email: row.email ?? undefined,
        roleId: row.role_id ?? undefined, sthanId: row.sthan_id ?? undefined,
        permissionSetId: row.permission_set_id ?? undefined,
        adminManagement: row.admin_management ?? undefined,
        passwordHash: row.password_hash ?? undefined,
        isSuperAdmin: row.is_super_admin,
        mustResetPassword: row.must_reset_password,
        active: row.active,
        createdAt: this.ctx.toIsoTimestamp(row.created_at), updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
        createdBy: row.created_by ?? undefined, updatedBy: row.updated_by ?? undefined,
      });
    }

    for (const row of sreniDivisionRows as Array<{
      id: string; sreni_id: string; name: string; display_order: number;
      created_at: string | Date; updated_at: string | Date;
    }>) {
      const d: SreniDivisionRecord = {
        id: row.id,
        sreniId: row.sreni_id,
        name: row.name,
        displayOrder: row.display_order,
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
      };
      this.ctx.sreniDivisions.set(`${d.sreniId}:${d.id}`, d);
    }

    for (const row of sreniContactRows as Array<{
      id: string; sreni_id: string; row_index: number;
      data: Record<string, string | number | boolean | null>;
      division_id: string | null; sthan_id: string | null;
      source_file: string | null; uploaded_by: string | null;
      created_at: string | Date; updated_at: string | Date;
    }>) {
      const r: SreniContactRecord = {
        id: row.id,
        sreniId: row.sreni_id,
        rowIndex: row.row_index,
        data: row.data ?? {},
        divisionId: row.division_id ?? undefined,
        sthanId: row.sthan_id ?? undefined,
        sourceFile: row.source_file ?? undefined,
        uploadedBy: row.uploaded_by ?? undefined,
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
      };
      this.ctx.sreniContacts.set(`${r.sreniId}:${r.id}`, r);
    }

    for (const row of calendarEventRows as Array<{
      id: string; sreni_id: string; title: string; event_date: string | Date;
      start_time: string; end_time: string; color: string; notes: string | null;
      scope: 'zone' | 'sthan'; sthan_ids: string[] | null;
      created_by: string; updated_by: string;
      created_at: string | Date; updated_at: string | Date;
    }>) {
      this.ctx.calendarEvents.set(row.id, {
        id: row.id,
        sreniId: row.sreni_id,
        title: row.title,
        date: this.ctx.toDateOnly(row.event_date),
        startTime: String(row.start_time).slice(0, 5),
        endTime: String(row.end_time).slice(0, 5),
        color: row.color,
        notes: row.notes ?? undefined,
        scope: row.scope,
        sthanIds: Array.isArray(row.sthan_ids) ? row.sthan_ids : [],
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
      });
    }

    for (const row of attendanceMetricRows as Array<{
      id: string; sreni_id: string; name: string; description: string | null;
      metric_keys: string[] | null; active: boolean; created_by: string; updated_by: string;
      created_at: string | Date; updated_at: string | Date;
    }>) {
      this.ctx.attendanceMetrics.set(row.id, {
        id: row.id,
        sreniId: row.sreni_id,
        name: row.name,
        description: row.description ?? undefined,
        keys: Array.isArray(row.metric_keys) ? row.metric_keys : [],
        active: row.active,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
      });
    }

    for (const row of eventAttendanceCaptureRows as Array<{
      id: string; sreni_id: string; event_id: string; metric_id: string;
      values_json: Record<string, string | number | boolean | null> | null;
      captured_by: string; captured_at: string | Date; updated_at: string | Date;
    }>) {
      this.ctx.eventAttendanceCaptures.set(row.id, {
        id: row.id,
        sreniId: row.sreni_id,
        eventId: row.event_id,
        metricId: row.metric_id,
        values: row.values_json ?? {},
        capturedBy: row.captured_by,
        capturedAt: this.ctx.toIsoTimestamp(row.captured_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
      });
    }
  }
}
