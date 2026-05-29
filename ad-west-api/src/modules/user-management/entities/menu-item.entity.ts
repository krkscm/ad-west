import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'adwest', name: 'menu_items' })
export class MenuItemEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 80 })
  key!: string;

  @Column({ type: 'varchar', length: 120 })
  label!: string;

  @Column({ name: 'parent_key', type: 'varchar', length: 80, nullable: true })
  parentKey!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  icon!: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ name: 'created_at', type: 'varchar', length: 40 })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'varchar', length: 40 })
  updatedAt!: string;
}
