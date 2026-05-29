-- ADWest PostgreSQL migration: FR-DOC, FR-JOB, FR-APR modules

CREATE TABLE IF NOT EXISTS adwest.document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sreny_id uuid NOT NULL REFERENCES adwest.srenies(id) ON DELETE CASCADE,
  parent_folder_id uuid REFERENCES adwest.document_folders(id) ON DELETE SET NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS adwest.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sreny_id uuid NOT NULL REFERENCES adwest.srenies(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES adwest.document_folders(id) ON DELETE SET NULL,
  source_document_id uuid REFERENCES adwest.documents(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  category text,
  description text,
  version integer NOT NULL DEFAULT 1,
  access_level text NOT NULL,
  linked_entity_type text,
  linked_entity_id text,
  uploaded_by uuid REFERENCES adwest.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_documents_access_level CHECK (access_level IN ('sreny', 'zone', 'private')),
  CONSTRAINT chk_documents_version CHECK (version >= 1)
);

CREATE TABLE IF NOT EXISTS adwest.report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sreny_id uuid NOT NULL REFERENCES adwest.srenies(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS adwest.report_template_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES adwest.report_templates(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL,
  required boolean NOT NULL DEFAULT false,
  options jsonb,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_report_template_field_type CHECK (field_type IN ('text', 'number', 'date', 'file', 'dropdown')),
  UNIQUE (template_id, field_key)
);

CREATE TABLE IF NOT EXISTS adwest.report_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES adwest.report_templates(id) ON DELETE CASCADE,
  submitted_by uuid REFERENCES adwest.users(id) ON DELETE SET NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES adwest.admin_users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_report_submissions_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE TABLE IF NOT EXISTS adwest.job_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sreny_id uuid NOT NULL REFERENCES adwest.srenies(id) ON DELETE CASCADE,
  title text NOT NULL,
  organization text NOT NULL,
  location text NOT NULL,
  job_type text NOT NULL,
  description text NOT NULL,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  experience_level text,
  application_deadline timestamptz NOT NULL,
  apply_email text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES adwest.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_job_listings_status CHECK (status IN ('draft', 'active', 'archived')),
  CONSTRAINT chk_job_type CHECK (job_type IN ('full_time', 'part_time', 'contract', 'volunteer'))
);

CREATE TABLE IF NOT EXISTS adwest.job_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES adwest.job_listings(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES adwest.users(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS adwest.resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES adwest.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  summary text,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS adwest.approval_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target_type text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_approval_workflow_target_type CHECK (
    target_type IN ('document_submission', 'report_submission', 'member_edit_request', 'job_listing')
  )
);

CREATE TABLE IF NOT EXISTS adwest.approval_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES adwest.approval_workflows(id) ON DELETE CASCADE,
  step_name text NOT NULL,
  step_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, step_order)
);

CREATE TABLE IF NOT EXISTS adwest.approval_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES adwest.approval_workflows(id) ON DELETE RESTRICT,
  target_id text NOT NULL,
  target_type text,
  summary text,
  status text NOT NULL DEFAULT 'pending',
  current_step_index integer NOT NULL DEFAULT 0,
  submitted_by uuid REFERENCES adwest.admin_users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES adwest.admin_users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_approval_items_status CHECK (status IN ('pending', 'approved', 'rejected', 'need_more_information'))
);

CREATE INDEX IF NOT EXISTS idx_document_folders_sreny_id ON adwest.document_folders(sreny_id);
CREATE INDEX IF NOT EXISTS idx_documents_sreny_id ON adwest.documents(sreny_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON adwest.documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_sreny_id ON adwest.report_templates(sreny_id);
CREATE INDEX IF NOT EXISTS idx_report_submissions_template_id ON adwest.report_submissions(template_id);
CREATE INDEX IF NOT EXISTS idx_report_submissions_status ON adwest.report_submissions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_listings_status_deadline ON adwest.job_listings(status, application_deadline);
CREATE INDEX IF NOT EXISTS idx_job_interests_job_id ON adwest.job_interests(job_id);
CREATE INDEX IF NOT EXISTS idx_resumes_contact_id ON adwest.resumes(contact_id);
CREATE INDEX IF NOT EXISTS idx_approval_items_workflow_id ON adwest.approval_items(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_items_status ON adwest.approval_items(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_file_name_trgm
  ON adwest.documents USING gin (lower(file_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_job_listings_title_trgm
  ON adwest.job_listings USING gin (lower(title) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_resumes_skills_gin
  ON adwest.resumes USING gin (skills jsonb_path_ops);