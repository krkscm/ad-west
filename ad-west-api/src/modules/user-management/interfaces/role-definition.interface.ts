import { RoleLevel } from '../enums/role-level.enum';

export interface RoleDefinition {
  id: string;
  code: string;
  name: string;
  active: boolean;
  level: RoleLevel;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}
