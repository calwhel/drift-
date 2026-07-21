#!/usr/bin/env node
/**
 * Applies SQL migrations to Neon via HTTP (no WebSocket).
 * Tracks applied files in schema_migrations so re-deploys are safe.
 * Use --soft to never exit non-zero (for Railway pre-deploy).
 */
const { readFileSync, existsSync } = require("fs");
const { join } = require("path");
const { neon } = require("@neondatabase/serverless");

const MIGRATION_FILES = [
  "0000_init.sql",
  "0001_all_phases.sql",
  "0002_admin_platform_wallets.sql",
  "0003_two_factor_enabled.sql",
  "0004_custodial_wallets.sql",
  "0005_password_reset_webhook_delivery.sql",
  "0006_gas_wallets.sql",
  "0007_settlements_derivation_nullable.sql",
  "0008_audit_fixes.sql",
  "0009_withdrawal_refund_tracking.sql",
  "0010_ledger_transfers.sql",
  "0011_withdrawal_net_sent.sql",
];

/** Detect whether a legacy DB already has this migration applied. */
const MIGRATION_MARKERS = {
  "0000_init.sql": { table: "users" },
  "0001_all_phases.sql": { table: "organizations" },
  "0002_admin_platform_wallets.sql": { table: "platform_wallets" },
  "0003_two_factor_enabled.sql": { column: { table: "users", name: "two_factor_enabled" } },
  "0004_custodial_wallets.sql": { column: { table: "wallets", name: "encrypted_private_key" } },
  "0005_password_reset_webhook_delivery.sql": { table: "password_reset_tokens" },
  "0006_gas_wallets.sql": { table: "gas_wallets" },
  "0007_settlements_derivation_nullable.sql": { table: "settlements" },
  "0008_audit_fixes.sql": { table: "poller_lease" },
  "0009_withdrawal_refund_tracking.sql": { column: { table: "withdrawals", name: "balance_refunded_at" } },
  "0010_ledger_transfers.sql": { table: "ledger_transfers" },
  "0011_withdrawal_net_sent.sql": { column: { table: "withdrawals", name: "net_sent" } },
};

const soft = process.argv.includes("--soft");

function splitStatements(sql) {
  return sql
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function isIgnorableError(err) {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  const detail = String(err?.detail ?? "").toLowerCase();
  const code = err?.code ?? "";
  const text = `${msg} ${detail}`;

  return (
    text.includes("already exists") ||
    text.includes("duplicate") ||
    text.includes("duplicated") ||
    text.includes("multiple primary keys") ||
    text.includes("does not exist") ||
    code === "42703" ||
    code === "42701" ||
    code === "42P07"
  );
}

async function ensureMigrationTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}

async function tableExists(sql, tableName) {
  const rows = await sql`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${tableName}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function columnExists(sql, tableName, columnName) {
  const rows = await sql`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
      AND column_name = ${columnName}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function markerPresent(sql, file) {
  const marker = MIGRATION_MARKERS[file];
  if (!marker) return false;
  if (marker.table) return tableExists(sql, marker.table);
  if (marker.column) return columnExists(sql, marker.column.table, marker.column.name);
  return false;
}

async function isRecorded(sql, file) {
  const rows = await sql`
    SELECT 1 FROM schema_migrations WHERE filename = ${file} LIMIT 1
  `;
  return rows.length > 0;
}

async function recordMigration(sql, file) {
  await sql`
    INSERT INTO schema_migrations (filename)
    VALUES (${file})
    ON CONFLICT (filename) DO NOTHING
  `;
}

async function bootstrapLegacyMigrations(sql) {
  const rows = await sql`SELECT COUNT(*)::int AS count FROM schema_migrations`;
  if (rows[0].count > 0) return;

  const hasUsers = await tableExists(sql, "users");
  if (!hasUsers) return;

  console.log("[migrate] Existing database detected — bootstrapping migration history");

  for (const file of MIGRATION_FILES) {
    if (await markerPresent(sql, file)) {
      await recordMigration(sql, file);
      console.log(`[migrate] Recorded ${file} as already applied`);
    }
  }
}

async function applyMigrationFile(sql, file) {
  const filePath = join(__dirname, "..", "drizzle", file);
  if (!existsSync(filePath)) {
    console.warn(`[migrate] Skipping missing file: ${file}`);
    return;
  }

  console.log(`[migrate] Applying ${file}...`);
  const content = readFileSync(filePath, "utf8");
  const statements = splitStatements(content);

  for (const statement of statements) {
    try {
      await sql.query(statement);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isIgnorableError(err)) {
        console.log(`[migrate] Skip (idempotent): ${statement.slice(0, 60)}...`);
        continue;
      }
      console.error(`[migrate] Failed statement: ${statement.slice(0, 120)}`);
      throw err;
    }
  }

  await recordMigration(sql, file);
  console.log(`[migrate] Done: ${file}`);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[migrate] DATABASE_URL not set — skipping migrations");
    return;
  }

  const sql = neon(url);
  console.log("[migrate] Connecting to Neon PostgreSQL (HTTP)...");

  await sql`SELECT 1`;
  console.log("[migrate] Connected");

  await ensureMigrationTable(sql);
  await bootstrapLegacyMigrations(sql);

  for (const file of MIGRATION_FILES) {
    if (await isRecorded(sql, file)) {
      console.log(`[migrate] Skipping ${file} (already applied)`);
      continue;
    }
    await applyMigrationFile(sql, file);
  }

  console.log("[migrate] All migrations applied successfully");
}

main().catch((err) => {
  console.error("[migrate] Migration failed:", err.message || err);
  if (soft) {
    console.warn("[migrate] Continuing startup anyway (--soft mode)");
    process.exit(0);
  }
  process.exit(1);
});
