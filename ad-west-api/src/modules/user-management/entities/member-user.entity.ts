import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('member_users')
export class MemberUserEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 160 })
  fullName!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone?: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;
}
