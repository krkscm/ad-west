import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoreBusinessRuntimeStateEntity } from '../entities/core-business-runtime-state.entity';
import { CoreBusinessStore } from './core-business-store.interface';

const CORE_BUSINESS_RUNTIME_STATE_ID = 'core_business_runtime';

@Injectable()
export class PostgresCoreBusinessStoreService implements CoreBusinessStore {
  constructor(
    @InjectRepository(CoreBusinessRuntimeStateEntity)
    private readonly runtimeStateRepo: Repository<CoreBusinessRuntimeStateEntity>,
  ) {}

  getMode(): 'in-memory' | 'db' {
    return 'db';
  }

  async loadState(): Promise<string | null> {
    const row = await this.runtimeStateRepo.findOne({
      where: { id: CORE_BUSINESS_RUNTIME_STATE_ID },
    });

    if (!row) {
      return null;
    }

    return JSON.stringify(row.stateJson ?? {});
  }

  async saveState(stateJson: string): Promise<void> {
    const parsed = JSON.parse(stateJson) as Record<string, unknown>;
    const now = new Date();

    await this.runtimeStateRepo.save({
      id: CORE_BUSINESS_RUNTIME_STATE_ID,
      stateJson: parsed,
      createdAt: now,
      updatedAt: now,
    });
  }
}

