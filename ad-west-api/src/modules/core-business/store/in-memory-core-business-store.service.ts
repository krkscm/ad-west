import { Injectable } from '@nestjs/common';
import { CoreBusinessStore } from './core-business-store.interface';

@Injectable()
export class InMemoryCoreBusinessStoreService implements CoreBusinessStore {
  private stateJson: string | null = null;

  getMode(): 'in-memory' | 'db' {
    return 'in-memory';
  }

  async loadState(): Promise<string | null> {
    return this.stateJson;
  }

  async saveState(stateJson: string): Promise<void> {
    this.stateJson = stateJson;
  }
}

