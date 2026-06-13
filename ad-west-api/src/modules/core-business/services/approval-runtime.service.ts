import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import {
  CreateApprovalWorkflowDto,
  ReviewApprovalItemDto,
  SubmitApprovalItemDto,
  ResubmitApprovalItemDto,
} from '../dto/core-business.dto';
import type {
  ApprovalWorkflowRecord,
  ApprovalItemRecord,
  ApprovalNotificationRecord,
  UserRecord,
} from '../core-business.service';

export interface ApprovalRuntimeContext {
  approvalWorkflows: Map<string, ApprovalWorkflowRecord>;
  approvalItems: Map<string, ApprovalItemRecord>;
  approvalNotifications: Map<string, ApprovalNotificationRecord>;
  users: Map<string, UserRecord>;
  newId(prefix: string): string;
  findApprovalWorkflow(workflowId: string): ApprovalWorkflowRecord;
  findApprovalItem(itemId: string): ApprovalItemRecord;
  scheduleApprovalItemStatePersistence(itemId: string): void;
  scheduleApprovalWorkflowStatePersistence(workflowId: string): void;
  resolveActorIdentityIds(principal: AuthPrincipal): string[];
  onApprovalItemFinalized?: (item: ApprovalItemRecord) => void;
}

export class ApprovalRuntimeService {
  constructor(private readonly ctx: ApprovalRuntimeContext) {}

  listApprovalWorkflows(): ApprovalWorkflowRecord[] {
    return Array.from(this.ctx.approvalWorkflows.values());
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
      id: this.ctx.newId('apw'),
      name: dto.name.trim(),
      targetType: dto.targetType,
      mode,
      steps,
      escalationHours: dto.escalationHours,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    this.ctx.approvalWorkflows.set(workflow.id, workflow);
    this.ctx.scheduleApprovalWorkflowStatePersistence(workflow.id);
    return workflow;
  }

