#!/usr/bin/env node
const { spawnSync } = require("child_process");

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
