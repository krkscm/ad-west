import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'adwest', name: 'auth_member_users' })
export class MemberUserEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 160 })
  fullName!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone?: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'failed_attempts', type: 'int', default: 0 })
  failedAttempts!: number;

  @Column({ name: 'locked_until', type: 'bigint', nullable: true })
  lockedUntil?: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;
}
