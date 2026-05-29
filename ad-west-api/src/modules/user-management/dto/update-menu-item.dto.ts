import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateMenuItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  parentKey?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
