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
  // Location levels
  { enumType: 'location_level', value: 'zone',  label: 'Zone',  sortOrder: 10, active: true },
  { enumType: 'location_level', value: 'sthan', label: 'Sthan', sortOrder: 20, active: true },
  // Approval modes
  { enumType: 'approval_mode', value: 'sequential', label: 'Sequential', sortOrder: 10, active: true },
  { enumType: 'approval_mode', value: 'parallel',   label: 'Parallel',   sortOrder: 20, active: true },
  // Approval target types
  { enumType: 'approval_target_type', value: 'document_submission',  label: 'Document Submission',  sortOrder: 10, active: true },
  { enumType: 'approval_target_type', value: 'report_submission',    label: 'Report Submission',    sortOrder: 20, active: true },
  { enumType: 'approval_target_type', value: 'member_edit_request',  label: 'Member Edit Request',  sortOrder: 30, active: true },
  { enumType: 'approval_target_type', value: 'job_listing',          label: 'Job Listing',          sortOrder: 40, active: true },
  // Approval item statuses
  { enumType: 'approval_item_status', value: 'submitted',  label: 'Submitted',  sortOrder: 10, active: true },
  { enumType: 'approval_item_status', value: 'in_review',  label: 'In Review',  sortOrder: 20, active: true },
  { enumType: 'approval_item_status', value: 'approved',   label: 'Approved',   sortOrder: 30, active: true },
  { enumType: 'approval_item_status', value: 'rejected',   label: 'Rejected',   sortOrder: 40, active: true },
  // Program statuses
  { enumType: 'program_status', value: 'draft',     label: 'Draft',     sortOrder: 10, active: true },
  { enumType: 'program_status', value: 'published', label: 'Published', sortOrder: 20, active: true },
  { enumType: 'program_status', value: 'archived',  label: 'Archived',  sortOrder: 30, active: true },
  // Attendance states
  { enumType: 'attendance_state', value: 'present', label: 'Present', sortOrder: 10, active: true },
  { enumType: 'attendance_state', value: 'absent',  label: 'Absent',  sortOrder: 20, active: true },
  { enumType: 'attendance_state', value: 'late',    label: 'Late',    sortOrder: 30, active: true },
  { enumType: 'attendance_state', value: 'excused', label: 'Excused', sortOrder: 40, active: true },
  // Ticket priorities
  { enumType: 'ticket_priority', value: 'low',      label: 'Low',      sortOrder: 10, active: true },
  { enumType: 'ticket_priority', value: 'medium',   label: 'Medium',   sortOrder: 20, active: true },
  { enumType: 'ticket_priority', value: 'high',     label: 'High',     sortOrder: 30, active: true },
  { enumType: 'ticket_priority', value: 'critical', label: 'Critical', sortOrder: 40, active: true },
  // Ticket statuses
  { enumType: 'ticket_status', value: 'new',         label: 'New',         sortOrder: 10, active: true },
  { enumType: 'ticket_status', value: 'in_progress', label: 'In Progress', sortOrder: 20, active: true },
  { enumType: 'ticket_status', value: 'resolved',    label: 'Resolved',    sortOrder: 30, active: true },
  { enumType: 'ticket_status', value: 'closed',      label: 'Closed',      sortOrder: 40, active: true },
  // Ticket activity actions
  { enumType: 'ticket_activity_action', value: 'created',        label: 'Created',        sortOrder: 10, active: true },
  { enumType: 'ticket_activity_action', value: 'assigned',       label: 'Assigned',       sortOrder: 20, active: true },
  { enumType: 'ticket_activity_action', value: 'status_updated', label: 'Status Updated', sortOrder: 30, active: true },
  { enumType: 'ticket_activity_action', value: 'comment_added',  label: 'Comment Added',  sortOrder: 40, active: true },
  // Document access levels
  { enumType: 'document_access_level', value: 'sreny',   label: 'Sreny',   sortOrder: 10, active: true },
  { enumType: 'document_access_level', value: 'zone',    label: 'Zone',    sortOrder: 20, active: true },
  { enumType: 'document_access_level', value: 'private', label: 'Private', sortOrder: 30, active: true },
  // Report field types
  { enumType: 'report_field_type', value: 'text',     label: 'Text',     sortOrder: 10, active: true },
  { enumType: 'report_field_type', value: 'number',   label: 'Number',   sortOrder: 20, active: true },
  { enumType: 'report_field_type', value: 'date',     label: 'Date',     sortOrder: 30, active: true },
  { enumType: 'report_field_type', value: 'file',     label: 'File',     sortOrder: 40, active: true },
  { enumType: 'report_field_type', value: 'dropdown', label: 'Dropdown', sortOrder: 50, active: true },
  // Report submission statuses
  { enumType: 'report_submission_status', value: 'submitted', label: 'Submitted', sortOrder: 10, active: true },
  { enumType: 'report_submission_status', value: 'approved',  label: 'Approved',  sortOrder: 20, active: true },
  { enumType: 'report_submission_status', value: 'rejected',  label: 'Rejected',  sortOrder: 30, active: true },
  // Job types
  { enumType: 'job_type', value: 'full_time',  label: 'Full Time',  sortOrder: 10, active: true },
  { enumType: 'job_type', value: 'part_time',  label: 'Part Time',  sortOrder: 20, active: true },
  { enumType: 'job_type', value: 'contract',   label: 'Contract',   sortOrder: 30, active: true },
  { enumType: 'job_type', value: 'volunteer',  label: 'Volunteer',  sortOrder: 40, active: true },
  // Job listing statuses
  { enumType: 'job_listing_status', value: 'draft',    label: 'Draft',    sortOrder: 10, active: true },
  { enumType: 'job_listing_status', value: 'active',   label: 'Active',   sortOrder: 20, active: true },
  { enumType: 'job_listing_status', value: 'archived', label: 'Archived', sortOrder: 30, active: true },
  // Member edit request statuses
  { enumType: 'member_edit_status', value: 'pending',  label: 'Pending',  sortOrder: 10, active: true },
  { enumType: 'member_edit_status', value: 'approved', label: 'Approved', sortOrder: 20, active: true },
  { enumType: 'member_edit_status', value: 'rejected', label: 'Rejected', sortOrder: 30, active: true },
  // Import file types
  { enumType: 'import_file_type', value: 'csv',  label: 'CSV',   sortOrder: 10, active: true },
  { enumType: 'import_file_type', value: 'xlsx', label: 'Excel', sortOrder: 20, active: true },
  // Import statuses
  { enumType: 'import_status', value: 'processing',       label: 'Processing',       sortOrder: 10, active: true },
  { enumType: 'import_status', value: 'ready_for_review', label: 'Ready for Review', sortOrder: 20, active: true },
  { enumType: 'import_status', value: 'finalized',        label: 'Finalized',        sortOrder: 30, active: true },
  { enumType: 'import_status', value: 'failed',           label: 'Failed',           sortOrder: 40, active: true },
  // Dedup decisions
  { enumType: 'dedup_decision', value: 'pending', label: 'Pending', sortOrder: 10, active: true },
  { enumType: 'dedup_decision', value: 'merged',  label: 'Merged',  sortOrder: 20, active: true },
  { enumType: 'dedup_decision', value: 'skipped', label: 'Skipped', sortOrder: 30, active: true },
  // Audit actor types
  { enumType: 'audit_actor_type', value: 'admin',  label: 'Admin',  sortOrder: 10, active: true },
  { enumType: 'audit_actor_type', value: 'member', label: 'Member', sortOrder: 20, active: true },
  { enumType: 'audit_actor_type', value: 'system', label: 'System', sortOrder: 30, active: true },
];

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
      const qb = this.repo!.createQueryBuilder('ev');
      if (query.enumType) qb.andWhere('ev.enum_type = :t', { t: query.enumType });
      if (query.activeOnly) qb.andWhere('ev.active = true');
      qb.orderBy('ev.enum_type').addOrderBy('ev.sort_order');
      const rows = await qb.getMany();
      return rows.map(this.toModel);
    }
    let items = Array.from(this.mem.values());
    if (query.enumType) items = items.filter((v) => v.enumType === query.enumType);
    if (query.activeOnly) items = items.filter((v) => v.active);
    return items.sort((a, b) => a.enumType.localeCompare(b.enumType) || a.sortOrder - b.sortOrder);
  }

  async listTypes(): Promise<string[]> {
    if (this.useDb()) {
      const rows = await this.repo!.createQueryBuilder('ev')
        .select('DISTINCT ev.enum_type', 'enumType')
        .orderBy('ev.enum_type')
        .getRawMany<{ enumType: string }>();
      return rows.map((r) => r.enumType);
    }
    const types = new Set(Array.from(this.mem.values()).map((v) => v.enumType));
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
