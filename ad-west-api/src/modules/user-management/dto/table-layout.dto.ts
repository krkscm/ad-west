import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ColumnConfigDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsBoolean()
  visible!: boolean;
}

export class CreateTableLayoutDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  tableKey!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnConfigDto)
  columns!: ColumnConfigDto[];

  @IsOptional()
  @IsBoolean()
  setActive?: boolean;
}

export class UpdateTableLayoutDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnConfigDto)
  columns?: ColumnConfigDto[];
}

export class SetActiveLayoutDto {
  @IsOptional()
  @IsString()
  layoutId?: string | null;
}

export class TableLayoutQueryDto {
  @IsString()
  @IsNotEmpty()
  tableKey!: string;
}
