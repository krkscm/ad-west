import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ENUM_TYPES } from '../../enum-values/enum-types.constants';
import { EnumConfigService } from '../../enum-values/services/enum-config.service';
import type { SreniContactRecord } from '../core-business.types';
import type { ContactAccessScope } from './contact-access-scope.service';
import { ContactAccessScopeService } from './contact-access-scope.service';

export type JoinUsReviewStatus = 'pending' | 'completed';

export interface JoinUsSubmissionRecord {
  id: string;
  name: string;
  mobileNo?: string;
  email?: string;
  familyOrBachelor?: string;
  interestedSreniId: string;
  interestedSreniName: string;
  reviewStatus: JoinUsReviewStatus;
  sthanId?: string;
  divisionId?: string;
  submittedAt: string;
  reviewedAt?: string;
  data: Record<string, string | number | boolean | null>;
}

export interface CompleteJoinUsReviewInput {
  sreniId: string;
  sthanId: string;
  zoneId?: string;
  divisionId?: string | null;
  reviewNote?: string;
  currentStatus?: string;
}

const JOIN_US_SOURCE = 'public-join-us-form';

export class JoinUsReviewService {
  private readonly scopeHelper = new ContactAccessScopeService();

  constructor(private readonly dataSource?: DataSource) {}

  async countPending(scope: ContactAccessScope): Promise<number> {
    if (!this.dataSource) return 0;
    const { whereSql, params } = this.buildListWhere(scope, 'pending');
    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total
       FROM adwest.sreni_contacts c
       ${whereSql}`,
      params,
    ) as Array<{ total: number }>;
    return rows[0]?.total ?? 0;
  }

  async listSubmissions(
    scope: ContactAccessScope,
    params: { page?: number; pageSize?: number; status?: JoinUsReviewStatus | 'all'; sreniId?: string; search?: string },
  ): Promise<{
    items: JoinUsSubmissionRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    pendingCount: number;
  }> {
    if (!this.dataSource) {
      return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 1, pendingCount: 0 };
    }

    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const status = params.status ?? 'pending';
    const { whereSql, params: whereParams, paramIdx } = this.buildListWhere(scope, status, params.sreniId, params.search);

    const pendingCount = await this.countPending(scope);

    const countRows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total FROM adwest.sreni_contacts c ${whereSql}`,
      whereParams,
    ) as Array<{ total: number }>;
    const total = countRows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const offset = (page - 1) * pageSize;

