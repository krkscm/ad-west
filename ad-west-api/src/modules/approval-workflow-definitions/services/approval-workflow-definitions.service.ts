import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AdminRole } from '@modules/user-management/enums/admin-role.enum';
import { DataSource } from 'typeorm';
import { CryptoService } from '@modules/user-management/services/crypto.service';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import { APPROVAL_WORKFLOW_STORE } from '../constants';
import {
  CreateApprovalWorkflowDto,
  CreateApprovalWorkflowStageDto,
  ListApprovalWorkflowsQueryDto,
  ReviewApprovalWorkflowItemDto,
  SubmitApprovalWorkflowItemDto,
  UpdateApprovalWorkflowDto,
  UpdateApprovalWorkflowStageDto,
} from '../dto/approval-workflow.dto';
import {
  ApprovalWorkflowDefinition,
  ApprovalWorkflowMode,
  ApprovalWorkflowStage,
} from '../interfaces/approval-workflow.interface';
import { ApprovalWorkflowStore } from '../interfaces/approval-workflow-store.interface';
import { applyInMemoryColumnFilters, parseColumnFilters } from '@modules/core-business/utils/column-filter.util';
import { applyInMemoryColumnSort, parseSortParams } from '@modules/core-business/utils/column-sort.util';

const DEFAULT_APPROVAL_MODES = new Set<string>(['sequential', 'parallel']);

