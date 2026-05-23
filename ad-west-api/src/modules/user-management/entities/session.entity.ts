import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('auth_sessions')
export class SessionEntity {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  tokenId!: string;

  @Column({ type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: 'admin' | 'member';

  @Column({ type: 'bigint' })
  expiresAt!: number;
}
