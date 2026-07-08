import { eq, and, sql, desc } from "drizzle-orm";
import { db, wallets, ledgerTransfers } from "../db";
import { isMerchantNetworkEnabled, isStablecoin, isLegacyTronNetwork } from "../constants";
import { logAudit } from "../audit";

/** Platform spread on cross-coin conversions (0 = 1:1 for USD stablecoins) */
export const CONVERSION_FEE_RATE = 0;

export interface ConversionQuote {
  debitAmount: number;
  creditAmount: number;
  feeAmount: number;
  exchangeRate: number;
  fromCurrency: string;
  toCurrency: string;
  fromNetwork: string;
  toNetwork: string;
}

export function getConversionRate(fromCurrency: string, toCurrency: string): number {
  if (!isStablecoin(fromCurrency) || !isStablecoin(toCurrency)) {
    throw new Error(`Conversion only supports USDT and USDC (${fromCurrency} → ${toCurrency})`);
  }
  return 1;
}

export function quoteConversion(
  fromCurrency: string,
  fromNetwork: string,
  toCurrency: string,
  toNetwork: string,
  debitAmount: number
): ConversionQuote {
  if (debitAmount <= 0) throw new Error("Amount must be greater than zero");
  if (fromCurrency === toCurrency && fromNetwork === toNetwork) {
    throw new Error("Source and destination wallets must differ");
  }

  const rate = getConversionRate(fromCurrency, toCurrency);
  const feeAmount = Math.round(debitAmount * CONVERSION_FEE_RATE * 1e6) / 1e6;
  const creditAmount = Math.round((debitAmount - feeAmount) * rate * 1e6) / 1e6;

  if (creditAmount < 0.01) {
    throw new Error("Converted amount too small after fees");
  }

  return {
    debitAmount,
    creditAmount,
    feeAmount,
    exchangeRate: rate,
    fromCurrency,
    toCurrency,
    fromNetwork,
    toNetwork,
  };
}

function assertWalletConvertible(wallet: {
  currency: string;
  network: string;
  walletType: string;
}) {
  if (wallet.walletType !== "generated") {
    throw new Error("Conversions are only available for Drift custodial wallets");
  }
  if (!isStablecoin(wallet.currency)) {
    throw new Error(`Currency ${wallet.currency} cannot be converted`);
  }
  const allowed =
    isMerchantNetworkEnabled(wallet.currency, wallet.network) ||
    isLegacyTronNetwork(wallet.network);
  if (!allowed) {
    throw new Error(`Network ${wallet.network} is not eligible for conversion`);
  }
}

export async function convertWalletBalance(params: {
  userId: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  createdBy?: "user" | "admin";
  adminUserId?: string;
  note?: string;
}) {
  const { userId, fromWalletId, toWalletId, amount, createdBy = "user", adminUserId, note } =
    params;

  if (fromWalletId === toWalletId) {
    throw new Error("Choose two different wallets");
  }

  const [fromWallet, toWallet] = await Promise.all([
    db.select().from(wallets).where(eq(wallets.id, fromWalletId)).limit(1),
    db.select().from(wallets).where(eq(wallets.id, toWalletId)).limit(1),
  ]);

  const from = fromWallet[0];
  const to = toWallet[0];

  if (!from || !to) throw new Error("Wallet not found");
  if (from.userId !== userId || to.userId !== userId) {
    throw new Error("Both wallets must belong to the same merchant");
  }

  assertWalletConvertible(from);
  assertWalletConvertible(to);

  if (!isMerchantNetworkEnabled(to.currency, to.network)) {
    throw new Error(
      `Cannot convert to ${to.currency} on ${to.network} — choose Solana, Base, or Polygon`
    );
  }

  const quote = quoteConversion(
    from.currency,
    from.network,
    to.currency,
    to.network,
    amount
  );

  const debitStr = String(quote.debitAmount);
  const creditStr = String(quote.creditAmount);
  const feeStr = String(quote.feeAmount);

  const transfer = await db.transaction(async (tx) => {
    const [debited] = await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance}::numeric - ${debitStr}` })
      .where(
        and(eq(wallets.id, from.id), sql`${wallets.balance}::numeric >= ${debitStr}`)
      )
      .returning();

    if (!debited) {
      throw new Error("Insufficient balance in source wallet");
    }

    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance}::numeric + ${creditStr}` })
      .where(eq(wallets.id, to.id));

    const [row] = await tx
      .insert(ledgerTransfers)
      .values({
        userId,
        fromWalletId: from.id,
        toWalletId: to.id,
        debitAmount: debitStr,
        creditAmount: creditStr,
        fromCurrency: from.currency,
        toCurrency: to.currency,
        fromNetwork: from.network,
        toNetwork: to.network,
        exchangeRate: String(quote.exchangeRate),
        feeAmount: feeStr,
        status: "completed",
        createdBy,
        adminUserId: adminUserId ?? null,
        note: note ?? null,
      })
      .returning();

    return row;
  });

  await logAudit(userId, "conversion.completed", "ledger_transfer", transfer.id, {
    from: `${from.currency}|${from.network}`,
    to: `${to.currency}|${to.network}`,
    debitAmount: quote.debitAmount,
    creditAmount: quote.creditAmount,
    createdBy,
    adminUserId,
  });

  return { transfer, quote };
}

export async function listConversionsForUser(userId: string, limit = 50) {
  return db
    .select()
    .from(ledgerTransfers)
    .where(eq(ledgerTransfers.userId, userId))
    .orderBy(desc(ledgerTransfers.createdAt))
    .limit(limit);
}

export function listSupportedConversionTargets() {
  return [
    { currency: "USDT", networks: ["SPL", "Base", "Polygon", "BEP20", "Arbitrum", "Avalanche"] },
    { currency: "USDC", networks: ["SPL", "Base", "Polygon"] },
  ];
}
