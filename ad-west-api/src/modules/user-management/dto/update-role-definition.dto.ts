import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';
import { RoleLevel } from '../enums/role-level.enum';

export class UpdateRoleDefinitionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(RoleLevel)
  level?: RoleLevel;

  @IsOptional()
  @IsBoolean()
  canApproveReimbursements?: boolean;
}
