import { derivePrivateKey } from "./derive";

const USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

function toSun(amount: number): number {
  return Math.round(amount * 1e6);
}

export async function broadcastTrc20Usdt(
  privateKeyHex: string,
  toAddress: string,
  amount: number
): Promise<string> {
  const { TronWeb } = await import("tronweb");
  const fullHost = process.env.TRON_FULL_HOST ?? "https://api.trongrid.io";
  const headers: Record<string, string> = {};
  if (process.env.TRONGRID_API_KEY) {
    headers["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;
  }

  const tronWeb = new TronWeb({
    fullHost,
    headers,
    privateKey: privateKeyHex.replace(/^0x/, ""),
  });

  const contract = await tronWeb.contract().at(USDT_TRC20_CONTRACT);
  const txId = await contract.methods
    .transfer(toAddress, toSun(amount).toString())
    .send({ feeLimit: 100_000_000 });

  return typeof txId === "string" ? txId : String(txId);
}

export async function broadcastTrc20FromDerivationIndex(
  derivationIndex: number,
  toAddress: string,
  amount: number
): Promise<string> {
  const privateKey = derivePrivateKey(derivationIndex, "TRC20");
  return broadcastTrc20Usdt(privateKey, toAddress, amount);
}
