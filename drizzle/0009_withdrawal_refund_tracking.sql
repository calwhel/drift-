ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS balance_refunded_at timestamptz;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS balance_refunded_amount numeric(20, 8);
