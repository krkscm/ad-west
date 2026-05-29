import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import {
  CreateDocumentDto,
  CreateDocumentFolderDto,
  CreateReportSubmissionDto,
  CreateReportTemplateDto,
  ReviewReportSubmissionDto,
} from '../dto/core-business.dto';
import type {
  DocumentFolderRecord,
  DocumentRecord,
  ReportSubmissionRecord,
  ReportTemplateRecord,
} from '../core-business.service';

export interface DocumentReportRuntimeContext {
  documentFolders: Map<string, DocumentFolderRecord>;
  documents: Map<string, DocumentRecord>;
  reportTemplates: Map<string, ReportTemplateRecord>;
  reportSubmissions: Map<string, ReportSubmissionRecord>;
  newId(prefix: string): string;
  ensureSreny(sreniId: string): void;
  findDocumentFolder(folderId: string): DocumentFolderRecord;
  findDocument(documentId: string): DocumentRecord;
  findReportTemplate(templateId: string): ReportTemplateRecord;
  findReportSubmission(submissionId: string): ReportSubmissionRecord;
  canViewCreatorData(principal: AuthPrincipal, creatorUserId: string): boolean;
  scheduleDocumentStatePersistence(entityId: string): void;
  scheduleReportTemplateStatePersistence(templateId: string): void;
  scheduleReportSubmissionStatePersistence(submissionId: string): void;
}

export class DocumentReportRuntimeService {
  constructor(private readonly ctx: DocumentReportRuntimeContext) {}

  listDocumentFolders(srenyId?: string): DocumentFolderRecord[] {
    const rows = Array.from(this.ctx.documentFolders.values());
    return srenyId ? rows.filter((item) => item.srenyId === srenyId) : rows;
  }

  createDocumentFolder(dto: CreateDocumentFolderDto): DocumentFolderRecord {
    this.ctx.ensureSreny(dto.srenyId);
    if (dto.parentFolderId) {
      this.ctx.findDocumentFolder(dto.parentFolderId);
    }

    const now = new Date().toISOString();
    const folder: DocumentFolderRecord = {
      id: this.ctx.newId('fld'),
      srenyId: dto.srenyId,
      name: dto.name.trim(),
      parentFolderId: dto.parentFolderId,
      createdAt: now,
      updatedAt: now,
    };

    this.ctx.documentFolders.set(folder.id, folder);
    this.ctx.scheduleDocumentStatePersistence(folder.id);
    return folder;
  }

