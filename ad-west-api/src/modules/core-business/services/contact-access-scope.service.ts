import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import type { PermissionRecord, PermissionSetRecord, UserRecord } from '../core-business.types';
import { sreniMembershipKey, type SreniExcelColumn } from './member-contact-template.constants';

export type ContactRoleLevel = 'ZONE' | 'STHAN';

export interface ContactAccessScope {
  userId: string;
  unrestricted: boolean;
  roleLevel?: ContactRoleLevel;
  allowedSreniIds: string[];
  sthanLocationId?: string;
  sthanName?: string;
}

type UserScopeRow = {
  id: string;
  role_id: string | null;
  sthan_id: string | null;
  permission_set_id: string | null;
  is_super_admin: boolean;
  level: string | null;
};

export class ContactAccessScopeService {
  constructor(
    private readonly dataSource?: DataSource,
    private readonly users?: Map<string, UserRecord>,
    private readonly permissionSets?: Map<string, PermissionSetRecord>,
    private readonly permissions?: Map<string, PermissionRecord>,
  ) {}

  async resolveScope(principal: AuthPrincipal): Promise<ContactAccessScope> {
    const user = await this.resolveOrganizationalUser(principal);
    if (!user) {
      throw new ForbiddenException('Settings user account is required for contact data access');
    }

    if (user.isSuperAdmin) {
      return {
        userId: user.id,
        unrestricted: true,
        allowedSreniIds: [],
      };
    }

    const allowedSreniIds = await this.loadAllowedSreniIds(user.permissionSetId);
    const roleLevel = this.normalizeRoleLevel(user.roleLevel);

    if (roleLevel === 'STHAN' && !user.sthanId?.trim()) {
      return {
        userId: user.id,
        unrestricted: false,
        roleLevel,
        allowedSreniIds,
        sthanLocationId: undefined,
      };
    }

    return {
      userId: user.id,
      unrestricted: false,
      roleLevel,
      allowedSreniIds,
      sthanLocationId: roleLevel === 'STHAN' ? user.sthanId?.trim() : undefined,
      sthanName: roleLevel === 'STHAN' ? user.sthanName?.trim() : undefined,
    };
  }

  assertUploadRowInScope(
    scope: ContactAccessScope,
    data: Record<string, string | number | boolean | null>,
    sreniColumns: SreniExcelColumn[],
  ): void {
    if (scope.unrestricted) {
      return;
    }

    const activeSreniIds: string[] = [];
    for (const sreni of sreniColumns) {
      const val = String(data[sreniMembershipKey(sreni.sreniId)] ?? '').trim();
      if (val.toLowerCase() === 'yes') {
        activeSreniIds.push(sreni.sreniId);
      }
    }

    if (!activeSreniIds.length) {
      return;
    }

    for (const sreniId of activeSreniIds) {
      this.assertCanAccessSreni(scope, sreniId);
    }

    if (scope.roleLevel === 'STHAN' && scope.sthanName) {
      const rowSthan = String(data.sthan ?? '').trim();
      if (rowSthan && rowSthan.toLowerCase() !== scope.sthanName.toLowerCase()) {
        throw new ForbiddenException('Upload row sthan is outside your assigned sthan');
      }
    }
  }

  assertCanAccessSreni(scope: ContactAccessScope, sreniId: string): void {
    if (scope.unrestricted) {
      return;
    }

    const normalizedSreniId = sreniId.trim();
    if (!scope.allowedSreniIds.includes(normalizedSreniId)) {
      throw new ForbiddenException('You do not have access to this sreni');
    }

    if (scope.roleLevel === 'STHAN' && !scope.sthanLocationId) {
      throw new ForbiddenException('Sthan assignment is required for your role');
    }
  }

  assertCanAccessContact(
    scope: ContactAccessScope,
    contact: {
      sreniId?: string | null;
      sthanLocationId?: string | null;
      locationId?: string | null;
      sthanId?: string | null;
      taggedSreniIds?: string[];
    },
    contextSreniId?: string,
  ): void {
    if (scope.unrestricted) {
      return;
    }

    const sreniIds = new Set<string>();
    if (contact.sreniId?.trim()) {
      sreniIds.add(contact.sreniId.trim());
    }
    for (const taggedSreniId of contact.taggedSreniIds ?? []) {
      if (taggedSreniId.trim()) {
        sreniIds.add(taggedSreniId.trim());
      }
    }

    const allowed = scope.allowedSreniIds;
    const relevantSreniId = contextSreniId?.trim();
    const matchesAllowedSreni = relevantSreniId
      ? allowed.includes(relevantSreniId) && sreniIds.has(relevantSreniId)
      : [...sreniIds].some((id) => allowed.includes(id));

    if (!matchesAllowedSreni) {
      throw new ForbiddenException('You do not have access to this contact');
    }

    if (scope.roleLevel === 'STHAN') {
      if (!scope.sthanLocationId) {
        throw new ForbiddenException('Sthan assignment is required for your role');
      }
      if (!this.contactMatchesSthan(contact, scope.sthanLocationId)) {
        throw new ForbiddenException('You do not have access to contacts outside your sthan');
      }
    }
  }

