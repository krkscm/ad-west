import { RoleDefinition } from './role-definition.interface';

export interface RoleDefinitionStore {
  list(): Promise<RoleDefinition[]>;
  findById(id: string): Promise<RoleDefinition | undefined>;
  findByCode(code: string): Promise<RoleDefinition | undefined>;
  create(role: RoleDefinition): Promise<void>;
  save(role: RoleDefinition): Promise<void>;
  delete(id: string): Promise<void>;
}
