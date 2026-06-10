import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class RoleDefinitionSchemaBootstrapService implements OnModuleInit {
  constructor(@Optional() @InjectDataSource() private readonly dataSource?: DataSource) {}

  async onModuleInit(): Promise<void> {
    if (!this.dataSource) return;

    await this.dataSource.query(`
      ALTER TABLE adwest.role_definitions
        ADD COLUMN IF NOT EXISTS can_approve_reimbursements boolean NOT NULL DEFAULT false
    `);

    const configTable = await this.dataSource.query(`
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'adwest'
        AND table_name = 'reimbursement_approval_config'
      LIMIT 1
    `) as Array<{ '?column?': number }>;

    if (configTable.length) {
      await this.dataSource.query(`
        UPDATE adwest.role_definitions rd
        SET can_approve_reimbursements = true
        FROM (
          SELECT jsonb_array_elements_text(approver_role_definition_ids) AS role_id
          FROM adwest.reimbursement_approval_config
          WHERE id = 'default'
        ) cfg
        WHERE rd.id = cfg.role_id
          AND rd.can_approve_reimbursements = false
      `);
    }

    await this.dataSource.query(`
      UPDATE adwest.role_definitions
      SET can_approve_reimbursements = true
      WHERE upper(code) = 'ZONE_VYP'
        AND active = true
        AND NOT EXISTS (
          SELECT 1
          FROM adwest.role_definitions
          WHERE can_approve_reimbursements = true
        )
    `);
  }
}
