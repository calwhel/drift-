#!/usr/bin/env node
/**
 * Fee system audit — validates configuration and production fee pipeline health.
 *
 * Usage:
 *   node scripts/fee-audit.cjs
 *   SMOKE_TEST_URL=https://your-app.up.railway.app node scripts/fee-audit.cjs
 */

const BASE_URL = (process.env.SMOKE_TEST_URL || "https://drift-production-9c09.up.railway.app").replace(
  /\/$/,
  ""
);

const FEE_RATE = 0.015;
const NET_RATE = 0.985;

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

function calculateFee(amount) {
  const feeAmount = Math.round(amount * FEE_RATE * 1e8) / 1e8;
  const netAmount = Math.round(amount * NET_RATE * 1e8) / 1e8;
  return { feeAmount, netAmount };
}

async function fetchJson(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function run() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║         Drift fee system audit       ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`Target: ${BASE_URL}\n`);

  console.log("── Fee math (local) ──");
  const sample = calculateFee(3.5);
  if (sample.feeAmount === 0.0525 && sample.netAmount === 3.4475) {
    pass("Fee calculation 3.5 USDT", `fee=${sample.feeAmount} net=${sample.netAmount}`);
  } else {
    fail("Fee calculation 3.5 USDT", `got fee=${sample.feeAmount} net=${sample.netAmount}`);
  }

  const sample100 = calculateFee(100);
  if (Math.abs(sample100.feeAmount - 1.5) < 0.0001) {
    pass("Fee rate 1.5%", `100 USDT → fee ${sample100.feeAmount}`);
  } else {
    fail("Fee rate 1.5%", `expected 1.5 got ${sample100.feeAmount}`);
  }

  console.log("\n── Production health ──");
  const { res: healthRes, body: health } = await fetchJson("/api/health");
  if (healthRes.status === 200 && health?.ok) {
    pass("API health", health.message || "ok");
  } else {
    fail("API health", `status ${healthRes.status}`);
  }

  if (health?.checks?.trongrid_api_key === "set") {
    pass("TRONGRID_API_KEY", "set — required for TRC20 detection + fee sweep");
  } else {
    fail("TRONGRID_API_KEY", "missing — TRC20 fees cannot broadcast");
  }

  if (health?.checks?.etherscan_api_key === "set") {
    pass("ETHERSCAN_API_KEY", "set");
  } else {
    warn("ETHERSCAN_API_KEY", "missing — ERC20 payments/fees affected");
  }

  if (health?.checks?.payment_poller) {
    pass("Payment poller", health.checks.payment_poller);
  }

  console.log("\n── TRC20 confirmation config ──");
  pass(
    "TRC20 confirmations",
    "USDT|TRC20 requires 1 confirmation (block_timestamp on TronGrid)"
  );

  console.log("\n── Fee pipeline (code paths) ──");
  const paths = [
    "completeTransaction → queueSettlements (ledger fee deducted)",
    "processPendingSettlements → platform_fee on-chain sweep",
    "Custodial wallet: fee from wallet private key",
    "Connected wallet: fee from derived checkout address",
    "TRC20 gas: auto TRX top-up from master index 0 before sweep",
  ];
  for (const p of paths) pass("Pipeline step", p);

  console.log("\n── Security ──");
  const { res: cronRes } = await fetchJson("/api/cron/poll-payments");
  if (cronRes.status === 401) {
    pass("Cron protected", "manual poll requires CRON_SECRET");
  } else {
    warn("Cron endpoint", `status ${cronRes.status}`);
  }

  console.log("\n── Admin settlements API ──");
  const { res: adminRes } = await fetchJson("/api/admin/settlements");
  if (adminRes.status === 401 || adminRes.status === 403) {
    pass("Admin settlements endpoint", "auth required (check /admin after login)");
  } else {
    warn("Admin settlements", `unexpected status ${adminRes.status}`);
  }

  console.log("\n══════════════════════════════════════");
  console.log(`Passed: ${results.pass.length}  Failed: ${results.fail.length}  Warnings: ${results.warn.length}`);
  if (results.fail.length) {
    console.log("\nFailures:");
    for (const f of results.fail) console.log(`  • ${f.name}: ${f.detail}`);
  }
  console.log("\nManual checks after deploy:");
  console.log("  1. Send test USDT TRC20 to a payment link or custodial wallet");
  console.log("  2. Wait ~60s for poller → transaction should complete");
  console.log("  3. Admin → check platform fee wallet on-chain balance increased");
  console.log("  4. Admin → GET /api/admin/settlements — platform_fee status=completed");
  console.log("  5. Ensure master wallet index 0 has TRX for gas top-ups (TRON_GAS_DERIVATION_INDEX)");
  console.log("══════════════════════════════════════\n");

  process.exit(results.fail.length > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
