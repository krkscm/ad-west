import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnumValueEntity } from '../entities/enum-value.entity';
import { CreateEnumValueDto, ListEnumValuesQueryDto, UpdateEnumValueDto } from '../dto/enum-value.dto';
import { CryptoService } from '@modules/user-management/services/crypto.service';

export interface EnumValue {
  id: string;
  enumType: string;
  value: string;
  label: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const SEED_VALUES: Omit<EnumValue, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Admin roles
  { enumType: 'admin_role', value: 'SUPER_ADMIN',  label: 'Super Admin',  sortOrder: 10, active: true },
  { enumType: 'admin_role', value: 'ZONE_ADMIN',   label: 'Zone Admin',   sortOrder: 20, active: true },
  { enumType: 'admin_role', value: 'SRENY_ADMIN',  label: 'Sreny Admin',  sortOrder: 30, active: true },
  // Scope types
  { enumType: 'scope_type', value: 'global', label: 'Global', sortOrder: 10, active: true },
  { enumType: 'scope_type', value: 'zone',   label: 'Zone',   sortOrder: 20, active: true },
  { enumType: 'scope_type', value: 'sreny',  label: 'Sreny',  sortOrder: 30, active: true },
  // Role levels
  { enumType: 'role_level', value: 'ZONE',  label: 'Zone',  sortOrder: 10, active: true },
  { enumType: 'role_level', value: 'STHAN', label: 'Sthan', sortOrder: 20, active: true },
  // Approval modes
  { enumType: 'approval_mode', value: 'sequential', label: 'Sequential', sortOrder: 10, active: true },
  { enumType: 'approval_mode', value: 'parallel',   label: 'Parallel',   sortOrder: 20, active: true },
];

const SUPPORTED_ENUM_TYPES = new Set<string>([
  'admin_role',
  'scope_type',
  'role_level',
  'approval_mode',
]);

@Injectable()
export class EnumValuesService {
  private mem = new Map<string, EnumValue>();

  constructor(
    private readonly cryptoService: CryptoService,
    @Optional() @InjectRepository(EnumValueEntity)
    private readonly repo?: Repository<EnumValueEntity>,
  ) {
    if (!this.repo) {
      this.seedInMemory();
    }
  }

  private seedInMemory(): void {
    const now = new Date().toISOString();
    for (const seed of SEED_VALUES) {
      const id = this.cryptoService.randomId('ev');
      this.mem.set(id, { id, ...seed, createdAt: now, updatedAt: now });
    }
  }

  private useDb(): boolean {
    return !!this.repo;
  }

  private toModel(e: EnumValueEntity): EnumValue {
    return {
      id: e.id,
      enumType: e.enumType,
      value: e.value,
      label: e.label,
      sortOrder: e.sortOrder,
      active: e.active,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  async list(query: ListEnumValuesQueryDto): Promise<EnumValue[]> {
    if (this.useDb()) {
      if (query.enumType && !SUPPORTED_ENUM_TYPES.has(query.enumType)) {
        return [];
      }
      const qb = this.repo!.createQueryBuilder('ev');
      if (!query.enumType) {
        qb.andWhere('ev.enum_type IN (:...supportedTypes)', {
          supportedTypes: Array.from(SUPPORTED_ENUM_TYPES),
        });
      }
      if (query.enumType) qb.andWhere('ev.enum_type = :t', { t: query.enumType });
      if (query.activeOnly) qb.andWhere('ev.active = true');
      qb.orderBy('ev.enum_type').addOrderBy('ev.sort_order');
      const rows = await qb.getMany();
      return rows.map(this.toModel);
    }
    let items = Array.from(this.mem.values());
    items = items.filter((v) => SUPPORTED_ENUM_TYPES.has(v.enumType));
    if (query.enumType) items = items.filter((v) => v.enumType === query.enumType);
    if (query.activeOnly) items = items.filter((v) => v.active);
    return items.sort((a, b) => a.enumType.localeCompare(b.enumType) || a.sortOrder - b.sortOrder);
  }

  async listTypes(): Promise<string[]> {
    if (this.useDb()) {
      const rows = await this.repo!.createQueryBuilder('ev')
        .select('DISTINCT ev.enum_type', 'enumType')
        .where('ev.enum_type IN (:...supportedTypes)', {
          supportedTypes: Array.from(SUPPORTED_ENUM_TYPES),
        })
        .orderBy('ev.enum_type')
        .getRawMany<{ enumType: string }>();
      return rows.map((r) => r.enumType);
    }
    const types = new Set(
      Array.from(this.mem.values())
        .filter((v) => SUPPORTED_ENUM_TYPES.has(v.enumType))
        .map((v) => v.enumType),
    );
    return Array.from(types).sort();
  }

  async create(dto: CreateEnumValueDto): Promise<EnumValue> {
    const existing = await this.findByTypeAndValue(dto.enumType, dto.value);
    if (existing) throw new BadRequestException(`Value '${dto.value}' already exists in type '${dto.enumType}'`);

    const now = new Date().toISOString();
    const item: EnumValue = {
      id: this.cryptoService.randomId('ev'),
      enumType: dto.enumType,
      value: dto.value,
      label: dto.label,
      sortOrder: dto.sortOrder ?? 0,
      active: dto.active ?? true,
      createdAt: now,
      updatedAt: now,
    };

    if (this.useDb()) {
      await this.repo!.insert(this.fromModel(item));
    } else {
      this.mem.set(item.id, item);
    }
    return item;
  }

  async update(id: string, dto: UpdateEnumValueDto): Promise<EnumValue> {
    const item = await this.findById(id);

    if (dto.value && dto.value !== item.value) {
      const conflict = await this.findByTypeAndValue(item.enumType, dto.value);
      if (conflict) throw new BadRequestException(`Value '${dto.value}' already exists in type '${item.enumType}'`);
    }

    const updated: EnumValue = {
      ...item,
      value: dto.value ?? item.value,
      label: dto.label ?? item.label,
      sortOrder: dto.sortOrder ?? item.sortOrder,
      active: dto.active ?? item.active,
      updatedAt: new Date().toISOString(),
    };

    if (this.useDb()) {
      await this.repo!.save(this.fromModel(updated));
    } else {
      this.mem.set(id, updated);
    }
    return updated;
  }

  async remove(id: string): Promise<{ success: boolean }> {
    await this.findById(id);
    if (this.useDb()) {
      await this.repo!.delete(id);
    } else {
      this.mem.delete(id);
    }
    return { success: true };
  }

  private async findById(id: string): Promise<EnumValue> {
    if (this.useDb()) {
      const row = await this.repo!.findOne({ where: { id } });
      if (!row) throw new NotFoundException(`Enum value ${id} not found`);
      return this.toModel(row);
    }
    const item = this.mem.get(id);
    if (!item) throw new NotFoundException(`Enum value ${id} not found`);
    return item;
  }

  private async findByTypeAndValue(enumType: string, value: string): Promise<EnumValue | null> {
    if (this.useDb()) {
      const row = await this.repo!.findOne({ where: { enumType, value } });
      return row ? this.toModel(row) : null;
    }
    return Array.from(this.mem.values()).find((v) => v.enumType === enumType && v.value === value) ?? null;
  }

  private fromModel(item: EnumValue): EnumValueEntity {
    const e = new EnumValueEntity();
    e.id = item.id;
    e.enumType = item.enumType;
    e.value = item.value;
    e.label = item.label;
    e.sortOrder = item.sortOrder;
    e.active = item.active;
    e.createdAt = item.createdAt;
    e.updatedAt = item.updatedAt;
    return e;
  }
}
