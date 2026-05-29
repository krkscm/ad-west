import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'adwest', name: 'auth_sessions' })
export class SessionEntity {
  @PrimaryColumn({ name: 'token_id', type: 'varchar', length: 80 })
  tokenId!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: 'admin' | 'member';

  @Column({ name: 'expires_at', type: 'bigint' })
  expiresAt!: number;
}
