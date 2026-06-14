#!/usr/bin/env node
/**
 * Runs before `npm start` on Railway: env setup + soft migrations.
 */
const { spawnSync } = require("child_process");

if (!process.env.NEXTAUTH_URL && process.env.RAILWAY_PUBLIC_DOMAIN) {
  process.env.NEXTAUTH_URL = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  console.log(`[prestart] NEXTAUTH_URL auto-set to ${process.env.NEXTAUTH_URL}`);
}

const port = process.env.PORT || "3000";
console.log(`[prestart] PORT=${port}`);

console.log("[prestart] Running database migrations (soft mode)...");
const migrate = spawnSync("node", ["scripts/migrate-sql.cjs", "--soft"], {
  stdio: "inherit",
  env: process.env,
});

if (migrate.status !== 0) {
  console.warn("[prestart] Migration failed — continuing to start Next.js");
}
