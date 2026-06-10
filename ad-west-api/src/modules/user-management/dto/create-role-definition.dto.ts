import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';
import { RoleLevel } from '../enums/role-level.enum';

export class CreateRoleDefinitionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEnum(RoleLevel)
  level!: RoleLevel;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  canApproveReimbursements?: boolean;
}
