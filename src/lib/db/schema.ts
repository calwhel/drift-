import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  varchar,
  jsonb,
  integer,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  ownerId: uuid("owner_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  emailVerified: boolean("email_verified").notNull().default(false),
  totpSecret: text("totp_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("org_member_unique").on(t.organizationId, t.userId)]
);

export const teamInvitations = pgTable("team_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("member"),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const derivationCounter = pgTable("derivation_counter", {
  id: integer("id").primaryKey().default(1),
  nextIndex: integer("next_index").notNull().default(1),
});

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    currency: varchar("currency", { length: 20 }).notNull(),
    address: text("address").notNull(),
    network: varchar("network", { length: 50 }).notNull(),
    balance: numeric("balance", { precision: 20, scale: 8 }).notNull().default("0"),
    derivationIndex: integer("derivation_index"),
    walletType: varchar("wallet_type", { length: 20 }).notNull().default("connected"),
    encryptedPrivateKey: text("encrypted_private_key"),
    label: varchar("label", { length: 100 }),
  },
  (t) => [uniqueIndex("wallets_user_currency_network").on(t.userId, t.currency, t.network)]
);

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
  derivationIndex: integer("derivation_index"),
  walletId: uuid("wallet_id").references(() => wallets.id, { onDelete: "set null" }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const transactions = pgTable(
  "transactions",
  {
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
  },
  (t) => [uniqueIndex("tx_hash_unique").on(t.txHash)]
);

export const settlements = pgTable("settlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(), // merchant_payout | platform_fee
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 20 }).notNull(),
  network: varchar("network", { length: 50 }).notNull(),
  toAddress: text("to_address").notNull(),
  fromDerivationIndex: integer("from_derivation_index"),
  walletId: uuid("wallet_id").references(() => wallets.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  txHash: text("tx_hash"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const withdrawals = pgTable("withdrawals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 20 }).notNull(),
  network: varchar("network", { length: 50 }).notNull(),
  toAddress: text("to_address").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  walletId: uuid("wallet_id").references(() => wallets.id, { onDelete: "set null" }),
  txHash: text("tx_hash"),
  feeAmount: numeric("fee_amount", { precision: 20, scale: 8 }),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  currency: varchar("currency", { length: 20 }).notNull().default("USDT"),
  subtotal: numeric("subtotal", { precision: 20, scale: 8 }).notNull(),
  tax: numeric("tax", { precision: 20, scale: 8 }).default("0"),
  total: numeric("total", { precision: 20, scale: 8 }).notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  paymentLinkId: uuid("payment_link_id").references(() => paymentLinks.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 20, scale: 8 }).notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }),
  planName: varchar("plan_name", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 20 }).notNull().default("USDT"),
  interval: varchar("interval", { length: 20 }).notNull().default("month"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  paymentLinkId: uuid("payment_link_id").references(() => paymentLinks.id, {
    onDelete: "set null",
  }),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull(),
  keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  scopes: jsonb("scopes").$type<string[]>().notNull().default(["payment_links:write"]),
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

export const platformWallets = pgTable(
  "platform_wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    currency: varchar("currency", { length: 20 }).notNull(),
    network: varchar("network", { length: 50 }).notNull(),
    address: text("address").notNull(),
    label: varchar("label", { length: 100 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("platform_wallet_currency_network").on(t.currency, t.network)]
);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  action: varchar("action", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }),
  resourceId: varchar("resource_id", { length: 100 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type PaymentLink = typeof paymentLinks.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type PlatformWallet = typeof platformWallets.$inferSelect;
