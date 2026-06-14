-- Email notifications: customer email on payment links, expiry notification flag

ALTER TABLE "payment_links" ADD COLUMN IF NOT EXISTS "customer_email" varchar(255);
ALTER TABLE "payment_links" ADD COLUMN IF NOT EXISTS "expiry_notified" boolean DEFAULT false NOT NULL;
