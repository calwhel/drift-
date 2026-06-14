#!/usr/bin/env node
/**
 * Applies Drizzle schema to Neon PostgreSQL.
 * Runs automatically on Railway startup when DATABASE_URL is set.
 */
const { execSync } = require("child_process");

if (!process.env.DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is not set — skipping migration");
  process.exit(0);
}

console.log("[migrate] Applying database schema to Neon...");
try {
  execSync("npx drizzle-kit push --force", {
    stdio: "inherit",
    env: process.env,
  });
  console.log("[migrate] Schema applied successfully");
} catch (err) {
  console.error("[migrate] Migration failed");
  process.exit(1);
}
