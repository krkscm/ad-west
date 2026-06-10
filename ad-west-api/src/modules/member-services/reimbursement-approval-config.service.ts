import { Injectable, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AdminRole } from '@modules/user-management/enums/admin-role.enum';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';

@Injectable()
export class ReimbursementApprovalConfigService {
  private columnReady: boolean | null = null;

  constructor(@Optional() @InjectDataSource() private readonly dataSource?: DataSource) {}

  private isMissingColumnError(error: unknown): boolean {
    return typeof error === 'object'
      && error !== null
      && 'code' in error
      && (error as { code?: string }).code === '42703';
  }

  private async ensureApproverColumn(): Promise<boolean> {
    if (!this.dataSource) return false;
    if (this.columnReady === true) return true;
    if (this.columnReady === false) return false;

    try {
      await this.dataSource.query(`
        ALTER TABLE adwest.role_definitions
          ADD COLUMN IF NOT EXISTS can_approve_reimbursements boolean NOT NULL DEFAULT false
      `);

      const configTable = await this.dataSource.query(`
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'adwest'
          AND table_name = 'reimbursement_approval_config'
        LIMIT 1
      `) as Array<{ '?column?': number }>;

      if (configTable.length) {
        await this.dataSource.query(`
          UPDATE adwest.role_definitions rd
          SET can_approve_reimbursements = true
          FROM (
            SELECT jsonb_array_elements_text(approver_role_definition_ids) AS role_id
            FROM adwest.reimbursement_approval_config
            WHERE id = 'default'
          ) cfg
          WHERE rd.id = cfg.role_id
            AND rd.can_approve_reimbursements = false
        `);
      }

      await this.dataSource.query(`
        UPDATE adwest.role_definitions
        SET can_approve_reimbursements = true
        WHERE upper(code) = 'ZONE_VYP'
          AND active = true
          AND NOT EXISTS (
            SELECT 1
            FROM adwest.role_definitions
            WHERE can_approve_reimbursements = true
          )
      `);

      this.columnReady = true;
      return true;
    } catch {
      this.columnReady = false;
      return false;
    }
  }

  async canPrincipalReview(principal: AuthPrincipal): Promise<boolean> {
    if (principal.roles.includes(AdminRole.SUPER_ADMIN)) return true;
    if (await this.isSuperAdminPrincipal(principal.userId)) return true;
    if (!this.dataSource) return false;

    if (!(await this.ensureApproverColumn())) return false;

    const actorRoleIds = await this.resolveActorRoleDefinitionIds(principal.userId);
    if (!actorRoleIds.size) return false;

    try {
      const rows = await this.dataSource.query(
        `
          SELECT id
          FROM adwest.role_definitions
          WHERE id = ANY($1::varchar[])
            AND active = true
            AND can_approve_reimbursements = true
        `,
        [[...actorRoleIds]],
      ) as Array<{ id: string }>;

      return rows.length > 0;
    } catch (error) {
      if (this.isMissingColumnError(error)) {
        this.columnReady = false;
        return false;
      }
      throw error;
    }
  }

  private async isSuperAdminPrincipal(userId: string): Promise<boolean> {
    if (!this.dataSource) return false;

    const rows = await this.dataSource.query(
      `SELECT is_super_admin FROM adwest.users WHERE id = $1 AND active = true LIMIT 1`,
      [userId],
    ) as Array<{ is_super_admin: boolean }>;

    return !!rows[0]?.is_super_admin;
  }

  private async resolveActorRoleDefinitionIds(userId: string): Promise<Set<string>> {
    const actorRoleIds = new Set<string>();
    if (!this.dataSource) return actorRoleIds;

    const [adminRows, userRows] = await Promise.all([
      this.dataSource.query(
        'SELECT role_definition_id FROM adwest.auth_admin_users WHERE id = $1 AND active = true LIMIT 1',
        [userId],
      ) as Promise<Array<{ role_definition_id: string | null }>>,
      this.dataSource.query(
        'SELECT role_id FROM adwest.users WHERE id = $1 AND active = true LIMIT 1',
        [userId],
      ) as Promise<Array<{ role_id: string | null }>>,
    ]);

    const adminRoleId = adminRows[0]?.role_definition_id;
    const userRoleId = userRows[0]?.role_id;
    if (adminRoleId) actorRoleIds.add(adminRoleId);
    if (userRoleId) actorRoleIds.add(userRoleId);
    return actorRoleIds;
  }
}
