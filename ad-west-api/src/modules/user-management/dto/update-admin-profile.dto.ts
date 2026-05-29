import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAdminProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  roleDefinitionId?: string;
}
