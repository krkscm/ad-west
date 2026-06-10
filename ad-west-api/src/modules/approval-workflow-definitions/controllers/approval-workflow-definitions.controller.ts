import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '@modules/user-management/decorators/current-user.decorator';
import { Roles } from '@modules/user-management/decorators/roles.decorator';
import { AdminRole } from '@modules/user-management/enums/admin-role.enum';
import { AuthGuard } from '@modules/user-management/guards/auth.guard';
import { RolesGuard } from '@modules/user-management/guards/roles.guard';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import {
  CreateApprovalWorkflowDto,
  CreateApprovalWorkflowStageDto,
  ListApprovalWorkflowsQueryDto,
  ReviewApprovalWorkflowItemDto,
  SubmitApprovalWorkflowItemDto,
  UpdateApprovalWorkflowDto,
  UpdateApprovalWorkflowStageDto,
  UpdateApprovalWorkflowStatusDto,
} from '../dto/approval-workflow.dto';
import {
  ApprovalWorkflowDefinitionsService,
  ApprovalWorkflowCoverageResult,
  ApprovalWorkflowRuntimeItem,
  PaginatedApprovalWorkflowsResponse,
} from '../services/approval-workflow-definitions.service';
import { ApprovalWorkflowDefinition, ApprovalWorkflowStage } from '../interfaces/approval-workflow.interface';

@Controller('settings/approval-workflows')
@UseGuards(AuthGuard, RolesGuard)
export class ApprovalWorkflowDefinitionsController {
  constructor(private readonly service: ApprovalWorkflowDefinitionsService) {}

  @Get()
  list(@Query() query: ListApprovalWorkflowsQueryDto): Promise<PaginatedApprovalWorkflowsResponse> {
    return this.service.list(query);
  }

  @Post()
  @Roles(AdminRole.SUPER_ADMIN)
  create(
    @Body() dto: CreateApprovalWorkflowDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<ApprovalWorkflowDefinition> {
    return this.service.create(dto, principal);
  }

  @Patch(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateApprovalWorkflowDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<ApprovalWorkflowDefinition> {
    return this.service.update(id, dto, principal);
  }

  @Patch(':id/status')
  @Roles(AdminRole.SUPER_ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateApprovalWorkflowStatusDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<ApprovalWorkflowDefinition> {
    return this.service.updateStatus(id, dto.isActive, principal);
  }

  @Delete(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.service.remove(id);
  }

  // Stage endpoints

  @Get(':workflowId/stages')
  listStages(@Param('workflowId') workflowId: string): Promise<ApprovalWorkflowStage[]> {
    return this.service.listStages(workflowId);
  }

  @Get(':workflowId/coverage')
  evaluateCoverage(@Param('workflowId') workflowId: string): Promise<ApprovalWorkflowCoverageResult> {
    return this.service.evaluateCoverage(workflowId);
  }

  @Get('runtime/items')
  listRuntimeItems(
    @Query('workflowId') workflowId?: string,
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
  ): ApprovalWorkflowRuntimeItem[] {
    return this.service.listRuntimeItems(workflowId, status);
  }

  @Get('runtime/my-items')
  listMyRuntimeItems(
    @CurrentUser() principal: AuthPrincipal,
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
  ): Promise<ApprovalWorkflowRuntimeItem[]> {
    return this.service.listMyRuntimeItems(principal, status);
  }

  @Get('runtime/my-notifications')
  listMyRuntimeNotifications(): [] {
    return [];
  }

  @Get('runtime/items/:itemId')
  getRuntimeItem(@Param('itemId') itemId: string): ApprovalWorkflowRuntimeItem {
    return this.service.getRuntimeItem(itemId);
  }

  @Post(':workflowId/runtime/items')
  submitRuntimeItem(
    @Param('workflowId') workflowId: string,
    @Body() dto: SubmitApprovalWorkflowItemDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<ApprovalWorkflowRuntimeItem> {
    return this.service.submitRuntimeItem(workflowId, dto, principal);
  }

  @Post('runtime/items/:itemId/review')
  reviewRuntimeItem(
    @Param('itemId') itemId: string,
    @Body() dto: ReviewApprovalWorkflowItemDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<ApprovalWorkflowRuntimeItem> {
    return this.service.reviewRuntimeItem(itemId, dto, principal);
  }

  @Post(':workflowId/stages')
  @Roles(AdminRole.SUPER_ADMIN)
  addStage(
    @Param('workflowId') workflowId: string,
    @Body() dto: CreateApprovalWorkflowStageDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<ApprovalWorkflowStage> {
    return this.service.addStage(workflowId, dto, principal);
  }

  @Patch(':workflowId/stages/:stageId')
  @Roles(AdminRole.SUPER_ADMIN)
  updateStage(
    @Param('workflowId') workflowId: string,
    @Param('stageId') stageId: string,
    @Body() dto: UpdateApprovalWorkflowStageDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<ApprovalWorkflowStage> {
    return this.service.updateStage(workflowId, stageId, dto, principal);
  }

  @Delete(':workflowId/stages/:stageId')
  @Roles(AdminRole.SUPER_ADMIN)
  removeStage(
    @Param('workflowId') workflowId: string,
    @Param('stageId') stageId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<{ success: boolean }> {
    return this.service.removeStage(workflowId, stageId, principal);
  }
}
