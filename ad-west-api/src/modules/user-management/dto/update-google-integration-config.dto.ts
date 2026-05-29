import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateGoogleIntegrationConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  clientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  clientSecret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  redirectUri?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  oauthScopes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  webAppOrigin?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  clearClientSecret?: boolean;
}
