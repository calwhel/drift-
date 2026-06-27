#!/usr/bin/env node
/**
 * Railway production entrypoint.
 * Sets required env vars, then runs `next start` with process.env.PORT.
 */
const { spawn } = require("child_process");
const { syncNextAuthUrl } = require("./resolve-nextauth-url.cjs");

const port = process.env.PORT || "3000";
process.env.PORT = port;
process.env.HOSTNAME = "0.0.0.0";

syncNextAuthUrl("[start]");
process.env.AUTH_TRUST_HOST = "true";

console.log(`[start] PORT=${port}`);
console.log(`[start] NEXTAUTH_URL=${process.env.NEXTAUTH_URL ?? "(unset)"}`);
console.log(`[start] Launching next start -H 0.0.0.0`);

const child = spawn("npx", ["next", "start", "-H", "0.0.0.0"], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[start] next exited via signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});

child.on("error", (err) => {
  console.error("[start] Failed to launch next:", err);
  process.exit(1);
});
