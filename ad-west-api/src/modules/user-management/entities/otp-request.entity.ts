import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('otp_requests')
export class OtpRequestEntity {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  purpose!: 'member-login';

  @Column({ type: 'varchar', length: 64 })
  memberId!: string;

  @Column({ type: 'varchar', length: 160 })
  destination!: string;

  @Column({ type: 'varchar', length: 8 })
  code!: string;

  @Column({ type: 'bigint' })
  expiresAt!: number;

  @Column({ type: 'int', default: 0 })
  attempts!: number;
}