  clampListFilters(
    scope: ContactAccessScope,
    filters?: { sreniId?: string; sthanId?: string; search?: string },
  ): { sreniId?: string; sthanId?: string; search?: string } {
    if (scope.unrestricted) {
      return filters ?? {};
    }

    const next = { ...(filters ?? {}) };

    if (next.sreniId && !scope.allowedSreniIds.includes(next.sreniId)) {
      next.sreniId = '__none__';
    }

    if (scope.roleLevel === 'STHAN') {
      next.sthanId = scope.sthanLocationId;
    }

    return next;
  }

  appendStahanSql(
    alias: string,
    scope: ContactAccessScope,
    conditions: string[],
    params: unknown[],
    paramIdx: number,
  ): number {
    if (scope.unrestricted || scope.roleLevel !== 'STHAN' || !scope.sthanLocationId) {
      return paramIdx;
    }

    conditions.push(
      `(${alias}.sthan_location_id::text = $${paramIdx}
        OR ${alias}.location_id::text = $${paramIdx}
        OR ${alias}.sthan_id::text = $${paramIdx})`,
    );
    params.push(scope.sthanLocationId);
    return paramIdx + 1;
  }

  appendAllowedSreniSql(
    alias: string,
    scope: ContactAccessScope,
    conditions: string[],
    params: unknown[],
    paramIdx: number,
  ): number {
    if (scope.unrestricted) {
      return paramIdx;
    }

    if (!scope.allowedSreniIds.length) {
      conditions.push('FALSE');
      return paramIdx;
    }

    conditions.push(
      `(
        ${alias}.sreni_id = ANY($${paramIdx}::text[])
        OR EXISTS (
          SELECT 1 FROM adwest.contact_sreni_tags cst_scope
          WHERE cst_scope.contact_id = ${alias}.id
            AND cst_scope.sreni_id = ANY($${paramIdx}::text[])
        )
      )`,
    );
    params.push(scope.allowedSreniIds);
    return paramIdx + 1;
  }

  contactMatchesSthan(
    contact: {
      sthanLocationId?: string | null;
      locationId?: string | null;
      sthanId?: string | null;
    },
    sthanLocationId: string,
  ): boolean {
    const normalized = sthanLocationId.trim();
    return (
      (contact.sthanLocationId?.trim() ?? '') === normalized
      || (contact.locationId?.trim() ?? '') === normalized
      || (contact.sthanId?.trim() ?? '') === normalized
    );
  }

  matchesScopeInMemory(
    scope: ContactAccessScope,
    contact: {
      sreniId?: string | null;
      sthanLocationId?: string | null;
      sthanId?: string | null;
      taggedSreniIds?: string[];
    },
    contextSreniId?: string,
  ): boolean {
    if (scope.unrestricted) {
      return true;
    }

    const sreniIds = new Set<string>();
    if (contact.sreniId?.trim()) {
      sreniIds.add(contact.sreniId.trim());
    }
    for (const taggedSreniId of contact.taggedSreniIds ?? []) {
      if (taggedSreniId.trim()) {
        sreniIds.add(taggedSreniId.trim());
      }
    }

    const relevantSreniId = contextSreniId?.trim();
    const allowed = scope.allowedSreniIds;
    const matchesSreni = relevantSreniId
      ? allowed.includes(relevantSreniId) && sreniIds.has(relevantSreniId)
      : [...sreniIds].some((id) => allowed.includes(id));

    if (!matchesSreni) {
      return false;
    }

    if (scope.roleLevel === 'STHAN') {
      if (!scope.sthanLocationId) {
        return false;
      }
      return this.contactMatchesSthan(contact, scope.sthanLocationId);
    }

    return true;
  }

  async loadContactAccessSnapshot(contactId: string): Promise<{
    sreniId?: string | null;
    sthanLocationId?: string | null;
    locationId?: string | null;
    sthanId?: string | null;
    taggedSreniIds: string[];
  } | null> {
    if (!this.dataSource) {
      return null;
    }

    const rows = await this.dataSource.query(
      `SELECT c.sreni_id, c.sthan_location_id::text AS sthan_location_id,
              c.location_id::text AS location_id, c.sthan_id::text AS sthan_id
       FROM adwest.sreni_contacts c
       WHERE c.id = $1::uuid
       LIMIT 1`,
      [contactId],
    ) as Array<{
      sreni_id: string | null;
      sthan_location_id: string | null;
      location_id: string | null;
      sthan_id: string | null;
    }>;

    if (!rows[0]) {
      return null;
    }

    const tagRows = await this.dataSource.query(
      `SELECT sreni_id FROM adwest.contact_sreni_tags WHERE contact_id = $1::uuid`,
      [contactId],
    ) as Array<{ sreni_id: string }>;

    return {
      sreniId: rows[0].sreni_id,
      sthanLocationId: rows[0].sthan_location_id,
      locationId: rows[0].location_id,
      sthanId: rows[0].sthan_id,
      taggedSreniIds: tagRows.map((row) => row.sreni_id),
    };
  }

