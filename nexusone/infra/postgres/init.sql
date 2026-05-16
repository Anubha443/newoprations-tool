CREATE SCHEMA IF NOT EXISTS nexus_core;
CREATE SCHEMA IF NOT EXISTS nexus_comm;
CREATE SCHEMA IF NOT EXISTS nexus_hrm;
CREATE SCHEMA IF NOT EXISTS nexus_crm;

DO $$ BEGIN
  CREATE TYPE nexus_core.user_role AS ENUM ('owner', 'admin', 'hr_manager', 'sales_rep', 'employee', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS nexus_core.organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nexus_core.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  organization_id UUID NOT NULL REFERENCES nexus_core.organizations(id),
  roles nexus_core.user_role[] NOT NULL DEFAULT ARRAY['employee']::nexus_core.user_role[],
  module_access JSONB NOT NULL DEFAULT '{"comm": true, "hrm": false, "crm": false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS nexus_comm.channels (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('public','private','dm')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nexus_comm.channel_members (
  channel_id BIGINT REFERENCES nexus_comm.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS nexus_comm.topics (
  id BIGSERIAL PRIMARY KEY,
  channel_id BIGINT REFERENCES nexus_comm.channels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  message_count INT NOT NULL DEFAULT 0,
  UNIQUE(channel_id, name)
);

CREATE TABLE IF NOT EXISTS nexus_comm.messages (
  id BIGSERIAL PRIMARY KEY,
  channel_id BIGINT REFERENCES nexus_comm.channels(id) ON DELETE CASCADE,
  topic_id BIGINT REFERENCES nexus_comm.topics(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('markdown','plain')),
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  reactions JSONB NOT NULL DEFAULT '{}'::jsonb,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  search_vector tsvector
);
CREATE INDEX IF NOT EXISTS idx_messages_search ON nexus_comm.messages USING GIN(search_vector);

CREATE TABLE IF NOT EXISTS nexus_comm.direct_messages (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL,
  participants UUID[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nexus_comm.dm_messages (
  id BIGSERIAL PRIMARY KEY,
  dm_id BIGINT REFERENCES nexus_comm.direct_messages(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nexus_comm.notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nexus_hrm.departments (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  head_id UUID,
  parent_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS nexus_hrm.designations (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  department_id BIGINT,
  level INT NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS nexus_hrm.employees (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES nexus_core.users(id),
  org_id UUID NOT NULL,
  employee_code TEXT UNIQUE NOT NULL,
  department_id BIGINT,
  designation_id BIGINT,
  manager_id BIGINT,
  employment_type TEXT NOT NULL,
  join_date DATE NOT NULL,
  status TEXT NOT NULL,
  salary_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  emergency_contact JSONB NOT NULL DEFAULT '{}'::jsonb,
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS nexus_hrm.leave_types (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  days_allowed INT NOT NULL,
  carry_forward BOOLEAN NOT NULL DEFAULT FALSE,
  paid BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS nexus_hrm.leave_requests (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  leave_type_id BIGINT NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  days NUMERIC(5,2) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS nexus_hrm.attendance (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT NOT NULL,
  overtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  notes TEXT
);
CREATE TABLE IF NOT EXISTS nexus_hrm.payroll (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  basic_salary NUMERIC(12,2) NOT NULL,
  allowances JSONB NOT NULL DEFAULT '{}'::jsonb,
  deductions JSONB NOT NULL DEFAULT '{}'::jsonb,
  net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  processed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS nexus_hrm.recruitment_jobs (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL,
  title TEXT NOT NULL,
  department_id BIGINT,
  description TEXT,
  requirements TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  openings INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS nexus_hrm.recruitment_applicants (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  resume_url TEXT,
  stage TEXT NOT NULL DEFAULT 'applied',
  ai_score DOUBLE PRECISION,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS nexus_hrm.performance_reviews (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  reviewer_id UUID NOT NULL,
  period TEXT NOT NULL,
  ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  comments TEXT,
  overall_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nexus_crm.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), org_id UUID NOT NULL, owner_id UUID NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  email TEXT, phone TEXT, company_id UUID, position TEXT, avatar_url TEXT, tags TEXT[] NOT NULL DEFAULT '{}', custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS nexus_crm.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), org_id UUID NOT NULL, owner_id UUID NOT NULL, name TEXT NOT NULL, domain TEXT, industry TEXT, size TEXT,
  address JSONB NOT NULL DEFAULT '{}'::jsonb, social_links JSONB NOT NULL DEFAULT '{}'::jsonb, custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS nexus_crm.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), org_id UUID NOT NULL, owner_id UUID NOT NULL, name TEXT NOT NULL, contact_id UUID, company_id UUID, pipeline_id UUID, stage_id UUID,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'USD', probability INT NOT NULL DEFAULT 0, expected_close_date DATE, status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS nexus_crm.pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), org_id UUID NOT NULL, name TEXT NOT NULL, is_default BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS nexus_crm.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), pipeline_id UUID NOT NULL, name TEXT NOT NULL, position INT NOT NULL, color TEXT NOT NULL, probability INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS nexus_crm.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), org_id UUID NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT, due_date TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  contact_id UUID, deal_id UUID, company_id UUID, created_by UUID NOT NULL, assignee_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS nexus_crm.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), org_id UUID NOT NULL, contact_id UUID, direction TEXT NOT NULL, subject TEXT NOT NULL, body_html TEXT, body_text TEXT,
  sent_at TIMESTAMPTZ, opened_at TIMESTAMPTZ, clicked_at TIMESTAMPTZ);

CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS nexus_core.ai_embeddings (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nexus_core.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
