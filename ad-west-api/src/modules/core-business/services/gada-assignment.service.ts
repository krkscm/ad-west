import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ContactAccessScope } from './contact-access-scope.service';

export interface SreniGadanayakRecord {
  id: string;
  sreniId: string;
  sthanId: string;
  sthanName?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  active: boolean;
  createdAt: string;
}

export interface ContactGadaAssignmentRecord {
  contactId: string;
  sreniId: string;
  gadanayakUserId: string;
  gadanayakUserName?: string;
  assignedBy?: string;
  assignedAt: string;
}

export type GadaContactListFilter = 'all' | 'unassigned' | 'mine';

export interface GadaListQueryOptions {
  filter?: GadaContactListFilter;
  gadanayakUserId?: string;
}

export class GadaAssignmentService {
  constructor(private readonly dataSource?: DataSource) {}

  isAssignmentCoordinator(scope: ContactAccessScope): boolean {
    if (scope.unrestricted) {
      return true;
    }
    if (scope.roleLevel === 'ZONE') {
      return true;
    }
    if (scope.roleLevel === 'STHAN' && scope.allowedSreniIds.length > 1) {
      return true;
    }
    return false;
  }

  async isGadaEnabled(sreniId: string): Promise<boolean> {
    if (!this.dataSource) {
      return false;
    }
    const rows = await this.dataSource.query(
      `SELECT COALESCE(gada_assignment_enabled, true) AS enabled
       FROM adwest.srenies WHERE id = $1 LIMIT 1`,
      [sreniId],
    ) as Array<{ enabled: boolean }>;
    return rows[0]?.enabled ?? false;
  }

  async assertCanManageAssignments(scope: ContactAccessScope, sreniId: string): Promise<void> {
    if (!(await this.isGadaEnabled(sreniId))) {
      throw new BadRequestException('Gada assignment is not enabled for this sreni.');
    }
    if (!this.isAssignmentCoordinator(scope)) {
      throw new ForbiddenException('Only zone users or multi-sreni sthan coordinators can manage gada assignments.');
    }
  }

  async isRegisteredGadanayak(sreniId: string, userId: string): Promise<boolean> {
    if (!this.dataSource) {
      return false;
    }
    const rows = await this.dataSource.query(
      `SELECT 1 FROM adwest.sreni_gadanayaks
       WHERE sreni_id = $1 AND user_id = $2::uuid AND active = true
       LIMIT 1`,
      [sreniId, userId],
    );
    return rows.length > 0;
  }

  appendGadaJoin(sreniId: string, contactAlias: string, joins: string[]): void {
    joins.push(
      `LEFT JOIN adwest.contact_gada_assignments cga
         ON cga.contact_id = ${contactAlias}.id AND cga.sreni_id = '${sreniId.replace(/'/g, "''")}'`,
    );
    joins.push(
      `LEFT JOIN adwest.users gadanayak_u ON gadanayak_u.id = cga.gadanayak_user_id`,
    );
  }

  appendGadaListFilter(
    _sreniId: string,
    scope: ContactAccessScope,
    gadaEnabled: boolean,
    options: GadaListQueryOptions | undefined,
    conditions: string[],
    params: unknown[],
    paramIdx: number,
  ): number {
    if (!gadaEnabled) {
      return paramIdx;
    }

    const filter = options?.filter ?? 'all';
    const coordinator = this.isAssignmentCoordinator(scope);

    if (coordinator) {
      if (filter === 'unassigned') {
        conditions.push('cga.id IS NULL');
      } else if (filter === 'mine') {
        conditions.push(`cga.gadanayak_user_id = $${paramIdx}::uuid`);
        params.push(scope.userId);
        paramIdx += 1;
      } else if (options?.gadanayakUserId?.trim()) {
        conditions.push(`cga.gadanayak_user_id = $${paramIdx}::uuid`);
        params.push(options.gadanayakUserId.trim());
        paramIdx += 1;
      }
      return paramIdx;
    }

    conditions.push(`cga.gadanayak_user_id = $${paramIdx}::uuid`);
    params.push(scope.userId);
    return paramIdx + 1;
  }

  resolveContactSthanId(contact: {
    sthanId?: string | null;
    sthanLocationId?: string | null;
    locationId?: string | null;
  }): string | null {
    return contact.sthanId?.trim()
      || contact.sthanLocationId?.trim()
      || contact.locationId?.trim()
      || null;
  }

