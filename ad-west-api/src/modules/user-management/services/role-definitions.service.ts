import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ROLE_DEFINITION_STORE } from '../constants';
import { CreateRoleDefinitionDto } from '../dto/create-role-definition.dto';
import { ListRoleDefinitionsQueryDto } from '../dto/list-role-definitions-query.dto';
import { UpdateRoleDefinitionDto } from '../dto/update-role-definition.dto';
import { UpdateRoleDefinitionStatusDto } from '../dto/update-role-definition-status.dto';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { RoleDefinition } from '../interfaces/role-definition.interface';
import { RoleDefinitionStore } from '../interfaces/role-definition-store.interface';
import { CryptoService } from './crypto.service';
import { applyInMemoryColumnFilters, parseColumnFilters } from '@modules/core-business/utils/column-filter.util';
import { applyInMemoryColumnSort, parseSortParams } from '@modules/core-business/utils/column-sort.util';

export interface PaginatedRoleDefinitionsResponse {
  items: RoleDefinition[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class RoleDefinitionsService {
  constructor(
    @Inject(ROLE_DEFINITION_STORE)
    private readonly store: RoleDefinitionStore,
    private readonly cryptoService: CryptoService,
  ) {}

  async list(query: ListRoleDefinitionsQueryDto): Promise<PaginatedRoleDefinitionsResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const search = query.search?.trim().toLowerCase();

    let rows = await this.store.list();

    if (search) {
      rows = rows.filter((row) => {
        return row.code.toLowerCase().includes(search) || row.name.toLowerCase().includes(search);
      });
    }

    if (query.level) {
      rows = rows.filter((row) => row.level === query.level);
    }

    if (typeof query.active === 'boolean') {
      rows = rows.filter((row) => row.active === query.active);
    }

    const columnFilters = parseColumnFilters(query.filters);
    if (Object.keys(columnFilters).length > 0) {
      rows = applyInMemoryColumnFilters(rows, columnFilters, {
        code: (row) => row.code,
        name: (row) => row.name,
        level: (row) => row.level,
        active: (row) => String(row.active),
      });
    }

    rows = applyInMemoryColumnSort(rows, parseSortParams(query.sortBy, query.sortDir), {
      code: (row) => row.code,
      name: (row) => row.name,
      level: (row) => row.level,
      active: (row) => row.active,
    }, (a, b) => a.name.localeCompare(b.name));

    const total = rows.length;
    const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;

    return {
      items: rows.slice(start, start + pageSize),
      page: safePage,
      pageSize,
      total,
      totalPages,
    };
  }

  async create(dto: CreateRoleDefinitionDto, principal: AuthPrincipal): Promise<RoleDefinition> {
    const normalizedCode = this.normalizeCode(dto.code);
    const existingByCode = await this.store.findByCode(normalizedCode);
    if (existingByCode) {
      throw new BadRequestException('Role code already exists');
    }

    const now = new Date().toISOString();
    const role: RoleDefinition = {
      id: this.cryptoService.randomId('role'),
      code: normalizedCode,
      name: dto.name.trim(),
      active: dto.active ?? true,
      level: dto.level,
      createdBy: principal.userId,
      createdAt: now,
      updatedBy: principal.userId,
      updatedAt: now,
    };

    await this.store.create(role);
    return role;
  }

  async update(id: string, dto: UpdateRoleDefinitionDto, principal: AuthPrincipal): Promise<RoleDefinition> {
    const role = await this.store.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (dto.code !== undefined) {
      const normalizedCode = this.normalizeCode(dto.code);
      const existingByCode = await this.store.findByCode(normalizedCode);
      if (existingByCode && existingByCode.id !== role.id) {
        throw new BadRequestException('Role code already exists');
      }
      role.code = normalizedCode;
    }

    if (dto.name !== undefined) {
      role.name = dto.name.trim();
    }

    if (dto.level !== undefined) {
      role.level = dto.level;
    }

    role.updatedBy = principal.userId;
    role.updatedAt = new Date().toISOString();

    await this.store.save(role);
    return role;
  }

  async updateStatus(
    id: string,
    dto: UpdateRoleDefinitionStatusDto,
    principal: AuthPrincipal,
  ): Promise<RoleDefinition> {
    const role = await this.store.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    role.active = dto.active;
    role.updatedBy = principal.userId;
    role.updatedAt = new Date().toISOString();

    await this.store.save(role);
    return role;
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const role = await this.store.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.store.delete(id);
    return { success: true };
  }

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }
}
