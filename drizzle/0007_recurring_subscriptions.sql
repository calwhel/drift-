-- Recurring subscriptions: plans, subscriber billing fields, transaction linkage

CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "description" text,
  "amount" numeric(20, 8) NOT NULL,
  "currency" varchar(20) NOT NULL DEFAULT 'USDT',
  "network" varchar(50) NOT NULL DEFAULT 'TRC20',
  "interval" varchar(20) NOT NULL DEFAULT 'month',
  "short_code" varchar(32) NOT NULL UNIQUE,
  "wallet_id" uuid REFERENCES "wallets"("id") ON DELETE SET NULL,
  "status" varchar(20) NOT NULL DEFAULT 'active',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "plan_id" uuid REFERENCES "subscription_plans"("id") ON DELETE SET NULL;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "deposit_address" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "derivation_index" integer;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "wallet_id" uuid REFERENCES "wallets"("id") ON DELETE SET NULL;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "past_due_notified" boolean DEFAULT false NOT NULL;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "paused_at" timestamp with time zone;

ALTER TABLE "subscriptions" ALTER COLUMN "plan_name" DROP NOT NULL;
ALTER TABLE "subscriptions" ALTER COLUMN "customer_email" DROP NOT NULL;

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "network" varchar(50) DEFAULT 'TRC20' NOT NULL;
