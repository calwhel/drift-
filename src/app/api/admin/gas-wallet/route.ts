import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getTronGasWalletStatus,
  MIN_GAS_TRX_WARNING,
  provisionTronGasWallet,
} from "@/lib/wallet/gas-wallet";
import { getSplGasWalletStatus } from "@/lib/wallet/spl-gas";
import { getAllEvmGasWalletStatuses } from "@/lib/evm/gas";

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
    const [tron, spl, evm] = await Promise.all([
      getTronGasWalletStatus(),
      getSplGasWalletStatus(),
      getAllEvmGasWalletStatuses(),
    ]);

    return NextResponse.json({
      tron: {
        ...tron,
        minTrxRequired: MIN_GAS_TRX_WARNING,
        explorerUrl: tron.address
          ? `https://tronscan.org/#/address/${tron.address}`
          : null,
      },
      spl: {
        ...spl,
        explorerUrl: spl.address ? `https://solscan.io/account/${spl.address}` : null,
      },
      evm: evm.map((g) => ({
        ...g,
        explorerUrl: g.address
          ? `https://${g.network === "BEP20" ? "bscscan" : g.network === "Polygon" ? "polygonscan" : g.network === "Arbitrum" ? "arbiscan" : g.network === "Base" ? "basescan" : "snowtrace"}.com/address/${g.address}`
          : null,
      })),
    });
  } catch (err) {
    return authError(err);
  }
}

export async function POST() {
  try {
    await requireAdmin();
    await provisionTronGasWallet();
    return GET();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to provision gas wallet";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
