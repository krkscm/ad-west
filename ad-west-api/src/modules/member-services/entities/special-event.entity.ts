import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'adwest', name: 'special_events' })
export class SpecialEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'date_time', type: 'timestamptz' })
  dateTime!: Date;

  @Column({ name: 'end_date_time', type: 'timestamptz', nullable: true })
  endDateTime?: Date | null;

  @Column({ type: 'text', nullable: true })
  venue?: string | null;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic!: boolean;

  @Column({ name: 'registration_enabled', type: 'boolean', default: false })
  registrationEnabled!: boolean;

  @Column({ name: 'created_by', type: 'varchar', length: 64, nullable: true })
  createdBy?: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
