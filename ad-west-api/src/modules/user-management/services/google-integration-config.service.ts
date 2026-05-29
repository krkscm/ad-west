import { Injectable, Optional } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { UpdateGoogleIntegrationConfigDto } from '../dto/update-google-integration-config.dto';

export interface GoogleIntegrationConfigView {
  clientId: string;
  redirectUri: string;
  oauthScopes: string;
  webAppOrigin: string;
  enabled: boolean;
  hasClientSecret: boolean;
  updatedAt?: string;
}

export interface GoogleIntegrationResolvedConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  oauthScopes: string;
  webAppOrigin: string;
  enabled: boolean;
}

interface DbRow {
  id: string;
  client_id: string | null;
  client_secret: string | null;
  redirect_uri: string | null;
  oauth_scopes: string | null;
  web_app_origin: string | null;
  enabled: boolean;
  updated_at: string;
}

@Injectable()
export class GoogleIntegrationConfigService {
  private readonly memConfig: GoogleIntegrationResolvedConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/google/callback',
    oauthScopes: process.env.GOOGLE_OAUTH_SCOPES || 'openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly',
    webAppOrigin: process.env.WEB_APP_ORIGIN || 'http://localhost:3000',
    enabled: true,
  };

  constructor(@Optional() @Inject(DataSource) private readonly dataSource?: DataSource) {}

  async getSettingsView(): Promise<GoogleIntegrationConfigView> {
    const resolved = await this.getResolvedConfig();
    const row = await this.getDbRow();
    return {
      clientId: resolved.clientId,
      redirectUri: resolved.redirectUri,
      oauthScopes: resolved.oauthScopes,
      webAppOrigin: resolved.webAppOrigin,
      enabled: resolved.enabled,
      hasClientSecret: resolved.clientSecret.length > 0,
      updatedAt: row?.updated_at,
    };
  }

  async getResolvedConfig(): Promise<GoogleIntegrationResolvedConfig> {
    const row = await this.getDbRow();
    if (!row) {
      return { ...this.memConfig };
    }

    return {
      clientId: row.client_id?.trim() || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: row.client_secret?.trim() || process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: row.redirect_uri?.trim() || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/google/callback',
      oauthScopes: row.oauth_scopes?.trim() || process.env.GOOGLE_OAUTH_SCOPES || 'openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly',
      webAppOrigin: row.web_app_origin?.trim() || process.env.WEB_APP_ORIGIN || 'http://localhost:3000',
      enabled: row.enabled,
    };
  }

  async update(dto: UpdateGoogleIntegrationConfigDto, principal: AuthPrincipal): Promise<GoogleIntegrationConfigView> {
    if (!this.dataSource) {
      this.memConfig.clientId = dto.clientId?.trim() ?? this.memConfig.clientId;
      this.memConfig.redirectUri = dto.redirectUri?.trim() ?? this.memConfig.redirectUri;
      this.memConfig.oauthScopes = dto.oauthScopes?.trim() ?? this.memConfig.oauthScopes;
      this.memConfig.webAppOrigin = dto.webAppOrigin?.trim() ?? this.memConfig.webAppOrigin;
      this.memConfig.enabled = dto.enabled ?? this.memConfig.enabled;
      if (dto.clearClientSecret) {
        this.memConfig.clientSecret = '';
      } else if (dto.clientSecret && dto.clientSecret.trim().length > 0) {
        this.memConfig.clientSecret = dto.clientSecret.trim();
      }

      return {
        clientId: this.memConfig.clientId,
        redirectUri: this.memConfig.redirectUri,
        oauthScopes: this.memConfig.oauthScopes,
        webAppOrigin: this.memConfig.webAppOrigin,
        enabled: this.memConfig.enabled,
        hasClientSecret: this.memConfig.clientSecret.length > 0,
      };
    }

    const existing = await this.getDbRow();
    const updaterId = await this.resolveUpdaterId(principal.userId);
    const nextClientSecret = dto.clearClientSecret
      ? null
      : dto.clientSecret !== undefined && dto.clientSecret.trim().length > 0
      ? dto.clientSecret.trim()
      : existing?.client_secret ?? null;

    await this.dataSource.query(
      `
      INSERT INTO adwest.integration_google_config
        (id, client_id, client_secret, redirect_uri, oauth_scopes, web_app_origin, enabled, updated_by, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        client_id = EXCLUDED.client_id,
        client_secret = EXCLUDED.client_secret,
        redirect_uri = EXCLUDED.redirect_uri,
        oauth_scopes = EXCLUDED.oauth_scopes,
        web_app_origin = EXCLUDED.web_app_origin,
        enabled = EXCLUDED.enabled,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      `,
      [
        'default',
        dto.clientId?.trim() ?? existing?.client_id ?? null,
        nextClientSecret,
        dto.redirectUri?.trim() ?? existing?.redirect_uri ?? null,
        dto.oauthScopes?.trim() ?? existing?.oauth_scopes ?? null,
        dto.webAppOrigin?.trim() ?? existing?.web_app_origin ?? null,
        dto.enabled ?? existing?.enabled ?? true,
        updaterId,
      ],
    );

    return this.getSettingsView();
  }

  private async getDbRow(): Promise<DbRow | null> {
    if (!this.dataSource) {
      return null;
    }

    const rows = await this.dataSource.query(
      `
      SELECT id, client_id, client_secret, redirect_uri, oauth_scopes, web_app_origin, enabled, updated_at
      FROM adwest.integration_google_config
      WHERE id = $1
      LIMIT 1
      `,
      ['default'],
    ) as DbRow[];

    return rows[0] ?? null;
  }

  private async resolveUpdaterId(userId: string): Promise<string | null> {
    if (!this.dataSource) {
      return null;
    }

    const rows = await this.dataSource.query(
      'SELECT id FROM adwest.auth_admin_users WHERE id = $1 LIMIT 1',
      [userId],
    ) as Array<{ id: string }>;

    return rows[0]?.id ?? null;
  }
}
