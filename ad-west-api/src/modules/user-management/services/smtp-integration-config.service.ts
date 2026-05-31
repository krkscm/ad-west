import { Injectable, Optional } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { UpdateSmtpIntegrationConfigDto } from '../dto/update-smtp-integration-config.dto';

export interface SmtpIntegrationConfigView {
  host: string;
  port: number;
  username: string;
  fromName: string;
  encryption: string;
  imapHost: string;
  imapPort: number;
  enabled: boolean;
  hasPassword: boolean;
  updatedAt?: string;
}

export interface SmtpResolvedConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  fromName: string;
  encryption: string;
  imapHost: string;
  imapPort: number;
  enabled: boolean;
}

interface DbRow {
  id: string;
  host: string | null;
  port: number | null;
  username: string | null;
  password: string | null;
  from_name: string | null;
  encryption: string | null;
  imap_host: string | null;
  imap_port: number | null;
  enabled: boolean;
  updated_at: string;
}

@Injectable()
export class SmtpIntegrationConfigService {
  private readonly memConfig: SmtpResolvedConfig = {
    host: '',
    port: 587,
    username: '',
    password: '',
    fromName: '',
    encryption: 'TLS',
    imapHost: '',
    imapPort: 993,
    enabled: false,
  };

  constructor(@Optional() @Inject(DataSource) private readonly dataSource?: DataSource) {}

  async getSettingsView(): Promise<SmtpIntegrationConfigView> {
    const resolved = await this.getResolvedConfig();
    const row = await this.getDbRow();
    return {
      host: resolved.host,
      port: resolved.port,
      username: resolved.username,
      fromName: resolved.fromName,
      encryption: resolved.encryption,
      imapHost: resolved.imapHost,
      imapPort: resolved.imapPort,
      enabled: resolved.enabled,
      hasPassword: resolved.password.length > 0,
      updatedAt: row?.updated_at,
    };
  }

  async getResolvedConfig(): Promise<SmtpResolvedConfig> {
    const row = await this.getDbRow();
    if (!row) {
      return { ...this.memConfig };
    }

    return {
      host: row.host?.trim() || '',
      port: row.port ?? 587,
      username: row.username?.trim() || '',
      password: row.password?.trim() || '',
      fromName: row.from_name?.trim() || '',
      encryption: row.encryption?.trim() || 'TLS',
      imapHost: row.imap_host?.trim() || '',
      imapPort: row.imap_port ?? 993,
      enabled: row.enabled,
    };
  }

  async update(dto: UpdateSmtpIntegrationConfigDto, principal: AuthPrincipal): Promise<SmtpIntegrationConfigView> {
    if (!this.dataSource) {
      this.memConfig.host = dto.host?.trim() ?? this.memConfig.host;
      this.memConfig.port = dto.port ?? this.memConfig.port;
      this.memConfig.username = dto.username?.trim() ?? this.memConfig.username;
      this.memConfig.fromName = dto.fromName?.trim() ?? this.memConfig.fromName;
      this.memConfig.encryption = dto.encryption?.trim() ?? this.memConfig.encryption;
      this.memConfig.imapHost = dto.imapHost?.trim() ?? this.memConfig.imapHost;
      this.memConfig.imapPort = dto.imapPort ?? this.memConfig.imapPort;
      this.memConfig.enabled = dto.enabled ?? this.memConfig.enabled;
      if (dto.clearPassword) {
        this.memConfig.password = '';
      } else if (dto.password && dto.password.trim().length > 0) {
        this.memConfig.password = dto.password.trim();
      }

      return {
        host: this.memConfig.host,
        port: this.memConfig.port,
        username: this.memConfig.username,
        fromName: this.memConfig.fromName,
        encryption: this.memConfig.encryption,
        imapHost: this.memConfig.imapHost,
        imapPort: this.memConfig.imapPort,
        enabled: this.memConfig.enabled,
        hasPassword: this.memConfig.password.length > 0,
      };
    }

    const existing = await this.getDbRow();
    const updaterId = await this.resolveUpdaterId(principal.userId);
    const nextPassword = dto.clearPassword
      ? null
      : dto.password !== undefined && dto.password.trim().length > 0
      ? dto.password.trim()
      : existing?.password ?? null;

    await this.dataSource.query(
      `
      INSERT INTO adwest.integration_smtp_config
        (id, host, port, username, password, from_name, encryption, imap_host, imap_port, enabled, updated_by, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        host = EXCLUDED.host,
        port = EXCLUDED.port,
        username = EXCLUDED.username,
        password = EXCLUDED.password,
        from_name = EXCLUDED.from_name,
        encryption = EXCLUDED.encryption,
        imap_host = EXCLUDED.imap_host,
        imap_port = EXCLUDED.imap_port,
        enabled = EXCLUDED.enabled,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      `,
      [
        'default',
        dto.host?.trim() ?? existing?.host ?? null,
        dto.port ?? existing?.port ?? 587,
        dto.username?.trim() ?? existing?.username ?? null,
        nextPassword,
        dto.fromName?.trim() ?? existing?.from_name ?? null,
        dto.encryption?.trim() ?? existing?.encryption ?? 'TLS',
        dto.imapHost?.trim() ?? existing?.imap_host ?? null,
        dto.imapPort ?? existing?.imap_port ?? 993,
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
      SELECT id, host, port, username, password, from_name, encryption, imap_host, imap_port, enabled, updated_at
      FROM adwest.integration_smtp_config
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
