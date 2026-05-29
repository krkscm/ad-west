import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateEnumValueDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  enumType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  value!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateEnumValueDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  value?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ListEnumValuesQueryDto {
  @IsOptional()
  @IsString()
  enumType?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true')
  @IsBoolean()
  activeOnly?: boolean;
}
