import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateSmtpIntegrationConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  host?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fromName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  encryption?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imapHost?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  imapPort?: number;

  @IsOptional()
  @IsBoolean()
  clearPassword?: boolean;
}
