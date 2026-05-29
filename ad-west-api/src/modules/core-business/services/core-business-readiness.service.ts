import type { CoreBusinessPersistenceReadinessRecord } from '../core-business.types';

export class CoreBusinessReadinessService {
  getPersistenceReadiness(coreBusinessStore: 'in-memory' | 'db'): CoreBusinessPersistenceReadinessRecord {
    const authStoreMode = process.env.ENABLE_DB_PERSISTENCE === 'true' ? 'db' : 'in-memory';
    const isProductionRuntime = process.env.NODE_ENV === 'production';
    const blockers: string[] = [];

    if (coreBusinessStore !== 'db') {
      blockers.push('Core Business runtime state is not configured for DB-backed persistence');
    }

    if (authStoreMode !== 'db') {
      blockers.push('Auth store is not running in DB persistence mode');
    }

    const nextSteps = blockers.length
      ? [
          'Set ENABLE_DB_PERSISTENCE=true for API runtime',
          'Run PostgreSQL migration for Core Business runtime state store',
          'Run Core Business regression suite in DB mode before UAT gate',
        ]
      : ['Persistence blockers are cleared for current runtime configuration'];

    return {
      coreBusinessStore,
      authStoreMode,
      isProductionRuntime,
      readyForUat: blockers.length === 0,
      blockers,
      nextSteps,
    };
  }
}