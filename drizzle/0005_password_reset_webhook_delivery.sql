CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens(user_id);

ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS response_status integer;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS response_body text;

CREATE INDEX IF NOT EXISTS webhook_deliveries_webhook_created_idx ON webhook_deliveries(webhook_id, created_at DESC);
