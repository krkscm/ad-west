import { Column, Entity, PrimaryColumn } from 'typeorm';
import { RoleAssignment } from '../interfaces/admin-user.interface';

@Entity({ schema: 'adwest', name: 'auth_admin_users' })
export class AdminUserEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  email!: string;

  @Column({ name: 'role_definition_id', type: 'varchar', length: 64, nullable: true })
  roleDefinitionId?: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ name: 'failed_attempts', type: 'int', default: 0 })
  failedAttempts!: number;

  @Column({ name: 'locked_until', type: 'bigint', nullable: true })
  lockedUntil?: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  roles!: RoleAssignment[];

  @Column({ name: 'created_at', type: 'varchar', length: 40 })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'varchar', length: 40 })
  updatedAt!: string;
}
