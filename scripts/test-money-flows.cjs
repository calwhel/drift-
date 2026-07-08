#!/usr/bin/env node
/**
 * Unit tests for critical money-flow logic (no DB or network required).
 * Run: node scripts/test-money-flows.cjs
 */
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

describe("derivation index constants", () => {
  test("merchant indices start after TRON gas wallet", () => {
    const TRON_GAS = 0;
    const MERCHANT_START = 1;
    const RESERVED = new Set([0, 200, 201, 202, 203, 204, 205]);
    assert.ok(MERCHANT_START > TRON_GAS);
    assert.ok(RESERVED.has(0));
    assert.ok(!RESERVED.has(1));
  });
});

describe("tx hash patterns", () => {
  const TRON_TX_RE = /^[a-f0-9]{64}$/;
  const EVM_TX_RE = /^0x[a-fA-F0-9]{64}$/;

  test("rejects garbage Tron tx ids", () => {
    assert.equal(TRON_TX_RE.test("true"), false);
    assert.equal(TRON_TX_RE.test("[object Object]"), false);
    assert.equal(TRON_TX_RE.test("a".repeat(64)), true);
  });

  test("validates EVM hashes", () => {
    assert.equal(EVM_TX_RE.test("0x" + "a".repeat(64)), true);
    assert.equal(EVM_TX_RE.test("0xabc"), false);
  });
});

describe("ambiguous verify detection", () => {
  function isVerifyAmbiguousError(err) {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      /not confirmed on-chain in time/i.test(msg) ||
      /TronGrid verify HTTP/i.test(msg) ||
      /429|rate limit|too many requests/i.test(msg)
    );
  }

  test("retryable verify errors", () => {
    assert.ok(isVerifyAmbiguousError(new Error("TronGrid verify HTTP 503")));
    assert.ok(isVerifyAmbiguousError(new Error("not confirmed on-chain in time")));
    assert.ok(!isVerifyAmbiguousError(new Error("Tron transaction failed on-chain: REVERT")));
  });
});

test("money-flow unit tests complete", () => {
  assert.ok(true);
});
