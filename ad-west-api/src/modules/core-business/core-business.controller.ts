import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { createReadStream } from 'fs';
import * as pathLib from 'path';
import { Response } from 'express';
import { CurrentUser } from '@modules/user-management/decorators/current-user.decorator';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import { CoreAdminAuthGuard } from './guards/core-admin-auth.guard';
import { CoreMemberAuthGuard } from './guards/core-member-auth.guard';
import {
  CreateDocumentDto,
  CreateDocumentFolderDto,
  CreateApprovalWorkflowDto,
  CreateReportSubmissionDto,
  CreateReportTemplateDto,
  CreateGovernanceAssignmentDto,
  CreateGovernanceStructureDto,
  CreateLocationDto,
  CreateSrenyDto,
  CreatePermissionDto,
  UpdatePermissionDto,
  CreatePermissionSetDto,
  UpdatePermissionSetDto,
  SetPermissionSetItemsDto,
  CreateSreniDefinitionDto,
  CreateAnalyticsStudioLayoutDto,
  CreateCalendarEventDto,
  CreateAttendanceMetricDto,
  ChangeOwnPasswordDto,
  CreateUserDto,
  UpdateUserDto,
  CreateSthanDto,
  CreateZoneDto,
  ReviewApprovalItemDto,
  ResubmitApprovalItemDto,
  ReviewReportSubmissionDto,
  SubmitApprovalItemDto,
  UpdateGovernanceAssignmentDto,
  UpdateGovernanceStructureDto,
  UpdateLocationDto,
  UpdateSrenyDto,
  UpdateSreniDefinitionDto,
  UpdateCalendarEventDto,
  UpdateAttendanceMetricDto,
  UpsertEventAttendanceCaptureDto,
  UpdateSthanDto,
  UpdateZoneDto,
  CreateReportMetricDefinitionDto,
  UpdateReportMetricDefinitionDto,
  SubmitSreniMonthlyReportDto,
  CreateSreniReportParameterDto,
  UpdateSreniReportParameterDto,
  SubmitSreniReportDto,
  CreateSthanExpenseDto,
  CreateSthanCalendarEventDto,
  ReviewSthanExpenseDto,
  SubmitSthanReportDto,
  UpdateSthanCalendarEventDto,
  CreateLocationReportMetricDto,
  UpdateLocationReportMetricDto,
  CreateSreniDivisionDto,
  UpdateSreniDivisionDto,
  AssignContactDivisionDto,
  AssignContactSthanDto,
  CreateHouseholdMemberDto,
  SetContactActiveDto,
  SetContactSreniTagsDto,
  UpdateContactDataDto,
  UpdateHouseholdMemberDto,
} from './dto/core-business.dto';
import { CoreBusinessService } from './core-business.service';

@Controller()
export class CoreBusinessController {
  constructor(private readonly service: CoreBusinessService) {}

  @Get('org/zones')
  @UseGuards(CoreAdminAuthGuard)
  listZones() {
    return this.service.listZones();
  }

  @Get('core/persistence/readiness')
  @UseGuards(CoreAdminAuthGuard)
  getPersistenceReadiness() {
    return this.service.getPersistenceReadiness();
  }

  @Post('org/zones')
  @UseGuards(CoreAdminAuthGuard)
  async createZone(@Body() dto: CreateZoneDto) {
    return await this.service.createZone(dto);
  }

  @Patch('org/zones/:zoneId')
  @UseGuards(CoreAdminAuthGuard)
  async updateZone(@Param('zoneId') zoneId: string, @Body() dto: UpdateZoneDto) {
    return await this.service.updateZone(zoneId, dto);
  }

  @Get('org/locations')
  @UseGuards(CoreAdminAuthGuard)
  async listLocations(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('level') level?: string,
  ) {
    return this.service.listLocationsFromDb({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      search,
      level,
    });
  }

  @Post('org/locations')
  @UseGuards(CoreAdminAuthGuard)
  async createLocation(@Body() dto: CreateLocationDto) {
    return await this.service.createLocation(dto);
  }

  @Patch('org/locations/:locationId')
  @UseGuards(CoreAdminAuthGuard)
  async updateLocation(@Param('locationId') locationId: string, @Body() dto: UpdateLocationDto) {
    return await this.service.updateLocation(locationId, dto);
  }

  @Delete('org/locations/:locationId')
  @UseGuards(CoreAdminAuthGuard)
  async deleteLocation(@Param('locationId') locationId: string) {
    await this.service.deleteLocation(locationId);
  }

  @Get('org/sreni-definitions')
  @UseGuards(CoreAdminAuthGuard)
  async listSreniDefinitions(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listSreniDefinitionsFromDb({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      search,
    });
  }

  @Post('org/sreni-definitions')
  @UseGuards(CoreAdminAuthGuard)
  async createSreniDefinition(
    @Body() dto: CreateSreniDefinitionDto,
    @CurrentUser() actor?: AuthPrincipal,
  ) {
    return await this.service.createSreniDefinition(dto, actor?.email);
  }

  @Patch('org/sreni-definitions/:sreniId')
  @UseGuards(CoreAdminAuthGuard)
  async updateSreniDefinition(
    @Param('sreniId') sreniId: string,
    @Body() dto: UpdateSreniDefinitionDto,
    @CurrentUser() actor?: AuthPrincipal,
  ) {
    return await this.service.updateSreniDefinition(sreniId, dto, actor?.email);
  }

