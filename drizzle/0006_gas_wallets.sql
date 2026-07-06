-- Admin Tron gas wallet (TRX source for TRC20 fee sweeps)

CREATE TABLE IF NOT EXISTS "gas_wallets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "network" varchar(50) NOT NULL UNIQUE,
  "currency" varchar(20) DEFAULT 'TRX' NOT NULL,
  "address" text NOT NULL,
  "derivation_index" integer DEFAULT 0 NOT NULL,
  "label" varchar(100),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
