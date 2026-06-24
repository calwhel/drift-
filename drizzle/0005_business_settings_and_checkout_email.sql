-- Business branding settings and checkout customer email capture

CREATE TABLE IF NOT EXISTS "business_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE UNIQUE,
  "logo_url" text,
  "primary_color" varchar(16) DEFAULT '#7c3aed' NOT NULL,
  "background_color" varchar(16) DEFAULT '#0a0a0f' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "payment_links" ADD COLUMN IF NOT EXISTS "customer_email" varchar(255);

-- Align with current application behavior that may queue settlements without derivation index
ALTER TABLE "settlements" ALTER COLUMN "from_derivation_index" DROP NOT NULL;
