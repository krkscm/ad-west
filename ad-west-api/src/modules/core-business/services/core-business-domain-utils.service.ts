import { BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  ApprovalItemRecord,
  ApprovalWorkflowRecord,
  DocumentFolderRecord,
  DocumentRecord,
  GovernanceAssignmentRecord,
  GovernanceStructureRecord,
  ProgramRecord,
  ProgramSessionRecord,
  ReportSubmissionRecord,
  ReportTemplateRecord,
  SrenyRecord,
  SthanRecord,
  UserRecord,
  ZoneRecord,
} from '../core-business.service';

export interface CoreBusinessDomainUtilsContext {
  zones: Map<string, ZoneRecord>;
  srenies: Map<string, SrenyRecord>;
  sthans: Map<string, SthanRecord>;
  governanceStructures: Map<string, GovernanceStructureRecord>;
  governanceAssignments: Map<string, GovernanceAssignmentRecord>;
  users: Map<string, UserRecord>;
  programs: Map<string, ProgramRecord>;
  sessions: Map<string, { programId: string; session: ProgramSessionRecord }>;
  documentFolders: Map<string, DocumentFolderRecord>;
  documents: Map<string, DocumentRecord>;
  reportTemplates: Map<string, ReportTemplateRecord>;
  reportSubmissions: Map<string, ReportSubmissionRecord>;
  approvalWorkflows: Map<string, ApprovalWorkflowRecord>;
  approvalItems: Map<string, ApprovalItemRecord>;
}

export class CoreBusinessDomainUtilsService {
  constructor(private readonly ctx: CoreBusinessDomainUtilsContext) {}

  findZone(zoneId: string): ZoneRecord {
    const zone = this.ctx.zones.get(zoneId);
    if (!zone) {
      throw new NotFoundException('Zone not found');
    }
    return zone;
  }

  findSreny(srenyId: string): SrenyRecord {
    const record = this.ctx.srenies.get(srenyId);
    if (!record) {
      throw new NotFoundException('Sreny not found');
    }
    return record;
  }

  findSthan(sthanId: string): SthanRecord {
    const record = this.ctx.sthans.get(sthanId);
    if (!record) {
      throw new NotFoundException('Sthan not found');
    }
    return record;
  }

  findGovernanceStructure(structureId: string): GovernanceStructureRecord {
    const structure = this.ctx.governanceStructures.get(structureId);
    if (!structure) {
      throw new NotFoundException('Governance structure not found');
    }
    return structure;
  }

  findGovernanceAssignment(assignmentId: string): GovernanceAssignmentRecord {
    const assignment = this.ctx.governanceAssignments.get(assignmentId);
    if (!assignment) {
      throw new NotFoundException('Governance assignment not found');
    }
    return assignment;
  }

  findUser(userId: string): UserRecord {
    const user = this.ctx.users.get(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  findProgram(programId: string): ProgramRecord {
    const program = this.ctx.programs.get(programId);
    if (!program) {
      throw new NotFoundException('Program not found');
    }
    return program;
  }

  findSession(sessionId: string): ProgramSessionRecord {
    const indexedSession = this.ctx.sessions.get(sessionId);
    if (indexedSession) {
      return indexedSession.session;
    }

    for (const program of this.ctx.programs.values()) {
      const session = program.sessions.find((item) => item.id === sessionId);
      if (session) {
        this.ctx.sessions.set(sessionId, { programId: program.id, session });
        return session;
      }
    }

    throw new NotFoundException('Session not found');
  }

  findDocumentFolder(folderId: string): DocumentFolderRecord {
    const folder = this.ctx.documentFolders.get(folderId);
    if (!folder) {
      throw new NotFoundException('Document folder not found');
    }
    return folder;
  }

  findDocument(documentId: string): DocumentRecord {
    const document = this.ctx.documents.get(documentId);
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  findReportTemplate(templateId: string): ReportTemplateRecord {
    const template = this.ctx.reportTemplates.get(templateId);
    if (!template) {
      throw new NotFoundException('Report template not found');
    }
    return template;
  }

  findReportSubmission(submissionId: string): ReportSubmissionRecord {
    const submission = this.ctx.reportSubmissions.get(submissionId);
    if (!submission) {
      throw new NotFoundException('Report submission not found');
    }
    return submission;
  }

  findApprovalWorkflow(workflowId: string): ApprovalWorkflowRecord {
    const workflow = this.ctx.approvalWorkflows.get(workflowId);
    if (!workflow) {
      throw new NotFoundException('Approval workflow not found');
    }
    return workflow;
  }

  findApprovalItem(itemId: string): ApprovalItemRecord {
    const item = this.ctx.approvalItems.get(itemId);
    if (!item) {
      throw new NotFoundException('Approval item not found');
    }
    return item;
  }

  clearServiceSrenyForZone(zoneId: string, excludeSrenyId?: string): void {
    for (const [id, sreny] of this.ctx.srenies.entries()) {
      if (sreny.zoneId !== zoneId) {
        continue;
      }
      if (excludeSrenyId && id === excludeSrenyId) {
        continue;
      }
      if (!sreny.isServiceSreny) {
        continue;
      }

      this.ctx.srenies.set(id, {
        ...sreny,
        isServiceSreny: false,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  normalizePositions(positions: string[]): string[] {
    const normalized = positions.map((value) => value.trim()).filter((value) => value.length > 0);
    const unique = Array.from(new Set(normalized));

    if (unique.length === 0) {
      throw new BadRequestException('At least one governance position is required');
    }

    return unique;
  }

  ensurePositionExists(structure: GovernanceStructureRecord, positionName: string): void {
    const normalized = positionName.trim().toLowerCase();
    const hasPosition = structure.positions.some((position) => position.toLowerCase() === normalized);
    if (!hasPosition) {
      throw new BadRequestException('Position is not part of the governance structure');
    }
  }

  ensureUserExists(userId: string): void {
    this.findUser(userId);
  }

  validateDateWindow(startDate: string, endDate?: string): void {
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

  ensureSessionWithinProgramWindow(
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

  toIsoTimestamp(value: string | Date): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }

  toDateOnly(value: string | Date): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
  }

  toTimeOnly(value: string): string {
    return value.includes('T') ? value.slice(11, 19) : value.slice(0, 8);
  }

  combineDateAndTime(dateValue: string | Date, timeValue: string | Date): string {
    const date = this.toDateOnly(dateValue instanceof Date ? dateValue.toISOString() : dateValue);
    const time =
      timeValue instanceof Date ? timeValue.toISOString().slice(11, 19) : timeValue.slice(0, 8);
    return new Date(`${date}T${time}`).toISOString();
  }
}
