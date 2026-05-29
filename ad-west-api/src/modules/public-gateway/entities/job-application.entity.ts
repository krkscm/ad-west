import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'adwest', name: 'job_applications' })
export class JobApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 30 })
  phone!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email?: string | null;

  @Column({ name: 'resume_url', type: 'text', nullable: true })
  resumeUrl?: string | null;

  @Column({ name: 'resume_storage_path', type: 'text', nullable: true })
  resumeStoragePath?: string | null;

  @Column({ name: 'resume_original_name', type: 'text', nullable: true })
  resumeOriginalName?: string | null;

  @Column({ name: 'resume_mime_type', type: 'varchar', length: 255, nullable: true })
  resumeMimeType?: string | null;

  @Column({ name: 'resume_size_bytes', type: 'integer', nullable: true })
  resumeSizeBytes?: number | null;

  @Column({ name: 'cover_letter', type: 'text', nullable: true })
  coverLetter?: string | null;

  @Column({ type: 'varchar', length: 40, default: 'new' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'reviewed_by', type: 'varchar', length: 64, nullable: true })
  reviewedBy?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
