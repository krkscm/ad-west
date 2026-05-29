import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateApprovalWorkflowStageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsString()
  approverPermissionSetId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approverRoleDefinitionIds?: string[];

  @IsOptional()
  @IsString()
  parentStageId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requiredCount?: number;

}

export class CreateApprovalWorkflowDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  approvalMode!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateApprovalWorkflowStageDto)
  stages?: CreateApprovalWorkflowStageDto[];
}

export class UpdateApprovalWorkflowDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  approvalMode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateApprovalWorkflowStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

export class UpdateApprovalWorkflowStageDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stageOrder?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  approverPermissionSetId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approverRoleDefinitionIds?: string[];

  @IsOptional()
  @IsString()
  parentStageId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requiredCount?: number;
}

export class ListApprovalWorkflowsQueryDto {
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
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  approvalMode?: string;
}

export class SubmitApprovalWorkflowItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  targetId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;
}

export class ReviewApprovalWorkflowItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  stageId!: string;

  @IsString()
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
