import { BadRequestException, ConflictException, Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { EnumConfigService } from '@modules/enum-values/services/enum-config.service';
import { ENUM_TYPES } from '@modules/enum-values/enum-types.constants';
import { DataSource } from 'typeorm';
import { randomBytes, randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import JSZip from 'jszip';
import { extname, join } from 'path';
import { In, Repository } from 'typeorm';
import { HelpdeskTicketEntity } from './entities/helpdesk-ticket.entity';
import { JobApplicationActivityEntity } from './entities/job-application-activity.entity';
import { JobApplicationEntity } from './entities/job-application.entity';
import { JobPostingEntity } from './entities/job-posting.entity';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketCategory = 'general' | 'technical' | 'financial' | 'membership' | 'other';
export type JobType = 'full_time' | 'part_time' | 'volunteer' | 'contract';
export type ApplicationStatus = 'new' | 'under_review' | 'shortlisted' | 'rejected' | 'accepted';

export interface HelpdeskTicket {
  id: string;
  name: string;
  phone: string;
  email?: string;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobPosting {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  location?: string;
  type: JobType;
  isActive: boolean;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  name: string;
  phone: string;
  email?: string;
  resumeUrl?: string;
  resumeFileName?: string;
  resumeMimeType?: string;
  resumeSizeBytes?: number;
  coverLetter?: string;
  status: ApplicationStatus;
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type JobApplicationActivityAction = 'submitted' | 'status_changed' | 'note_updated' | 'follow_up';

export interface JobApplicationActivity {
  id: string;
  applicationId: string;
  action: JobApplicationActivityAction;
  fromStatus?: string;
  toStatus?: string;
  comment?: string;
  actorId?: string;
  actorLabel?: string;
  createdAt: string;
}

export interface PublicSreniOption {
  id: string;
  name: string;
  code?: string;
}

export interface PublicSreniContactSubmissionResult {
  id: string;
  sreniId: string;
  rowIndex: number;
  createdAt: string;
}

interface ResumeUploadMetadata {
  url: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

interface ResumeDownloadDescriptor {
  filePath: string;
  fileName: string;
  mimeType: string;
}

const MAX_RESUME_SIZE_BYTES = 1024 * 1024;
const ALLOWED_RESUME_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);
const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PERMISSIVE_REGEX = /^\+?[\d\s()\-]{7,20}$/;

@Injectable()
export class PublicGatewayService {
  private readonly tickets = new Map<string, HelpdeskTicket>();
  private readonly jobPostings = new Map<string, JobPosting>();
  private readonly jobApplications = new Map<string, JobApplication>();
  private readonly jobApplicationActivities = new Map<string, JobApplicationActivity[]>();
  private readonly memoryResumeStorage = new Map<string, ResumeDownloadDescriptor>();
  private readonly enumConfig: EnumConfigService;

  constructor(
    @Optional() @InjectRepository(HelpdeskTicketEntity)
    private readonly ticketRepo?: Repository<HelpdeskTicketEntity>,
    @Optional() @InjectRepository(JobPostingEntity)
    private readonly jobPostingRepo?: Repository<JobPostingEntity>,
    @Optional() @InjectRepository(JobApplicationEntity)
    private readonly jobApplicationRepo?: Repository<JobApplicationEntity>,
    @Optional() @InjectRepository(JobApplicationActivityEntity)
    private readonly jobApplicationActivityRepo?: Repository<JobApplicationActivityEntity>,
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
  ) {
    this.enumConfig = new EnumConfigService(this.useDb() ? 'db' : 'in-memory', this.dataSource);
  }

  private useDb(): boolean {
    return !!this.ticketRepo && !!this.jobPostingRepo && !!this.jobApplicationRepo;
  }

  private canPersistActivities(): boolean {
    return this.useDb() && !!this.jobApplicationActivityRepo;
  }

  private toJobApplicationActivity(entity: JobApplicationActivityEntity): JobApplicationActivity {
    return {
      id: entity.id,
      applicationId: entity.applicationId,
      action: entity.action as JobApplicationActivityAction,
      fromStatus: entity.fromStatus ?? undefined,
      toStatus: entity.toStatus ?? undefined,
      comment: entity.comment ?? undefined,
      actorId: entity.actorId ?? undefined,
      actorLabel: entity.actorLabel ?? undefined,
      createdAt: entity.createdAt.toISOString(),
    };
  }

  private async recordApplicationActivity(
    applicationId: string,
    payload: {
      action: JobApplicationActivityAction;
      fromStatus?: string;
      toStatus?: string;
      comment?: string;
      actorId?: string;
      actorLabel?: string;
      createdAt?: Date;
    },
  ): Promise<JobApplicationActivity> {
    await this.enumConfig.validate(ENUM_TYPES.JOB_APPLICATION_ACTIVITY, payload.action, 'Activity action');

    const now = payload.createdAt ?? new Date();
    const activity: JobApplicationActivity = {
      id: randomUUID(),
      applicationId,
      action: payload.action,
      fromStatus: payload.fromStatus,
      toStatus: payload.toStatus,
      comment: payload.comment?.trim() || undefined,
      actorId: payload.actorId,
      actorLabel: payload.actorLabel,
      createdAt: now.toISOString(),
    };

    if (this.canPersistActivities()) {
      const entity = this.jobApplicationActivityRepo!.create({
        id: activity.id,
        applicationId,
        action: payload.action,
        fromStatus: payload.fromStatus ?? null,
        toStatus: payload.toStatus ?? null,
        comment: payload.comment?.trim() || null,
        actorId: payload.actorId ?? null,
        actorLabel: payload.actorLabel ?? null,
        createdAt: now,
      });
      return this.toJobApplicationActivity(await this.jobApplicationActivityRepo!.save(entity));
    }

    const bucket = this.jobApplicationActivities.get(applicationId) ?? [];
    bucket.push(activity);
    this.jobApplicationActivities.set(applicationId, bucket);
    return activity;
  }

  async listApplicationActivities(applicationId: string): Promise<JobApplicationActivity[]> {
    if (this.canPersistActivities()) {
      const application = await this.jobApplicationRepo!.findOne({ where: { id: applicationId } });
      if (!application) return [];
      const rows = await this.jobApplicationActivityRepo!.find({
        where: { applicationId },
        order: { createdAt: 'ASC' },
      });
      return rows.map((row) => this.toJobApplicationActivity(row));
    }

    if (this.useDb()) {
      const application = await this.jobApplicationRepo!.findOne({ where: { id: applicationId } });
      if (!application) return [];
    } else if (!this.jobApplications.has(applicationId)) {
      return [];
    }

    return (this.jobApplicationActivities.get(applicationId) ?? [])
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  private newId(): string {
    return randomBytes(12).toString('hex');
  }

  private getResumeUrl(applicationId: string): string {
    return `/api/v1/gateway/jobs/applications/${applicationId}/resume`;
  }

  private parseDateRange(fromDate?: string, toDate?: string): { from?: Date; to?: Date } {
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    if (fromDate && Number.isNaN(from?.getTime())) {
      throw new BadRequestException('fromDate must be a valid date string');
    }

    if (toDate && Number.isNaN(to?.getTime())) {
      throw new BadRequestException('toDate must be a valid date string');
    }

    if (from && to && from.getTime() > to.getTime()) {
      throw new BadRequestException('fromDate must be before or equal to toDate');
    }

    return { from, to };
  }

  private normalizePhoneForMatch(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  async listPublicSreniOptions(): Promise<PublicSreniOption[]> {
    if (!this.useDb()) {
      return [];
    }

    const rows = await this.ticketRepo!.manager.query(
      `SELECT id::text AS id, name, code
       FROM adwest.srenies
       WHERE active = true
         AND join_us_visible = true
       ORDER BY name ASC`,
    ) as Array<{ id: string; name: string; code: string | null }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code ?? undefined,
    }));
  }

  async submitPublicSreniContact(data: {
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
    submittedFrom?: string;
  }): Promise<PublicSreniContactSubmissionResult> {
    if (!this.useDb()) {
      throw new ServiceUnavailableException('Public contact registration is available only when DB persistence is enabled.');
    }

    const trimmedName = data.fullName.trim();
    const trimmedPhone = data.phone.trim();
    const trimmedEmail = data.email?.trim() || null;
    const normalizedPhone = this.normalizePhoneForMatch(trimmedPhone);

    if (!PHONE_PERMISSIVE_REGEX.test(trimmedPhone) || normalizedPhone.length < 7 || normalizedPhone.length > 15) {
      throw new BadRequestException('Phone number format is invalid. Please use a valid phone number with country code if available.');
    }

    if (trimmedEmail && !EMAIL_FORMAT_REGEX.test(trimmedEmail)) {
      throw new BadRequestException('Email address format is invalid.');
    }

    const sreniRows = await this.ticketRepo!.manager.query(
      `SELECT id::text AS id
       FROM adwest.srenies
       WHERE id::text = $1 AND active = true
       LIMIT 1`,
      [data.sreniId],
    ) as Array<{ id: string }>;

    if (!sreniRows.length) {
      throw new BadRequestException('Selected sreni is not available.');
    }

    const duplicateRows = await this.ticketRepo!.manager.query(
      `SELECT id::text AS id
       FROM adwest.sreni_contacts
       WHERE sreni_id = $1
         AND (
           regexp_replace(COALESCE(data->>'phone', ''), '[^0-9]', '', 'g') = $2
           OR ($3::text IS NOT NULL AND lower(COALESCE(data->>'email', '')) = lower($3::text))
         )
       LIMIT 1`,
      [data.sreniId, normalizedPhone, trimmedEmail],
    ) as Array<{ id: string }>;

    if (duplicateRows.length > 0) {
      throw new ConflictException('A contact with the same phone or email already exists for this sreni.');
    }

    const contactPayload = {
      full_name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
      city: data.city?.trim() || null,
      country: data.country?.trim() || null,
      notes: data.notes?.trim() || null,
      personal_number: data.personalNumber?.trim() || null,
      family_or_bachelor: data.familyOrBachelor?.trim() || null,
      family: data.family?.trim() || null,
      bachelor: data.bachelor?.trim() || null,
      address_in_uae: data.addressInUae?.trim() || null,
      company: data.company?.trim() || null,
      profession: data.profession?.trim() || null,
      wife_name: data.wifeName?.trim() || null,
      land_line: data.landLine?.trim() || null,
      zone_or_land_mark: data.zoneOrLandMark?.trim() || null,
      district: data.district?.trim() || null,
      template_fields: {
        Name: trimmedName,
        'Personal Number': data.personalNumber?.trim() || null,
        'Family / Bachelor': data.familyOrBachelor?.trim() || null,
        Family: data.family?.trim() || null,
        Bachelor: data.bachelor?.trim() || null,
        'Address in UAE': data.addressInUae?.trim() || null,
        Company: data.company?.trim() || null,
        Profession: data.profession?.trim() || null,
        WifeName: data.wifeName?.trim() || null,
        'Land Line': data.landLine?.trim() || null,
        'Zone / Land mark': data.zoneOrLandMark?.trim() || null,
        District: data.district?.trim() || null,
      },
      source: 'public_join_form',
      submitted_from: data.submittedFrom ?? null,
      submitted_at: new Date().toISOString(),
    };

    const result = await this.ticketRepo!.manager.query(
      `WITH next_row AS (
         SELECT COALESCE(MAX(row_index), 0) + 1 AS row_index
         FROM adwest.sreni_contacts
         WHERE sreni_id = $1
       )
       INSERT INTO adwest.sreni_contacts (sreni_id, row_index, data, source_file, uploaded_by)
       SELECT $1, next_row.row_index, $2::jsonb, 'public-join-us-form', 'public'
       FROM next_row
       RETURNING id::text AS id, sreni_id::text AS sreni_id, row_index, created_at`,
      [data.sreniId, JSON.stringify(contactPayload)],
    ) as Array<{ id: string; sreni_id: string; row_index: number; created_at: string | Date }>;

    const row = result[0];
    return {
      id: row.id,
      sreniId: row.sreni_id,
      rowIndex: row.row_index,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  private toHelpdeskTicket(entity: HelpdeskTicketEntity): HelpdeskTicket {
    return {
      id: entity.id,
      name: entity.name,
      phone: entity.phone,
      email: entity.email ?? undefined,
      category: entity.category as TicketCategory,
      subject: entity.subject,
      description: entity.description,
      status: entity.status as TicketStatus,
      assignedTo: entity.assignedTo ?? undefined,
      notes: entity.notes ?? undefined,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private toJobPosting(entity: JobPostingEntity): JobPosting {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      requirements: entity.requirements ?? undefined,
      location: entity.location ?? undefined,
      type: entity.type as JobType,
      isActive: entity.isActive,
      expiresAt: entity.expiresAt?.toISOString(),
      createdBy: entity.createdBy ?? '',
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private toJobApplication(entity: JobApplicationEntity, jobTitle: string): JobApplication {
    return {
      id: entity.id,
      jobId: entity.jobId,
      jobTitle,
      name: entity.name,
      phone: entity.phone,
      email: entity.email ?? undefined,
      resumeUrl: entity.resumeUrl ?? undefined,
      resumeFileName: entity.resumeOriginalName ?? undefined,
      resumeMimeType: entity.resumeMimeType ?? undefined,
      resumeSizeBytes: entity.resumeSizeBytes ?? undefined,
      coverLetter: entity.coverLetter ?? undefined,
      status: entity.status as ApplicationStatus,
      notes: entity.notes ?? undefined,
      reviewedBy: entity.reviewedBy ?? undefined,
      reviewedAt: entity.reviewedAt?.toISOString(),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private async detectResumeType(buffer: Buffer): Promise<{ ext: '.pdf' | '.doc' | '.docx'; mimeType: string }> {
    const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const docHeader = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

    if (buffer.subarray(0, pdfHeader.length).equals(pdfHeader)) {
      return { ext: '.pdf', mimeType: 'application/pdf' };
    }

    if (buffer.subarray(0, docHeader.length).equals(docHeader)) {
      return { ext: '.doc', mimeType: 'application/msword' };
    }

    if (buffer.subarray(0, zipHeader.length).equals(zipHeader)) {
      try {
        const zip = await JSZip.loadAsync(buffer);
        const contentTypesFile = zip.file('[Content_Types].xml');
        const documentFile = zip.file('word/document.xml');
        if (!contentTypesFile || !documentFile) {
          throw new Error('Missing DOCX structure');
        }

        const contentTypes = await contentTypesFile.async('text');
        if (!contentTypes.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml')) {
          throw new Error('Invalid DOCX main content type');
        }

        return {
          ext: '.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
      } catch {
        throw new BadRequestException('Resume file content is not a valid DOCX document');
      }
    }

    throw new BadRequestException('Resume must be a valid PDF, DOC, or DOCX file');
  }

  private async persistResumeFile(applicationId: string, file: Express.Multer.File): Promise<ResumeUploadMetadata> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Resume file is empty');
    }

    if (file.size > MAX_RESUME_SIZE_BYTES || file.buffer.length > MAX_RESUME_SIZE_BYTES) {
      throw new BadRequestException('Resume file must not exceed 1 MB');
    }

    const originalExt = extname(file.originalname ?? '').toLowerCase();
    if (!ALLOWED_RESUME_EXTENSIONS.has(originalExt)) {
      throw new BadRequestException('Resume must use .pdf, .doc, or .docx format');
    }

    const detected = await this.detectResumeType(file.buffer);
    if (detected.ext !== originalExt) {
      throw new BadRequestException('Resume file content does not match its extension');
    }

    const baseUploadDir = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');
    const resumeDir = join(baseUploadDir, 'public-gateway', 'resumes');
    await mkdir(resumeDir, { recursive: true });

    const storedName = `${applicationId}${detected.ext}`;
    const storagePath = join(resumeDir, storedName);
    await writeFile(storagePath, file.buffer);

    return {
      url: this.getResumeUrl(applicationId),
      storagePath,
      originalName: file.originalname,
      mimeType: detected.mimeType,
      sizeBytes: file.size,
    };
  }

  async submitTicket(data: {
    name: string;
    phone: string;
    email?: string;
    category?: TicketCategory;
    subject: string;
    description: string;
  }): Promise<HelpdeskTicket> {
    const category = data.category ?? 'general';
    await this.enumConfig.validate(ENUM_TYPES.HELPDESK_TICKET_CATEGORY, category, 'Category');
    await this.enumConfig.validate(ENUM_TYPES.HELPDESK_TICKET_STATUS, 'open', 'Status');
    const now = new Date();

    if (this.useDb()) {
      const entity = this.ticketRepo!.create({
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        category,
        subject: data.subject.trim(),
        description: data.description.trim(),
        status: 'open',
        createdAt: now,
        updatedAt: now,
      });
      return this.toHelpdeskTicket(await this.ticketRepo!.save(entity));
    }

    const timestamp = now.toISOString();
    const ticket: HelpdeskTicket = {
      id: this.newId(),
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || undefined,
      category,
      subject: data.subject.trim(),
      description: data.description.trim(),
      status: 'open',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.tickets.set(ticket.id, ticket);
    return ticket;
  }

  async listTickets(status?: string, fromDate?: string, toDate?: string): Promise<HelpdeskTicket[]> {
    const { from, to } = this.parseDateRange(fromDate, toDate);

    if (this.useDb()) {
      const qb = this.ticketRepo!.createQueryBuilder('ticket');
      if (status) qb.andWhere('ticket.status = :status', { status });
      if (from) qb.andWhere('ticket.created_at >= :from', { from });
      if (to) qb.andWhere('ticket.created_at <= :to', { to });

      const rows = await qb.orderBy('ticket.created_at', 'DESC').getMany();
      return rows.map((row) => this.toHelpdeskTicket(row));
    }

    const all = [...this.tickets.values()]
      .filter((ticket) => {
        if (status && ticket.status !== status) return false;
        const createdAtMs = Date.parse(ticket.createdAt);
        if (from && Number.isFinite(createdAtMs) && createdAtMs < from.getTime()) return false;
        if (to && Number.isFinite(createdAtMs) && createdAtMs > to.getTime()) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return all;
  }

  async getTicket(id: string): Promise<HelpdeskTicket | undefined> {
    if (this.useDb()) {
      const row = await this.ticketRepo!.findOne({ where: { id } });
      return row ? this.toHelpdeskTicket(row) : undefined;
    }
    return this.tickets.get(id);
  }

  async updateTicket(
    id: string,
    data: { status?: TicketStatus; assignedTo?: string; notes?: string },
  ): Promise<HelpdeskTicket | undefined> {
    if (data.status !== undefined) {
      await this.enumConfig.validate(ENUM_TYPES.HELPDESK_TICKET_STATUS, data.status, 'Status');
    }
    if (this.useDb()) {
      const ticket = await this.ticketRepo!.findOne({ where: { id } });
      if (!ticket) return undefined;

      ticket.status = data.status ?? ticket.status;
      ticket.assignedTo = data.assignedTo ?? ticket.assignedTo ?? null;
      ticket.notes = data.notes ?? ticket.notes ?? null;
      ticket.updatedAt = new Date();

      return this.toHelpdeskTicket(await this.ticketRepo!.save(ticket));
    }

    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;
    const updated: HelpdeskTicket = { ...ticket, ...data, updatedAt: new Date().toISOString() };
    this.tickets.set(id, updated);
    return updated;
  }

  async listActiveJobPostings(): Promise<JobPosting[]> {
    if (this.useDb()) {
      const rows = await this.jobPostingRepo!
        .createQueryBuilder('job')
        .where('job.is_active = true')
        .andWhere('(job.expires_at IS NULL OR job.expires_at > NOW())')
        .orderBy('job.created_at', 'DESC')
        .getMany();
      return rows.map((row) => this.toJobPosting(row));
    }

    const now = new Date().toISOString();
    return [...this.jobPostings.values()]
      .filter((job) => job.isActive && (!job.expiresAt || job.expiresAt > now))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listAllJobPostings(fromDate?: string, toDate?: string): Promise<JobPosting[]> {
    const { from, to } = this.parseDateRange(fromDate, toDate);

    if (this.useDb()) {
      const qb = this.jobPostingRepo!.createQueryBuilder('job');
      if (from) qb.andWhere('job.created_at >= :from', { from });
      if (to) qb.andWhere('job.created_at <= :to', { to });

      const rows = await qb.orderBy('job.created_at', 'DESC').getMany();
      return rows.map((row) => this.toJobPosting(row));
    }

    return [...this.jobPostings.values()]
      .filter((job) => {
        const createdAtMs = Date.parse(job.createdAt);
        if (from && Number.isFinite(createdAtMs) && createdAtMs < from.getTime()) return false;
        if (to && Number.isFinite(createdAtMs) && createdAtMs > to.getTime()) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getJobPosting(id: string): Promise<JobPosting | undefined> {
    if (this.useDb()) {
      const row = await this.jobPostingRepo!.findOne({ where: { id } });
      return row ? this.toJobPosting(row) : undefined;
    }
    return this.jobPostings.get(id);
  }

  async createJobPosting(
    data: {
      title: string;
      description: string;
      requirements?: string;
      location?: string;
      type?: JobType;
      expiresAt?: string;
    },
    createdBy: string,
  ): Promise<JobPosting> {
    const type = data.type ?? 'full_time';
    await this.enumConfig.validate(ENUM_TYPES.JOB_POSTING_TYPE, type, 'Job type');
    const now = new Date();

    if (this.useDb()) {
      const entity = this.jobPostingRepo!.create({
        title: data.title.trim(),
        description: data.description.trim(),
        requirements: data.requirements?.trim() || null,
        location: data.location?.trim() || null,
        type,
        isActive: true,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdBy,
        createdAt: now,
        updatedAt: now,
      });
      return this.toJobPosting(await this.jobPostingRepo!.save(entity));
    }

    const timestamp = now.toISOString();
    const posting: JobPosting = {
      id: this.newId(),
      title: data.title.trim(),
      description: data.description.trim(),
      requirements: data.requirements?.trim() || undefined,
      location: data.location?.trim() || undefined,
      type,
      isActive: true,
      expiresAt: data.expiresAt || undefined,
      createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.jobPostings.set(posting.id, posting);
    return posting;
  }

  async updateJobPosting(
    id: string,
    data: {
      title?: string;
      description?: string;
      requirements?: string;
      location?: string;
      type?: JobType;
      isActive?: boolean;
      expiresAt?: string;
    },
  ): Promise<JobPosting | undefined> {
    if (data.type !== undefined) {
      await this.enumConfig.validate(ENUM_TYPES.JOB_POSTING_TYPE, data.type, 'Job type');
    }
    if (this.useDb()) {
      const posting = await this.jobPostingRepo!.findOne({ where: { id } });
      if (!posting) return undefined;

      posting.title = data.title?.trim() ?? posting.title;
      posting.description = data.description?.trim() ?? posting.description;
      posting.requirements = data.requirements !== undefined ? (data.requirements?.trim() || null) : posting.requirements;
      posting.location = data.location !== undefined ? (data.location?.trim() || null) : posting.location;
      posting.type = data.type ?? posting.type;
      posting.isActive = data.isActive ?? posting.isActive;
      posting.expiresAt = data.expiresAt !== undefined ? (data.expiresAt ? new Date(data.expiresAt) : null) : posting.expiresAt;
      posting.updatedAt = new Date();

      return this.toJobPosting(await this.jobPostingRepo!.save(posting));
    }

    const posting = this.jobPostings.get(id);
    if (!posting) return undefined;
    const updated: JobPosting = { ...posting, ...data, updatedAt: new Date().toISOString() };
    this.jobPostings.set(id, updated);
    return updated;
  }

  async deleteJobPosting(id: string): Promise<boolean> {
    if (this.useDb()) {
      const result = await this.jobPostingRepo!.delete(id);
      return !!result.affected;
    }
    return this.jobPostings.delete(id);
  }

  async submitPublicJobPosting(data: {
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    title: string;
    description: string;
    requirements?: string;
    location?: string;
    type?: JobType;
  }): Promise<JobPosting> {
    const contactBlock = [
      `[Submitted by: ${data.contactName.trim()} | ${data.contactPhone.trim()}${data.contactEmail?.trim() ? ' | ' + data.contactEmail.trim() : ''}]`,
    ].join('');
    const fullDescription = `${contactBlock}\n\n${data.description.trim()}`;
    const now = new Date();

    if (this.useDb()) {
      const entity = this.jobPostingRepo!.create({
        title: data.title.trim(),
        description: fullDescription,
        requirements: data.requirements?.trim() || null,
        location: data.location?.trim() || null,
        type: data.type ?? 'full_time',
        isActive: false,
        createdBy: null,
        createdAt: now,
        updatedAt: now,
      });
      return this.toJobPosting(await this.jobPostingRepo!.save(entity));
    }

    const timestamp = now.toISOString();
    const posting: JobPosting = {
      id: this.newId(),
      title: data.title.trim(),
      description: fullDescription,
      requirements: data.requirements?.trim() || undefined,
      location: data.location?.trim() || undefined,
      type: data.type ?? 'full_time',
      isActive: false,
      createdBy: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.jobPostings.set(posting.id, posting);
    return posting;
  }

  async submitApplication(
    jobId: string,
    data: { name: string; phone: string; email?: string; coverLetter?: string },
    resumeFile?: Express.Multer.File,
  ): Promise<JobApplication | null> {
    if (this.useDb()) {
      const job = await this.jobPostingRepo!
        .createQueryBuilder('job')
        .where('job.id = :jobId', { jobId })
        .andWhere('job.is_active = true')
        .andWhere('(job.expires_at IS NULL OR job.expires_at > NOW())')
        .getOne();

      if (!job) return null;

      const now = new Date();
      const applicationId = randomUUID();
      const resume = resumeFile ? await this.persistResumeFile(applicationId, resumeFile) : undefined;
      const entity = this.jobApplicationRepo!.create({
        id: applicationId,
        jobId,
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        resumeUrl: resume?.url ?? null,
        resumeStoragePath: resume?.storagePath ?? null,
        resumeOriginalName: resume?.originalName ?? null,
        resumeMimeType: resume?.mimeType ?? null,
        resumeSizeBytes: resume?.sizeBytes ?? null,
        coverLetter: data.coverLetter?.trim() || null,
        status: 'new',
        createdAt: now,
        updatedAt: now,
      });

      const saved = await this.jobApplicationRepo!.save(entity);
      await this.recordApplicationActivity(applicationId, {
        action: 'submitted',
        toStatus: 'new',
        actorLabel: data.name.trim(),
        createdAt: now,
      });
      return this.toJobApplication(saved, job.title);
    }

    const job = this.jobPostings.get(jobId);
    const now = new Date().toISOString();
    if (!job || !job.isActive || (job.expiresAt && job.expiresAt <= now)) return null;

    const applicationId = randomUUID();
    const resume = resumeFile ? await this.persistResumeFile(applicationId, resumeFile) : undefined;
    const application: JobApplication = {
      id: applicationId,
      jobId,
      jobTitle: job.title,
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || undefined,
      resumeUrl: resume?.url,
      resumeFileName: resume?.originalName,
      resumeMimeType: resume?.mimeType,
      resumeSizeBytes: resume?.sizeBytes,
      coverLetter: data.coverLetter?.trim() || undefined,
      status: 'new',
      createdAt: now,
      updatedAt: now,
    };

    if (resume) {
      this.memoryResumeStorage.set(applicationId, {
        filePath: resume.storagePath,
        fileName: resume.originalName,
        mimeType: resume.mimeType,
      });
    }

    this.jobApplications.set(application.id, application);
    await this.recordApplicationActivity(applicationId, {
      action: 'submitted',
      toStatus: 'new',
      actorLabel: data.name.trim(),
      createdAt: new Date(now),
    });
    return application;
  }

  async listApplicationsForJob(jobId: string): Promise<JobApplication[]> {
    if (this.useDb()) {
      const [applications, job] = await Promise.all([
        this.jobApplicationRepo!.find({ where: { jobId }, order: { createdAt: 'DESC' } }),
        this.jobPostingRepo!.findOne({ where: { id: jobId } }),
      ]);
      return applications.map((application) => this.toJobApplication(application, job?.title ?? 'Unknown Job'));
    }

    return [...this.jobApplications.values()]
      .filter((application) => application.jobId === jobId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listAllApplications(fromDate?: string, toDate?: string): Promise<JobApplication[]> {
    const { from, to } = this.parseDateRange(fromDate, toDate);

    if (this.useDb()) {
      const qb = this.jobApplicationRepo!.createQueryBuilder('application');
      if (from) qb.andWhere('application.created_at >= :from', { from });
      if (to) qb.andWhere('application.created_at <= :to', { to });

      const applications = await qb.orderBy('application.created_at', 'DESC').getMany();
      if (applications.length === 0) {
        return [];
      }

      const jobIds = [...new Set(applications.map((application) => application.jobId))];
      const jobs = await this.jobPostingRepo!.find({ where: { id: In(jobIds) } });
      const titleMap = new Map(jobs.map((job) => [job.id, job.title]));
      return applications.map((application) =>
        this.toJobApplication(application, titleMap.get(application.jobId) ?? 'Unknown Job'),
      );
    }

    return [...this.jobApplications.values()]
      .filter((application) => {
        const createdAtMs = Date.parse(application.createdAt);
        if (from && Number.isFinite(createdAtMs) && createdAtMs < from.getTime()) return false;
        if (to && Number.isFinite(createdAtMs) && createdAtMs > to.getTime()) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateApplication(
    id: string,
    data: { status?: ApplicationStatus; notes?: string; followUpNote?: string },
    actor?: { userId?: string; email?: string },
  ): Promise<JobApplication | undefined> {
    if (data.status !== undefined) {
      await this.enumConfig.validate(ENUM_TYPES.JOB_APPLICATION_STATUS, data.status, 'Application status');
    }
    const actorLabel = actor?.email?.trim() || actor?.userId || 'Admin';

    if (this.useDb()) {
      const application = await this.jobApplicationRepo!.findOne({ where: { id } });
      if (!application) return undefined;

      const previousStatus = application.status;
      const previousNotes = application.notes ?? '';
      const nextStatus = data.status ?? application.status;
      const nextNotes = data.notes !== undefined ? (data.notes ?? '') : previousNotes;

      application.status = nextStatus;
      application.notes = nextNotes || null;
      if (actor?.userId) {
        application.reviewedBy = actor.userId;
        application.reviewedAt = new Date();
      }
      application.updatedAt = new Date();

      const [saved, job] = await Promise.all([
        this.jobApplicationRepo!.save(application),
        this.jobPostingRepo!.findOne({ where: { id: application.jobId } }),
      ]);

      if (nextStatus !== previousStatus) {
        await this.recordApplicationActivity(id, {
          action: 'status_changed',
          fromStatus: previousStatus,
          toStatus: nextStatus,
          actorId: actor?.userId,
          actorLabel,
        });
      }
      if (data.notes !== undefined && nextNotes !== previousNotes) {
        await this.recordApplicationActivity(id, {
          action: 'note_updated',
          comment: nextNotes || undefined,
          actorId: actor?.userId,
          actorLabel,
        });
      }
      const followUp = data.followUpNote?.trim();
      if (followUp) {
        await this.recordApplicationActivity(id, {
          action: 'follow_up',
          comment: followUp,
          actorId: actor?.userId,
          actorLabel,
        });
      }

      return this.toJobApplication(saved, job?.title ?? 'Unknown Job');
    }

    const application = this.jobApplications.get(id);
    if (!application) return undefined;

    const previousStatus = application.status;
    const previousNotes = application.notes ?? '';
    const nextStatus = data.status ?? application.status;
    const nextNotes = data.notes !== undefined ? (data.notes ?? '') : previousNotes;

    const updated: JobApplication = {
      ...application,
      status: nextStatus,
      notes: nextNotes || undefined,
      reviewedBy: actor?.userId ?? application.reviewedBy,
      reviewedAt: actor?.userId ? new Date().toISOString() : application.reviewedAt,
      updatedAt: new Date().toISOString(),
    };
    this.jobApplications.set(id, updated);

    if (nextStatus !== previousStatus) {
      await this.recordApplicationActivity(id, {
        action: 'status_changed',
        fromStatus: previousStatus,
        toStatus: nextStatus,
        actorId: actor?.userId,
        actorLabel,
      });
    }
    if (data.notes !== undefined && nextNotes !== previousNotes) {
      await this.recordApplicationActivity(id, {
        action: 'note_updated',
        comment: nextNotes || undefined,
        actorId: actor?.userId,
        actorLabel,
      });
    }
    const followUp = data.followUpNote?.trim();
    if (followUp) {
      await this.recordApplicationActivity(id, {
        action: 'follow_up',
        comment: followUp,
        actorId: actor?.userId,
        actorLabel,
      });
    }

    return updated;
  }

  async getApplicationResumeDownload(applicationId: string): Promise<ResumeDownloadDescriptor | undefined> {
    if (this.useDb()) {
      const application = await this.jobApplicationRepo!.findOne({ where: { id: applicationId } });
      if (!application?.resumeStoragePath || !application.resumeOriginalName) {
        return undefined;
      }

      return {
        filePath: application.resumeStoragePath,
        fileName: application.resumeOriginalName,
        mimeType: application.resumeMimeType || 'application/octet-stream',
      };
    }

    return this.memoryResumeStorage.get(applicationId);
  }
}
