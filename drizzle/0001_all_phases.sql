-- Phase 1-3 schema extensions

CREATE TABLE IF NOT EXISTS "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(100) NOT NULL UNIQUE,
  "owner_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "derivation_counter" (
  "id" integer PRIMARY KEY DEFAULT 1,
  "next_index" integer DEFAULT 1 NOT NULL
);

CREATE TABLE IF NOT EXISTS "organization_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" varchar(20) DEFAULT 'member' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "org_member_unique" ON "organization_members" ("organization_id", "user_id");

CREATE TABLE IF NOT EXISTS "team_invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "email" varchar(255) NOT NULL,
  "role" varchar(20) DEFAULT 'member' NOT NULL,
  "token" varchar(64) NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "settlements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "transaction_id" uuid NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" varchar(20) NOT NULL,
  "amount" numeric(20, 8) NOT NULL,
  "currency" varchar(20) NOT NULL,
  "network" varchar(50) NOT NULL,
  "to_address" text NOT NULL,
  "from_derivation_index" integer NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "tx_hash" text,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "withdrawals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "amount" numeric(20, 8) NOT NULL,
  "currency" varchar(20) NOT NULL,
  "network" varchar(50) NOT NULL,
  "to_address" text NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "tx_hash" text,
  "fee_amount" numeric(20, 8),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "invoice_number" varchar(50) NOT NULL,
  "customer_email" varchar(255) NOT NULL,
  "customer_name" varchar(255),
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "currency" varchar(20) DEFAULT 'USDT' NOT NULL,
  "subtotal" numeric(20, 8) NOT NULL,
  "tax" numeric(20, 8) DEFAULT '0',
  "total" numeric(20, 8) NOT NULL,
  "due_date" timestamp with time zone,
  "payment_link_id" uuid REFERENCES "payment_links"("id") ON DELETE SET NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "invoice_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "description" text NOT NULL,
  "quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
  "unit_price" numeric(20, 8) NOT NULL,
  "amount" numeric(20, 8) NOT NULL
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "customer_email" varchar(255) NOT NULL,
  "customer_name" varchar(255),
  "plan_name" varchar(255) NOT NULL,
  "amount" numeric(20, 8) NOT NULL,
  "currency" varchar(20) DEFAULT 'USDT' NOT NULL,
  "interval" varchar(20) DEFAULT 'month' NOT NULL,
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "payment_link_id" uuid REFERENCES "payment_links"("id") ON DELETE SET NULL,
  "current_period_start" timestamp with time zone,
  "current_period_end" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "organization_id" uuid REFERENCES "organizations"("id") ON DELETE SET NULL,
  "action" varchar(100) NOT NULL,
  "resource" varchar(100),
  "resource_id" varchar(100),
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Alter existing tables
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "organization_id" uuid REFERENCES "organizations"("id") ON DELETE SET NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_secret" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_enabled" boolean DEFAULT false NOT NULL;

ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "derivation_index" integer;

ALTER TABLE "payment_links" ADD COLUMN IF NOT EXISTS "derivation_index" integer;
ALTER TABLE "payment_links" ADD COLUMN IF NOT EXISTS "paid_at" timestamp with time zone;
UPDATE "payment_links" SET "derivation_index" = 0 WHERE "derivation_index" IS NULL;
-- Only enforce NOT NULL when table is empty or all rows have derivation_index
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "payment_links" WHERE "derivation_index" IS NULL) THEN
    ALTER TABLE "payment_links" ALTER COLUMN "derivation_index" SET NOT NULL;
  END IF;
END $$;

ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "scopes" jsonb DEFAULT '["payment_links:write"]';

CREATE UNIQUE INDEX IF NOT EXISTS "tx_hash_unique" ON "transactions" ("tx_hash");

INSERT INTO "derivation_counter" ("id", "next_index") VALUES (1, 1) ON CONFLICT DO NOTHING;
