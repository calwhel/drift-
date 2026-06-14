#!/usr/bin/env node
/**
 * Runs before `npm start` on Railway: env setup + soft migrations.
 * Next.js reads PORT from process.env automatically via `next start`.
 */
const { appendFileSync } = require("fs");
const { spawnSync } = require("child_process");

const port = process.env.PORT || "3000";
console.log(`[prestart] PORT=${port} (Next.js will bind via process.env.PORT)`);

if (!process.env.NEXTAUTH_URL && process.env.RAILWAY_PUBLIC_DOMAIN) {
  const url = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  process.env.NEXTAUTH_URL = url;
  // Next.js loads .env.local at server startup so auth works in this process tree.
  appendFileSync(".env.local", `\nNEXTAUTH_URL=${url}\n`);
  console.log(`[prestart] NEXTAUTH_URL auto-set to ${url}`);
}

console.log("[prestart] Running database migrations (soft mode, 30s timeout)...");
const migrate = spawnSync("node", ["scripts/migrate-sql.cjs", "--soft"], {
  stdio: "inherit",
  env: process.env,
  timeout: 30_000,
});

if (migrate.error?.code === "ETIMEDOUT") {
  console.warn("[prestart] Migration timed out — continuing to start Next.js");
} else if (migrate.status !== 0) {
  console.warn("[prestart] Migration failed — continuing to start Next.js");
}
