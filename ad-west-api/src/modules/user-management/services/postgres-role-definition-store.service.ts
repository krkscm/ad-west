import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleDefinitionStore } from '../interfaces/role-definition-store.interface';
import { RoleDefinition } from '../interfaces/role-definition.interface';
import { RoleDefinitionEntity } from '../entities/role-definition.entity';

@Injectable()
export class PostgresRoleDefinitionStoreService implements RoleDefinitionStore {
  constructor(
    @InjectRepository(RoleDefinitionEntity)
    private readonly roleDefinitionRepo: Repository<RoleDefinitionEntity>,
  ) {}

  async list(): Promise<RoleDefinition[]> {
    return this.roleDefinitionRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<RoleDefinition | undefined> {
    const found = await this.roleDefinitionRepo.findOne({ where: { id } });
    return found ?? undefined;
  }

  async findByCode(code: string): Promise<RoleDefinition | undefined> {
    const normalized = code.trim().toUpperCase();
    const allRows = await this.roleDefinitionRepo.find();
    return allRows.find((row) => row.code.toUpperCase() === normalized);
  }

  async create(role: RoleDefinition): Promise<void> {
    await this.roleDefinitionRepo.insert(role);
  }

  async save(role: RoleDefinition): Promise<void> {
    await this.roleDefinitionRepo.save(role);
  }

  async delete(id: string): Promise<void> {
    await this.roleDefinitionRepo.delete({ id });
  }
}
