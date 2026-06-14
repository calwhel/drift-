-- Rename totp_enabled to two_factor_enabled (totp_secret already exists)

ALTER TABLE "users" RENAME COLUMN "totp_enabled" TO "two_factor_enabled";
