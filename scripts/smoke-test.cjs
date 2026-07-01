#!/usr/bin/env node
/**
 * Pre-launch smoke test — hits the live (or staging) deployment over HTTP.
 * No Railway dashboard setup required. Runs in GitHub Actions after deploy.
 *
 * Usage:
 *   node scripts/smoke-test.cjs
 *   SMOKE_TEST_URL=https://your-app.up.railway.app node scripts/smoke-test.cjs
 */

const BASE_URL = (process.env.SMOKE_TEST_URL || "https://drift-production-9c09.up.railway.app").replace(
  /\/$/,
  ""
);
const MAX_WAIT_MS = Number(process.env.SMOKE_WAIT_MS || 6 * 60 * 1000);
const RETRY_INTERVAL_MS = Number(process.env.SMOKE_RETRY_MS || 15_000);

const results = { pass: [], fail: [], warn: [] };

function pass(name, detail) {
  results.pass.push({ name, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail) {
  results.fail.push({ name, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function warn(name, detail) {
  results.warn.push({ name, detail });
  console.log(`  ⚠ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function fetchWithTimeout(path, options = {}) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal, redirect: "manual" });
    let body = null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        body = await res.json();
      } catch {
        body = null;
      }
    }
    return { res, body, url };
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForDeploy() {
  const start = Date.now();
  console.log(`\nWaiting for deployment at ${BASE_URL} (up to ${MAX_WAIT_MS / 1000}s)…\n`);

  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      const { res, body } = await fetchWithTimeout("/api/health");
      if (res.status === 200 && body?.ok === true) {
        pass("Deployment ready", "health check OK");
        return true;
      }
      if (res.status === 200 && body?.ok === false) {
        warn("Health check reachable but not OK", body.error || JSON.stringify(body.checks));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  … not ready yet (${msg})`);
    }
    await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
  }

  fail("Deployment ready", `timed out after ${MAX_WAIT_MS / 1000}s`);
  return false;
}

async function runChecks() {
  console.log("\n── Core health ──");

  const { res: healthRes, body: health } = await fetchWithTimeout("/api/health");
  if (healthRes.status === 200 && health?.ok === true) {
    pass("API health", health.message || "ok");
  } else {
    fail("API health", `status ${healthRes.status} body=${JSON.stringify(health)}`);
  }

  if (health?.checks) {
    for (const [key, val] of Object.entries(health.checks)) {
      if (val === "set") pass(`Env ${key}`, "set");
      else fail(`Env ${key}`, "missing on server");
    }
  }

  console.log("\n── Public pages ──");
  const pages = ["/", "/auth/login", "/auth/signup", "/developers", "/auth/accept-invite"];
  for (const path of pages) {
    const { res } = await fetchWithTimeout(path);
    if (res.status === 200) pass(`Page ${path}`, "200");
    else fail(`Page ${path}`, `status ${res.status}`);
  }

  console.log("\n── Auth protection ──");
  const { res: dashRes } = await fetchWithTimeout("/dashboard/overview");
  if (dashRes.status === 307 || dashRes.status === 302 || dashRes.status === 308) {
    pass("Dashboard requires login", `redirect ${dashRes.status}`);
  } else {
    fail("Dashboard requires login", `expected redirect, got ${dashRes.status}`);
  }

  const { res: adminRes } = await fetchWithTimeout("/admin");
  if (adminRes.status === 307 || adminRes.status === 302 || adminRes.status === 308) {
    pass("Admin requires login", `redirect ${adminRes.status}`);
  } else {
    fail("Admin requires login", `expected redirect, got ${adminRes.status}`);
  }

  console.log("\n── Payment APIs ──");
  const { res: badLinkRes, body: badLink } = await fetchWithTimeout(
    "/api/payment-links/public/invalid-smoke-test-code"
  );
  if (badLinkRes.status === 404) {
    pass("Invalid payment link", "404 as expected");
  } else {
    fail("Invalid payment link", `expected 404, got ${badLinkRes.status}`);
  }

  const { res: signupGet, body: signupBody } = await fetchWithTimeout("/api/auth/signup");
  if (signupGet.status === 200 && signupBody?.ok) {
    pass("Signup API mounted", "GET /api/auth/signup");
  } else {
    fail("Signup API mounted", `status ${signupGet.status}`);
  }

  console.log("\n── Security ──");
  const { res: cronRes } = await fetchWithTimeout("/api/cron/poll-payments");
  if (cronRes.status === 401) {
    pass("Cron endpoint protected", "401 without secret");
  } else if (cronRes.status === 200) {
    warn("Cron endpoint protected", "returned 200 — set CRON_SECRET in production");
  } else {
    warn("Cron endpoint", `status ${cronRes.status}`);
  }

  console.log("\n── Protected APIs (expect 401) ──");
  const protectedApis = [
    "/api/wallets",
    "/api/payment-links",
    "/api/transactions",
    "/api/dashboard/stats",
  ];
  for (const path of protectedApis) {
    const { res } = await fetchWithTimeout(path);
    if (res.status === 401) pass(`Auth required ${path}`, "401");
    else fail(`Auth required ${path}`, `expected 401, got ${res.status}`);
  }
}

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║       Drift pre-launch smoke test    ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`Target: ${BASE_URL}`);

  const ready = await waitForDeploy();
  if (!ready) {
    printSummary();
    process.exit(1);
  }

  await runChecks();
  printSummary();

  process.exit(results.fail.length > 0 ? 1 : 0);
}

function printSummary() {
  console.log("\n══════════════════════════════════════");
  console.log(`Passed: ${results.pass.length}  Failed: ${results.fail.length}  Warnings: ${results.warn.length}`);
  if (results.fail.length > 0) {
    console.log("\nFailures:");
    for (const f of results.fail) console.log(`  • ${f.name}: ${f.detail}`);
  }
  if (results.warn.length > 0) {
    console.log("\nWarnings (optional — review Railway env vars):");
    for (const w of results.warn) console.log(`  • ${w.name}: ${w.detail}`);
  }
  console.log("══════════════════════════════════════\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
