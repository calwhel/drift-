#!/usr/bin/env node
const { spawnSync } = require("child_process");

// Auto-configure NEXTAUTH_URL on Railway if not set manually
if (!process.env.NEXTAUTH_URL && process.env.RAILWAY_PUBLIC_DOMAIN) {
  process.env.NEXTAUTH_URL = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  console.log(`[start] NEXTAUTH_URL auto-set to ${process.env.NEXTAUTH_URL}`);
}

console.log("[start] Running database migrations (soft mode)...");
spawnSync("node", ["scripts/migrate-sql.cjs", "--soft"], {
  stdio: "inherit",
  env: process.env,
});

console.log("[start] Starting Next.js...");
const result = spawnSync("npx", ["next", "start"], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
