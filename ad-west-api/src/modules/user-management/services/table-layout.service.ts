import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTableLayoutEntity } from '../entities/user-table-layout.entity';
import {
  CreateTableLayoutDto,
  SetActiveLayoutDto,
  UpdateTableLayoutDto,
} from '../dto/table-layout.dto';
import { CryptoService } from './crypto.service';

export interface TableLayoutItem {
  id: string;
  tableKey: string;
  name: string;
  columns: Array<{ key: string; visible: boolean }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TableLayoutsResponse {
  layouts: TableLayoutItem[];
  activeId: string | null;
}

@Injectable()
export class TableLayoutService {
  private readonly mem = new Map<string, UserTableLayoutEntity>();

  constructor(
    private readonly crypto: CryptoService,
    @Optional() @InjectRepository(UserTableLayoutEntity)
    private readonly repo?: Repository<UserTableLayoutEntity>,
  ) {}

  private useDb(): boolean {
    return !!this.repo;
  }

  private toItem(e: UserTableLayoutEntity): TableLayoutItem {
    return {
      id: e.id,
      tableKey: e.tableKey,
      name: e.name,
      columns: e.columns,
      isActive: e.isActive,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  async list(userId: string, tableKey: string): Promise<TableLayoutsResponse> {
    let rows: UserTableLayoutEntity[];

    if (this.useDb()) {
      rows = await this.repo!.find({
        where: { userId, tableKey },
        order: { createdAt: 'ASC' },
      });
    } else {
      rows = Array.from(this.mem.values()).filter(
        (e) => e.userId === userId && e.tableKey === tableKey,
      );
      rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }

    const layouts = rows.map((e) => this.toItem(e));
    const active = layouts.find((l) => l.isActive) ?? null;
    return { layouts, activeId: active?.id ?? null };
  }

  async create(userId: string, dto: CreateTableLayoutDto): Promise<TableLayoutItem> {
    const now = new Date().toISOString();

    if (dto.setActive) {
      await this.deactivateAll(userId, dto.tableKey);
    }

    const entity = {
      id: this.crypto.randomId('tl'),
      userId,
      tableKey: dto.tableKey,
      name: dto.name,
      columns: dto.columns,
      isActive: dto.setActive ?? false,
      createdAt: now,
      updatedAt: now,
    } as UserTableLayoutEntity;

    if (this.useDb()) {
      await this.repo!.insert(entity);
    } else {
      this.mem.set(entity.id, entity);
    }

    return this.toItem(entity);
  }

  async update(userId: string, id: string, dto: UpdateTableLayoutDto): Promise<TableLayoutItem> {
    const entity = await this.findOwned(userId, id);
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.columns !== undefined) entity.columns = dto.columns;
    entity.updatedAt = new Date().toISOString();

    if (this.useDb()) {
      await this.repo!.save(entity);
    } else {
      this.mem.set(entity.id, entity);
    }

    return this.toItem(entity);
  }

  async remove(userId: string, id: string): Promise<{ success: boolean }> {
    const entity = await this.findOwned(userId, id);

    if (this.useDb()) {
      await this.repo!.delete(entity.id);
    } else {
      this.mem.delete(entity.id);
    }

    return { success: true };
  }

  async setActive(userId: string, tableKey: string, dto: SetActiveLayoutDto): Promise<void> {
    await this.deactivateAll(userId, tableKey);

    if (dto.layoutId) {
      const entity = await this.findOwned(userId, dto.layoutId);
      if (entity.tableKey !== tableKey) {
        throw new ForbiddenException('Layout does not belong to this table');
      }
      entity.isActive = true;
      entity.updatedAt = new Date().toISOString();

      if (this.useDb()) {
        await this.repo!.save(entity);
      } else {
        this.mem.set(entity.id, entity);
      }
    }
  }

  private async deactivateAll(userId: string, tableKey: string): Promise<void> {
    if (this.useDb()) {
      await this.repo!
        .createQueryBuilder()
        .update(UserTableLayoutEntity)
        .set({ isActive: false })
        .where('user_id = :userId AND table_key = :tableKey', { userId, tableKey })
        .execute();
    } else {
      for (const e of this.mem.values()) {
        if (e.userId === userId && e.tableKey === tableKey) {
          e.isActive = false;
        }
      }
    }
  }

  private async findOwned(userId: string, id: string): Promise<UserTableLayoutEntity> {
    let entity: UserTableLayoutEntity | null | undefined;

    if (this.useDb()) {
      entity = await this.repo!.findOne({ where: { id } });
    } else {
      entity = this.mem.get(id);
    }

    if (!entity) throw new NotFoundException('Layout not found');
    if (entity.userId !== userId) throw new ForbiddenException('Access denied');
    return entity;
  }
}
