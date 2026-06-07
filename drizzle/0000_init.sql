CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "business_name" varchar(255) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "wallets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "currency" varchar(20) NOT NULL,
  "address" text NOT NULL,
  "network" varchar(50) NOT NULL,
  "balance" numeric(20, 8) DEFAULT '0' NOT NULL
);

CREATE TABLE IF NOT EXISTS "payment_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "description" text,
  "amount" numeric(20, 8) NOT NULL,
  "currency" varchar(20) NOT NULL,
  "network" varchar(50) DEFAULT 'TRC20' NOT NULL,
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "expiry" timestamp with time zone,
  "redirect_url" text,
  "short_code" varchar(32) NOT NULL UNIQUE,
  "deposit_address" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_link_id" uuid REFERENCES "payment_links"("id") ON DELETE SET NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "amount" numeric(20, 8) NOT NULL,
  "currency" varchar(20) NOT NULL,
  "network" varchar(50) NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "tx_hash" text,
  "fee_amount" numeric(20, 8),
  "net_amount" numeric(20, 8),
  "customer_email" varchar(255),
  "confirmations" numeric(10, 0) DEFAULT '0',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "key_hash" text NOT NULL,
  "key_prefix" varchar(12) NOT NULL,
  "name" varchar(100) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "webhooks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "events" jsonb DEFAULT '["transaction.completed"]' NOT NULL,
  "secret" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "webhook_id" uuid NOT NULL REFERENCES "webhooks"("id") ON DELETE CASCADE,
  "transaction_id" uuid REFERENCES "transactions"("id") ON DELETE SET NULL,
  "payload" jsonb NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "attempts" numeric(3, 0) DEFAULT '0' NOT NULL,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_transactions_user_id" ON "transactions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_transactions_status" ON "transactions" ("status");
CREATE INDEX IF NOT EXISTS "idx_payment_links_short_code" ON "payment_links" ("short_code");
CREATE INDEX IF NOT EXISTS "idx_payment_links_user_id" ON "payment_links" ("user_id");
