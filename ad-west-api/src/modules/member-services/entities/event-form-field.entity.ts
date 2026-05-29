import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'adwest', name: 'event_form_fields' })
export class EventFormFieldEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ name: 'field_type', type: 'varchar', length: 40, default: 'text' })
  fieldType!: string;

  @Column({ type: 'text' })
  label!: string;

  @Column({ type: 'text', nullable: true })
  placeholder?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  options?: string[] | null;

  @Column({ name: 'is_required', type: 'boolean', default: false })
  isRequired!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;
}