  @Delete('org/sreni-definitions/:sreniId')
  @UseGuards(CoreAdminAuthGuard)
  async deleteSreniDefinition(@Param('sreniId') sreniId: string) {
    await this.service.deleteSreniDefinition(sreniId);
  }

  // ── Attendance Metrics ───────────────────────────────────────────────────

  @Get('org/attendance-metrics')
  @UseGuards(CoreAdminAuthGuard)
  async listAttendanceMetrics(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('sreniId') sreniId?: string,
  ) {
    return this.service.listAttendanceMetricsFromDb({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      search,
      sreniId,
    });
  }

  @Post('org/attendance-metrics')
  @UseGuards(CoreAdminAuthGuard)
  async createAttendanceMetric(
    @Body() dto: CreateAttendanceMetricDto,
    @CurrentUser() actor?: AuthPrincipal,
  ) {
    return this.service.createAttendanceMetric(dto, actor);
  }

  @Patch('org/attendance-metrics/:metricId')
  @UseGuards(CoreAdminAuthGuard)
  async updateAttendanceMetric(
    @Param('metricId') metricId: string,
    @Body() dto: UpdateAttendanceMetricDto,
    @CurrentUser() actor?: AuthPrincipal,
  ) {
    return this.service.updateAttendanceMetric(metricId, dto, actor);
  }

  @Delete('org/attendance-metrics/:metricId')
  @UseGuards(CoreAdminAuthGuard)
  async deleteAttendanceMetric(@Param('metricId') metricId: string) {
    return this.service.deleteAttendanceMetric(metricId);
  }

  // ── Permissions ─────────────────────────────────────────────────────────────

  @Get('org/permissions')
  @UseGuards(CoreAdminAuthGuard)
  async listPermissions(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.service.listPermissionsFromDb({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      search,
      locationId,
    });
  }

  @Post('org/permissions')
  @UseGuards(CoreAdminAuthGuard)
  async createPermission(@Body() dto: CreatePermissionDto, @CurrentUser() actor?: AuthPrincipal) {
    return this.service.createPermission(dto, actor?.email);
  }

  @Patch('org/permissions/:permId')
  @UseGuards(CoreAdminAuthGuard)
  async updatePermission(@Param('permId') permId: string, @Body() dto: UpdatePermissionDto, @CurrentUser() actor?: AuthPrincipal) {
    return this.service.updatePermission(permId, dto, actor?.email);
  }

  @Delete('org/permissions/:permId')
  @UseGuards(CoreAdminAuthGuard)
  async deletePermission(@Param('permId') permId: string) {
    await this.service.deletePermission(permId);
  }

  // ── Permission sets ──────────────────────────────────────────────────────────

  @Get('org/permission-sets')
  @UseGuards(CoreAdminAuthGuard)
  async listPermissionSets(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listPermissionSetsFromDb({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      search,
    });
  }

  @Post('org/permission-sets')
  @UseGuards(CoreAdminAuthGuard)
  async createPermissionSet(@Body() dto: CreatePermissionSetDto, @CurrentUser() actor?: AuthPrincipal) {
    return this.service.createPermissionSet(dto, actor?.email);
  }

  @Patch('org/permission-sets/:setId')
  @UseGuards(CoreAdminAuthGuard)
  async updatePermissionSet(@Param('setId') setId: string, @Body() dto: UpdatePermissionSetDto, @CurrentUser() actor?: AuthPrincipal) {
    return this.service.updatePermissionSet(setId, dto, actor?.email);
  }

  @Put('org/permission-sets/:setId/permissions')
  @UseGuards(CoreAdminAuthGuard)
  async setPermissionSetItems(@Param('setId') setId: string, @Body() dto: SetPermissionSetItemsDto, @CurrentUser() actor?: AuthPrincipal) {
    return this.service.setPermissionSetItems(setId, dto, actor?.email);
  }

  @Delete('org/permission-sets/:setId')
  @UseGuards(CoreAdminAuthGuard)
  async deletePermissionSet(@Param('setId') setId: string) {
    await this.service.deletePermissionSet(setId);
  }

  // ── Users ────────────────────────────────────────────────────────────────────

