import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '@modules/user-management/decorators/current-user.decorator';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import { GatewayAdminAuthGuard } from '@modules/public-gateway/guards/gateway-admin-auth.guard';
import {
  FormFieldType,
  MemberServicesService,
  NotificationTarget,
  ReimbursementCategory,
  ReimbursementStatus,
} from './member-services.service';

// ─── Admin — Reimbursements ────────────────────────────────────────────────────

@Controller('member-services/reimbursements')
@UseGuards(GatewayAdminAuthGuard)
export class ReimbursementController {
  constructor(private readonly svc: MemberServicesService) {}

  @Get()
  async list(
    @Query('submittedBy') submittedBy?: string,
    @Query('status') status?: string,
  ) {
    const filterBy = submittedBy ?? undefined;
    return { items: await this.svc.listReimbursements(filterBy, status) };
  }

  @Get('my')
  async listMine(@CurrentUser() user: AuthPrincipal) {
    return { items: await this.svc.listReimbursements(user.userId) };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const r = await this.svc.getReimbursement(id);
    if (!r) throw new NotFoundException('Reimbursement not found');
    return r;
  }

  @Post()
  @UseInterceptors(FileInterceptor('receipt', { storage: memoryStorage(), limits: { fileSize: 512 * 1024 } }))
  async create(
    @Body() body: {
      category: ReimbursementCategory;
      description: string;
      amount: string;
      currency?: string;
      asDraft?: string;
    },
    @UploadedFile() receipt: Express.Multer.File | undefined,
    @CurrentUser() user: AuthPrincipal,
  ) {
    if (!body.description?.trim()) throw new BadRequestException('Description is required');
    if (!receipt) throw new BadRequestException('A receipt or proof of payment file is required');
    const amount = parseFloat(body.amount);
    if (!amount || amount <= 0) throw new BadRequestException('Amount must be greater than 0');
    return this.svc.createReimbursement({
      submittedBy: user.userId,
      category: (body.category ?? 'other') as ReimbursementCategory,
      description: body.description,
      amount,
      currency: body.currency,
      asDraft: body.asDraft === 'true',
      receiptFile: receipt,
    });
  }

  @Patch(':id/submit')
  async submit(@Param('id') id: string, @CurrentUser() user: AuthPrincipal) {
    const r = await this.svc.submitReimbursement(id, user.userId);
    if (!r) throw new NotFoundException('Reimbursement not found or cannot be submitted');
    return r;
  }

  @Patch(':id/review')
  async review(
    @Param('id') id: string,
    @Body() body: { status: ReimbursementStatus; reviewerNotes?: string },
    @CurrentUser() user: AuthPrincipal,
  ) {
    if (!['pending_review', 'approved', 'rejected'].includes(body.status)) {
      throw new BadRequestException('Invalid status for review');
    }
    const r = await this.svc.updateReimbursementStatus(id, {
      status: body.status,
      reviewerNotes: body.reviewerNotes,
      reviewedBy: user.userId,
    });
    if (!r) throw new NotFoundException('Reimbursement not found');
    return r;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.svc.deleteReimbursement(id);
    if (!deleted) throw new NotFoundException('Reimbursement not found');
    return { success: true };
  }
}

// ─── Admin — Special Events ────────────────────────────────────────────────────

@Controller('member-services/events')
@UseGuards(GatewayAdminAuthGuard)
export class SpecialEventsAdminController {
  constructor(private readonly svc: MemberServicesService) {}

  @Get()
  async list(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    return { items: await this.svc.listEvents(fromDate, toDate) };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const event = await this.svc.getEvent(id);
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  @Post()
  async create(
    @Body() body: {
      title: string;
      description?: string;
      dateTime: string;
      endDateTime?: string;
      venue?: string;
      isPublic?: boolean;
      registrationEnabled?: boolean;
      sreniIds?: string[];
      formFields?: Array<{
        fieldType: FormFieldType;
        label: string;
        placeholder?: string;
        options?: string[];
        isRequired?: boolean;
        sortOrder?: number;
      }>;
    },
    @CurrentUser() user: AuthPrincipal,
  ) {
    if (!body.title?.trim()) throw new BadRequestException('Title is required');
    if (!body.dateTime) throw new BadRequestException('Date and time are required');
    return this.svc.createEvent({ ...body, createdBy: user.userId });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
      title?: string;
      description?: string;
      dateTime?: string;
      endDateTime?: string;
      venue?: string;
      isPublic?: boolean;
      registrationEnabled?: boolean;
      sreniIds?: string[];
      formFields?: Array<{
        fieldType: FormFieldType;
        label: string;
        placeholder?: string;
        options?: string[];
        isRequired?: boolean;
        sortOrder?: number;
      }>;
    },
  ) {
    const updated = await this.svc.updateEvent(id, body);
    if (!updated) throw new NotFoundException('Event not found');
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.svc.deleteEvent(id);
    if (!deleted) throw new NotFoundException('Event not found');
    return { success: true };
  }

  @Get(':id/registrations')
  async listRegistrations(@Param('id') id: string) {
    return { items: await this.svc.listEventRegistrations(id) };
  }
}

// ─── Admin — Notifications ─────────────────────────────────────────────────────

@Controller('member-services/notifications')
@UseGuards(GatewayAdminAuthGuard)
export class NotificationsAdminController {
  constructor(private readonly svc: MemberServicesService) {}

  @Get()
  async list(@Query('activeOnly') activeOnly?: string) {
    return { items: await this.svc.listNotifications(activeOnly === 'true') };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const n = await this.svc.getNotification(id);
    if (!n) throw new NotFoundException('Notification not found');
    return n;
  }

  @Post()
  async create(
    @Body() body: {
      title: string;
      message: string;
      validFrom?: string;
      validTo: string;
      target?: NotificationTarget;
    },
    @CurrentUser() user: AuthPrincipal,
  ) {
    if (!body.title?.trim()) throw new BadRequestException('Title is required');
    if (!body.message?.trim()) throw new BadRequestException('Message is required');
    if (!body.validTo) throw new BadRequestException('Valid-to date is required');
    return this.svc.createNotification({ ...body, createdBy: user.userId });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
      title?: string;
      message?: string;
      validFrom?: string;
      validTo?: string;
      target?: NotificationTarget;
      isActive?: boolean;
    },
  ) {
    const updated = await this.svc.updateNotification(id, body);
    if (!updated) throw new NotFoundException('Notification not found');
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.svc.deleteNotification(id);
    if (!deleted) throw new NotFoundException('Notification not found');
    return { success: true };
  }
}

// ─── Public — Event Registration ───────────────────────────────────────────────

@Controller('public/events')
export class PublicEventsController {
  constructor(private readonly svc: MemberServicesService) {}

  @Get(':id/registration-info')
  async getRegistrationInfo(@Param('id') id: string) {
    const event = await this.svc.getPublicEventForRegistration(id);
    if (!event) throw new NotFoundException('Event not found or registration is not open');
    return event;
  }

  @Post(':id/register')
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  async register(
    @Param('id') id: string,
    @Body() body: { formData: Record<string, unknown> },
  ) {
    if (!body.formData || typeof body.formData !== 'object') {
      throw new BadRequestException('Form data is required');
    }
    const reg = await this.svc.submitEventRegistration(id, body.formData);
    if (!reg) throw new NotFoundException('Event not found or registration is closed');
    return reg;
  }

  @Get('sreni/:sreniId')
  async getEventsForSreni(@Param('sreniId') sreniId: string) {
    return { items: await this.svc.listEventsForSreni(sreniId) };
  }
}