  listDocuments(srenyId?: string, search?: string): DocumentRecord[] {
    let rows = Array.from(this.ctx.documents.values());
    if (srenyId) {
      rows = rows.filter((item) => item.srenyId === srenyId);
    }

    if (search) {
      const term = search.trim().toLowerCase();
      rows = rows.filter((item) =>
        [item.fileName, item.category ?? '', item.description ?? '', item.fileType]
          .join(' ')
          .toLowerCase()
          .includes(term),
      );
    }

    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  createDocument(dto: CreateDocumentDto, principal: AuthPrincipal): DocumentRecord {
    this.ctx.ensureSreny(dto.srenyId);
    if (dto.folderId) {
      this.ctx.findDocumentFolder(dto.folderId);
    }

    const now = new Date().toISOString();
    const document: DocumentRecord = {
      id: this.ctx.newId('doc'),
      srenyId: dto.srenyId,
      folderId: dto.folderId,
      fileName: dto.fileName.trim(),
      fileType: dto.fileType.trim().toLowerCase(),
      category: dto.category,
      description: dto.description,
      version: 1,
      accessLevel: dto.accessLevel,
      linkedEntityType: dto.linkedEntityType,
      linkedEntityId: dto.linkedEntityId,
      uploadedBy: principal.userId,
      sourceDocumentId: dto.sourceDocumentId,
      createdAt: now,
      updatedAt: now,
    };

    this.ctx.documents.set(document.id, document);
    this.ctx.scheduleDocumentStatePersistence(document.id);
    return document;
  }

  createDocumentVersion(documentId: string, dto: CreateDocumentDto, principal: AuthPrincipal): DocumentRecord {
    const source = this.ctx.findDocument(documentId);
    const created = this.createDocument(
      {
        ...dto,
        srenyId: source.srenyId,
        folderId: dto.folderId ?? source.folderId,
        sourceDocumentId: source.id,
      },
      principal,
    );

    created.version = source.version + 1;
    this.ctx.documents.set(created.id, created);
    this.ctx.scheduleDocumentStatePersistence(created.id);
    return created;
  }

  uploadDocument(
    sreniId: string,
    file: Express.Multer.File,
    description: string | undefined,
    principal: AuthPrincipal,
  ): DocumentRecord {
    const now = new Date().toISOString();
    const doc: DocumentRecord = {
      id: this.ctx.newId('doc'),
      srenyId: sreniId,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      filePath: file.path,
      description,
      version: 1,
      accessLevel: 'sreny',
      uploadedBy: principal.userId,
      createdAt: now,
      updatedAt: now,
    };
    this.ctx.documents.set(doc.id, doc);
    this.ctx.scheduleDocumentStatePersistence(doc.id);
    return doc;
  }

  downloadDocument(documentId: string): { record: DocumentRecord; filePath: string } {
    const record = this.ctx.findDocument(documentId);
    if (!record.filePath) {
      throw new BadRequestException('No file stored for this document');
    }
    if (!fs.existsSync(record.filePath)) {
      throw new BadRequestException('File not found on server');
    }
    return { record, filePath: record.filePath };
  }

  deleteDocument(documentId: string): void {
    const record = this.ctx.findDocument(documentId);
    if (record.filePath && fs.existsSync(record.filePath)) {
      fs.unlinkSync(record.filePath);
    }
    this.ctx.documents.delete(documentId);
  }

  listReportTemplates(srenyId?: string): ReportTemplateRecord[] {
    const rows = Array.from(this.ctx.reportTemplates.values());
    return srenyId ? rows.filter((item) => item.srenyId === srenyId) : rows;
  }

  createReportTemplate(dto: CreateReportTemplateDto): ReportTemplateRecord {
    this.ctx.ensureSreny(dto.srenyId);
    const now = new Date().toISOString();
    const template: ReportTemplateRecord = {
      id: this.ctx.newId('rpt'),
      srenyId: dto.srenyId,
      name: dto.name.trim(),
      fields: dto.fields.map((field) => ({
        key: field.key.trim(),
        label: field.label.trim(),
        type: field.type,
        required: field.required ?? false,
        options: field.options,
      })),
      createdAt: now,
      updatedAt: now,
    };

    this.ctx.reportTemplates.set(template.id, template);
    this.ctx.scheduleReportTemplateStatePersistence(template.id);
    return template;
  }

  createReportSubmission(dto: CreateReportSubmissionDto, principal: AuthPrincipal): ReportSubmissionRecord {
    this.ctx.findReportTemplate(dto.templateId);
    const now = new Date().toISOString();
    const submission: ReportSubmissionRecord = {
      id: this.ctx.newId('rps'),
      templateId: dto.templateId,
      submittedBy: principal.userId,
      answers: dto.answers,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    this.ctx.reportSubmissions.set(submission.id, submission);
    this.ctx.scheduleReportSubmissionStatePersistence(submission.id);
    return submission;
  }

  listReportSubmissions(status?: string): ReportSubmissionRecord[] {
    const rows = Array.from(this.ctx.reportSubmissions.values());
    const filtered = status ? rows.filter((item) => item.status === status) : rows;
    return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  listMyReportSubmissions(principal: AuthPrincipal): ReportSubmissionRecord[] {
    return Array.from(this.ctx.reportSubmissions.values())
      .filter((item) => this.ctx.canViewCreatorData(principal, item.submittedBy))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  reviewReportSubmission(
    submissionId: string,
    dto: ReviewReportSubmissionDto,
    principal: AuthPrincipal,
  ): ReportSubmissionRecord {
    const submission = this.ctx.findReportSubmission(submissionId);
    if (submission.status !== 'pending') {
      throw new BadRequestException('Submission is already reviewed');
    }

    submission.status = dto.decision;
    submission.reviewedBy = principal.userId;
    submission.reviewedAt = new Date().toISOString();
    submission.reviewNote = dto.note;
    submission.updatedAt = submission.reviewedAt;
    this.ctx.reportSubmissions.set(submission.id, submission);
    this.ctx.scheduleReportSubmissionStatePersistence(submission.id);
    return submission;
  }
}
