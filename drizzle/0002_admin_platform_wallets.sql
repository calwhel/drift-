-- Admin system: is_admin on users + platform fee wallets table

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_admin" boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS "platform_wallets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "currency" varchar(20) NOT NULL,
  "network" varchar(50) NOT NULL,
  "address" text NOT NULL,
  "label" varchar(100),
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_wallet_currency_network" ON "platform_wallets" ("currency", "network");
