-- Named admin users for dashboard access.
-- Each person gets their own secret so access can be revoked individually.

CREATE TABLE IF NOT EXISTS admin_users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  secret_hash TEXT        NOT NULL UNIQUE,   -- SHA-256 of the raw secret
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_only" ON admin_users FOR ALL USING (FALSE);