export interface PaginatedApprovalWorkflowsResponse {
  items: ApprovalWorkflowDefinition[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApprovalStageCoverageResult {
  stageId: string;
  stageLabel: string;
  stageOrder: number;
  requiredCount: number;
  approverRoleDefinitionIds: string[];
  eligibleApproverCount: number;
  satisfiable: boolean;
  details: Array<{ roleDefinitionId: string; roleName: string; eligibleCount: number }>;
  notes?: string[];
}

export interface ApprovalWorkflowCoverageResult {
  workflowId: string;
  workflowCode: string;
  workflowName: string;
  evaluatedAt: string;
  stages: ApprovalStageCoverageResult[];
}

export interface ApprovalWorkflowRuntimeDecision {
  stageId: string;
  actorId: string;
  decision: 'approved' | 'rejected';
  note?: string;
  createdAt: string;
}

export interface ApprovalWorkflowRuntimeStageState {
  stageId: string;
  status: 'blocked' | 'pending' | 'approved' | 'rejected';
  approvals: string[];
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface ApprovalWorkflowRuntimeItem {
  id: string;
  workflowId: string;
  targetId: string;
  summary?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedBy: string;
  currentStageIds: string[];
  stageStates: ApprovalWorkflowRuntimeStageState[];
  decisions: ApprovalWorkflowRuntimeDecision[];
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ApprovalWorkflowDefinitionsService {
  private readonly runtimeItems = new Map<string, ApprovalWorkflowRuntimeItem>();

  constructor(
    @Inject(APPROVAL_WORKFLOW_STORE)
    private readonly store: ApprovalWorkflowStore,
    private readonly cryptoService: CryptoService,
    @Optional() @Inject(DataSource) private readonly dataSource?: DataSource,
  ) {}

  async list(query: ListApprovalWorkflowsQueryDto): Promise<PaginatedApprovalWorkflowsResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const search = query.search?.trim().toLowerCase();

    let rows = await this.store.list();

    if (search) {
      rows = rows.filter(
        (r) =>
          r.code.toLowerCase().includes(search) ||
          r.name.toLowerCase().includes(search) ||
          (r.description ?? '').toLowerCase().includes(search),
      );
    }

    if (typeof query.isActive === 'boolean') {
      rows = rows.filter((r) => r.isActive === query.isActive);
    }

    if (query.approvalMode) {
      rows = rows.filter((r) => r.approvalMode === query.approvalMode);
    }

    const columnFilters = parseColumnFilters(query.filters);
    if (Object.keys(columnFilters).length > 0) {
      rows = applyInMemoryColumnFilters(rows, columnFilters, {
        code: (row) => row.code,
        name: (row) => row.name,
        approvalMode: (row) => row.approvalMode,
        isActive: (row) => String(row.isActive),
      });
    }

    rows = applyInMemoryColumnSort(rows, parseSortParams(query.sortBy, query.sortDir), {
      code: (row) => row.code,
      name: (row) => row.name,
      approvalMode: (row) => row.approvalMode,
      isActive: (row) => row.isActive,
    }, (a, b) => a.name.localeCompare(b.name));

    const total = rows.length;
    const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;

    return { items: rows.slice(start, start + pageSize), page: safePage, pageSize, total, totalPages };
  }

  async create(dto: CreateApprovalWorkflowDto, principal: AuthPrincipal): Promise<ApprovalWorkflowDefinition> {
    const normalizedCode = dto.code.trim().toUpperCase();
    const existing = await this.store.findByCode(normalizedCode);
    if (existing) throw new BadRequestException('Workflow code already exists');

    await this.assertApprovalModeAllowed(dto.approvalMode);

    const now = new Date().toISOString();
    const workflowId = this.cryptoService.randomId('apwd');

    const stages: ApprovalWorkflowStage[] = [];
    for (let i = 0; i < (dto.stages ?? []).length; i += 1) {
      const stageDto = dto.stages![i];
      await this.assertStageApproverBindings(stageDto, true);
      stages.push(this.buildStage(stageDto, workflowId, i + 1, now));
    }
    this.assertHierarchyIntegrity(stages);

    const record: ApprovalWorkflowDefinition = {
      id: workflowId,
      code: normalizedCode,
      name: dto.name.trim(),
      description: dto.description?.trim() || undefined,
      approvalMode: dto.approvalMode as ApprovalWorkflowMode,
      isActive: dto.isActive ?? true,
      stages,
      createdBy: principal.userId,
      createdAt: now,
      updatedBy: principal.userId,
      updatedAt: now,
    };

    await this.store.create(record);
    return record;
  }

  async update(id: string, dto: UpdateApprovalWorkflowDto, principal: AuthPrincipal): Promise<ApprovalWorkflowDefinition> {
    const record = await this.requireWorkflow(id);

    if (dto.name !== undefined) record.name = dto.name.trim();
    if (dto.description !== undefined) record.description = dto.description.trim() || undefined;
    if (dto.approvalMode !== undefined) {
      await this.assertApprovalModeAllowed(dto.approvalMode);
      record.approvalMode = dto.approvalMode as ApprovalWorkflowMode;
    }
    if (dto.isActive !== undefined) record.isActive = dto.isActive;

    record.updatedBy = principal.userId;
    record.updatedAt = new Date().toISOString();

    await this.store.save(record);
    return record;
  }

  async updateStatus(id: string, isActive: boolean, principal: AuthPrincipal): Promise<ApprovalWorkflowDefinition> {
    const record = await this.requireWorkflow(id);
    record.isActive = isActive;
    record.updatedBy = principal.userId;
    record.updatedAt = new Date().toISOString();
    await this.store.save(record);
    return record;
  }

  async remove(id: string): Promise<{ success: boolean }> {
    await this.requireWorkflow(id);
    await this.store.delete(id);
    return { success: true };
  }

  async listStages(workflowId: string): Promise<ApprovalWorkflowStage[]> {
    const record = await this.requireWorkflow(workflowId);
    return [...record.stages].sort((a, b) => a.stageOrder - b.stageOrder);
  }

  async evaluateCoverage(workflowId: string): Promise<ApprovalWorkflowCoverageResult> {
    const record = await this.requireWorkflow(workflowId);
    const sortedStages = [...record.stages].sort((a, b) => a.stageOrder - b.stageOrder);
    const now = new Date().toISOString();

    const allRoleIds = [...new Set(sortedStages.flatMap((stage) => stage.approverRoleDefinitionIds ?? []))];
    if (!allRoleIds.length || !this.dataSource) {
      return {
        workflowId: record.id,
        workflowCode: record.code,
        workflowName: record.name,
        evaluatedAt: now,
        stages: sortedStages.map((stage) => ({
          stageId: stage.id,
          stageLabel: stage.label,
          stageOrder: stage.stageOrder,
          requiredCount: stage.requiredCount,
          approverRoleDefinitionIds: stage.approverRoleDefinitionIds ?? [],
          eligibleApproverCount: 0,
          satisfiable: false,
          details: [],
          notes: [
            ...(stage.approverRoleDefinitionIds?.length ? [] : ['No role definition approvers configured for this stage']),
            ...(!this.dataSource ? ['Coverage evaluation requires DB persistence mode'] : []),
          ],
        })),
      };
    }

    const roleRows = await this.dataSource.query(
      'SELECT id, name FROM adwest.role_definitions WHERE id = ANY($1::varchar[])',
      [allRoleIds],
    ) as Array<{ id: string; name: string }>;
    const roleNameById = new Map(roleRows.map((row) => [row.id, row.name]));

    const userRows = await this.dataSource.query(
      `SELECT role_id, COUNT(*)::int AS total
       FROM adwest.users
       WHERE active = true
         AND role_id = ANY($1::varchar[])
       GROUP BY role_id`,
      [allRoleIds],
    ) as Array<{ role_id: string; total: number }>;

    const adminRows = await this.dataSource.query(
      `SELECT role_definition_id, COUNT(*)::int AS total
       FROM adwest.auth_admin_users
       WHERE active = true
         AND role_definition_id = ANY($1::varchar[])
       GROUP BY role_definition_id`,
      [allRoleIds],
    ) as Array<{ role_definition_id: string; total: number }>;

    const eligibleCountByRoleId = new Map<string, number>();
    for (const row of userRows) {
      eligibleCountByRoleId.set(row.role_id, (eligibleCountByRoleId.get(row.role_id) ?? 0) + Number(row.total ?? 0));
    }
    for (const row of adminRows) {
      eligibleCountByRoleId.set(
        row.role_definition_id,
        (eligibleCountByRoleId.get(row.role_definition_id) ?? 0) + Number(row.total ?? 0),
      );
    }

    const stages: ApprovalStageCoverageResult[] = sortedStages.map((stage) => {
      const roleIds = stage.approverRoleDefinitionIds ?? [];
      const details = roleIds.map((roleId) => ({
        roleDefinitionId: roleId,
        roleName: roleNameById.get(roleId) ?? roleId,
        eligibleCount: eligibleCountByRoleId.get(roleId) ?? 0,
      }));
      const eligibleApproverCount = details.reduce((sum, row) => sum + row.eligibleCount, 0);

      const notes: string[] = [];
      if (!roleIds.length) {
        notes.push('No role definition approvers configured for this stage');
      }
      if (roleIds.length && eligibleApproverCount < stage.requiredCount) {
        notes.push('Required approvals exceed currently eligible approvers');
      }

      return {
        stageId: stage.id,
        stageLabel: stage.label,
        stageOrder: stage.stageOrder,
        requiredCount: stage.requiredCount,
        approverRoleDefinitionIds: roleIds,
        eligibleApproverCount,
        satisfiable: roleIds.length > 0 && eligibleApproverCount >= stage.requiredCount,
        details,
        notes: notes.length ? notes : undefined,
      };
    });

    return {
      workflowId: record.id,
      workflowCode: record.code,
      workflowName: record.name,
      evaluatedAt: now,
      stages,
    };
  }

  listRuntimeItems(workflowId?: string, status?: ApprovalWorkflowRuntimeItem['status']): ApprovalWorkflowRuntimeItem[] {
    const rows = Array.from(this.runtimeItems.values());
    return rows
      .filter((row) => (workflowId ? row.workflowId === workflowId : true))
      .filter((row) => (status ? row.status === status : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  listMyRuntimeItems(principal: AuthPrincipal, status?: ApprovalWorkflowRuntimeItem['status']): ApprovalWorkflowRuntimeItem[] {
    const isSuperAdmin = principal.roles.includes(AdminRole.SUPER_ADMIN);
    const effectiveStatus = status ?? 'pending';
    const rows = Array.from(this.runtimeItems.values()).filter(
      (row) => row.status === effectiveStatus,
    );
    if (isSuperAdmin) {
      return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    // For non-super-admins, exclude stages they've already voted on
    return rows
      .filter((item) =>
        item.currentStageIds.length > 0 &&
        item.stageStates.some(
          (s) => s.status === 'pending' && !s.approvals.includes(principal.userId),
        ),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getRuntimeItem(itemId: string): ApprovalWorkflowRuntimeItem {
    const item = this.runtimeItems.get(itemId);
    if (!item) throw new NotFoundException('Approval runtime item not found');
    return item;
  }

  async submitRuntimeItem(
    workflowId: string,
    dto: SubmitApprovalWorkflowItemDto,
    principal: AuthPrincipal,
  ): Promise<ApprovalWorkflowRuntimeItem> {
    const workflow = await this.requireWorkflow(workflowId);
    if (!workflow.isActive) {
      throw new BadRequestException('Approval workflow is not active');
    }
    if (!workflow.stages.length) {
      throw new BadRequestException('Approval workflow has no stages');
    }

    const stageById = new Map(workflow.stages.map((stage) => [stage.id, stage]));
    const rootStageIds = workflow.stages
      .filter((stage) => !stage.parentStageId)
      .sort((a, b) => a.stageOrder - b.stageOrder)
      .map((stage) => stage.id);

    const now = new Date().toISOString();
    const item: ApprovalWorkflowRuntimeItem = {
      id: this.cryptoService.randomId('apri'),
      workflowId: workflow.id,
      targetId: dto.targetId.trim(),
      summary: dto.summary?.trim() || undefined,
      status: 'pending',
      submittedBy: principal.userId,
      currentStageIds: rootStageIds,
      stageStates: workflow.stages.map((stage) => ({
        stageId: stage.id,
        status: rootStageIds.includes(stage.id) ? 'pending' : 'blocked',
        approvals: [],
      })),
      decisions: [
        {
          stageId: rootStageIds[0] ?? workflow.stages[0].id,
          actorId: principal.userId,
          decision: 'approved',
          note: 'submitted',
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    // Make sure initial stages are actually satisfiable by having approver bindings.
    for (const stageId of rootStageIds) {
      const stage = stageById.get(stageId);
      if (!stage) continue;
      if (!stage.approverPermissionSetId && (!stage.approverRoleDefinitionIds || !stage.approverRoleDefinitionIds.length)) {
        throw new BadRequestException(`Stage ${stage.label} has no approver mapping configured`);
      }
    }

    this.runtimeItems.set(item.id, item);
    return item;
  }

  async reviewRuntimeItem(
    itemId: string,
    dto: ReviewApprovalWorkflowItemDto,
    principal: AuthPrincipal,
  ): Promise<ApprovalWorkflowRuntimeItem> {
    const item = this.getRuntimeItem(itemId);
    if (item.status !== 'pending') {
      throw new BadRequestException('Approval runtime item is already finalized');
    }

    const workflow = await this.requireWorkflow(item.workflowId);
    const stage = workflow.stages.find((row) => row.id === dto.stageId);
    if (!stage) throw new NotFoundException('Stage not found');

    const stageState = item.stageStates.find((row) => row.stageId === stage.id);
    if (!stageState) throw new NotFoundException('Stage state not found');
    if (stageState.status !== 'pending') {
      throw new BadRequestException('Stage is not pending for review');
    }

    const isSuperAdmin = principal.roles.includes(AdminRole.SUPER_ADMIN);
    if (!isSuperAdmin) {
      await this.assertActorCanReviewStage(stage, principal);
    }

    if (stageState.approvals.includes(principal.userId)) {
      throw new BadRequestException('The same approver cannot approve a stage twice');
    }

    const now = new Date().toISOString();
    item.decisions.push({
      stageId: stage.id,
      actorId: principal.userId,
      decision: dto.decision,
      note: dto.note,
      createdAt: now,
    });

    if (dto.decision === 'rejected') {
      stageState.status = 'rejected';
      stageState.reviewedBy = principal.userId;
      stageState.reviewedAt = now;
      item.status = 'rejected';
      item.currentStageIds = [];
      item.updatedAt = now;
      this.runtimeItems.set(item.id, item);
      return item;
    }

    stageState.approvals = [...new Set([...stageState.approvals, principal.userId])];

    if (stageState.approvals.length >= stage.requiredCount) {
      stageState.status = 'approved';
      stageState.reviewedBy = principal.userId;
      stageState.reviewedAt = now;
    }

    this.refreshStageProgress(item, workflow);
    item.updatedAt = now;
    this.runtimeItems.set(item.id, item);
    return item;
  }

  async addStage(workflowId: string, dto: CreateApprovalWorkflowStageDto, principal: AuthPrincipal): Promise<ApprovalWorkflowStage> {
    const record = await this.requireWorkflow(workflowId);
    await this.assertStageApproverBindings(dto, true);

    const maxOrder = record.stages.reduce((m, s) => Math.max(m, s.stageOrder), 0);
    const now = new Date().toISOString();
    const stage = this.buildStage(dto, workflowId, maxOrder + 1, now);

    const nextStages = [...record.stages, stage];
    this.assertHierarchyIntegrity(nextStages);

    record.stages = nextStages;
    record.updatedBy = principal.userId;
    record.updatedAt = now;
    await this.store.save(record);
    return stage;
  }

  async updateStage(workflowId: string, stageId: string, dto: UpdateApprovalWorkflowStageDto, principal: AuthPrincipal): Promise<ApprovalWorkflowStage> {
    const record = await this.requireWorkflow(workflowId);
    const stage = record.stages.find((s) => s.id === stageId);
    if (!stage) throw new NotFoundException('Stage not found');

    await this.assertStageApproverBindings(dto, false);

    if (dto.label !== undefined) stage.label = dto.label.trim();
    if (dto.approverPermissionSetId !== undefined) {
      stage.approverPermissionSetId = dto.approverPermissionSetId?.trim() || undefined;
    }
    if (dto.approverRoleDefinitionIds !== undefined) {
      stage.approverRoleDefinitionIds = this.normalizeRoleDefinitionIds(dto.approverRoleDefinitionIds);
    }
    if (dto.parentStageId !== undefined) stage.parentStageId = dto.parentStageId || undefined;
    if (dto.requiredCount !== undefined) stage.requiredCount = dto.requiredCount;
    if (dto.stageOrder !== undefined) stage.stageOrder = dto.stageOrder;

    if (!stage.approverPermissionSetId && (!stage.approverRoleDefinitionIds || !stage.approverRoleDefinitionIds.length)) {
      throw new BadRequestException('Each stage needs at least one approver mapping (permission set or role definitions)');
    }

    stage.updatedAt = new Date().toISOString();

    this.assertHierarchyIntegrity(record.stages);
    this.reorderStages(record.stages);

    record.updatedBy = principal.userId;
    record.updatedAt = new Date().toISOString();
    await this.store.save(record);
    return stage;
  }

  async removeStage(workflowId: string, stageId: string, principal: AuthPrincipal): Promise<{ success: boolean }> {
    const record = await this.requireWorkflow(workflowId);
    const idx = record.stages.findIndex((s) => s.id === stageId);
    if (idx === -1) throw new NotFoundException('Stage not found');
    record.stages.splice(idx, 1);
    for (const stage of record.stages) {
      if (stage.parentStageId === stageId) {
        stage.parentStageId = undefined;
      }
    }
    this.reorderStages(record.stages);
    this.assertHierarchyIntegrity(record.stages);
    record.updatedBy = principal.userId;
    record.updatedAt = new Date().toISOString();
    await this.store.save(record);
    return { success: true };
  }

  private async requireWorkflow(id: string): Promise<ApprovalWorkflowDefinition> {
    const record = await this.store.findById(id);
    if (!record) throw new NotFoundException('Approval workflow not found');
    return record;
  }

  private refreshStageProgress(item: ApprovalWorkflowRuntimeItem, workflow: ApprovalWorkflowDefinition): void {
    const childrenByParent = new Map<string, ApprovalWorkflowStage[]>();
    for (const stage of workflow.stages) {
      if (!stage.parentStageId) continue;
      childrenByParent.set(stage.parentStageId, [...(childrenByParent.get(stage.parentStageId) ?? []), stage]);
    }

    const stageStateById = new Map(item.stageStates.map((state) => [state.stageId, state]));

    // Unlock child stages once parent is approved.
    for (const [parentId, children] of childrenByParent.entries()) {
      const parentState = stageStateById.get(parentId);
      if (!parentState || parentState.status !== 'approved') continue;
      for (const child of children) {
        const childState = stageStateById.get(child.id);
        if (childState && childState.status === 'blocked') {
          childState.status = 'pending';
        }
      }
    }

    const pendingStages = item.stageStates
      .filter((stageState) => stageState.status === 'pending')
      .map((stageState) => stageState.stageId);

    const allApproved = item.stageStates.every((stageState) => stageState.status === 'approved');
    if (allApproved) {
      item.status = 'approved';
      item.currentStageIds = [];
      return;
    }

    item.currentStageIds = pendingStages;
  }

  private async assertActorCanReviewStage(stage: ApprovalWorkflowStage, principal: AuthPrincipal): Promise<void> {
    const roleDefinitionIds = stage.approverRoleDefinitionIds ?? [];
    if (!roleDefinitionIds.length) {
      throw new ForbiddenException('Stage does not allow role-based reviewers');
    }

    if (!this.dataSource) {
      throw new ForbiddenException('Role-based reviewer validation requires DB persistence mode');
    }

    const [adminRows, userRows] = await Promise.all([
      this.dataSource.query(
        'SELECT role_definition_id FROM adwest.auth_admin_users WHERE id = $1 AND active = true LIMIT 1',
        [principal.userId],
      ) as Promise<Array<{ role_definition_id: string | null }>>,
      this.dataSource.query(
        'SELECT role_id FROM adwest.users WHERE id = $1 AND active = true LIMIT 1',
        [principal.userId],
      ) as Promise<Array<{ role_id: string | null }>>,
    ]);

    const actorRoleIds = new Set<string>();
    const adminRoleId = adminRows[0]?.role_definition_id;
    const userRoleId = userRows[0]?.role_id;
    if (adminRoleId) actorRoleIds.add(adminRoleId);
    if (userRoleId) actorRoleIds.add(userRoleId);

    const hasEligibleRole = roleDefinitionIds.some((roleId) => actorRoleIds.has(roleId));
    if (!hasEligibleRole) {
      throw new ForbiddenException('Current user role is not eligible to review this stage');
    }
  }

  private buildStage(dto: CreateApprovalWorkflowStageDto, workflowId: string, order: number, now: string): ApprovalWorkflowStage {
    return {
      id: this.cryptoService.randomId('apws'),
      workflowId,
      stageOrder: order,
      label: dto.label.trim(),
      approverPermissionSetId: dto.approverPermissionSetId?.trim() || undefined,
      approverRoleDefinitionIds: this.normalizeRoleDefinitionIds(dto.approverRoleDefinitionIds),
      parentStageId: dto.parentStageId || undefined,
      requiredCount: dto.requiredCount ?? 1,
      createdAt: now,
      updatedAt: now,
    };
  }

  private reorderStages(stages: ApprovalWorkflowStage[]): void {
    stages.sort((a, b) => a.stageOrder - b.stageOrder).forEach((s, i) => {
      s.stageOrder = i + 1;
    });
  }

  private assertHierarchyIntegrity(stages: ApprovalWorkflowStage[]): void {
    const byId = new Map<string, ApprovalWorkflowStage>();
    for (const stage of stages) {
      byId.set(stage.id, stage);
    }

    for (const stage of stages) {
      if (!stage.parentStageId) continue;
      if (stage.parentStageId === stage.id) {
        throw new BadRequestException('Stage cannot be its own parent');
      }
      if (!byId.has(stage.parentStageId)) {
        throw new BadRequestException(`Parent stage ${stage.parentStageId} was not found`);
      }
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const detectCycle = (stageId: string): boolean => {
      if (visited.has(stageId)) return false;
      if (visiting.has(stageId)) return true;
      visiting.add(stageId);
      const stage = byId.get(stageId);
      if (stage?.parentStageId && detectCycle(stage.parentStageId)) {
        return true;
      }
      visiting.delete(stageId);
      visited.add(stageId);
      return false;
    };

    for (const stage of stages) {
      if (detectCycle(stage.id)) {
        throw new BadRequestException('Hierarchy mapping cannot contain cycles');
      }
    }
  }

  private async assertApprovalModeAllowed(mode: string): Promise<void> {
    const normalized = mode.trim();
    if (!normalized) {
      throw new BadRequestException('Approval mode is required');
    }
    const activeModes = await this.listActiveApprovalModes();
    if (!activeModes.has(normalized)) {
      throw new BadRequestException(`Approval mode "${normalized}" is not active in enum_values`);
    }
  }

  private async listActiveApprovalModes(): Promise<Set<string>> {
    if (!this.dataSource) {
      return DEFAULT_APPROVAL_MODES;
    }
    const rows = await this.dataSource.query(
      `SELECT value FROM adwest.enum_values WHERE enum_type = 'approval_mode' AND active = true`,
    ) as Array<{ value: string }>;
    if (!rows.length) {
      return DEFAULT_APPROVAL_MODES;
    }
    return new Set(rows.map((row) => row.value));
  }

  private async assertPermissionSetExists(permissionSetId: string): Promise<void> {
    const normalizedId = permissionSetId?.trim();
    if (!normalizedId) {
      throw new BadRequestException('Approver permission set is required');
    }
    if (!this.dataSource) {
      return;
    }
    const rows = await this.dataSource.query(
      'SELECT id FROM adwest.permission_sets WHERE id = $1 AND active = true LIMIT 1',
      [normalizedId],
    ) as Array<{ id: string }>;
    if (!rows.length) {
      throw new BadRequestException(`Permission set ${normalizedId} was not found or is inactive`);
    }
  }

  private normalizeRoleDefinitionIds(roleDefinitionIds?: string[]): string[] | undefined {
    if (!roleDefinitionIds) return undefined;
    const normalized = roleDefinitionIds
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
    if (!normalized.length) return undefined;
    return [...new Set(normalized)];
  }

  private async assertRoleDefinitionExists(roleDefinitionId: string): Promise<void> {
    const normalizedId = roleDefinitionId?.trim();
    if (!normalizedId) {
      throw new BadRequestException('Role definition id cannot be empty');
    }
    if (!this.dataSource) {
      return;
    }
    const rows = await this.dataSource.query(
      'SELECT id FROM adwest.role_definitions WHERE id = $1 AND active = true LIMIT 1',
      [normalizedId],
    ) as Array<{ id: string }>;
    if (!rows.length) {
      throw new BadRequestException(`Role definition ${normalizedId} was not found or is inactive`);
    }
  }

  private async assertStageApproverBindings(
    dto: Pick<CreateApprovalWorkflowStageDto, 'approverPermissionSetId' | 'approverRoleDefinitionIds'>,
    requireAtLeastOne: boolean,
  ): Promise<void> {
    const permissionSetId = dto.approverPermissionSetId?.trim();
    const roleDefinitionIds = this.normalizeRoleDefinitionIds(dto.approverRoleDefinitionIds);

    if (requireAtLeastOne && !permissionSetId && (!roleDefinitionIds || !roleDefinitionIds.length)) {
      throw new BadRequestException('Each stage needs at least one approver mapping (permission set or role definitions)');
    }

    if (permissionSetId) {
      await this.assertPermissionSetExists(permissionSetId);
    }

    for (const roleDefinitionId of roleDefinitionIds ?? []) {
      await this.assertRoleDefinitionExists(roleDefinitionId);
    }
  }
}
