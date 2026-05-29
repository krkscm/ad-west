/*
  DDL (run once in PostgreSQL before enabling DB persistence):

  CREATE TABLE adwest.approval_workflow_definitions (
    id            VARCHAR(64)  PRIMARY KEY,
    code          VARCHAR(40)  NOT NULL UNIQUE,
    name          VARCHAR(120) NOT NULL,
    description   TEXT,
    approval_mode VARCHAR(60)  NOT NULL DEFAULT 'sequential',
    is_active     BOOLEAN      NOT NULL DEFAULT true,
    stages        JSONB        NOT NULL DEFAULT '[]'::jsonb,
    created_by    VARCHAR(64)  NOT NULL,
    created_at    VARCHAR(40)  NOT NULL,
    updated_by    VARCHAR(64)  NOT NULL,
    updated_at    VARCHAR(40)  NOT NULL
  );
*/

import { Column, Entity, PrimaryColumn } from 'typeorm';
import { ApprovalWorkflowStage } from '../interfaces/approval-workflow.interface';

@Entity({ schema: 'adwest', name: 'approval_workflow_definitions' })
export class ApprovalWorkflowDefinitionEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'approval_mode', type: 'varchar', length: 60, default: 'sequential' })
  approvalMode!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  stages!: ApprovalWorkflowStage[];

  @Column({ name: 'created_by', type: 'varchar', length: 64 })
  createdBy!: string;

  @Column({ name: 'created_at', type: 'varchar', length: 40 })
  createdAt!: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 64 })
  updatedBy!: string;

  @Column({ name: 'updated_at', type: 'varchar', length: 40 })
  updatedAt!: string;
}
