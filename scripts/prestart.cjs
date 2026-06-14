#!/usr/bin/env node
/**
 * Local `npm start` helper — Railway uses scripts/start.cjs directly.
 */
const { readFileSync, writeFileSync, existsSync } = require("fs");

const port = process.env.PORT || "3000";
console.log(`[prestart] PORT=${port}`);

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
  console.log(`[prestart] NEXTAUTH_URL auto-set to ${url}`);
}
