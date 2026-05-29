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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { memoryStorage } from 'multer';
import { CurrentUser } from '@modules/user-management/decorators/current-user.decorator';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import {
  ApplicationStatus,
  JobType,
  PublicGatewayService,
  TicketCategory,
  TicketStatus,
} from '../public-gateway.service';
import { GatewayAdminAuthGuard } from '../guards/gateway-admin-auth.guard';

const MAX_RESUME_SIZE_BYTES = 1024 * 1024;

// ─── Public — Helpdesk ───────────────────────────────────────────────────────

@Controller('public/helpdesk')
export class PublicHelpdeskController {
  constructor(private readonly service: PublicGatewayService) {}

  @Post('tickets')
  async submitTicket(
    @Body()
    body: {
      name: string;
      phone: string;
      email?: string;
      category?: TicketCategory;
      subject: string;
      description: string;
    },
  ) {
    if (!body.name?.trim()) throw new BadRequestException('Name is required');
    if (!body.phone?.trim()) throw new BadRequestException('Phone number is required');
    if (!body.subject?.trim()) throw new BadRequestException('Subject is required');
    if (!body.description?.trim()) throw new BadRequestException('Description is required');
    return this.service.submitTicket(body);
  }
}

// ─── Admin — Helpdesk ────────────────────────────────────────────────────────

@Controller('gateway/helpdesk')
@UseGuards(GatewayAdminAuthGuard)
export class AdminHelpdeskController {
  constructor(private readonly service: PublicGatewayService) {}

  @Get('tickets')
  async listTickets(@Query('status') status?: string) {
    return { items: await this.service.listTickets(status) };
  }

  @Get('tickets/:id')
  async getTicket(@Param('id') id: string) {
    const ticket = await this.service.getTicket(id);
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  @Patch('tickets/:id')
  async updateTicket(
    @Param('id') id: string,
    @Body() body: { status?: TicketStatus; assignedTo?: string; notes?: string },
  ) {
    const updated = await this.service.updateTicket(id, body);
    if (!updated) throw new NotFoundException('Ticket not found');
    return updated;
  }
}

// ─── Public — Jobs ───────────────────────────────────────────────────────────

@Controller('public/jobs')
export class PublicJobsController {
  constructor(private readonly service: PublicGatewayService) {}

  @Get()
  async listActiveJobs() {
    return { items: await this.service.listActiveJobPostings() };
  }

  @Post()
  async submitPublicJob(
    @Body()
    body: {
      contactName: string;
      contactPhone: string;
      contactEmail?: string;
      title: string;
      description: string;
      requirements?: string;
      location?: string;
      type?: string;
    },
  ) {
    if (!body.contactName?.trim()) throw new BadRequestException('Your name is required');
    if (!body.contactPhone?.trim()) throw new BadRequestException('Your phone number is required');
    if (!body.title?.trim()) throw new BadRequestException('Job title is required');
    if (!body.description?.trim()) throw new BadRequestException('Job description is required');
    return this.service.submitPublicJobPosting({
      contactName: body.contactName,
      contactPhone: body.contactPhone,
      contactEmail: body.contactEmail,
      title: body.title,
      description: body.description,
      requirements: body.requirements,
      location: body.location,
      type: body.type as any,
    });
  }

  @Post(':jobId/apply')
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_RESUME_SIZE_BYTES },
    }),
  )
  async applyForJob(
    @Param('jobId') jobId: string,
    @Body() body: { name: string; phone: string; email?: string; coverLetter?: string },
    @UploadedFile() resume: Express.Multer.File | undefined,
  ) {
    if (!body.name?.trim()) throw new BadRequestException('Name is required');
    if (!body.phone?.trim()) throw new BadRequestException('Phone number is required');
    if (resume && resume.size > MAX_RESUME_SIZE_BYTES) {
      throw new BadRequestException('Resume file must not exceed 1 MB');
    }
    const application = await this.service.submitApplication(jobId, body, resume);
    if (!application) throw new NotFoundException('Job posting not found or no longer accepting applications');
    return application;
  }
}

// ─── Admin — Jobs ─────────────────────────────────────────────────────────────

@Controller('gateway/jobs')
@UseGuards(GatewayAdminAuthGuard)
export class AdminJobsController {
  constructor(private readonly service: PublicGatewayService) {}

  @Get()
  async listAllJobs() {
    return { items: await this.service.listAllJobPostings() };
  }

  @Post()
  async createJob(
    @Body()
    body: {
      title: string;
      description: string;
      requirements?: string;
      location?: string;
      type?: JobType;
      expiresAt?: string;
    },
    @CurrentUser() user: AuthPrincipal,
  ) {
    if (!body.title?.trim()) throw new BadRequestException('Title is required');
    if (!body.description?.trim()) throw new BadRequestException('Description is required');
    return this.service.createJobPosting(body, user.userId);
  }

  @Patch(':id')
  async updateJob(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      requirements?: string;
      location?: string;
      type?: JobType;
      isActive?: boolean;
      expiresAt?: string;
    },
  ) {
    const updated = await this.service.updateJobPosting(id, body);
    if (!updated) throw new NotFoundException('Job posting not found');
    return updated;
  }

  @Delete(':id')
  async deleteJob(@Param('id') id: string) {
    const deleted = await this.service.deleteJobPosting(id);
    if (!deleted) throw new NotFoundException('Job posting not found');
    return { success: true };
  }

  @Get('applications')
  async listAllApplications() {
    return { items: await this.service.listAllApplications() };
  }

  @Get('applications/:id/resume')
  async downloadApplicationResume(@Param('id') id: string, @Res() res: Response) {
    const file = await this.service.getApplicationResumeDownload(id);
    if (!file) {
      throw new NotFoundException('Resume file not found');
    }

    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`);
    res.setHeader('Content-Type', file.mimeType);
    createReadStream(file.filePath).pipe(res as unknown as NodeJS.WritableStream);
  }

  @Get(':jobId/applications')
  async listApplicationsForJob(@Param('jobId') jobId: string) {
    return { items: await this.service.listApplicationsForJob(jobId) };
  }

  @Patch('applications/:id')
  async updateApplication(
    @Param('id') id: string,
    @Body() body: { status?: ApplicationStatus; notes?: string },
    @CurrentUser() user: AuthPrincipal,
  ) {
    const updated = await this.service.updateApplication(id, body, user.userId);
    if (!updated) throw new NotFoundException('Application not found');
    return updated;
  }
}