    const rows = await this.dataSource.query(
      `SELECT c.id, c.data, c.sthan_id, c.division_id, c.review_status, c.reviewed_at, c.created_at,
              tag.sreni_id AS interested_sreni_id,
              COALESCE(s.name, tag.sreni_id) AS interested_sreni_name
       FROM adwest.sreni_contacts c
       INNER JOIN LATERAL (
         SELECT cst.sreni_id
         FROM adwest.contact_sreni_tags cst
         WHERE cst.contact_id = c.id
         ORDER BY cst.created_at ASC
         LIMIT 1
       ) tag ON true
       LEFT JOIN adwest.srenies s ON s.id::text = tag.sreni_id
       ${whereSql}
       ORDER BY c.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...whereParams, pageSize, offset],
    ) as Array<{
      id: string;
      data: Record<string, string | number | boolean | null>;
      sthan_id: string | null;
      division_id: string | null;
      review_status: string | null;
      reviewed_at: string | Date | null;
      created_at: string | Date;
      interested_sreni_id: string;
      interested_sreni_name: string;
    }>;

    const items = rows.map((r) => ({
      id: r.id,
      name: String(r.data?.name ?? ''),
      mobileNo: r.data?.mobileNo != null ? String(r.data.mobileNo) : undefined,
      email: r.data?.email != null ? String(r.data.email) : undefined,
      familyOrBachelor: r.data?.familyOrBachelor != null ? String(r.data.familyOrBachelor) : undefined,
      interestedSreniId: r.interested_sreni_id,
      interestedSreniName: r.interested_sreni_name,
      reviewStatus: (r.review_status === 'completed' ? 'completed' : 'pending') as JoinUsReviewStatus,
      sthanId: r.sthan_id ?? undefined,
      divisionId: r.division_id ?? undefined,
      submittedAt: new Date(r.created_at).toISOString(),
      reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : undefined,
      data: r.data ?? {},
    }));

    return { items, total, page, pageSize, totalPages, pendingCount };
  }

  async completeReview(
    contactId: string,
    input: CompleteJoinUsReviewInput,
    reviewerUserId: string,
    scope: ContactAccessScope,
  ): Promise<SreniContactRecord> {
    if (!this.dataSource) {
      throw new BadRequestException('Join Us review requires database persistence.');
    }

    const contactRows = await this.dataSource.query(
      `SELECT c.id, c.sreni_id, c.data, c.review_status, c.source_file, c.row_index,
              c.zone_location_id, c.sthan_location_id, c.division_id, c.sthan_id,
              c.source_file, c.uploaded_by, c.created_at, c.updated_at,
              tag.sreni_id AS interested_sreni_id
       FROM adwest.sreni_contacts c
       INNER JOIN LATERAL (
         SELECT cst.sreni_id
         FROM adwest.contact_sreni_tags cst
         WHERE cst.contact_id = c.id
         ORDER BY cst.created_at ASC
         LIMIT 1
       ) tag ON true
       WHERE c.id = $1::uuid
         AND c.contact_kind = 'household'
         AND c.source_file = $2
       LIMIT 1`,
      [contactId, JOIN_US_SOURCE],
    ) as Array<{
      id: string;
      sreni_id: string | null;
      data: Record<string, string | number | boolean | null>;
      review_status: string | null;
      source_file: string;
      row_index: number;
      zone_location_id: string | null;
      sthan_location_id: string | null;
      division_id: string | null;
      sthan_id: string | null;
      uploaded_by: string | null;
      created_at: string | Date;
      updated_at: string | Date;
      interested_sreni_id: string;
    }>;

    const contact = contactRows[0];
    if (!contact) {
      throw new NotFoundException('Join Us submission not found.');
    }
    if (contact.review_status === 'completed') {
      throw new BadRequestException('This submission has already been reviewed.');
    }
    if (input.sreniId !== contact.interested_sreni_id) {
      throw new BadRequestException('Sreni does not match the applicant\'s interested Sreni.');
    }

    this.scopeHelper.assertCanAccessSreni(scope, input.sreniId);

    const sthanRows = await this.dataSource.query(
      `SELECT id::text AS id, name, parent_id::text AS parent_id, level
       FROM adwest.locations
       WHERE id::text = $1 AND active = true AND level = 'sthan'
       LIMIT 1`,
      [input.sthanId.trim()],
    ) as Array<{ id: string; name: string; parent_id: string | null; level: string }>;
    if (!sthanRows[0]) {
      throw new BadRequestException('Invalid Sthan selected.');
    }
    const sthan = sthanRows[0];

    let zoneId = input.zoneId?.trim() || sthan.parent_id || null;
    if (zoneId) {
      const zoneRows = await this.dataSource.query(
        `SELECT id::text AS id, name FROM adwest.locations
         WHERE id::text = $1 AND active = true AND level = 'zone' LIMIT 1`,
        [zoneId],
      ) as Array<{ id: string; name: string }>;
      if (!zoneRows[0]) {
        throw new BadRequestException('Invalid Zone selected.');
      }
      if (scope.roleLevel === 'STHAN' && scope.sthanLocationId && scope.sthanLocationId !== sthan.id) {
        throw new BadRequestException('You can only assign contacts within your sthan.');
      }
      zoneId = zoneRows[0].id;
    }

    const zoneNameRows = zoneId
      ? await this.dataSource.query(
        `SELECT name FROM adwest.locations WHERE id::text = $1 LIMIT 1`,
        [zoneId],
      ) as Array<{ name: string }>
      : [];
    const zoneName = zoneNameRows[0]?.name ?? null;

    const mergedData: Record<string, string | number | boolean | null> = {
      ...(contact.data ?? {}),
      sthan: sthan.name,
      ...(zoneName ? { zone: zoneName } : {}),
      ...(input.reviewNote?.trim()
        ? {
            remarks: [contact.data?.remarks, input.reviewNote.trim()].filter(Boolean).join('\n'),
          }
        : {}),
    };

    const currentStatus = input.currentStatus?.trim();
    if (currentStatus) {
      const enumConfig = new EnumConfigService('db', this.dataSource);
      await enumConfig.validate(ENUM_TYPES.CONTACT_CURRENT_STATUS, currentStatus, 'Current status');
      mergedData.currentStatus = currentStatus;
    } else {
      delete mergedData.currentStatus;
    }

    const divisionId = input.divisionId ?? null;
    if (divisionId) {
      const divRows = await this.dataSource.query(
        `SELECT id FROM adwest.sreni_divisions WHERE id = $1 AND sreni_id = $2 LIMIT 1`,
        [divisionId, input.sreniId],
      );
      if (!divRows.length) {
        throw new BadRequestException('Invalid division for this Sreni.');
      }
    }

    await this.dataSource.query('BEGIN');
    try {
      await this.dataSource.query(
        `UPDATE adwest.sreni_contacts
         SET sreni_id = $2,
             sthan_id = $3,
             sthan_location_id = $4::uuid,
             location_id = $4::uuid,
             zone_location_id = $5::uuid,
             division_id = $6,
             data = $7::jsonb,
             review_status = 'completed',
             reviewed_at = now(),
             reviewed_by = $8::uuid,
             updated_at = now()
         WHERE id = $1::uuid`,
        [
          contactId,
          input.sreniId,
          sthan.id,
          sthan.id,
          zoneId,
          divisionId,
          JSON.stringify(mergedData),
          reviewerUserId,
        ],
      );

      await this.dataSource.query(
        `UPDATE adwest.contact_sreni_tags
         SET division_id = $3, updated_at = now()
         WHERE contact_id = $1::uuid AND sreni_id = $2`,
        [contactId, input.sreniId, divisionId],
      );

      await this.dataSource.query('COMMIT');
    } catch (error) {
      await this.dataSource.query('ROLLBACK');
      throw error;
    }

    const updatedRows = await this.dataSource.query(
      `SELECT id, sreni_id, row_index, data, zone_location_id, sthan_location_id,
              division_location_id, division_id, sthan_id,
              COALESCE(active, true) AS active, source_file, uploaded_by,
              review_status, reviewed_at, created_at, updated_at
       FROM adwest.sreni_contacts WHERE id = $1::uuid`,
      [contactId],
    ) as Array<{
      id: string;
      sreni_id: string;
      row_index: number;
      data: Record<string, string | number | boolean | null>;
      zone_location_id: string | null;
      sthan_location_id: string | null;
      division_location_id: string | null;
      division_id: string | null;
      sthan_id: string | null;
      active: boolean;
      source_file: string | null;
      uploaded_by: string | null;
      review_status: string | null;
      reviewed_at: string | Date | null;
      created_at: string | Date;
      updated_at: string | Date;
    }>;

    const r = updatedRows[0];
    return {
      id: r.id,
      sreniId: r.sreni_id,
      rowIndex: r.row_index,
      data: r.data ?? {},
      zoneLocationId: r.zone_location_id ?? undefined,
      sthanLocationId: r.sthan_location_id ?? undefined,
      divisionLocationId: r.division_location_id ?? undefined,
      divisionId: r.division_id ?? undefined,
      sthanId: r.sthan_id ?? undefined,
      active: r.active,
      sourceFile: r.source_file ?? undefined,
      uploadedBy: r.uploaded_by ?? undefined,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  private buildListWhere(
    scope: ContactAccessScope,
    status: JoinUsReviewStatus | 'all',
    sreniIdFilter?: string,
    search?: string,
  ): { whereSql: string; params: unknown[]; paramIdx: number } {
    const conditions = [
      `c.contact_kind = 'household'`,
      `c.source_file = '${JOIN_US_SOURCE}'`,
      `COALESCE(c.active, true) = true`,
    ];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (status !== 'all') {
      conditions.push(`COALESCE(c.review_status, 'pending') = $${paramIdx}`);
      params.push(status);
      paramIdx += 1;
    }

    if (sreniIdFilter?.trim()) {
      conditions.push(`EXISTS (
        SELECT 1 FROM adwest.contact_sreni_tags cst
        WHERE cst.contact_id = c.id AND cst.sreni_id = $${paramIdx}
      )`);
      params.push(sreniIdFilter.trim());
      paramIdx += 1;
    }

    if (search?.trim()) {
      conditions.push(`(
        COALESCE(c.data->>'name', '') ILIKE $${paramIdx}
        OR COALESCE(c.data->>'mobileNo', '') ILIKE $${paramIdx}
      )`);
      params.push(`%${search.trim()}%`);
      paramIdx += 1;
    }

    if (!scope.unrestricted) {
      if (scope.allowedSreniIds.length > 0) {
        conditions.push(`EXISTS (
          SELECT 1 FROM adwest.contact_sreni_tags cst_scope
          WHERE cst_scope.contact_id = c.id
            AND cst_scope.sreni_id = ANY($${paramIdx}::text[])
        )`);
        params.push(scope.allowedSreniIds);
        paramIdx += 1;
      } else {
        conditions.push('FALSE');
      }

      if (scope.roleLevel === 'STHAN' && scope.sthanLocationId) {
        conditions.push(`(
          c.sthan_id = $${paramIdx}
          OR c.sthan_location_id::text = $${paramIdx}
          OR (c.sthan_id IS NULL AND c.review_status IS DISTINCT FROM 'completed')
        )`);
        params.push(scope.sthanLocationId);
        paramIdx += 1;
      }
    }

    return {
      whereSql: `WHERE ${conditions.join(' AND ')}`,
      params,
      paramIdx,
    };
  }
}
