import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import JSZip from 'jszip';
import { extname, join } from 'path';
import { In, Repository } from 'typeorm';
import { HelpdeskTicketEntity } from './entities/helpdesk-ticket.entity';
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

@Injectable()
export class PublicGatewayService {
  private readonly tickets = new Map<string, HelpdeskTicket>();
  private readonly jobPostings = new Map<string, JobPosting>();
  private readonly jobApplications = new Map<string, JobApplication>();
  private readonly memoryResumeStorage = new Map<string, ResumeDownloadDescriptor>();

  constructor(
    @Optional() @InjectRepository(HelpdeskTicketEntity)
    private readonly ticketRepo?: Repository<HelpdeskTicketEntity>,
    @Optional() @InjectRepository(JobPostingEntity)
    private readonly jobPostingRepo?: Repository<JobPostingEntity>,
    @Optional() @InjectRepository(JobApplicationEntity)
    private readonly jobApplicationRepo?: Repository<JobApplicationEntity>,
  ) {}

  private useDb(): boolean {
    return !!this.ticketRepo && !!this.jobPostingRepo && !!this.jobApplicationRepo;
  }

  private newId(): string {
    return randomBytes(12).toString('hex');
  }

  private getResumeUrl(applicationId: string): string {
    return `/api/v1/gateway/jobs/applications/${applicationId}/resume`;
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
    const now = new Date();

    if (this.useDb()) {
      const entity = this.ticketRepo!.create({
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        category: data.category ?? 'general',
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
      category: data.category ?? 'general',
      subject: data.subject.trim(),
      description: data.description.trim(),
      status: 'open',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.tickets.set(ticket.id, ticket);
    return ticket;
  }

  async listTickets(status?: string): Promise<HelpdeskTicket[]> {
    if (this.useDb()) {
      const rows = status
        ? await this.ticketRepo!.find({ where: { status }, order: { createdAt: 'DESC' } })
        : await this.ticketRepo!.find({ order: { createdAt: 'DESC' } });
      return rows.map((row) => this.toHelpdeskTicket(row));
    }

    const all = [...this.tickets.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return status ? all.filter((ticket) => ticket.status === status) : all;
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

  async listAllJobPostings(): Promise<JobPosting[]> {
    if (this.useDb()) {
      const rows = await this.jobPostingRepo!.find({ order: { createdAt: 'DESC' } });
      return rows.map((row) => this.toJobPosting(row));
    }
    return [...this.jobPostings.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
    const now = new Date();

    if (this.useDb()) {
      const entity = this.jobPostingRepo!.create({
        title: data.title.trim(),
        description: data.description.trim(),
        requirements: data.requirements?.trim() || null,
        location: data.location?.trim() || null,
        type: data.type ?? 'full_time',
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
      type: data.type ?? 'full_time',
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

      return this.toJobApplication(await this.jobApplicationRepo!.save(entity), job.title);
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

  async listAllApplications(): Promise<JobApplication[]> {
    if (this.useDb()) {
      const applications = await this.jobApplicationRepo!.find({ order: { createdAt: 'DESC' } });
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

    return [...this.jobApplications.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateApplication(
    id: string,
    data: { status?: ApplicationStatus; notes?: string },
    reviewedBy?: string,
  ): Promise<JobApplication | undefined> {
    if (this.useDb()) {
      const application = await this.jobApplicationRepo!.findOne({ where: { id } });
      if (!application) return undefined;

      application.status = data.status ?? application.status;
      application.notes = data.notes ?? application.notes ?? null;
      application.reviewedBy = reviewedBy ?? application.reviewedBy ?? null;
      application.reviewedAt = reviewedBy ? new Date() : application.reviewedAt;
      application.updatedAt = new Date();

      const [saved, job] = await Promise.all([
        this.jobApplicationRepo!.save(application),
        this.jobPostingRepo!.findOne({ where: { id: application.jobId } }),
      ]);

      return this.toJobApplication(saved, job?.title ?? 'Unknown Job');
    }

    const application = this.jobApplications.get(id);
    if (!application) return undefined;
    const updated: JobApplication = {
      ...application,
      ...data,
      reviewedBy: reviewedBy ?? application.reviewedBy,
      reviewedAt: reviewedBy ? new Date().toISOString() : application.reviewedAt,
      updatedAt: new Date().toISOString(),
    };
    this.jobApplications.set(id, updated);
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
