import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  @MaxLength(80)
  key!: string;

  @IsString()
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  parentKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