  private async resolveOrganizationalUser(
    principal: AuthPrincipal,
  ): Promise<{ id: string; isSuperAdmin: boolean; permissionSetId?: string; roleLevel?: string; sthanId?: string; sthanName?: string } | null> {
    const fromMemory = this.resolveOrganizationalUserFromMemory(principal);
    if (fromMemory) {
      return fromMemory;
    }

    if (!this.dataSource) {
      return null;
    }

    const byIdRows = await this.dataSource.query(
      `SELECT u.id, u.role_id, u.sthan_id, u.permission_set_id, COALESCE(u.is_super_admin, false) AS is_super_admin,
              rd.level, l.name AS sthan_name
       FROM adwest.users u
       LEFT JOIN adwest.role_definitions rd ON rd.id = u.role_id
       LEFT JOIN adwest.locations l ON l.id::text = u.sthan_id
       WHERE u.id = $1::uuid AND u.active = true
       LIMIT 1`,
      [principal.userId],
    ) as Array<UserScopeRow & { sthan_name: string | null }>;

    if (byIdRows[0]) {
      return this.mapUserScopeRow(byIdRows[0]);
    }

    if (!principal.email?.trim()) {
      return null;
    }

    const byEmailRows = await this.dataSource.query(
      `SELECT u.id, u.role_id, u.sthan_id, u.permission_set_id, COALESCE(u.is_super_admin, false) AS is_super_admin,
              rd.level, l.name AS sthan_name
       FROM adwest.users u
       LEFT JOIN adwest.role_definitions rd ON rd.id = u.role_id
       LEFT JOIN adwest.locations l ON l.id::text = u.sthan_id
       WHERE lower(u.email) = lower($1) AND u.active = true
       LIMIT 1`,
      [principal.email.trim()],
    ) as Array<UserScopeRow & { sthan_name: string | null }>;

    return byEmailRows[0] ? this.mapUserScopeRow(byEmailRows[0]) : null;
  }

  private resolveOrganizationalUserFromMemory(
    principal: AuthPrincipal,
  ): { id: string; isSuperAdmin: boolean; permissionSetId?: string; roleLevel?: string; sthanId?: string; sthanName?: string } | null {
    if (!this.users?.size) {
      return null;
    }

    const direct = this.users.get(principal.userId);
    if (direct?.active) {
      return {
        id: direct.id,
        isSuperAdmin: direct.isSuperAdmin ?? false,
        permissionSetId: direct.permissionSetId,
        sthanId: direct.sthanId,
      };
    }

    if (!principal.email?.trim()) {
      return null;
    }

    const normalizedEmail = principal.email.trim().toLowerCase();
    const byEmail = Array.from(this.users.values()).find(
      (user) => user.active && user.email?.trim().toLowerCase() === normalizedEmail,
    );

    if (!byEmail) {
      return null;
    }

    return {
      id: byEmail.id,
      isSuperAdmin: byEmail.isSuperAdmin ?? false,
      permissionSetId: byEmail.permissionSetId,
      sthanId: byEmail.sthanId,
    };
  }

  private mapUserScopeRow(row: UserScopeRow & { sthan_name?: string | null }): {
    id: string;
    isSuperAdmin: boolean;
    permissionSetId?: string;
    roleLevel?: string;
    sthanId?: string;
    sthanName?: string;
  } {
    return {
      id: row.id,
      isSuperAdmin: row.is_super_admin,
      permissionSetId: row.permission_set_id ?? undefined,
      roleLevel: row.level ?? undefined,
      sthanId: row.sthan_id ?? undefined,
      sthanName: row.sthan_name ?? undefined,
    };
  }

  private async loadAllowedSreniIds(permissionSetId?: string): Promise<string[]> {
    if (!permissionSetId?.trim()) {
      return [];
    }

    if (!this.dataSource) {
      const permissionSet = this.permissionSets?.get(permissionSetId.trim());
      if (!permissionSet) {
        return [];
      }
      return [...new Set(
        permissionSet.permissionIds
          .map((permissionId) => this.permissions?.get(permissionId)?.sreniId?.trim())
          .filter((sreniId): sreniId is string => Boolean(sreniId)),
      )];
    }

    const rows = await this.dataSource.query(
      `SELECT DISTINCT p.sreni_id
       FROM adwest.permission_set_items psi
       INNER JOIN adwest.permissions p ON p.id = psi.permission_id
       WHERE psi.permission_set_id = $1
         AND COALESCE(p.active, true) = true
         AND COALESCE(p.sreni_id, '') <> ''`,
      [permissionSetId.trim()],
    ) as Array<{ sreni_id: string }>;

    return rows.map((row) => row.sreni_id.trim()).filter(Boolean);
  }

  private normalizeRoleLevel(level?: string | null): ContactRoleLevel | undefined {
    const normalized = level?.trim().toUpperCase();
    if (normalized === 'ZONE' || normalized === 'STHAN') {
      return normalized;
    }
    return undefined;
  }
}
