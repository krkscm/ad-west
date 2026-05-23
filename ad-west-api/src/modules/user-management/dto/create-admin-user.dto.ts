import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { AdminRole, ScopeType } from '../enums/admin-role.enum';

export class CreateAdminUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(AdminRole)
  role!: AdminRole;

  @IsEnum(['global', 'zone', 'sreny'])
  scopeType!: ScopeType;

  @IsOptional()
  @IsString()
  scopeId?: string;
}
