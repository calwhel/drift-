ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS net_sent numeric(20, 8) NOT NULL DEFAULT 0;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;
