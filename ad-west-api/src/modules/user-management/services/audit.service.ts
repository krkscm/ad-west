import { Inject, Injectable } from '@nestjs/common';
import { USER_STORE } from '../constants';
import { AuditLogEntry } from '../interfaces/audit-log.interface';
import { UserStore } from '../interfaces/user-store.interface';
import { CryptoService } from './crypto.service';

@Injectable()
export class AuditService {
  constructor(
    @Inject(USER_STORE) private readonly store: UserStore,
    private readonly cryptoService: CryptoService,
  ) {}

  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    await this.store.saveAudit({
      id: this.cryptoService.randomId('audit'),
      timestamp: new Date().toISOString(),
      ...entry,
    });
  }

  async list(action?: string): Promise<AuditLogEntry[]> {
    const all = await this.store.listAudit();
    if (!action) {
      return all;
    }

    const normalized = action.trim().toLowerCase();
    return all.filter((item) => item.action.toLowerCase().includes(normalized));
  }
}
