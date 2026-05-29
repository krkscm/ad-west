import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'adwest', name: 'admin_menu_grants' })
export class AdminMenuGrantEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'admin_user_id', type: 'varchar', length: 64 })
  adminUserId!: string;

  @Column({ name: 'menu_key', type: 'varchar', length: 80 })
  menuKey!: string;

  @Column({ name: 'granted_by', type: 'varchar', length: 64 })
  grantedBy!: string;

  @Column({ name: 'granted_at', type: 'varchar', length: 40 })
  grantedAt!: string;
}
