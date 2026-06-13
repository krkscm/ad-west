import { DataSource } from 'typeorm';

export class CoreBusinessDbBootstrapService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logWarning: (message: string) => void,
  ) {}

  async ensureRuntimeSchema(): Promise<void> {
    try {
      await this.dataSource.query(
        `ALTER TABLE adwest.users ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT FALSE`,
      );
      await this.dataSource.query(
        `ALTER TABLE adwest.auth_member_users ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT FALSE`,
      );
      await this.dataSource.query(
        `ALTER TABLE adwest.users ADD COLUMN IF NOT EXISTS permission_set_id VARCHAR(64)`,
      );
      await this.dataSource.query(
        `ALTER TABLE adwest.users ADD COLUMN IF NOT EXISTS admin_management VARCHAR(60)`,
      );
      await this.dataSource.query(
        `ALTER TABLE adwest.users ADD COLUMN IF NOT EXISTS reporting_to_role_ids TEXT[] NOT NULL DEFAULT '{}'`,
      );
      await this.dataSource.query(
        `ALTER TABLE adwest.srenies ADD COLUMN IF NOT EXISTS join_us_visible BOOLEAN NOT NULL DEFAULT FALSE`,
      );
      await this.dataSource.query(
        `ALTER TABLE adwest.approval_items ADD COLUMN IF NOT EXISTS target_type VARCHAR(64)`,
      );
      await this.dataSource.query(
        `ALTER TABLE adwest.sreni_calendar_events ADD COLUMN IF NOT EXISTS approval_status varchar(20) NOT NULL DEFAULT 'approved'`,
      );
      await this.dataSource.query(
        `ALTER TABLE adwest.sthan_calendar_events ADD COLUMN IF NOT EXISTS approval_status varchar(20) NOT NULL DEFAULT 'approved'`,
      );
      await this.dataSource.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'chk_approval_items_status'
              AND conrelid = 'adwest.approval_items'::regclass
          ) THEN
            ALTER TABLE adwest.approval_items DROP CONSTRAINT chk_approval_items_status;
          END IF;
          ALTER TABLE adwest.approval_items
            ADD CONSTRAINT chk_approval_items_status
            CHECK (status IN ('pending', 'approved', 'rejected', 'need_more_information'));
        END $$;
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS adwest.report_metric_definitions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(200) NOT NULL,
          description TEXT,
          unit VARCHAR(50),
          input_type VARCHAR(20) NOT NULL DEFAULT 'number',
          is_required BOOLEAN NOT NULL DEFAULT false,
          sort_order INTEGER NOT NULL DEFAULT 0,
          active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS adwest.sreni_monthly_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sreni_id VARCHAR(100) NOT NULL,
          report_year INTEGER NOT NULL,
          report_month INTEGER NOT NULL CHECK (report_month BETWEEN 1 AND 12),
          status VARCHAR(20) NOT NULL DEFAULT 'draft',
          submitted_by VARCHAR(200),
          submitted_at TIMESTAMPTZ,
          notes TEXT,
          entries JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(sreni_id, report_year, report_month)
        )
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS adwest.sreni_report_parameters (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sreni_id VARCHAR(100) NOT NULL,
          submission_type VARCHAR(20) NOT NULL,
          name VARCHAR(200) NOT NULL,
          description TEXT,
          unit VARCHAR(50),
          input_type VARCHAR(20) NOT NULL DEFAULT 'number',
          is_required BOOLEAN NOT NULL DEFAULT false,
          sort_order INTEGER NOT NULL DEFAULT 0,
          active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS adwest.sreni_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sreni_id VARCHAR(100) NOT NULL,
          submission_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
          period_year INTEGER NOT NULL,
          period_value INTEGER NOT NULL,
          entries JSONB NOT NULL DEFAULT '{}',
          notes TEXT,
          submitted_by VARCHAR(200),
          submitted_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(sreni_id, submission_type, period_year, period_value)
        )
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS adwest.analytics_studio_layouts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sreni_id VARCHAR(100) NOT NULL,
          user_id VARCHAR(100) NOT NULL,
          layout_type VARCHAR(20) NOT NULL,
          name VARCHAR(160) NOT NULL,
          config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT chk_analytics_studio_layouts_type CHECK (layout_type IN ('details', 'pivot')),
          UNIQUE(sreni_id, user_id, layout_type, name)
        )
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_analytics_studio_layouts_owner
        ON adwest.analytics_studio_layouts (sreni_id, user_id, layout_type, updated_at DESC)
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS adwest.seva_samithi_contacts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contact_id UUID NOT NULL REFERENCES adwest.sreni_contacts(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT uq_seva_samithi_contacts_contact UNIQUE (contact_id)
        )
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_seva_samithi_contacts_contact_id
        ON adwest.seva_samithi_contacts (contact_id)
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS adwest.seva_samithi_contributions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contact_id UUID NOT NULL REFERENCES adwest.sreni_contacts(id) ON DELETE CASCADE,
          activity_date DATE NOT NULL,
          seva_activity TEXT,
          details TEXT,
          created_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_seva_samithi_contributions_contact_date
        ON adwest.seva_samithi_contributions (contact_id, activity_date DESC)
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS adwest.seva_samithi_contribution_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contribution_id UUID NOT NULL REFERENCES adwest.seva_samithi_contributions(id) ON DELETE CASCADE,
          file_name TEXT NOT NULL,
          file_type TEXT,
          file_path TEXT NOT NULL,
          file_size BIGINT,
          uploaded_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_seva_samithi_contribution_documents_contribution
        ON adwest.seva_samithi_contribution_documents (contribution_id)
      `);
      // Add Reports menu for any existing srenies that don't yet have one.
      await this.dataSource.query(`
        INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
        SELECT gen_random_uuid()::text,
               concat('sreni-', s.id, '-reports'),
               'Reports',
               concat('sreni-', s.id),
               '📊',
               50,
               true,
               now(),
               now()
        FROM adwest.srenies s
        WHERE NOT EXISTS (
          SELECT 1 FROM adwest.menu_items m WHERE m.key = concat('sreni-', s.id, '-reports')
        )
      `);
      // Add Analytics Studio menu for any existing srenies that don't yet have one.
      await this.dataSource.query(`
        INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
        SELECT gen_random_uuid()::text,
               concat('sreni-', s.id, '-analytics'),
               'Analytics Studio',
               concat('sreni-', s.id),
               '📈',
               60,
               true,
               now(),
               now()
        FROM adwest.srenies s
        WHERE NOT EXISTS (
          SELECT 1 FROM adwest.menu_items m WHERE m.key = concat('sreni-', s.id, '-analytics')
        )
      `);
      // Ensure settings-level Report Config menu item exists.
      await this.dataSource.query(`
        INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
        VALUES ('menu_settings_report_config', 'settings-report-config', 'Report Config', 'settings', '📊', 85, true, now(), now())
        ON CONFLICT (key) DO NOTHING
      `);
      // Ensure settings-level Google Integration menu item exists.
      await this.dataSource.query(`
        INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
        VALUES ('menu_settings_google_integration', 'settings-google-integration', 'Google Integration', 'settings', '🔐', 95, true, now(), now())
        ON CONFLICT (key) DO NOTHING
      `);
    } catch (error) {
      this.logWarning(`Schema migration warning: ${(error as Error).message}`);
    }
  }
}
