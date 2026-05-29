import { DataSource } from 'typeorm';
import type {
  ApprovalItemRecord,
  ApprovalWorkflowRecord,
  AttendanceRecord,
  DocumentFolderRecord,
  DocumentRecord,
  ProgramRecord,
  ReportSubmissionRecord,
  ReportTemplateRecord,
  SrenyRecord,
} from '../core-business.service';

export interface CoreBusinessPersistenceRuntimeContext {
  runtimeMode: 'in-memory' | 'db';
  dataSource?: DataSource;
  programs: Map<string, ProgramRecord>;
  attendance: Map<string, AttendanceRecord>;
  documentFolders: Map<string, DocumentFolderRecord>;
  documents: Map<string, DocumentRecord>;
  reportTemplates: Map<string, ReportTemplateRecord>;
  reportSubmissions: Map<string, ReportSubmissionRecord>;
  approvalWorkflows: Map<string, ApprovalWorkflowRecord>;
  approvalItems: Map<string, ApprovalItemRecord>;
  listSrenies(): SrenyRecord[];
  toDateOnly(value: string | Date): string;
  toTimeOnly(value: string): string;
  newId(prefix: string): string;
  logWarning(message: string): void;
}

export class CoreBusinessPersistenceRuntimeService {
  constructor(private readonly ctx: CoreBusinessPersistenceRuntimeContext) {}

  scheduleProgramStatePersistence(programId: string): void {
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      return;
    }

    const program = this.ctx.programs.get(programId);
    if (!program) {
      return;
    }

