import { Column, Entity, PrimaryColumn } from 'typeorm';
import { RoleLevel } from '../enums/role-level.enum';

@Entity({ schema: 'adwest', name: 'role_definitions' })
export class RoleDefinitionEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 40 })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'varchar', length: 16 })
  level!: RoleLevel;

  @Column({ name: 'created_by', type: 'varchar', length: 64 })
  createdBy!: string;

  @Column({ name: 'created_at', type: 'varchar', length: 40 })
  createdAt!: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 64 })
  updatedBy!: string;

  @Column({ name: 'updated_at', type: 'varchar', length: 40 })
  updatedAt!: string;
}
