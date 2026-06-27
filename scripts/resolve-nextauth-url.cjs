#!/usr/bin/env node
/**
 * Resolve NEXTAUTH_URL for Railway and other hosts.
 * Always prefers the live Railway public domain over stale dashboard values.
 */
const { readFileSync, writeFileSync, existsSync } = require("fs");

function resolveNextAuthUrl() {
  const fromEnv = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  const railwayStatic = process.env.RAILWAY_STATIC_URL?.replace(/\/$/, "");

  if (railwayDomain) {
    return `https://${railwayDomain}`;
  }

  if (railwayStatic) {
    return railwayStatic;
  }

  return fromEnv || null;
}

function syncNextAuthUrl(logPrefix = "[start]") {
  const resolved = resolveNextAuthUrl();
  if (!resolved) {
    console.warn(`${logPrefix} NEXTAUTH_URL not set and no Railway domain detected`);
    return null;
  }

  const previous = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (previous && previous !== resolved) {
    console.warn(`${logPrefix} Overriding stale NEXTAUTH_URL (${previous}) -> ${resolved}`);
  } else if (!previous) {
    console.log(`${logPrefix} NEXTAUTH_URL auto-set to ${resolved}`);
  }

  process.env.NEXTAUTH_URL = resolved;

  const envPath = ".env.local";
  let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  content = content
    .split("\n")
    .filter((line) => !line.startsWith("NEXTAUTH_URL="))
    .join("\n")
    .trimEnd();
  writeFileSync(
    envPath,
    content ? `${content}\nNEXTAUTH_URL=${resolved}\n` : `NEXTAUTH_URL=${resolved}\n`
  );

  return resolved;
}

module.exports = { resolveNextAuthUrl, syncNextAuthUrl };