    const snapshot = this.clone(program);
    void this.persistProgramState(snapshot).catch((error: unknown) => {
      this.ctx.logWarning(
        `Failed to persist Core Business program ${programId}: ${(error as Error).message}`,
      );
    });
  }

  scheduleAttendanceStatePersistence(attendanceId: string): void {
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      return;
    }

    const record = this.ctx.attendance.get(attendanceId);
    if (!record) {
      return;
    }

    const snapshot = { ...record };
    void this.persistAttendanceState(snapshot).catch((error) => {
      this.ctx.logWarning(
        `Failed to persist Core Business attendance ${attendanceId}: ${(error as Error).message}`,
      );
    });
  }

  scheduleDocumentStatePersistence(entityId: string): void {
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      return;
    }

    const folder = this.ctx.documentFolders.get(entityId);
    if (folder) {
      void this.persistDocumentFolderState(folder).catch((error) => {
        this.ctx.logWarning(
          `Failed to persist Core Business document folder ${entityId}: ${(error as Error).message}`,
        );
      });
      return;
    }

    const document = this.ctx.documents.get(entityId);
    if (!document) {
      return;
    }

    const snapshot = this.clone(document);
    void this.persistDocumentState(snapshot).catch((error) => {
      this.ctx.logWarning(
        `Failed to persist Core Business document ${entityId}: ${(error as Error).message}`,
      );
    });
  }

  scheduleReportTemplateStatePersistence(templateId: string): void {
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      return;
    }

    const template = this.ctx.reportTemplates.get(templateId);
    if (!template) {
      return;
    }

    const snapshot = this.clone(template);
    void this.persistReportTemplateState(snapshot).catch((error) => {
      this.ctx.logWarning(
        `Failed to persist Core Business report template ${templateId}: ${(error as Error).message}`,
      );
    });
  }

  scheduleReportSubmissionStatePersistence(submissionId: string): void {
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      return;
    }

    const submission = this.ctx.reportSubmissions.get(submissionId);
    if (!submission) {
      return;
    }

    const snapshot = this.clone(submission);
    void this.persistReportSubmissionState(snapshot).catch((error) => {
      this.ctx.logWarning(
        `Failed to persist Core Business report submission ${submissionId}: ${(error as Error).message}`,
      );
    });
  }

  scheduleApprovalWorkflowStatePersistence(workflowId: string): void {
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      return;
    }

    const workflow = this.ctx.approvalWorkflows.get(workflowId);
    if (!workflow) {
      return;
    }

    const snapshot = this.clone(workflow);
    void this.persistApprovalWorkflowState(snapshot).catch((error) => {
      this.ctx.logWarning(
        `Failed to persist Core Business approval workflow ${workflowId}: ${(error as Error).message}`,
      );
    });
  }

  scheduleApprovalItemStatePersistence(itemId: string): void {
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      return;
    }

    const item = this.ctx.approvalItems.get(itemId);
    if (!item) {
      return;
    }

    const snapshot = this.clone(item);
    void this.persistApprovalItemState(snapshot).catch((error) => {
      this.ctx.logWarning(
        `Failed to persist Core Business approval item ${itemId}: ${(error as Error).message}`,
      );
    });
  }

  private async persistReportTemplateState(template: ReportTemplateRecord): Promise<void> {
    if (!this.ctx.dataSource || this.ctx.runtimeMode !== 'db') {
      return;
    }

    await this.ctx.dataSource.query(
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

    await this.ctx.dataSource.query('DELETE FROM adwest.report_template_fields WHERE template_id = $1', [
      template.id,
    ]);

    for (const [index, field] of template.fields.entries()) {
      await this.ctx.dataSource.query(
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
          this.ctx.newId('rtf'),
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
    if (!this.ctx.dataSource || this.ctx.runtimeMode !== 'db') {
      return;
    }

    await this.ctx.dataSource.query(
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
    if (!this.ctx.dataSource || this.ctx.runtimeMode !== 'db') {
      return;
    }

    await this.ctx.dataSource.query(
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

    await this.ctx.dataSource.query('DELETE FROM adwest.approval_workflow_steps WHERE workflow_id = $1', [
      workflow.id,
    ]);

    for (const [index, step] of workflow.steps.entries()) {
      await this.ctx.dataSource.query(
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
        [this.ctx.newId('apws'), workflow.id, step, index, workflow.createdAt, workflow.updatedAt],
      );
    }
  }

  private async persistApprovalItemState(item: ApprovalItemRecord): Promise<void> {
    if (!this.ctx.dataSource || this.ctx.runtimeMode !== 'db') {
      return;
    }

    await this.ctx.dataSource.query(
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

  private async persistProgramState(program: ProgramRecord): Promise<void> {
    if (!this.ctx.dataSource || this.ctx.runtimeMode !== 'db') {
      return;
    }

    const srenyId = this.ctx.listSrenies()[0]?.id;
    if (!srenyId) {
      return;
    }

    await this.ctx.dataSource.query(
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
        this.ctx.toDateOnly(program.startDate),
        this.ctx.toDateOnly(program.endDate),
        program.capacity,
        program.status,
        program.description ?? null,
        program.createdAt,
        program.updatedAt,
      ],
    );

    await this.ctx.dataSource.query('DELETE FROM adwest.program_sessions WHERE program_id = $1', [
      program.id,
    ]);
    for (const session of program.sessions) {
      await this.ctx.dataSource.query(
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
          this.ctx.toDateOnly(session.startAt),
          this.ctx.toTimeOnly(session.startAt),
          this.ctx.toTimeOnly(session.endAt),
          session.name,
        ],
      );
    }

    await this.ctx.dataSource.query('DELETE FROM adwest.registrations WHERE program_id = $1', [
      program.id,
    ]);
    for (const registration of program.registrations) {
      await this.ctx.dataSource.query(
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

  private async persistAttendanceState(record: AttendanceRecord): Promise<void> {
    if (!this.ctx.dataSource || this.ctx.runtimeMode !== 'db') {
      return;
    }

    await this.ctx.dataSource.query(
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

  private async persistDocumentFolderState(folder: DocumentFolderRecord): Promise<void> {
    if (!this.ctx.dataSource || this.ctx.runtimeMode !== 'db') {
      return;
    }

    await this.ctx.dataSource.query(
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
    if (!this.ctx.dataSource || this.ctx.runtimeMode !== 'db') {
      return;
    }

    await this.ctx.dataSource.query(
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

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
