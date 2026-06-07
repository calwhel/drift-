import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  currency: varchar("currency", { length: 20 }).notNull(),
  address: text("address").notNull(),
  network: varchar("network", { length: 50 }).notNull(),
  balance: numeric("balance", { precision: 20, scale: 8 }).notNull().default("0"),
});

export const paymentLinks = pgTable("payment_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 20 }).notNull(),
  network: varchar("network", { length: 50 }).notNull().default("TRC20"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  expiry: timestamp("expiry", { withTimezone: true }),
  redirectUrl: text("redirect_url"),
  shortCode: varchar("short_code", { length: 32 }).notNull().unique(),
  depositAddress: text("deposit_address").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentLinkId: uuid("payment_link_id").references(() => paymentLinks.id, {
    onDelete: "set null",
  }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 20 }).notNull(),
  network: varchar("network", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  txHash: text("tx_hash"),
  feeAmount: numeric("fee_amount", { precision: 20, scale: 8 }),
  netAmount: numeric("net_amount", { precision: 20, scale: 8 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  confirmations: numeric("confirmations", { precision: 10, scale: 0 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull(),
  keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const webhooks = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  events: jsonb("events").$type<string[]>().notNull().default(["transaction.completed"]),
  secret: text("secret").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  webhookId: uuid("webhook_id")
    .notNull()
    .references(() => webhooks.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id").references(() => transactions.id, {
    onDelete: "set null",
  }),
  payload: jsonb("payload").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  attempts: numeric("attempts", { precision: 3, scale: 0 }).notNull().default("0"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type PaymentLink = typeof paymentLinks.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
