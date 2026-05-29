export interface CoreBusinessStore {
  getMode(): 'in-memory' | 'db';
  loadState(): Promise<string | null>;
  saveState(stateJson: string): Promise<void>;
}