  async listGadanayaks(sreniId: string, sthanId?: string): Promise<SreniGadanayakRecord[]> {
    if (!this.dataSource) {
      return [];
    }

    const params: unknown[] = [sreniId];
    let sthanClause = '';
    if (sthanId?.trim()) {
      sthanClause = ' AND sg.sthan_id = $2';
      params.push(sthanId.trim());
    }

    const rows = await this.dataSource.query(
      `SELECT sg.id, sg.sreni_id, sg.sthan_id, sg.user_id, sg.active, sg.created_at,
              u.name AS user_name, u.email AS user_email,
              l.name AS sthan_name
       FROM adwest.sreni_gadanayaks sg
       INNER JOIN adwest.users u ON u.id = sg.user_id
       LEFT JOIN adwest.locations l ON l.id::text = sg.sthan_id
       WHERE sg.sreni_id = $1 AND sg.active = true${sthanClause}
       ORDER BY l.name NULLS LAST, u.name`,
      params,
    ) as Array<{
      id: string;
      sreni_id: string;
      sthan_id: string;
      user_id: string;
      active: boolean;
      created_at: string | Date;
      user_name: string;
      user_email: string | null;
      sthan_name: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      sreniId: row.sreni_id,
      sthanId: row.sthan_id,
      sthanName: row.sthan_name ?? undefined,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email ?? undefined,
      active: row.active,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }

  async listEligibleGadanayakUsers(sreniId: string, sthanId: string): Promise<Array<{ id: string; name: string; email?: string }>> {
    if (!this.dataSource) {
      return [];
    }

    const rows = await this.dataSource.query(
      `SELECT DISTINCT u.id, u.name, u.email
       FROM adwest.users u
       INNER JOIN adwest.permission_set_items psi ON psi.permission_set_id = u.permission_set_id
       INNER JOIN adwest.permissions p ON p.id = psi.permission_id
         AND p.sreni_id = $1
         AND COALESCE(p.active, true) = true
       WHERE u.active = true
         AND COALESCE(u.is_super_admin, false) = false
         AND u.sthan_id = $2
         AND NOT EXISTS (
           SELECT 1 FROM adwest.sreni_gadanayaks sg
           WHERE sg.sreni_id = $1 AND sg.sthan_id = $2 AND sg.user_id = u.id AND sg.active = true
         )
       ORDER BY u.name`,
      [sreniId, sthanId],
    ) as Array<{ id: string; name: string; email: string | null }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email ?? undefined,
    }));
  }

  async registerGadanayak(
    sreniId: string,
    sthanId: string,
    userId: string,
    actorUserId: string,
  ): Promise<SreniGadanayakRecord> {
    if (!this.dataSource) {
      throw new BadRequestException('Gada assignment requires database persistence.');
    }

    await this.assertUserEligibleForGadanayak(sreniId, sthanId, userId);

    const rows = await this.dataSource.query(
      `INSERT INTO adwest.sreni_gadanayaks (sreni_id, sthan_id, user_id, created_by)
       VALUES ($1, $2, $3::uuid, $4::uuid)
       ON CONFLICT (sreni_id, sthan_id, user_id)
       DO UPDATE SET active = true, updated_at = now()
       RETURNING id, sreni_id, sthan_id, user_id, active, created_at`,
      [sreniId, sthanId, userId, actorUserId],
    ) as Array<{
      id: string;
      sreni_id: string;
      sthan_id: string;
      user_id: string;
      active: boolean;
      created_at: string | Date;
    }>;

    const list = await this.listGadanayaks(sreniId, sthanId);
    const match = list.find((item) => item.id === rows[0].id || item.userId === userId);
    if (!match) {
      throw new NotFoundException('Failed to load registered gadanayak.');
    }
    return match;
  }

  async removeGadanayak(sreniId: string, gadanayakId: string): Promise<void> {
    if (!this.dataSource) {
      return;
    }

    const rows = await this.dataSource.query(
      `UPDATE adwest.sreni_gadanayaks
       SET active = false, updated_at = now()
       WHERE id = $1::uuid AND sreni_id = $2
       RETURNING user_id`,
      [gadanayakId, sreniId],
    ) as Array<{ user_id: string }>;

    if (!rows[0]) {
      throw new NotFoundException('Gadanayak not found.');
    }

    await this.dataSource.query(
      `DELETE FROM adwest.contact_gada_assignments
       WHERE sreni_id = $1 AND gadanayak_user_id = $2::uuid`,
      [sreniId, rows[0].user_id],
    );
  }

  async assignContact(
    sreniId: string,
    contactId: string,
    gadanayakUserId: string,
    actorUserId: string,
    contact: {
      sthanId?: string | null;
      sthanLocationId?: string | null;
      locationId?: string | null;
    },
  ): Promise<ContactGadaAssignmentRecord> {
    if (!this.dataSource) {
      throw new BadRequestException('Gada assignment requires database persistence.');
    }

    const contactSthanId = this.resolveContactSthanId(contact);
    if (!contactSthanId) {
      throw new BadRequestException('Contact must have a sthan before gada assignment.');
    }

    const gadanayakRows = await this.dataSource.query(
      `SELECT sg.sthan_id, u.name AS user_name
       FROM adwest.sreni_gadanayaks sg
       INNER JOIN adwest.users u ON u.id = sg.user_id
       WHERE sg.sreni_id = $1 AND sg.user_id = $2::uuid AND sg.active = true
       LIMIT 1`,
      [sreniId, gadanayakUserId],
    ) as Array<{ sthan_id: string; user_name: string }>;

    if (!gadanayakRows[0]) {
      throw new BadRequestException('Selected user is not a registered gadanayak for this sreni.');
    }

    if (gadanayakRows[0].sthan_id !== contactSthanId) {
      throw new BadRequestException('Gadanayak sthan must match the contact sthan.');
    }

    const rows = await this.dataSource.query(
      `INSERT INTO adwest.contact_gada_assignments
         (contact_id, sreni_id, gadanayak_user_id, assigned_by)
       VALUES ($1::uuid, $2, $3::uuid, $4::uuid)
       ON CONFLICT (contact_id, sreni_id)
       DO UPDATE SET
         gadanayak_user_id = EXCLUDED.gadanayak_user_id,
         assigned_by = EXCLUDED.assigned_by,
         assigned_at = now(),
         updated_at = now()
       RETURNING contact_id, sreni_id, gadanayak_user_id, assigned_by, assigned_at`,
      [contactId, sreniId, gadanayakUserId, actorUserId],
    ) as Array<{
      contact_id: string;
      sreni_id: string;
      gadanayak_user_id: string;
      assigned_by: string | null;
      assigned_at: string | Date;
    }>;

    return {
      contactId: rows[0].contact_id,
      sreniId: rows[0].sreni_id,
      gadanayakUserId: rows[0].gadanayak_user_id,
      gadanayakUserName: gadanayakRows[0].user_name,
      assignedBy: rows[0].assigned_by ?? undefined,
      assignedAt: new Date(rows[0].assigned_at).toISOString(),
    };
  }

  async unassignContact(sreniId: string, contactId: string): Promise<void> {
    if (!this.dataSource) {
      return;
    }

    const rows = await this.dataSource.query(
      `DELETE FROM adwest.contact_gada_assignments
       WHERE sreni_id = $1 AND contact_id = $2::uuid
       RETURNING id`,
      [sreniId, contactId],
    );

    if (!rows.length) {
      throw new NotFoundException('Gada assignment not found for this contact.');
    }
  }

  async bulkAssignContacts(
    sreniId: string,
    contactIds: string[],
    gadanayakUserId: string,
    actorUserId: string,
  ): Promise<{ assigned: number }> {
    let assigned = 0;
    for (const contactId of contactIds) {
      const snapshot = await this.loadContactSthanSnapshot(contactId);
      if (!snapshot) {
        continue;
      }
      await this.assignContact(sreniId, contactId, gadanayakUserId, actorUserId, snapshot);
      assigned += 1;
    }
    return { assigned };
  }

  private async loadContactSthanSnapshot(contactId: string): Promise<{
    sthanId?: string | null;
    sthanLocationId?: string | null;
    locationId?: string | null;
  } | null> {
    if (!this.dataSource) {
      return null;
    }

    const rows = await this.dataSource.query(
      `SELECT sthan_id, sthan_location_id::text AS sthan_location_id,
              location_id::text AS location_id
       FROM adwest.sreni_contacts
       WHERE id = $1::uuid
       LIMIT 1`,
      [contactId],
    ) as Array<{
      sthan_id: string | null;
      sthan_location_id: string | null;
      location_id: string | null;
    }>;

    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      sthanId: row.sthan_id,
      sthanLocationId: row.sthan_location_id,
      locationId: row.location_id,
    };
  }

  private async assertUserEligibleForGadanayak(
    sreniId: string,
    sthanId: string,
    userId: string,
  ): Promise<void> {
    if (!this.dataSource) {
      return;
    }

    const rows = await this.dataSource.query(
      `SELECT u.id
       FROM adwest.users u
       INNER JOIN adwest.permission_set_items psi ON psi.permission_set_id = u.permission_set_id
       INNER JOIN adwest.permissions p ON p.id = psi.permission_id
         AND p.sreni_id = $1
         AND COALESCE(p.active, true) = true
       WHERE u.id = $2::uuid
         AND u.active = true
         AND COALESCE(u.is_super_admin, false) = false
         AND u.sthan_id = $3
       LIMIT 1`,
      [sreniId, userId, sthanId],
    );

    if (!rows.length) {
      throw new BadRequestException('User must have active access to this sreni and sthan to become a gadanayak.');
    }
  }
}
