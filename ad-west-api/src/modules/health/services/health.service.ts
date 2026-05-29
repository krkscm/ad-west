import { Inject, Injectable, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface HealthDependencyCheck {
  name: string;
  status: 'up' | 'down' | 'skipped';
  message: string;
  latencyMs?: number;
}

export interface HealthResponse {
  success: boolean;
  status: 'ok' | 'degraded';
  message: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  checks: HealthDependencyCheck[];
}

@Injectable()
export class HealthService {
  constructor(
    @Optional() @Inject(DataSource) private readonly dataSource?: DataSource,
  ) {}

  async getHealth(): Promise<HealthResponse> {
    const checks: HealthDependencyCheck[] = [];
    const dbModeEnabled = process.env.ENABLE_DB_PERSISTENCE === 'true';

    if (!dbModeEnabled) {
      checks.push({
        name: 'database',
        status: 'skipped',
        message: 'DB persistence is disabled in this runtime mode',
      });
    } else if (!this.dataSource) {
      checks.push({
        name: 'database',
        status: 'down',
        message: 'DB persistence is enabled but DataSource is unavailable',
      });
    } else {
      const startedAt = Date.now();
      try {
        await this.dataSource.query('SELECT 1');
        checks.push({
          name: 'database',
          status: 'up',
          message: 'PostgreSQL connection is healthy',
          latencyMs: Date.now() - startedAt,
        });
      } catch (error) {
        checks.push({
          name: 'database',
          status: 'down',
          message: `PostgreSQL health probe failed: ${(error as Error).message}`,
          latencyMs: Date.now() - startedAt,
        });
      }
    }

    const success = checks.every((check) => check.status !== 'down');

    return {
      success,
      status: success ? 'ok' : 'degraded',
      message: success ? 'API is healthy' : 'API health check failed',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      checks,
    };
  }
}
