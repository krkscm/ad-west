import { DataSource } from 'typeorm';
import type {
  ResponsibilityChartEdgeRecord,
  ResponsibilityChartNodeRecord,
  ResponsibilityChartRecord,
  UserRecord,
} from '../core-business.types';

export interface ResponsibilityChartRuntimeContext {
  users: Map<string, UserRecord>;
  runtimeMode: 'in-memory' | 'db';
  dataSource?: DataSource;
  toIsoTimestamp(value: string | Date): string;
}

type ChartUserRow = {
  id: string;
  name: string;
  roleId?: string;
  reportingToRoleIds: string[];
  isSuperAdmin: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export class ResponsibilityChartRuntimeService {
  constructor(private readonly ctx: ResponsibilityChartRuntimeContext) {}

  async getResponsibilityChart(year?: number): Promise<ResponsibilityChartRecord> {
    const users = await this.loadUsers();
    const availableYears = this.resolveAvailableYears(users);
    const selectedYear = this.resolveSelectedYear(availableYears, year);
    const asOfEnd = new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59, 999));

    const nodes = users
      .filter((user) => this.existsInYear(user, asOfEnd))
      .map((user) => ({
        userId: user.id,
        name: user.name,
        roleId: user.roleId,
        reportingToRoleIds: user.reportingToRoleIds,
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const usersByRole = new Map<string, ResponsibilityChartNodeRecord[]>();
    for (const node of nodes) {
      if (!node.roleId) {
        continue;
      }
      const bucket = usersByRole.get(node.roleId) ?? [];
      bucket.push(node);
      usersByRole.set(node.roleId, bucket);
    }

    const edges: ResponsibilityChartEdgeRecord[] = [];
    const edgeKeys = new Set<string>();

    for (const node of nodes) {
      for (const roleId of node.reportingToRoleIds) {
        const managers = usersByRole.get(roleId) ?? [];
        for (const manager of managers) {
          if (manager.userId === node.userId) {
            continue;
          }

          const key = `${node.userId}|${manager.userId}|${roleId}`;
          if (edgeKeys.has(key)) {
            continue;
          }

          edges.push({
            fromUserId: node.userId,
            toUserId: manager.userId,
            viaRoleId: roleId,
          });
          edgeKeys.add(key);
        }
      }
    }

    return {
      year: selectedYear,
      availableYears,
      nodes,
      edges,
    };
  }

  private async loadUsers(): Promise<ChartUserRow[]> {
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      return Array.from(this.ctx.users.values())
        .filter((user) => !user.isSuperAdmin)
        .map((user) => ({
        id: user.id,
        name: user.name,
        roleId: user.roleId,
        reportingToRoleIds: user.reportingToRoleIds ?? [],
        isSuperAdmin: user.isSuperAdmin ?? false,
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));
    }

    const rows = await this.ctx.dataSource.query(
      `SELECT id, name, role_id, reporting_to_role_ids, is_super_admin, active, created_at, updated_at
       FROM adwest.users
       WHERE COALESCE(is_super_admin, false) = false
       ORDER BY created_at ASC`,
    ) as Array<{
      id: string;
      name: string;
      role_id: string | null;
      reporting_to_role_ids: string[] | null;
      is_super_admin: boolean;
      active: boolean;
      created_at: string | Date;
      updated_at: string | Date;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      roleId: row.role_id ?? undefined,
      reportingToRoleIds: Array.isArray(row.reporting_to_role_ids) ? row.reporting_to_role_ids : [],
      isSuperAdmin: row.is_super_admin,
      active: row.active,
      createdAt: this.ctx.toIsoTimestamp(row.created_at),
      updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
    }));
  }

  private resolveAvailableYears(users: ChartUserRow[]): number[] {
    const years = new Set<number>();
    for (const user of users) {
      const value = new Date(user.createdAt);
      if (!Number.isNaN(value.getTime())) {
        years.add(value.getUTCFullYear());
      }
    }

    if (!years.size) {
      years.add(new Date().getUTCFullYear());
    }

    const sorted = Array.from(years).sort((a, b) => a - b);
    const currentYear = new Date().getUTCFullYear();
    const startYear = sorted[0];
    const range: number[] = [];

    for (let year = startYear; year <= currentYear; year += 1) {
      range.push(year);
    }

    return range;
  }

  private resolveSelectedYear(availableYears: number[], requestedYear?: number): number {
    if (requestedYear && Number.isFinite(requestedYear)) {
      return requestedYear;
    }

    return availableYears[availableYears.length - 1];
  }

  private existsInYear(user: ChartUserRow, asOfEnd: Date): boolean {
    const createdAt = Date.parse(user.createdAt);
    if (Number.isNaN(createdAt) || createdAt > asOfEnd.getTime()) {
      return false;
    }

    if (user.active) {
      return true;
    }

    const updatedAt = Date.parse(user.updatedAt);
    if (Number.isNaN(updatedAt)) {
      return false;
    }

    // Best-effort history for inactive users: keep them visible for earlier years.
    return updatedAt > asOfEnd.getTime();
  }
}
