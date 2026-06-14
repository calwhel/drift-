-- Custodial wallets: type, encrypted keys, payment link + withdrawal wallet references

ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "wallet_type" varchar(20) DEFAULT 'connected' NOT NULL;
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "encrypted_private_key" text;
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "label" varchar(100);

ALTER TABLE "payment_links" ADD COLUMN IF NOT EXISTS "wallet_id" uuid REFERENCES "wallets"("id") ON DELETE SET NULL;
ALTER TABLE "payment_links" ALTER COLUMN "derivation_index" DROP NOT NULL;

ALTER TABLE "withdrawals" ADD COLUMN IF NOT EXISTS "wallet_id" uuid REFERENCES "wallets"("id") ON DELETE SET NULL;
ALTER TABLE "withdrawals" ADD COLUMN IF NOT EXISTS "error" text;

ALTER TABLE "settlements" ADD COLUMN IF NOT EXISTS "wallet_id" uuid REFERENCES "wallets"("id") ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "wallets_user_currency_network" ON "wallets" ("user_id", "currency", "network");
