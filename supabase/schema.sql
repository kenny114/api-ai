-- =============================================================================
-- LeadAPI — Supabase Schema
-- Run this in the Supabase SQL editor to set up all tables and functions.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- Tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT        NOT NULL UNIQUE,          -- raw API key (sk_live_...)
  requests_used   INTEGER     NOT NULL DEFAULT 0,
  requests_limit  INTEGER     NOT NULL DEFAULT 1000,
  name            TEXT,
  user_email      TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS leads (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id      UUID        NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  platform        TEXT        NOT NULL CHECK (platform IN ('instagram', 'twitter', 'linkedin')),
  profile_url     TEXT,
  username        TEXT        NOT NULL,
  name            TEXT,
  bio             TEXT,
  followers       INTEGER,
  following       INTEGER,
  niche           TEXT,
  location        TEXT,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  api_key_id        UUID        NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  campaign_type     TEXT,
  template          TEXT        CHECK (template IN ('cold_outreach', 'follow_up', 'partnership', 'custom')),
  custom_prompt     TEXT,
  generated_message TEXT        NOT NULL,
  tone              TEXT        CHECK (tone IN ('professional', 'casual', 'friendly', 'direct')),
  model_used        TEXT,
  status            TEXT        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'sent', 'archived')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outreach_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      UUID        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  lead_id         UUID        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  api_key_id      UUID        NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  platform        TEXT        NOT NULL CHECK (platform IN ('instagram', 'twitter', 'linkedin')),
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'sent', 'failed')),
  error           TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id      UUID        NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint        TEXT        NOT NULL,
  method          TEXT,
  request_body    JSONB,
  response_status INTEGER,
  duration_ms     INTEGER,
  ip_address      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_leads_api_key      ON leads        (api_key_id);
CREATE INDEX IF NOT EXISTS idx_leads_platform     ON leads        (platform);
CREATE INDEX IF NOT EXISTS idx_messages_lead      ON messages     (lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_api_key   ON messages     (api_key_id);
CREATE INDEX IF NOT EXISTS idx_outreach_message   ON outreach_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_outreach_status    ON outreach_logs(status);
CREATE INDEX IF NOT EXISTS idx_usage_api_key      ON usage_logs   (api_key_id);
CREATE INDEX IF NOT EXISTS idx_usage_created      ON usage_logs   (created_at DESC);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE api_keys      ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_only" ON api_keys      FOR ALL USING (FALSE);
CREATE POLICY "service_only" ON leads         FOR ALL USING (FALSE);
CREATE POLICY "service_only" ON messages      FOR ALL USING (FALSE);
CREATE POLICY "service_only" ON outreach_logs FOR ALL USING (FALSE);
CREATE POLICY "service_only" ON usage_logs    FOR ALL USING (FALSE);

-- =============================================================================
-- Seed: insert a dev API key via the app or Supabase dashboard, not here.
-- =============================================================================
