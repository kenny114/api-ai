-- Add last_used_at to api_keys if it doesn't already exist.
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
