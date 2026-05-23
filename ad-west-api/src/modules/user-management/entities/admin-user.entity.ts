import { Column, Entity, PrimaryColumn } from 'typeorm';
import { RoleAssignment } from '../interfaces/admin-user.interface';

@Entity('admin_users')
export class AdminUserEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'boolean', default: false })
  mfaEnabled!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  totpSecret?: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  roles!: RoleAssignment[];

  @Column({ type: 'varchar', length: 40 })
  createdAt!: string;

  @Column({ type: 'varchar', length: 40 })
  updatedAt!: string;
}
