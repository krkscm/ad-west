import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'adwest', name: 'event_registrations' })
export class EventRegistrationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ name: 'form_data', type: 'jsonb', default: '{}' })
  formData!: Record<string, unknown>;

  @Column({ name: 'submitted_at', type: 'timestamptz' })
  submittedAt!: Date;
}
