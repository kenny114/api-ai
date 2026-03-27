-- Per-customer platform credentials (encrypted).
-- Customers store their own session tokens so sends use their accounts, not the owner's.

CREATE TABLE IF NOT EXISTS platform_credentials (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id      UUID        NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  platform        TEXT        NOT NULL CHECK (platform IN ('instagram', 'twitter', 'linkedin')),
  credential_enc  TEXT        NOT NULL,          -- AES-256-GCM encrypted token
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (api_key_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_platform_creds_api_key ON platform_credentials (api_key_id);

ALTER TABLE platform_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_only" ON platform_credentials FOR ALL USING (FALSE);
