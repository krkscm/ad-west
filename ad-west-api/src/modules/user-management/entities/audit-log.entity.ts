import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'adwest', name: 'auth_audit_logs' })
export class AuditLogEntity {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  id!: string;

  @Column({ name: 'actor_id', type: 'varchar', length: 64 })
  actorId!: string;

  @Column({ name: 'actor_type', type: 'varchar', length: 16 })
  actorType!: 'admin' | 'member' | 'system';

  @Column({ type: 'varchar', length: 120 })
  action!: string;

  @Column({ name: 'target_type', type: 'varchar', length: 64 })
  targetType!: string;

  @Column({ name: 'target_id', type: 'varchar', length: 80 })
  targetId!: string;

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, unknown>;

  @Column({ type: 'varchar', length: 40 })
  timestamp!: string;
}
