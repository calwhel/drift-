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

function explorerUrlForNetwork(network: string, address: string): string {
  const hosts: Record<string, string> = {
    BEP20: "bscscan.com",
    Polygon: "polygonscan.com",
    Arbitrum: "arbiscan.io",
    Base: "basescan.org",
    Avalanche: "snowtrace.io",
  };
  const host = hosts[network] ?? "etherscan.io";
  return `https://${host}/address/${address}`;
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    return authError(err);
  }

  try {
    const [tron, spl, evm] = await Promise.all([
      getTronGasWalletStatus().catch((err) => ({
        configured: false,
        address: null,
        derivationIndex: 0,
        trxBalance: 0,
        accountExists: false,
        ready: false,
        message: err instanceof Error ? err.message : "Failed to load Tron gas wallet",
      })),
      getSplGasWalletStatus().catch((err) => ({
        configured: false,
        address: null,
        solBalance: 0,
        ready: false,
        message: err instanceof Error ? err.message : "Failed to load Solana gas wallet",
      })),
      getAllEvmGasWalletStatuses().catch(() => [] as Awaited<ReturnType<typeof getAllEvmGasWalletStatuses>>),
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
        explorerUrl: g.address ? explorerUrlForNetwork(g.network, g.address) : null,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load gas wallets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    await requireAdmin();
    await provisionTronGasWallet();
    return GET();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to provision gas wallet";
    const status = message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
