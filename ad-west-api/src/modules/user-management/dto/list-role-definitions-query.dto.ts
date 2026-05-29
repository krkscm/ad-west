import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { RoleLevel } from '../enums/role-level.enum';

export class ListRoleDefinitionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return value;
  })
  active?: boolean;

  @IsOptional()
  @IsEnum(RoleLevel)
  level?: RoleLevel;
}
