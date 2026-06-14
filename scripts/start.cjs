#!/usr/bin/env node
/**
 * Railway production entrypoint.
 * Sets required env vars, then runs `next start` with process.env.PORT.
 */
const { spawn } = require("child_process");
const { readFileSync, writeFileSync, existsSync } = require("fs");

const port = process.env.PORT || "3000";
process.env.PORT = port;
process.env.HOSTNAME = "0.0.0.0";

if (!process.env.NEXTAUTH_URL && process.env.RAILWAY_PUBLIC_DOMAIN) {
  const url = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  process.env.NEXTAUTH_URL = url;

  const envPath = ".env.local";
  let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  content = content
    .split("\n")
    .filter((line) => !line.startsWith("NEXTAUTH_URL="))
    .join("\n")
    .trimEnd();
  writeFileSync(
    envPath,
    content ? `${content}\nNEXTAUTH_URL=${url}\n` : `NEXTAUTH_URL=${url}\n`
  );
  console.log(`[start] NEXTAUTH_URL auto-set to ${url}`);
}

console.log(`[start] PORT=${port}`);
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
