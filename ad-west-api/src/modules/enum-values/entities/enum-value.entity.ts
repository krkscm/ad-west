/*
  DDL (run once in PostgreSQL before enabling DB persistence):

  CREATE TABLE adwest.enum_values (
    id          VARCHAR(64)  PRIMARY KEY,
    enum_type   VARCHAR(60)  NOT NULL,
    value       VARCHAR(60)  NOT NULL,
    label       VARCHAR(120) NOT NULL,
    sort_order  INT          NOT NULL DEFAULT 0,
    active      BOOLEAN      NOT NULL DEFAULT true,
    created_at  VARCHAR(40)  NOT NULL,
    updated_at  VARCHAR(40)  NOT NULL,
    CONSTRAINT uq_enum_values_type_value UNIQUE (enum_type, value)
  );

  CREATE INDEX idx_enum_values_type ON adwest.enum_values (enum_type);
*/

import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'adwest', name: 'enum_values' })
export class EnumValueEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'enum_type', type: 'varchar', length: 60 })
  enumType!: string;

  @Column({ type: 'varchar', length: 60 })
  value!: string;

  @Column({ type: 'varchar', length: 120 })
  label!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ name: 'created_at', type: 'varchar', length: 40 })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'varchar', length: 40 })
  updatedAt!: string;
}
