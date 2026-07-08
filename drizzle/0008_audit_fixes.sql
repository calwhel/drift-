-- Poller lease (works with Neon HTTP — session advisory locks do not)
CREATE TABLE IF NOT EXISTS poller_lease (
  id integer PRIMARY KEY DEFAULT 1,
  holder_id text,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO poller_lease (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Idempotent payment completion recovery
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS balance_credited_at timestamptz;

-- Prevent duplicate settlement rows per transaction
CREATE UNIQUE INDEX IF NOT EXISTS settlements_tx_type_unique ON settlements (transaction_id, type);

-- Merchant derivation must not collide with TRON gas wallet (index 0)
UPDATE derivation_counter SET next_index = GREATEST(next_index, 2) WHERE id = 1 AND next_index < 2;

-- DB-backed rate limiting (works across Railway replicas)
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);
