-- Business branding settings for checkout pages

CREATE TABLE IF NOT EXISTS "business_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "logo_url" text,
  "primary_color" varchar(7) DEFAULT '#7c3aed' NOT NULL,
  "background_color" varchar(7) DEFAULT '#0a0a0f' NOT NULL,
  "business_name" varchar(255),
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_settings_user_id_unique" ON "business_settings" ("user_id");
