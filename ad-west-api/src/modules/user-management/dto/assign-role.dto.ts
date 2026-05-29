import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { AdminRole, ScopeType } from '../enums/admin-role.enum';

export class AssignRoleDto {
  @IsEnum(AdminRole)
  role!: AdminRole;

  @IsEnum(['global', 'zone', 'sreny'])
  scopeType!: ScopeType;

  @IsOptional()
  @IsString()
  scopeId?: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
