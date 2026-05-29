import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'adwest', name: 'core_business_runtime_state' })
export class CoreBusinessRuntimeStateEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'state_json', type: 'jsonb', default: () => "'{}'::jsonb" })
  stateJson!: Record<string, unknown>;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

