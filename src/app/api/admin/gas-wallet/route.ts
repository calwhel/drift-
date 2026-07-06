import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getTronGasWalletStatus,
  MIN_GAS_TRX,
  provisionTronGasWallet,
} from "@/lib/wallet/gas-wallet";

function authError(err: unknown) {
  const message = err instanceof Error ? err.message : "Unauthorized";
  return NextResponse.json(
    { error: message },
    { status: message === "Forbidden" ? 403 : 401 }
  );
}

export async function GET() {
  try {
    await requireAdmin();
    const status = await getTronGasWalletStatus();
    return NextResponse.json({
      ...status,
      minTrxRequired: MIN_GAS_TRX,
      explorerUrl: status.address
        ? `https://tronscan.org/#/address/${status.address}`
        : null,
    });
  } catch (err) {
    return authError(err);
  }
}

export async function POST() {
  try {
    await requireAdmin();
    await provisionTronGasWallet();
    const status = await getTronGasWalletStatus();
    return NextResponse.json({
      ok: true,
      ...status,
      minTrxRequired: MIN_GAS_TRX,
      explorerUrl: status.address
        ? `https://tronscan.org/#/address/${status.address}`
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to provision gas wallet";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
