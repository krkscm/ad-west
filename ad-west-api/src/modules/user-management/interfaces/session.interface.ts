export interface SessionRecord {
  tokenId: string;
  userId: string;
  type: 'admin' | 'member';
  expiresAt: number;
}
