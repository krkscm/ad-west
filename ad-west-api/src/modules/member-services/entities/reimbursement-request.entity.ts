import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'adwest', name: 'reimbursement_requests' })
export class ReimbursementRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'submitted_by', type: 'varchar', length: 64 })
  submittedBy!: string;

  @Column({ type: 'varchar', length: 40, default: 'other' })
  category!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'AED' })
  currency!: string;

  @Column({ name: 'receipt_url', type: 'text', nullable: true })
  receiptUrl?: string | null;

  @Column({ name: 'receipt_storage_path', type: 'text', nullable: true })
  receiptStoragePath?: string | null;

  @Column({ name: 'receipt_original_name', type: 'text', nullable: true })
  receiptOriginalName?: string | null;

  @Column({ name: 'receipt_mime_type', type: 'varchar', length: 255, nullable: true })
  receiptMimeType?: string | null;

  @Column({ type: 'varchar', length: 40, default: 'draft' })
  status!: string;

  @Column({ name: 'reviewer_notes', type: 'text', nullable: true })
  reviewerNotes?: string | null;

  @Column({ name: 'reviewed_by', type: 'varchar', length: 64, nullable: true })
  reviewedBy?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