  @Get('org/users')
  @UseGuards(CoreAdminAuthGuard)
  async listUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listUsersFromDb({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      search,
    });
  }

  @Get('org/responsibility-chart')
  @UseGuards(CoreAdminAuthGuard)
  async getResponsibilityChart(@Query('year') year?: string) {
    const normalizedYear = typeof year === 'string' ? year.trim() : undefined;
    let parsedYear: number | undefined;

    if (normalizedYear) {
      if (!/^\d{4}$/.test(normalizedYear)) {
        throw new BadRequestException('year must be a valid 4-digit year');
      }
      parsedYear = parseInt(normalizedYear, 10);
    }

    if (parsedYear !== undefined && (parsedYear < 1900 || parsedYear > 9999)) {
      throw new BadRequestException('year must be a valid 4-digit year');
    }

    return this.service.getResponsibilityChart(parsedYear);
  }

  @Post('org/users')
  @UseGuards(CoreAdminAuthGuard)
  async createUser(@Body() dto: CreateUserDto, @CurrentUser() actor?: AuthPrincipal) {
    return this.service.createUser(dto, actor?.email);
  }

  @Patch('org/users/:userId')
  @UseGuards(CoreAdminAuthGuard)
  async updateUser(@Param('userId') userId: string, @Body() dto: UpdateUserDto, @CurrentUser() actor?: AuthPrincipal) {
    return this.service.updateUser(userId, dto, actor?.email);
  }

  @Delete('org/users/:userId')
  @UseGuards(CoreAdminAuthGuard)
  async deleteUser(@Param('userId') userId: string) {
    await this.service.deleteUser(userId);
  }

  @Post('org/users/me/change-password')
  @UseGuards(CoreAdminAuthGuard)
  async changeOwnPassword(@Body() dto: ChangeOwnPasswordDto, @CurrentUser() actor: AuthPrincipal) {
    await this.service.changeOwnPassword(actor.userId, dto.currentPassword, dto.newPassword);
  }

  @Get('org/srenies')
  @UseGuards(CoreAdminAuthGuard)
  listSrenies(@Query('zoneId') zoneId?: string) {
    return this.service.listSrenies(zoneId);
  }

  @Post('org/srenies')
  @UseGuards(CoreAdminAuthGuard)
  async createSreny(@Body() dto: CreateSrenyDto) {
    return await this.service.createSreny(dto);
  }

  @Patch('org/srenies/:srenyId')
  @UseGuards(CoreAdminAuthGuard)
  async updateSreny(@Param('srenyId') srenyId: string, @Body() dto: UpdateSrenyDto) {
    return await this.service.updateSreny(srenyId, dto);
  }

  @Get('org/srenies/:srenyId/governance-structures')
  @UseGuards(CoreAdminAuthGuard)
  listGovernanceStructures(@Param('srenyId') srenyId: string) {
    return this.service.listGovernanceStructures(srenyId);
  }

  @Post('org/srenies/:srenyId/governance-structures')
  @UseGuards(CoreAdminAuthGuard)
  createGovernanceStructure(
    @Param('srenyId') srenyId: string,
    @Body() dto: CreateGovernanceStructureDto,
  ) {
    return this.service.createGovernanceStructure(srenyId, dto);
  }

  @Patch('org/srenies/:srenyId/governance-structures/:structureId')
  @UseGuards(CoreAdminAuthGuard)
  updateGovernanceStructure(
    @Param('srenyId') srenyId: string,
    @Param('structureId') structureId: string,
    @Body() dto: UpdateGovernanceStructureDto,
  ) {
    return this.service.updateGovernanceStructure(srenyId, structureId, dto);
  }

  @Get('org/governance-structures/:structureId/assignments')
  @UseGuards(CoreAdminAuthGuard)
  listGovernanceAssignments(@Param('structureId') structureId: string) {
    return this.service.listGovernanceAssignments(structureId);
  }

  @Post('org/governance-structures/:structureId/assignments')
  @UseGuards(CoreAdminAuthGuard)
  createGovernanceAssignment(
    @Param('structureId') structureId: string,
    @Body() dto: CreateGovernanceAssignmentDto,
  ) {
    return this.service.createGovernanceAssignment(structureId, dto);
  }

  @Patch('org/governance-structures/:structureId/assignments/:assignmentId')
  @UseGuards(CoreAdminAuthGuard)
  updateGovernanceAssignment(
    @Param('structureId') structureId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateGovernanceAssignmentDto,
  ) {
    return this.service.updateGovernanceAssignment(structureId, assignmentId, dto);
  }

  @Get('org/sthans')
  @UseGuards(CoreAdminAuthGuard)
  async listSthans(@Query('srenyId') srenyId?: string) {
    return this.service.listSthans(srenyId);
  }

  @Post('org/sthans')
  @UseGuards(CoreAdminAuthGuard)
  createSthan(@Body() dto: CreateSthanDto) {
    return this.service.createSthan(dto);
  }

  @Patch('org/sthans/:sthanId')
  @UseGuards(CoreAdminAuthGuard)
  updateSthan(@Param('sthanId') sthanId: string, @Body() dto: UpdateSthanDto) {
    return this.service.updateSthan(sthanId, dto);
  }

  @Get('documents/folders')
  @UseGuards(CoreAdminAuthGuard)
  listDocumentFolders(@Query('srenyId') srenyId?: string) {
    return this.service.listDocumentFolders(srenyId);
  }

  @Post('documents/folders')
  @UseGuards(CoreAdminAuthGuard)
  createDocumentFolder(@Body() dto: CreateDocumentFolderDto) {
    return this.service.createDocumentFolder(dto);
  }

  @Get('documents/files')
  @UseGuards(CoreAdminAuthGuard)
  listDocuments(@Query('srenyId') srenyId?: string, @Query('search') search?: string) {
    return this.service.listDocuments(srenyId, search);
  }

  @Post('documents/files')
  @UseGuards(CoreAdminAuthGuard)
  createDocument(@Body() dto: CreateDocumentDto, @CurrentUser() principal: AuthPrincipal) {
    return this.service.createDocument(dto, principal);
  }

  @Post('documents/files/:documentId/new-version')
  @UseGuards(CoreAdminAuthGuard)
  createDocumentVersion(
    @Param('documentId') documentId: string,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    return this.service.createDocumentVersion(documentId, dto, principal);
  }

  @Post('documents/sreni/:sreniId/upload')
  @UseGuards(CoreAdminAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const base = process.env.UPLOAD_DIR ?? pathLib.join(process.cwd(), 'uploads');
          const dir = pathLib.join(base, 'documents', req.params.sreniId);
          require('fs').mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = pathLib.extname(file.originalname);
          const base = pathLib.basename(file.originalname, ext).replace(/[^a-zA-Z0-9._-]/g, '_');
          cb(null, `${Date.now()}-${base}${ext}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadDocument(
    @Param('sreniId') sreniId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description: string | undefined,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.service.uploadDocument(sreniId, file, description, principal);
  }

  @Get('documents/files/:documentId/download')
  @UseGuards(CoreAdminAuthGuard)
  async downloadDocument(
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ) {
    const { record, filePath } = this.service.downloadDocument(documentId);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(record.fileName)}"`);
    res.setHeader('Content-Type', record.fileType || 'application/octet-stream');
    if (record.fileSize) res.setHeader('Content-Length', String(record.fileSize));
    createReadStream(filePath).pipe(res as unknown as NodeJS.WritableStream);
  }

  @Delete('documents/files/:documentId')
  @UseGuards(CoreAdminAuthGuard)
  deleteDocument(@Param('documentId') documentId: string) {
    this.service.deleteDocument(documentId);
    return { success: true };
  }

  @Get('reports/templates')
  @UseGuards(CoreAdminAuthGuard)
  listReportTemplates(@Query('srenyId') srenyId?: string) {
    return this.service.listReportTemplates(srenyId);
  }

  @Post('reports/templates')
  @UseGuards(CoreAdminAuthGuard)
  createReportTemplate(@Body() dto: CreateReportTemplateDto) {
    return this.service.createReportTemplate(dto);
  }

  @Get('reports/submissions')
  @UseGuards(CoreAdminAuthGuard)
  listReportSubmissions(@Query('status') status?: string) {
    return this.service.listReportSubmissions(status);
  }

  @Post('reports/submissions/:submissionId/review')
  @UseGuards(CoreAdminAuthGuard)
  reviewReportSubmission(
    @Param('submissionId') submissionId: string,
    @Body() dto: ReviewReportSubmissionDto,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    return this.service.reviewReportSubmission(submissionId, dto, principal);
  }

  @Get('approvals/workflows')
  @UseGuards(CoreAdminAuthGuard)
  listApprovalWorkflows() {
    return this.service.listApprovalWorkflows();
  }

  @Post('approvals/workflows')
  @UseGuards(CoreAdminAuthGuard)
  createApprovalWorkflow(@Body() dto: CreateApprovalWorkflowDto) {
    return this.service.createApprovalWorkflow(dto);
  }

  @Get('approvals/items')
  @UseGuards(CoreAdminAuthGuard)
  listApprovalItems(@Query('status') status?: string) {
    return this.service.listApprovalItems(status);
  }

  @Get('approvals/my-actions')
  @UseGuards(CoreAdminAuthGuard)
  listMyApprovalActions(@CurrentUser() principal: AuthPrincipal, @Query('status') status?: string) {
    return this.service.listMyApprovalActions(principal, status);
  }

  @Get('approvals/notifications')
  @UseGuards(CoreAdminAuthGuard)
  listApprovalNotifications(@Query('itemId') itemId?: string) {
    return this.service.listApprovalNotifications(itemId);
  }

  @Get('approvals/my-notifications')
  @UseGuards(CoreAdminAuthGuard)
  listMyApprovalNotifications(@CurrentUser() principal: AuthPrincipal, @Query('itemId') itemId?: string) {
    return this.service.listMyApprovalNotifications(principal, itemId);
  }

  @Post('approvals/items')
  @UseGuards(CoreAdminAuthGuard)
  submitApprovalItem(@Body() dto: SubmitApprovalItemDto, @CurrentUser() principal: AuthPrincipal) {
    return this.service.submitApprovalItem(dto, principal);
  }

  @Post('approvals/items/:itemId/review')
  @UseGuards(CoreAdminAuthGuard)
  reviewApprovalItem(
    @Param('itemId') itemId: string,
    @Body() dto: ReviewApprovalItemDto,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    return this.service.reviewApprovalItem(itemId, dto, principal);
  }

  @Post('approvals/items/:itemId/resubmit')
  @UseGuards(CoreAdminAuthGuard)
  resubmitApprovalItem(
    @Param('itemId') itemId: string,
    @Body() dto: ResubmitApprovalItemDto,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    return this.service.resubmitApprovalItem(itemId, dto, principal);
  }

  @Get('members/me/reports/templates')
  @UseGuards(CoreMemberAuthGuard)
  listMemberReportTemplates() {
    return this.service.listReportTemplates();
  }

  @Get('members/me/reports/submissions')
  @UseGuards(CoreMemberAuthGuard)
  listMyReportSubmissions(@CurrentUser() principal: AuthPrincipal) {
    return this.service.listMyReportSubmissions(principal);
  }

  @Post('members/me/reports/submissions')
  @UseGuards(CoreMemberAuthGuard)
  createReportSubmission(
    @Body() dto: CreateReportSubmissionDto,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    return this.service.createReportSubmission(dto, principal);
  }

  // ── Sreni Calendar Events ────────────────────────────────────────────────

  @Get('programs/sreni-definitions/:sreniId/calendar-events')
  @UseGuards(CoreAdminAuthGuard)
  listSreniCalendarEvents(
    @Param('sreniId') sreniId: string,
    @CurrentUser() actor: AuthPrincipal,
    @Query('accessibleSthanIds') accessibleSthanIds?: string,
  ) {
    const sthanIds = (accessibleSthanIds ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return this.service.listSreniCalendarEvents(sreniId, actor, sthanIds);
  }

  @Post('programs/sreni-definitions/:sreniId/calendar-events')
  @UseGuards(CoreAdminAuthGuard)
  createSreniCalendarEvent(
    @Param('sreniId') sreniId: string,
    @Body() dto: CreateCalendarEventDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.service.createSreniCalendarEvent(sreniId, dto, actor);
  }

  @Patch('programs/sreni-definitions/:sreniId/calendar-events/:eventId')
  @UseGuards(CoreAdminAuthGuard)
  updateSreniCalendarEvent(
    @Param('sreniId') sreniId: string,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateCalendarEventDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.service.updateSreniCalendarEvent(sreniId, eventId, dto, actor);
  }

  @Delete('programs/sreni-definitions/:sreniId/calendar-events/:eventId')
  @UseGuards(CoreAdminAuthGuard)
  deleteSreniCalendarEvent(
    @Param('sreniId') sreniId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.service.deleteSreniCalendarEvent(sreniId, eventId, actor);
  }

  @Get('programs/sreni-definitions/:sreniId/attendance-listing')
  @UseGuards(CoreAdminAuthGuard)
  listSreniAttendanceListing(
    @Param('sreniId') sreniId: string,
    @CurrentUser() actor: AuthPrincipal,
    @Query('accessibleSthanIds') accessibleSthanIds?: string,
  ) {
    const sthanIds = (accessibleSthanIds ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return this.service.listSreniAttendanceListing(sreniId, actor, sthanIds);
  }

  @Get('programs/sreni-definitions/:sreniId/analytics-layouts')
  @UseGuards(CoreAdminAuthGuard)
  listAnalyticsStudioLayouts(
    @Param('sreniId') sreniId: string,
    @CurrentUser() actor: AuthPrincipal,
    @Query('layoutType') layoutType?: string,
  ) {
    return this.service.listAnalyticsStudioLayouts(sreniId, actor, layoutType);
  }

  @Post('programs/sreni-definitions/:sreniId/analytics-layouts')
  @UseGuards(CoreAdminAuthGuard)
  saveAnalyticsStudioLayout(
    @Param('sreniId') sreniId: string,
    @Body() dto: CreateAnalyticsStudioLayoutDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.service.saveAnalyticsStudioLayout(sreniId, actor, dto);
  }

  @Delete('programs/sreni-definitions/:sreniId/analytics-layouts/:layoutId')
  @UseGuards(CoreAdminAuthGuard)
  deleteAnalyticsStudioLayout(
    @Param('sreniId') sreniId: string,
    @Param('layoutId') layoutId: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.service.deleteAnalyticsStudioLayout(sreniId, layoutId, actor);
  }

  @Put('programs/sreni-definitions/:sreniId/calendar-events/:eventId/attendance-capture')
  @UseGuards(CoreAdminAuthGuard)
  upsertEventAttendanceCapture(
    @Param('sreniId') sreniId: string,
    @Param('eventId') eventId: string,
    @Body() dto: UpsertEventAttendanceCaptureDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.service.upsertEventAttendanceCapture(sreniId, eventId, dto, actor);
  }

  // ── Sreni Contact List ─────────────────────────────────────────────────────

  @Get('org/sreni-definitions/:sreniId/contacts')
  @UseGuards(CoreAdminAuthGuard)
  async listSreniContacts(
    @Param('sreniId') sreniId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listSreniContacts(
      sreniId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 50,
    );
  }

  @Post('org/sreni-definitions/:sreniId/contacts/upload')
  @UseGuards(CoreAdminAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadSreniContacts(
    @Param('sreniId') sreniId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor?: AuthPrincipal,
  ) {
    if (!file) throw new BadRequestException('No file uploaded. Send the Excel file as "file" in a multipart/form-data request.');
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ];
    if (!allowedMimes.includes(file.mimetype) && !file.originalname.match(/\.(xlsx|xls)$/i)) {
      throw new BadRequestException('Only .xlsx and .xls files are accepted.');
    }
    return this.service.uploadSreniContacts(sreniId, file.buffer, file.originalname, actor?.email ?? actor?.userId);
  }

  @Delete('org/sreni-definitions/:sreniId/contacts')
  @UseGuards(CoreAdminAuthGuard)
  async clearSreniContacts(@Param('sreniId') sreniId: string) {
    return this.service.clearSreniContacts(sreniId);
  }

  @Get('org/contacts')
  @UseGuards(CoreAdminAuthGuard)
  listAllContacts(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sreniId') sreniId?: string,
    @Query('sthanId') sthanId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listAllContacts(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 50,
      {
        sreniId: sreniId?.trim() || undefined,
        sthanId: sthanId?.trim() || undefined,
        search: search?.trim() || undefined,
      },
    );
  }

  @Post('org/contacts/upload')
  @UseGuards(CoreAdminAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadGlobalContacts(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor?: AuthPrincipal,
  ) {
    if (!file) throw new BadRequestException('No file uploaded. Send the Excel file as "file" in a multipart/form-data request.');
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ];
    if (!allowedMimes.includes(file.mimetype) && !file.originalname.match(/\.(xlsx|xls)$/i)) {
      throw new BadRequestException('Only .xlsx and .xls files are accepted.');
    }
    return this.service.uploadGlobalContacts(file.buffer, file.originalname, actor?.email ?? actor?.userId);
  }

  @Patch('org/sreni-definitions/:sreniId/contacts/:contactId')
  @UseGuards(CoreAdminAuthGuard)
  updateContactData(
    @Param('sreniId') sreniId: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateContactDataDto,
  ) {
    return this.service.updateContactData(sreniId, contactId, dto.data);
  }

  @Patch('org/sreni-definitions/:sreniId/contacts/:contactId/division')
  @UseGuards(CoreAdminAuthGuard)
  async assignContactDivision(
    @Param('sreniId') sreniId: string,
    @Param('contactId') contactId: string,
    @Body() dto: AssignContactDivisionDto,
  ) {
    return this.service.assignContactDivision(sreniId, contactId, dto);
  }

  @Patch('org/sreni-definitions/:sreniId/contacts/:contactId/sthan')
  @UseGuards(CoreAdminAuthGuard)
  async assignContactSthan(
    @Param('sreniId') sreniId: string,
    @Param('contactId') contactId: string,
    @Body() dto: AssignContactSthanDto,
  ) {
    return this.service.assignContactSthan(sreniId, contactId, dto);
  }

  @Patch('org/sreni-definitions/:sreniId/contacts/:contactId/active')
  @UseGuards(CoreAdminAuthGuard)
  toggleContactActive(
    @Param('sreniId') sreniId: string,
    @Param('contactId') contactId: string,
    @Body() dto: SetContactActiveDto,
  ) {
    return this.service.toggleContactActive(sreniId, contactId, dto.active);
  }

  @Delete('org/sreni-definitions/:sreniId/contacts/:contactId')
  @UseGuards(CoreAdminAuthGuard)
  deleteContact(
    @Param('sreniId') sreniId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.service.deleteContact(sreniId, contactId);
  }

  @Get('org/sreni-definitions/:sreniId/contacts/:contactId/members')
  @UseGuards(CoreAdminAuthGuard)
  listHouseholdMembers(
    @Param('sreniId') sreniId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.service.listHouseholdMembers(sreniId, contactId);
  }

  @Post('org/sreni-definitions/:sreniId/contacts/:contactId/members')
  @UseGuards(CoreAdminAuthGuard)
  createHouseholdMember(
    @Param('sreniId') sreniId: string,
    @Param('contactId') contactId: string,
    @Body() dto: CreateHouseholdMemberDto,
  ) {
    return this.service.createHouseholdMember(sreniId, contactId, dto);
  }

  @Patch('org/sreni-definitions/:sreniId/contacts/:contactId/members/:memberId')
  @UseGuards(CoreAdminAuthGuard)
  updateHouseholdMember(
    @Param('sreniId') sreniId: string,
    @Param('contactId') contactId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateHouseholdMemberDto,
  ) {
    return this.service.updateHouseholdMember(sreniId, contactId, memberId, dto);
  }

  @Delete('org/sreni-definitions/:sreniId/contacts/:contactId/members/:memberId')
  @UseGuards(CoreAdminAuthGuard)
  deleteHouseholdMember(
    @Param('sreniId') sreniId: string,
    @Param('contactId') contactId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.service.deleteHouseholdMember(sreniId, contactId, memberId);
  }

  @Get('org/sreni-definitions/:sreniId/participants/stats')
  @UseGuards(CoreAdminAuthGuard)
  getSreniParticipantStats(@Param('sreniId') sreniId: string) {
    return this.service.getSreniParticipantStats(sreniId);
  }

  @Get('org/sreni-definitions/:sreniId/participants')
  @UseGuards(CoreAdminAuthGuard)
  listSreniParticipants(
    @Param('sreniId') sreniId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listSreniParticipants(
      sreniId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 100,
    );
  }

  @Get('org/sreni-definitions/:sreniId/contacts/:contactId/participants')
  @UseGuards(CoreAdminAuthGuard)
  listContactParticipants(
    @Param('sreniId') sreniId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.service.listContactParticipants(sreniId, contactId);
  }

  @Get('org/contacts/:contactId/sreni-tags')
  @UseGuards(CoreAdminAuthGuard)
  listContactSreniTags(@Param('contactId') contactId: string) {
    return this.service.listContactSreniTags(contactId);
  }

  @Put('org/contacts/:contactId/sreni-tags')
  @UseGuards(CoreAdminAuthGuard)
  setContactSreniTags(
    @Param('contactId') contactId: string,
    @Body() dto: SetContactSreniTagsDto,
  ) {
    return this.service.setContactSreniTags(contactId, dto);
  }

  // ── Sreni Divisions ────────────────────────────────────────────────────────

  @Get('org/sreni-definitions/:sreniId/divisions')
  @UseGuards(CoreAdminAuthGuard)
  listSreniDivisions(@Param('sreniId') sreniId: string) {
    return this.service.listSreniDivisions(sreniId);
  }

  @Post('org/sreni-definitions/:sreniId/divisions')
  @UseGuards(CoreAdminAuthGuard)
  createSreniDivision(@Param('sreniId') sreniId: string, @Body() dto: CreateSreniDivisionDto) {
    return this.service.createSreniDivision(sreniId, dto);
  }

  @Patch('org/sreni-definitions/:sreniId/divisions/:divisionId')
  @UseGuards(CoreAdminAuthGuard)
  updateSreniDivision(
    @Param('sreniId') sreniId: string,
    @Param('divisionId') divisionId: string,
    @Body() dto: UpdateSreniDivisionDto,
  ) {
    return this.service.updateSreniDivision(sreniId, divisionId, dto);
  }

  @Delete('org/sreni-definitions/:sreniId/divisions/:divisionId')
  @UseGuards(CoreAdminAuthGuard)
  async deleteSreniDivision(
    @Param('sreniId') sreniId: string,
    @Param('divisionId') divisionId: string,
  ) {
    await this.service.deleteSreniDivision(sreniId, divisionId);
    return { deleted: true };
  }

  // ── Report Metric Definitions (Settings) ───────────────────────────────────

  @Get('settings/report-metrics')
  @UseGuards(CoreAdminAuthGuard)
  listReportMetricDefinitions() {
    return this.service.listReportMetricDefinitions();
  }

  @Post('settings/report-metrics')
  @UseGuards(CoreAdminAuthGuard)
  createReportMetricDefinition(@Body() dto: CreateReportMetricDefinitionDto) {
    return this.service.createReportMetricDefinition(dto);
  }

  @Patch('settings/report-metrics/:metricId')
  @UseGuards(CoreAdminAuthGuard)
  updateReportMetricDefinition(@Param('metricId') metricId: string, @Body() dto: UpdateReportMetricDefinitionDto) {
    return this.service.updateReportMetricDefinition(metricId, dto);
  }

  @Delete('settings/report-metrics/:metricId')
  @UseGuards(CoreAdminAuthGuard)
  deleteReportMetricDefinition(@Param('metricId') metricId: string) {
    return this.service.deleteReportMetricDefinition(metricId);
  }

  // ── Location Report Metrics (shared across all sthans) ────────────────────

  @Get('settings/location-report-metrics')
  @UseGuards(CoreAdminAuthGuard)
  listLocationReportMetrics() {
    return this.service.listLocationReportMetrics();
  }

  @Post('settings/location-report-metrics')
  @UseGuards(CoreAdminAuthGuard)
  createLocationReportMetric(@Body() dto: CreateLocationReportMetricDto) {
    return this.service.createLocationReportMetric(dto);
  }

  @Patch('settings/location-report-metrics/:metricId')
  @UseGuards(CoreAdminAuthGuard)
  updateLocationReportMetric(@Param('metricId') metricId: string, @Body() dto: UpdateLocationReportMetricDto) {
    return this.service.updateLocationReportMetric(metricId, dto);
  }

  // ── Sreni Monthly Reports ───────────────────────────────────────────────────

  @Get('org/reports')
  @UseGuards(CoreAdminAuthGuard)
  listAllMonthlyReports(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    return this.service.listAllMonthlyReports(fromDate, toDate);
  }

  @Get('org/sreni-definitions/:sreniId/reports')
  @UseGuards(CoreAdminAuthGuard)
  listSreniMonthlyReports(@Param('sreniId') sreniId: string) {
    return this.service.listSreniMonthlyReports(sreniId);
  }

  @Post('org/sreni-definitions/:sreniId/reports')
  @UseGuards(CoreAdminAuthGuard)
  upsertSreniMonthlyReport(
    @Param('sreniId') sreniId: string,
    @Body() dto: SubmitSreniMonthlyReportDto,
    @CurrentUser() actor?: AuthPrincipal,
  ) {
    return this.service.upsertSreniMonthlyReport(sreniId, dto, actor?.email ?? actor?.userId);
  }

  // ── Sreni Report Parameters (config) ───────────────────────────────────────

  @Get('org/sreni-definitions/:sreniId/report-config/parameters')
  @UseGuards(CoreAdminAuthGuard)
  listSreniReportParameters(
    @Param('sreniId') sreniId: string,
    @Query('submissionType') submissionType?: string,
  ) {
    return this.service.listSreniReportParameters(sreniId, submissionType);
  }

  @Post('org/sreni-definitions/:sreniId/report-config/:submissionType/parameters')
  @UseGuards(CoreAdminAuthGuard)
  createSreniReportParameter(
    @Param('sreniId') sreniId: string,
    @Param('submissionType') submissionType: string,
    @Body() dto: CreateSreniReportParameterDto,
  ) {
    return this.service.createSreniReportParameter(sreniId, submissionType, dto);
  }

  @Patch('org/sreni-definitions/:sreniId/report-config/parameters/:parameterId')
  @UseGuards(CoreAdminAuthGuard)
  updateSreniReportParameter(
    @Param('parameterId') parameterId: string,
    @Body() dto: UpdateSreniReportParameterDto,
  ) {
    return this.service.updateSreniReportParameter(parameterId, dto);
  }

  @Delete('org/sreni-definitions/:sreniId/report-config/parameters/:parameterId')
  @UseGuards(CoreAdminAuthGuard)
  deleteSreniReportParameter(@Param('parameterId') parameterId: string) {
    return this.service.deleteSreniReportParameter(parameterId);
  }

  // ── Sreni Reports v2 (new generic) ─────────────────────────────────────────

  @Get('org/sreni-definitions/:sreniId/reports-v2')
  @UseGuards(CoreAdminAuthGuard)
  listSreniReports(
    @Param('sreniId') sreniId: string,
    @Query('submissionType') submissionType?: string,
  ) {
    return this.service.listSreniReports(sreniId, submissionType);
  }

  @Post('org/sreni-definitions/:sreniId/reports-v2')
  @UseGuards(CoreAdminAuthGuard)
  upsertSreniReport(
    @Param('sreniId') sreniId: string,
    @Body() dto: SubmitSreniReportDto,
    @CurrentUser() actor?: AuthPrincipal,
  ) {
    return this.service.upsertSreniReport(sreniId, dto, actor?.email ?? actor?.userId, actor);
  }

  // ── Sthan Reports ──────────────────────────────────────────────────────────

  @Get('org/locations/:locationId/sthan-reports')
  @UseGuards(CoreAdminAuthGuard)
  listSthanReports(@Param('locationId') locationId: string) {
    return this.service.listSthanReports(locationId);
  }

  @Post('org/locations/:locationId/sthan-reports')
  @UseGuards(CoreAdminAuthGuard)
  upsertSthanReport(
    @Param('locationId') locationId: string,
    @Body() dto: SubmitSthanReportDto,
    @CurrentUser() actor?: AuthPrincipal,
  ) {
    return this.service.upsertSthanReport(locationId, dto, actor?.email ?? actor?.userId);
  }

  // ── Sthan Expenses ────────────────────────────────────────────────────────

  @Get('org/locations/:locationId/expenses')
  @UseGuards(CoreAdminAuthGuard)
  listSthanExpenses(
    @Param('locationId') locationId: string,
    @Query('status') status?: string,
  ) {
    return this.service.listSthanExpenses(locationId, status);
  }

  @Post('org/locations/:locationId/expenses')
  @UseGuards(CoreAdminAuthGuard)
  createSthanExpense(
    @Param('locationId') locationId: string,
    @Body() dto: CreateSthanExpenseDto,
    @CurrentUser() actor?: AuthPrincipal,
  ) {
    return this.service.createSthanExpense(locationId, dto, actor?.email ?? actor?.userId);
  }

  @Patch('org/locations/:locationId/expenses/:expenseId/review')
  @UseGuards(CoreAdminAuthGuard)
  reviewSthanExpense(
    @Param('locationId') locationId: string,
    @Param('expenseId') expenseId: string,
    @Body() dto: ReviewSthanExpenseDto,
    @CurrentUser() actor?: AuthPrincipal,
  ) {
    return this.service.reviewSthanExpense(locationId, expenseId, dto, actor?.email ?? actor?.userId);
  }

  @Delete('org/locations/:locationId/expenses/:expenseId')
  @UseGuards(CoreAdminAuthGuard)
  deleteSthanExpense(
    @Param('locationId') locationId: string,
    @Param('expenseId') expenseId: string,
  ) {
    return this.service.deleteSthanExpense(locationId, expenseId);
  }

  // ── Sthan Contacts ────────────────────────────────────────────────────────

  @Get('org/locations/:locationId/contacts')
  @UseGuards(CoreAdminAuthGuard)
  listSthanContacts(
    @Param('locationId') locationId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listSthanContacts(
      locationId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 50,
    );
  }

  @Post('org/locations/:locationId/contacts/upload')
  @UseGuards(CoreAdminAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadSthanContacts(
    @Param('locationId') locationId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor?: AuthPrincipal,
  ) {
    if (!file) throw new BadRequestException('No file uploaded. Send the Excel file as "file" in a multipart/form-data request.');
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ];
    if (!allowedMimes.includes(file.mimetype) && !file.originalname.match(/\.(xlsx|xls)$/i)) {
      throw new BadRequestException('Only .xlsx and .xls files are accepted.');
    }
    return this.service.uploadSthanContacts(locationId, file.buffer, file.originalname, actor?.email ?? actor?.userId);
  }

  @Delete('org/locations/:locationId/contacts')
  @UseGuards(CoreAdminAuthGuard)
  clearSthanContacts(@Param('locationId') locationId: string) {
    return this.service.clearSthanContacts(locationId);
  }

  @Patch('org/locations/:locationId/contacts/:contactId')
  @UseGuards(CoreAdminAuthGuard)
  updateSthanContact(
    @Param('locationId') locationId: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateContactDataDto,
  ) {
    return this.service.updateSthanContact(locationId, contactId, dto.data);
  }

  // ── Sthan Calendar ────────────────────────────────────────────────────────

  @Get('org/locations/:locationId/calendar-events')
  @UseGuards(CoreAdminAuthGuard)
  listSthanCalendarEvents(@Param('locationId') locationId: string) {
    return this.service.listSthanCalendarEvents(locationId);
  }

  @Post('org/locations/:locationId/calendar-events')
  @UseGuards(CoreAdminAuthGuard)
  createSthanCalendarEvent(
    @Param('locationId') locationId: string,
    @Body() dto: CreateSthanCalendarEventDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.service.createSthanCalendarEvent(locationId, dto, actor);
  }

  @Patch('org/locations/:locationId/calendar-events/:eventId')
  @UseGuards(CoreAdminAuthGuard)
  updateSthanCalendarEvent(
    @Param('locationId') locationId: string,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateSthanCalendarEventDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.service.updateSthanCalendarEvent(locationId, eventId, dto, actor);
  }

  @Delete('org/locations/:locationId/calendar-events/:eventId')
  @UseGuards(CoreAdminAuthGuard)
  deleteSthanCalendarEvent(
    @Param('locationId') locationId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.service.deleteSthanCalendarEvent(locationId, eventId, actor);
  }
}


