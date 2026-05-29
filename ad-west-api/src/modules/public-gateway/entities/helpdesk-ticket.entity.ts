import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'adwest', name: 'helpdesk_tickets' })
export class HelpdeskTicketEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 30 })
  phone!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 40, default: 'general' })
  category!: string;

  @Column({ type: 'varchar', length: 300 })
  subject!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 40, default: 'open' })
  status!: string;

  @Column({ name: 'assigned_to', type: 'varchar', length: 64, nullable: true })
  assignedTo?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
