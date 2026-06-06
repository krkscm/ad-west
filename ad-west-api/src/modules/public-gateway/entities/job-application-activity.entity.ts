import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'adwest', name: 'job_application_activities' })
export class JobApplicationActivityEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId!: string;

  @Column({ type: 'varchar', length: 40 })
  action!: string;

  @Column({ name: 'from_status', type: 'varchar', length: 40, nullable: true })
  fromStatus?: string | null;

  @Column({ name: 'to_status', type: 'varchar', length: 40, nullable: true })
  toStatus?: string | null;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Column({ name: 'actor_id', type: 'varchar', length: 64, nullable: true })
  actorId?: string | null;

  @Column({ name: 'actor_label', type: 'text', nullable: true })
  actorLabel?: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
