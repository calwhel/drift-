-- Rename totp_enabled to two_factor_enabled (totp_secret already exists)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'totp_enabled'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'two_factor_enabled'
  ) THEN
    ALTER TABLE users RENAME COLUMN totp_enabled TO two_factor_enabled;
  END IF;
END $$;
