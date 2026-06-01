import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'adwest', name: 'user_table_layouts' })
export class UserTableLayoutEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId!: string;

  @Column({ name: 'table_key', type: 'varchar', length: 120 })
  tableKey!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  columns!: Array<{ key: string; visible: boolean }>;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive!: boolean;

  @Column({ name: 'created_at', type: 'varchar', length: 40 })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'varchar', length: 40 })
  updatedAt!: string;
}
