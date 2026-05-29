import { Injectable } from '@nestjs/common';
import { RoleDefinitionStore } from '../interfaces/role-definition-store.interface';
import { RoleDefinition } from '../interfaces/role-definition.interface';

@Injectable()
export class InMemoryRoleDefinitionStoreService implements RoleDefinitionStore {
  private readonly roles = new Map<string, RoleDefinition>();

  async list(): Promise<RoleDefinition[]> {
    return [...this.roles.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findById(id: string): Promise<RoleDefinition | undefined> {
    return this.roles.get(id);
  }

  async findByCode(code: string): Promise<RoleDefinition | undefined> {
    const normalized = code.trim().toUpperCase();
    return [...this.roles.values()].find((role) => role.code.toUpperCase() === normalized);
  }

  async create(role: RoleDefinition): Promise<void> {
    this.roles.set(role.id, role);
  }

  async save(role: RoleDefinition): Promise<void> {
    this.roles.set(role.id, role);
  }

  async delete(id: string): Promise<void> {
    this.roles.delete(id);
  }
}
