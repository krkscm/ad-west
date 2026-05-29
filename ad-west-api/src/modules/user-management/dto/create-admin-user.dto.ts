import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAdminUserDto {
  @IsString()
  @MaxLength(40)
  code!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  roleDefinitionId!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
