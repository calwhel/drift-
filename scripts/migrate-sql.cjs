#!/usr/bin/env node
/**
 * Applies SQL migrations to Neon via HTTP (no WebSocket).
 * Use --soft to never exit non-zero (for Railway startup).
 */
const { readFileSync, existsSync } = require("fs");
const { join } = require("path");
const { neon } = require("@neondatabase/serverless");

const MIGRATION_FILES = ["0000_init.sql", "0001_all_phases.sql", "0002_admin_platform_wallets.sql", "0003_two_factor_enabled.sql"];
const soft = process.argv.includes("--soft");

function splitStatements(sql) {
  return sql
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function isIgnorableError(message) {
  const m = message.toLowerCase();
  return (
    m.includes("already exists") ||
    m.includes("duplicate") ||
    m.includes("multiple primary keys") ||
    m.includes("does not exist")
  );
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

  for (const file of MIGRATION_FILES) {
    const filePath = join(__dirname, "..", "drizzle", file);
    if (!existsSync(filePath)) {
      console.warn(`[migrate] Skipping missing file: ${file}`);
      continue;
    }

    console.log(`[migrate] Applying ${file}...`);
    const content = readFileSync(filePath, "utf8");
    const statements = splitStatements(content);

    for (const statement of statements) {
      try {
        await sql.query(statement);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isIgnorableError(msg)) {
          console.log(`[migrate] Skip (exists): ${statement.slice(0, 60)}...`);
          continue;
        }
        console.error(`[migrate] Failed statement: ${statement.slice(0, 120)}`);
        throw err;
      }
    }
    console.log(`[migrate] Done: ${file}`);
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
