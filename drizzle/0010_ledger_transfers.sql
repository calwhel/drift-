CREATE TABLE IF NOT EXISTS ledger_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  to_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  debit_amount NUMERIC(20, 8) NOT NULL,
  credit_amount NUMERIC(20, 8) NOT NULL,
  from_currency VARCHAR(20) NOT NULL,
  to_currency VARCHAR(20) NOT NULL,
  from_network VARCHAR(50) NOT NULL,
  to_network VARCHAR(50) NOT NULL,
  exchange_rate NUMERIC(20, 8) NOT NULL DEFAULT 1,
  fee_amount NUMERIC(20, 8) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  created_by VARCHAR(20) NOT NULL DEFAULT 'user',
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ledger_transfers_user_id_idx ON ledger_transfers(user_id);
CREATE INDEX IF NOT EXISTS ledger_transfers_created_at_idx ON ledger_transfers(created_at DESC);
