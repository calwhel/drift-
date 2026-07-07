import { eq } from "drizzle-orm";
import { db, gasWallets } from "../db";
import { deriveDepositAddress, derivePrivateKey } from "./derive";
import { isMasterWalletConfigured } from "./master-wallet";

export const TRON_GAS_NETWORK = "TRC20";

/** Target TRX on a deposit address before one TRC20 transfer (~5–8 TRX typical burn) */
export const TRX_TOP_UP_TARGET = 6;

/** Admin UI: recommend topping up gas wallet below this */
export const MIN_GAS_TRX_WARNING = 15;

/** Minimum TRX in gas wallet to send one funding transaction */
export const MIN_GAS_TRX_OPERATION = 2;

export interface TronGasWalletStatus {
  configured: boolean;
  address: string | null;
  derivationIndex: number;
  trxBalance: number;
  accountExists: boolean;
  ready: boolean;
  message: string;
}

export async function fetchTronTrxBalanceSun(address: string): Promise<number> {
  const apiKey = process.env.TRONGRID_API_KEY;
  const res = await fetch(`https://api.trongrid.io/v1/accounts/${address}`, {
    headers: apiKey ? { "TRON-PRO-API-KEY": apiKey } : {},
  });
  if (!res.ok) return 0;

  const data = (await res.json()) as { data?: Array<{ balance?: number }> };
  return data.data?.[0]?.balance ?? 0;
}

export async function fetchTronTrxBalance(address: string): Promise<number> {
  return (await fetchTronTrxBalanceSun(address)) / 1e6;
}

export async function isTronAccountActivated(address: string): Promise<boolean> {
  const apiKey = process.env.TRONGRID_API_KEY;
  const res = await fetch(`https://api.trongrid.io/v1/accounts/${address}`, {
    headers: apiKey ? { "TRON-PRO-API-KEY": apiKey } : {},
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { data?: unknown[] };
  return Array.isArray(data.data) && data.data.length > 0;
}

export function getTronGasDerivationIndex(): number {
  return Number(process.env.TRON_GAS_DERIVATION_INDEX ?? 0);
}

/** Create or refresh the admin gas wallet record from the master mnemonic */
export async function provisionTronGasWallet() {
  if (!isMasterWalletConfigured()) {
    throw new Error("MASTER_WALLET_MNEMONIC is not configured");
  }

  const derivationIndex = getTronGasDerivationIndex();
  const address = deriveDepositAddress(derivationIndex, "USDT", TRON_GAS_NETWORK);

  const [existing] = await db
    .select()
    .from(gasWallets)
    .where(eq(gasWallets.network, TRON_GAS_NETWORK))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(gasWallets)
      .set({
        address,
        derivationIndex,
        label: existing.label ?? "Tron gas wallet",
        updatedAt: new Date(),
      })
      .where(eq(gasWallets.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(gasWallets)
    .values({
      network: TRON_GAS_NETWORK,
      currency: "TRX",
      address,
      derivationIndex,
      label: "Tron gas wallet",
    })
    .returning();

  return created;
}

export async function getTronGasWalletRecord() {
  const [row] = await db
    .select()
    .from(gasWallets)
    .where(eq(gasWallets.network, TRON_GAS_NETWORK))
    .limit(1);
  return row ?? null;
}

export function getTronGasWalletPrivateKey(): string {
  if (!isMasterWalletConfigured()) {
    throw new Error("MASTER_WALLET_MNEMONIC is not configured");
  }
  const index = getTronGasDerivationIndex();
  return derivePrivateKey(index, TRON_GAS_NETWORK);
}

export async function getTronGasWalletStatus(): Promise<TronGasWalletStatus> {
  if (!isMasterWalletConfigured()) {
    return {
      configured: false,
      address: null,
      derivationIndex: getTronGasDerivationIndex(),
      trxBalance: 0,
      accountExists: false,
      ready: false,
      message: "Add MASTER_WALLET_MNEMONIC in Railway to enable the gas wallet.",
    };
  }

  let record = await getTronGasWalletRecord();
  if (!record) {
    record = await provisionTronGasWallet();
  }

  const trxBalance = await fetchTronTrxBalance(record.address);
  const accountExists = await isTronAccountActivated(record.address);
  const ready = accountExists && trxBalance >= MIN_GAS_TRX_WARNING;

  let message: string;
  if (!accountExists) {
    message = `Send at least ${MIN_GAS_TRX_WARNING} TRX to activate this gas wallet.`;
  } else if (trxBalance < MIN_GAS_TRX_WARNING) {
    message = `Gas wallet is active but low on TRX (${trxBalance.toFixed(2)} TRX). Send more TRX to keep sweeps and withdrawals running.`;
  } else {
    message = "Gas wallet is ready for TRC20 transfers.";
  }

  return {
    configured: true,
    address: record.address,
    derivationIndex: record.derivationIndex,
    trxBalance,
    accountExists,
    ready,
    message,
  };
}

/** Ensure gas wallet can fund a single TRX send (does not require 20+ TRX reserve). */
export async function assertTronGasWalletCanSend(amountTrx: number): Promise<string> {
  const status = await getTronGasWalletStatus();
  if (!status.configured || !status.address) {
    throw new Error(status.message || "Tron gas wallet is not configured");
  }
  if (!status.accountExists) {
    throw new Error(
      `Tron gas wallet ${status.address} is not activated. Send TRX to this address in Admin → Platform Wallets.`
    );
  }

  const required = amountTrx + MIN_GAS_TRX_OPERATION;
  if (status.trxBalance < required) {
    throw new Error(
      `Tron gas wallet needs more TRX (has ${status.trxBalance.toFixed(2)}, need ~${required.toFixed(1)} for this transfer). Send TRX to ${status.address}.`
    );
  }

  return status.address;
}
