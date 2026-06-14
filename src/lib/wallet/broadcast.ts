import { decryptPrivateKey } from "./encryption";

const USDT_ERC20 = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const USDC_ERC20 = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

export async function broadcastFromPrivateKey(
  privateKey: string,
  toAddress: string,
  amount: number,
  currency: string,
  network: string
): Promise<string> {
  if (network === "ERC20" && process.env.ETH_RPC_URL) {
    const contract =
      currency === "USDC" ? USDC_ERC20 : currency === "USDT" ? USDT_ERC20 : null;
    const decimals = currency === "ETH" ? 18 : 6;

    if (currency === "ETH") {
      const { Wallet, JsonRpcProvider, parseEther } = await import("ethers");
      const provider = new JsonRpcProvider(process.env.ETH_RPC_URL);
      const signer = new Wallet(privateKey, provider);
      const tx = await signer.sendTransaction({
        to: toAddress,
        value: parseEther(amount.toFixed(18)),
      });
      const receipt = await tx.wait();
      return receipt!.hash;
    }

    if (contract) {
      const { Wallet, Contract, JsonRpcProvider, parseUnits } = await import("ethers");
      const provider = new JsonRpcProvider(process.env.ETH_RPC_URL);
      const signer = new Wallet(privateKey, provider);
      const token = new Contract(
        contract,
        ["function transfer(address to, uint256 amount) returns (bool)"],
        signer
      );
      const tx = await token.transfer(toAddress, parseUnits(amount.toFixed(decimals), decimals));
      const receipt = await tx.wait();
      return receipt.hash as string;
    }
  }

  throw new Error(`On-chain broadcast not configured for ${currency}/${network}`);
}

export function getPrivateKeyFromWallet(encryptedPrivateKey: string | null): string | null {
  if (!encryptedPrivateKey) return null;
  return decryptPrivateKey(encryptedPrivateKey);
}
