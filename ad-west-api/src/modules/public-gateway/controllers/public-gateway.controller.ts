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
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { memoryStorage } from 'multer';
import { CurrentUser } from '@modules/user-management/decorators/current-user.decorator';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import { CryptoService } from '@modules/user-management/services/crypto.service';
import {
  ApplicationStatus,
  JobType,
  PublicSreniOption,
  PublicGatewayService,
  TicketCategory,
  TicketStatus,
} from '../public-gateway.service';
import { GatewayAdminAuthGuard } from '../guards/gateway-admin-auth.guard';

const MAX_RESUME_SIZE_BYTES = 1024 * 1024;

@Controller('public/sreni-contacts')
export class PublicSreniContactsController {
  constructor(
    private readonly service: PublicGatewayService,
    private readonly cryptoService: CryptoService,
  ) {}

  @Get('srenies')
  async listSrenies(): Promise<{ items: PublicSreniOption[] }> {
    return { items: await this.service.listPublicSreniOptions() };
  }

  @Post('register')
  @Throttle({ default: { limit: 6, ttl: 60000 } })
  async register(
    @Body()
    body: {
      sreniId: string;
      fullName: string;
      phone: string;
      email?: string;
      city?: string;
      country?: string;
      notes?: string;
      personalNumber?: string;
      familyOrBachelor?: string;
      family?: string;
      bachelor?: string;
      addressInUae?: string;
      company?: string;
      profession?: string;
      wifeName?: string;
      landLine?: string;
      zoneOrLandMark?: string;
      district?: string;
      captchaToken: string;
      captchaAnswer: string;
      website?: string;
    },
  ) {
    if (body.website && body.website.trim().length > 0) {
      throw new BadRequestException('Suspicious submission blocked.');
    }
    if (!this.cryptoService.verifyCaptcha(body.captchaToken, body.captchaAnswer)) {
      throw new BadRequestException('Captcha validation failed.');
    }
    if (!body.sreniId?.trim()) throw new BadRequestException('Sreni is required.');
    if (!body.fullName?.trim()) throw new BadRequestException('Full name is required.');
    if (!body.phone?.trim()) throw new BadRequestException('Phone number is required.');

    return this.service.submitPublicSreniContact({
      sreniId: body.sreniId,
      fullName: body.fullName,
      phone: body.phone,
      email: body.email,
      city: body.city,
      country: body.country,
      notes: body.notes,
      personalNumber: body.personalNumber,
      familyOrBachelor: body.familyOrBachelor,
      family: body.family,
      bachelor: body.bachelor,
      addressInUae: body.addressInUae,
      company: body.company,
      profession: body.profession,
      wifeName: body.wifeName,
      landLine: body.landLine,
      zoneOrLandMark: body.zoneOrLandMark,
      district: body.district,
      submittedFrom: 'public_join_us_page',
    });
  }
}

// ─── Public — Helpdesk ───────────────────────────────────────────────────────

@Controller('public/helpdesk')
export class PublicHelpdeskController {
  constructor(private readonly service: PublicGatewayService) {}

  @Post('tickets')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
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
  async listTickets(
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return { items: await this.service.listTickets(status, fromDate, toDate) };
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
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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
  @Throttle({ default: { limit: 8, ttl: 60000 } })
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
  async listAllJobs(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    return { items: await this.service.listAllJobPostings(fromDate, toDate) };
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
  async listAllApplications(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    return { items: await this.service.listAllApplications(fromDate, toDate) };
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