  submitApprovalItem(dto: SubmitApprovalItemDto, principal: AuthPrincipal): ApprovalItemRecord {
    const workflow = this.ctx.findApprovalWorkflow(dto.workflowId);
    if (!workflow.active) {
      throw new BadRequestException('Approval workflow is not active');
    }

    const now = new Date().toISOString();
    const dueAt = workflow.escalationHours
      ? new Date(Date.now() + workflow.escalationHours * 60 * 60 * 1000).toISOString()
      : undefined;

    const item: ApprovalItemRecord = {
      id: this.ctx.newId('api'),
      workflowId: dto.workflowId,
      targetId: dto.targetId,
      summary: dto.summary,
      status: 'pending',
      currentStepIndex: 0,
      submittedBy: principal.userId,
      dueAt,
      escalationCount: 0,
      auditTrail: [
        {
          id: this.ctx.newId('apat'),
          action: 'submitted',
          actorId: principal.userId,
          stepIndex: 0,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.ctx.approvalItems.set(item.id, item);
    this.pushApprovalNotification(item, workflow, 'submitted', {
      recipientUserIds: this.getPendingApproverIds(item, workflow),
    });
    this.ctx.scheduleApprovalItemStatePersistence(item.id);
    return item;
  }

  listApprovalItems(status?: string): ApprovalItemRecord[] {
    this.applyApprovalEscalations();
    const rows = Array.from(this.ctx.approvalItems.values());
    const filtered = status ? rows.filter((item) => item.status === status) : rows;
    return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  listApprovalNotifications(itemId?: string): ApprovalNotificationRecord[] {
    const rows = Array.from(this.ctx.approvalNotifications.values());
    const filtered = itemId ? rows.filter((item) => item.itemId === itemId) : rows;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listMyApprovalActions(principal: AuthPrincipal, status?: string): ApprovalItemRecord[] {
    this.applyApprovalEscalations();
    const actorIds = new Set(this.ctx.resolveActorIdentityIds(principal));

    const rows = Array.from(this.ctx.approvalItems.values()).filter((item) => {
      if (status && item.status !== status) {
        return false;
      }

      if (item.status === 'pending') {
        const workflow = this.ctx.findApprovalWorkflow(item.workflowId);
        return this.getPendingApproverIds(item, workflow).some((id) => actorIds.has(id));
      }

      return item.status === 'need_more_information'
        && (actorIds.has(item.submittedBy) || item.submittedBy === principal.userId);
    });

    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  listMyApprovalNotifications(principal: AuthPrincipal, itemId?: string): ApprovalNotificationRecord[] {
    const rows = this.listApprovalNotifications(itemId);
    return rows.filter((record) => {
      if (record.recipientUserId) {
        return record.recipientUserId === principal.userId;
      }
      if (record.recipientStep?.startsWith('user:')) {
        return record.recipientStep === `user:${principal.userId}`;
      }
      return false;
    });
  }

  reviewApprovalItem(itemId: string, dto: ReviewApprovalItemDto, principal: AuthPrincipal): ApprovalItemRecord {
    const item = this.ctx.findApprovalItem(itemId);
    const workflow = this.ctx.findApprovalWorkflow(item.workflowId);
    this.applyApprovalEscalations();

    if (item.status !== 'pending') {
      throw new BadRequestException('Approval item already finalized');
    }

    const approverIds = this.getPendingApproverIds(item, workflow);
    const actorIds = new Set(this.ctx.resolveActorIdentityIds(principal));
    if (!approverIds.some((id) => actorIds.has(id))) {
      throw new UnauthorizedException('You are not assigned to review this approval item');
    }

    const now = new Date().toISOString();

    if (dto.decision === 'need_more_information') {
      item.status = 'need_more_information';
      item.auditTrail.push({
        id: this.ctx.newId('apat'),
        action: 'need_more_information',
        actorId: principal.userId,
        stepIndex: item.currentStepIndex,
        note: dto.note,
        createdAt: now,
      });
      this.pushApprovalNotification(item, workflow, 'need_more_information', {
        recipientUserIds: [item.submittedBy],
      });
      item.reviewedBy = principal.userId;
      item.reviewedAt = now;
      item.reviewNote = dto.note;
      item.updatedAt = now;
      this.ctx.approvalItems.set(item.id, item);
      this.ctx.scheduleApprovalItemStatePersistence(item.id);
      return item;
    }

    if (dto.decision === 'rejected') {
      item.status = 'rejected';
      item.auditTrail.push({
        id: this.ctx.newId('apat'),
        action: 'rejected',
        actorId: principal.userId,
        stepIndex: item.currentStepIndex,
        note: dto.note,
        createdAt: now,
      });
      this.pushApprovalNotification(item, workflow, 'rejected', {
        recipientUserIds: [item.submittedBy],
      });
    } else {
      if (workflow.mode === 'single' || workflow.mode === 'parallel_any') {
        item.status = 'approved';
        item.auditTrail.push({
          id: this.ctx.newId('apat'),
          action: 'approved',
          actorId: principal.userId,
          stepIndex: item.currentStepIndex,
          note: dto.note,
          createdAt: now,
        });
        this.pushApprovalNotification(item, workflow, 'approved', {
          recipientUserIds: [item.submittedBy],
        });
      } else {
        const nextIndex = item.currentStepIndex + 1;
        if (nextIndex >= workflow.steps.length) {
          item.status = 'approved';
          item.auditTrail.push({
            id: this.ctx.newId('apat'),
            action: 'approved',
            actorId: principal.userId,
            stepIndex: item.currentStepIndex,
            note: dto.note,
            createdAt: now,
          });
          this.pushApprovalNotification(item, workflow, 'approved', {
            recipientUserIds: [item.submittedBy],
          });
        } else {
          item.currentStepIndex = nextIndex;
          item.auditTrail.push({
            id: this.ctx.newId('apat'),
            action: 'step_advanced',
            actorId: principal.userId,
            stepIndex: nextIndex,
            note: dto.note,
            createdAt: now,
          });
          this.pushApprovalNotification(item, workflow, 'step_advanced', {
            recipientUserIds: this.getPendingApproverIds(item, workflow),
          });
        }
      }
    }

    item.reviewedBy = principal.userId;
    item.reviewedAt = now;
    item.reviewNote = dto.note;
    item.updatedAt = item.reviewedAt;
    this.ctx.approvalItems.set(item.id, item);
    this.ctx.scheduleApprovalItemStatePersistence(item.id);
    if (item.status === 'approved' || item.status === 'rejected') {
      this.ctx.onApprovalItemFinalized?.(item);
    }
    return item;
  }

  resubmitApprovalItem(itemId: string, dto: ResubmitApprovalItemDto, principal: AuthPrincipal): ApprovalItemRecord {
    const item = this.ctx.findApprovalItem(itemId);
    if (item.status !== 'need_more_information') {
      throw new BadRequestException('Only items needing more information can be resubmitted');
    }
    const actorIds = new Set(this.ctx.resolveActorIdentityIds(principal));
    if (!actorIds.has(item.submittedBy) && item.submittedBy !== principal.userId) {
      throw new UnauthorizedException('Only the original requester can resubmit this item');
    }

    const workflow = this.ctx.findApprovalWorkflow(item.workflowId);
    const now = new Date().toISOString();

    item.status = 'pending';
    item.currentStepIndex = 0;
    item.reviewedBy = undefined;
    item.reviewedAt = undefined;
    item.reviewNote = undefined;
    item.updatedAt = now;
    item.auditTrail.push({
      id: this.ctx.newId('apat'),
      action: 'resubmitted',
      actorId: principal.userId,
      stepIndex: item.currentStepIndex,
      note: dto.note,
      createdAt: now,
    });

    this.ctx.approvalItems.set(item.id, item);
    this.pushApprovalNotification(item, workflow, 'resubmitted', {
      recipientUserIds: this.getPendingApproverIds(item, workflow),
    });
    this.ctx.scheduleApprovalItemStatePersistence(item.id);
    return item;
  }

  createReportingApprovalRequest(
    payload: { targetId: string; targetType: 'report_submission' | 'calendar_event'; summary: string },
    principal: AuthPrincipal,
  ): void {
    const approverIds = this.resolveReportingApproverUserIds(principal);
    if (!approverIds.length) {
      return;
    }

    const now = new Date().toISOString();
    const workflow: ApprovalWorkflowRecord = {
      id: this.ctx.newId('apw'),
      name: `Reporting chain approval for ${payload.targetType}`,
      targetType: 'report_submission',
      mode: 'parallel_any',
      steps: approverIds,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    this.ctx.approvalWorkflows.set(workflow.id, workflow);
    this.ctx.scheduleApprovalWorkflowStatePersistence(workflow.id);

    const requester = this.resolveRequesterUser(principal);
    const submittedBy = requester?.id ?? principal.userId;

    const item: ApprovalItemRecord = {
      id: this.ctx.newId('api'),
      workflowId: workflow.id,
      targetId: payload.targetId,
      targetType: payload.targetType,
      summary: payload.summary,
      status: 'pending',
      currentStepIndex: 0,
      submittedBy,
      escalationCount: 0,
      auditTrail: [
        {
          id: this.ctx.newId('apat'),
          action: 'submitted',
          actorId: principal.userId,
          stepIndex: 0,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.ctx.approvalItems.set(item.id, item);
    this.pushApprovalNotification(item, workflow, 'submitted', {
      recipientUserIds: approverIds,
    });
    this.ctx.scheduleApprovalItemStatePersistence(item.id);
  }

  isTargetApproved(targetType: 'report_submission' | 'calendar_event', targetId: string): boolean {
    const latest = Array.from(this.ctx.approvalItems.values())
      .filter((item) => item.targetType === targetType && item.targetId === targetId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

    if (!latest) {
      return true;
    }

    return latest.status === 'approved';
  }

  private applyApprovalEscalations(): void {
    const nowMs = Date.now();
    const nowIso = new Date().toISOString();

    for (const [id, item] of this.ctx.approvalItems.entries()) {
      if (item.status !== 'pending' || !item.dueAt) {
        continue;
      }

      const dueMs = Date.parse(item.dueAt);
      if (Number.isNaN(dueMs) || dueMs > nowMs) {
        continue;
      }

      const workflow = this.ctx.findApprovalWorkflow(item.workflowId);
      if (!workflow.escalationHours) {
        continue;
      }

      item.escalationCount += 1;
      item.lastEscalatedAt = nowIso;
      item.updatedAt = nowIso;
      item.dueAt = new Date(nowMs + workflow.escalationHours * 60 * 60 * 1000).toISOString();
      item.auditTrail.push({
        id: this.ctx.newId('apat'),
        action: 'escalated',
        actorId: 'system',
        stepIndex: item.currentStepIndex,
        note: `Escalated due to timeout after ${workflow.escalationHours} hour window`,
        createdAt: nowIso,
      });

      this.ctx.approvalItems.set(id, item);
      this.pushApprovalNotification(item, workflow, 'escalated', {
        recipientUserIds: this.getPendingApproverIds(item, workflow),
      });
      this.ctx.scheduleApprovalItemStatePersistence(id);
    }
  }

  private pushApprovalNotification(
    item: ApprovalItemRecord,
    workflow: ApprovalWorkflowRecord,
    event: ApprovalNotificationRecord['event'],
    options?: { recipientUserIds?: string[] },
  ): void {
    const currentStep = workflow.steps[item.currentStepIndex] ?? workflow.steps[workflow.steps.length - 1];
    const recipients = Array.from(new Set(options?.recipientUserIds ?? []));
    const createdAt = new Date().toISOString();

    if (!recipients.length) {
      const record: ApprovalNotificationRecord = {
        id: this.ctx.newId('apn'),
        itemId: item.id,
        workflowId: workflow.id,
        channel: 'in_app',
        event,
        recipientStep: currentStep,
        message: `Approval item ${item.id} ${event.replace('_', ' ')} at step ${currentStep}`,
        createdAt,
      };
      this.ctx.approvalNotifications.set(record.id, record);
      return;
    }

    for (const recipientUserId of recipients) {
      const record: ApprovalNotificationRecord = {
        id: this.ctx.newId('apn'),
        itemId: item.id,
        workflowId: workflow.id,
        channel: 'in_app',
        event,
        recipientUserId,
        recipientStep: `user:${recipientUserId}`,
        message: `Approval item ${item.id} ${event.replace('_', ' ')}`,
        createdAt,
      };
      this.ctx.approvalNotifications.set(record.id, record);
    }
  }

  private getPendingApproverIds(item: ApprovalItemRecord, workflow: ApprovalWorkflowRecord): string[] {
    if (workflow.mode === 'single' || workflow.mode === 'parallel_any') {
      return workflow.steps;
    }
    return [workflow.steps[item.currentStepIndex] ?? workflow.steps[workflow.steps.length - 1]];
  }

  private resolveReportingApproverUserIds(principal: AuthPrincipal): string[] {
    const requester = this.resolveRequesterUser(principal);
    if (!requester?.reportingToRoleIds?.length) {
      return [];
    }

    const reportingRoleIds = new Set(requester.reportingToRoleIds.filter((id) => id.trim().length > 0));
    const approverIds = Array.from(this.ctx.users.values())
      .filter((user) => user.active && user.roleId && reportingRoleIds.has(user.roleId))
      .map((user) => user.id)
      .filter((id) => id !== requester.id);

    return Array.from(new Set(approverIds));
  }

  private resolveRequesterUser(principal: AuthPrincipal): UserRecord | undefined {
    const direct = this.ctx.users.get(principal.userId);
    if (direct) {
      return direct;
    }

    if (principal.email) {
      const normalizedEmail = principal.email.toLowerCase();
      return Array.from(this.ctx.users.values()).find((user) => user.email?.toLowerCase() === normalizedEmail);
    }

    return undefined;
  }
}
