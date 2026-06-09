import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as pathLib from 'path';
import { DataSource } from 'typeorm';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';

export type SevaContributionDocumentRecord = {
  id: string;
  contributionId: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy?: string;
  createdAt: string;
};

export type SevaContributionRecord = {
  id: string;
  contactId: string;
  activityDate: string;
  sevaActivity?: string;
  details?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  documents: SevaContributionDocumentRecord[];
};

type ContributionRow = {
  id: string;
  contact_id: string;
  activity_date: string | Date;
  seva_activity: string | null;
  details: string | null;
  created_by: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type DocumentRow = {
  id: string;
  contribution_id: string;
  file_name: string;
  file_type: string | null;
  file_path: string;
  file_size: string | number | null;
  uploaded_by: string | null;
  created_at: string | Date;
};

export class SevaSamithiContributionService {
  constructor(private readonly dataSource?: DataSource) {}

  private requireDataSource(): DataSource {
    if (!this.dataSource) {
      throw new BadRequestException('Database is not available');
    }
    return this.dataSource;
  }

  private toIsoDate(value: string | Date): string {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    const text = String(value).trim();
    return text.length >= 10 ? text.slice(0, 10) : text;
  }

  private toIsoTimestamp(value: string | Date): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
  }

  private mapDocument(row: DocumentRow): SevaContributionDocumentRecord {
    return {
      id: row.id,
      contributionId: row.contribution_id,
      fileName: row.file_name,
      fileType: row.file_type ?? undefined,
      fileSize: row.file_size != null ? Number(row.file_size) : undefined,
      uploadedBy: row.uploaded_by ?? undefined,
      createdAt: this.toIsoTimestamp(row.created_at),
    };
  }

  private mapContribution(row: ContributionRow, documents: DocumentRow[]): SevaContributionRecord {
    return {
      id: row.id,
      contactId: row.contact_id,
      activityDate: this.toIsoDate(row.activity_date),
      sevaActivity: row.seva_activity?.trim() || undefined,
      details: row.details?.trim() || undefined,
      createdBy: row.created_by ?? undefined,
      createdAt: this.toIsoTimestamp(row.created_at),
      updatedAt: this.toIsoTimestamp(row.updated_at),
      documents: documents.map((doc) => this.mapDocument(doc)),
    };
  }

  async listByContact(contactId: string): Promise<SevaContributionRecord[]> {
    const ds = this.requireDataSource();
    const rows = await ds.query(
      `SELECT id, contact_id, activity_date, seva_activity, details, created_by, created_at, updated_at
       FROM adwest.seva_samithi_contributions
       WHERE contact_id = $1::uuid
       ORDER BY activity_date DESC, created_at DESC`,
      [contactId.trim()],
    ) as ContributionRow[];

    if (!rows.length) {
      return [];
    }

    const contributionIds = rows.map((row) => row.id);
    const docRows = await ds.query(
      `SELECT id, contribution_id, file_name, file_type, file_path, file_size, uploaded_by, created_at
       FROM adwest.seva_samithi_contribution_documents
       WHERE contribution_id = ANY($1::uuid[])
       ORDER BY created_at ASC`,
      [contributionIds],
    ) as DocumentRow[];

    const docsByContribution = new Map<string, DocumentRow[]>();
    for (const doc of docRows) {
      const bucket = docsByContribution.get(doc.contribution_id) ?? [];
      bucket.push(doc);
      docsByContribution.set(doc.contribution_id, bucket);
    }

    return rows.map((row) => this.mapContribution(row, docsByContribution.get(row.id) ?? []));
  }

  async create(
    contactId: string,
    payload: { activityDate: string; sevaActivity?: string; details?: string },
    principal: AuthPrincipal,
  ): Promise<SevaContributionRecord> {
    const ds = this.requireDataSource();
    const activityDate = payload.activityDate?.trim();
    if (!activityDate) {
      throw new BadRequestException('Activity date is required');
    }

    const rows = await ds.query(
      `INSERT INTO adwest.seva_samithi_contributions
         (contact_id, activity_date, seva_activity, details, created_by)
       VALUES ($1::uuid, $2::date, $3, $4, $5)
       RETURNING id, contact_id, activity_date, seva_activity, details, created_by, created_at, updated_at`,
      [
        contactId.trim(),
        activityDate,
        payload.sevaActivity?.trim() || null,
        payload.details?.trim() || null,
        principal.userId,
      ],
    ) as ContributionRow[];

    const row = rows[0];
    if (!row) {
      throw new BadRequestException('Failed to create seva contribution');
    }
    return this.mapContribution(row, []);
  }

  async update(
    contactId: string,
    contributionId: string,
    payload: { activityDate?: string; sevaActivity?: string; details?: string },
  ): Promise<SevaContributionRecord> {
    const ds = this.requireDataSource();
    const existing = await this.findContributionRow(contactId, contributionId);

    const activityDate = payload.activityDate?.trim() || this.toIsoDate(existing.activity_date);
    const sevaActivity = payload.sevaActivity !== undefined
      ? (payload.sevaActivity.trim() || null)
      : existing.seva_activity;
    const details = payload.details !== undefined
      ? (payload.details.trim() || null)
      : existing.details;

    const rows = await ds.query(
      `UPDATE adwest.seva_samithi_contributions
       SET activity_date = $3::date,
           seva_activity = $4,
           details = $5,
           updated_at = now()
       WHERE id = $1::uuid AND contact_id = $2::uuid
       RETURNING id, contact_id, activity_date, seva_activity, details, created_by, created_at, updated_at`,
      [contributionId.trim(), contactId.trim(), activityDate, sevaActivity, details],
    ) as ContributionRow[];

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Seva contribution not found');
    }

    const docRows = await ds.query(
      `SELECT id, contribution_id, file_name, file_type, file_path, file_size, uploaded_by, created_at
       FROM adwest.seva_samithi_contribution_documents
       WHERE contribution_id = $1::uuid
       ORDER BY created_at ASC`,
      [contributionId.trim()],
    ) as DocumentRow[];

    return this.mapContribution(row, docRows);
  }

  async delete(contactId: string, contributionId: string): Promise<void> {
    const ds = this.requireDataSource();
    const docRows = await ds.query(
      `SELECT d.id, d.contribution_id, d.file_name, d.file_type, d.file_path, d.file_size, d.uploaded_by, d.created_at
       FROM adwest.seva_samithi_contribution_documents d
       INNER JOIN adwest.seva_samithi_contributions c ON c.id = d.contribution_id
       WHERE c.id = $1::uuid AND c.contact_id = $2::uuid`,
      [contributionId.trim(), contactId.trim()],
    ) as DocumentRow[];

    for (const doc of docRows) {
      this.unlinkFile(doc.file_path);
    }

    const rows = await ds.query(
      `DELETE FROM adwest.seva_samithi_contributions
       WHERE id = $1::uuid AND contact_id = $2::uuid
       RETURNING id`,
      [contributionId.trim(), contactId.trim()],
    ) as Array<{ id: string }>;

    if (!rows.length) {
      throw new NotFoundException('Seva contribution not found');
    }
  }

  async uploadDocuments(
    contactId: string,
    contributionId: string,
    files: Express.Multer.File[],
    principal: AuthPrincipal,
  ): Promise<SevaContributionDocumentRecord[]> {
    const ds = this.requireDataSource();
    if (!files.length) {
      throw new BadRequestException('No files uploaded');
    }

    await this.findContributionRow(contactId, contributionId);

    const created: SevaContributionDocumentRecord[] = [];
    for (const file of files) {
      const rows = await ds.query(
        `INSERT INTO adwest.seva_samithi_contribution_documents
           (contribution_id, file_name, file_type, file_path, file_size, uploaded_by)
         VALUES ($1::uuid, $2, $3, $4, $5, $6)
         RETURNING id, contribution_id, file_name, file_type, file_path, file_size, uploaded_by, created_at`,
        [
          contributionId.trim(),
          file.originalname,
          file.mimetype,
          file.path,
          file.size,
          principal.userId,
        ],
      ) as DocumentRow[];
      const row = rows[0];
      if (row) {
        created.push(this.mapDocument(row));
      }
    }

    return created;
  }

  async downloadDocument(documentId: string): Promise<{ record: SevaContributionDocumentRecord; filePath: string }> {
    const ds = this.requireDataSource();
    const rows = await ds.query(
      `SELECT id, contribution_id, file_name, file_type, file_path, file_size, uploaded_by, created_at
       FROM adwest.seva_samithi_contribution_documents
       WHERE id = $1::uuid`,
      [documentId.trim()],
    ) as DocumentRow[];

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Document not found');
    }
    if (!row.file_path || !fs.existsSync(row.file_path)) {
      throw new NotFoundException('File not found on server');
    }

    return {
      record: this.mapDocument(row),
      filePath: row.file_path,
    };
  }

  async deleteDocument(documentId: string): Promise<void> {
    const ds = this.requireDataSource();
    const rows = await ds.query(
      `SELECT id, contribution_id, file_name, file_type, file_path, file_size, uploaded_by, created_at
       FROM adwest.seva_samithi_contribution_documents
       WHERE id = $1::uuid`,
      [documentId.trim()],
    ) as DocumentRow[];

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Document not found');
    }

    this.unlinkFile(row.file_path);
    await ds.query(
      `DELETE FROM adwest.seva_samithi_contribution_documents WHERE id = $1::uuid`,
      [documentId.trim()],
    );
  }

  contributionUploadDir(contactId: string, contributionId: string): string {
    const base = process.env.UPLOAD_DIR ?? pathLib.join(process.cwd(), 'uploads');
    return pathLib.join(base, 'seva-contributions', contactId.trim(), contributionId.trim());
  }

  private async findContributionRow(contactId: string, contributionId: string): Promise<ContributionRow> {
    const ds = this.requireDataSource();
    const rows = await ds.query(
      `SELECT id, contact_id, activity_date, seva_activity, details, created_by, created_at, updated_at
       FROM adwest.seva_samithi_contributions
       WHERE id = $1::uuid AND contact_id = $2::uuid`,
      [contributionId.trim(), contactId.trim()],
    ) as ContributionRow[];

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Seva contribution not found');
    }
    return row;
  }

  private unlinkFile(filePath: string): void {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
