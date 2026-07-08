import { getAddress, id, zeroPadValue, JsonRpcProvider, type Log } from "ethers";
import type { EvmChainConfig } from "./chains";
import { withEvmRpc } from "./rpc";

/** ERC-20 Transfer(address,address,uint256) */
const TRANSFER_TOPIC = id("Transfer(address,address,uint256)");

const MAX_TRANSFERS = 50;

/** Block lookback attempts — public RPCs often cap eth_getLogs range */
const LOOKBACK_BLOCKS = [12_000, 6_000, 3_000, 1_500];

export interface EvmDetectedTransfer {
  txHash: string;
  amount: number;
  confirmations: number;
  blockNumber: number;
  blockTimestamp?: number;
}

export function encodeRecipientLogTopic(address: string): string {
  return zeroPadValue(getAddress(address), 32);
}

async function fetchLogsWithLookback(
  provider: JsonRpcProvider,
  chain: EvmChainConfig,
  toTopic: string,
  tip: number
): Promise<Log[]> {
  let lastError: unknown;

  for (const lookback of LOOKBACK_BLOCKS) {
    try {
      return await provider.getLogs({
        address: chain.usdtContract,
        topics: [TRANSFER_TOPIC, null, toTopic],
        fromBlock: Math.max(0, tip - lookback),
        toBlock: tip,
      });
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!/block range|query returned more than|too many results/i.test(msg)) {
        throw err;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`eth_getLogs failed for ${chain.network}`);
}

/**
 * Detect inbound USDT transfers to a deposit address via public RPC (no Etherscan).
 */
export async function pollEvmUsdtTransfersToAddress(
  depositAddress: string,
  chain: EvmChainConfig
): Promise<EvmDetectedTransfer[]> {
  const toTopic = encodeRecipientLogTopic(depositAddress);

  return withEvmRpc(chain, async (provider) => {
    const tip = await provider.getBlockNumber();
    const logs = await fetchLogsWithLookback(provider, chain, toTopic, tip);

    const byTx = new Map<string, Log>();
    for (const log of logs) {
      const existing = byTx.get(log.transactionHash);
      if (!existing || log.blockNumber > existing.blockNumber) {
        byTx.set(log.transactionHash, log);
      }
    }

    const sorted = Array.from(byTx.values()).sort((a, b) => b.blockNumber - a.blockNumber);
    const blockTimestamps = new Map<number, number>();

    const results: EvmDetectedTransfer[] = [];

    for (const log of sorted.slice(0, MAX_TRANSFERS)) {
      const raw = log.data && log.data !== "0x" ? BigInt(log.data) : BigInt(0);
      if (raw <= BigInt(0)) continue;

      const amount = Number(raw) / Math.pow(10, chain.usdtDecimals);
      if (amount <= 0) continue;

      if (!blockTimestamps.has(log.blockNumber)) {
        try {
          const block = await provider.getBlock(log.blockNumber);
          if (block?.timestamp) {
            blockTimestamps.set(log.blockNumber, block.timestamp * 1000);
          }
        } catch {
          // timestamp is optional for payment matching
        }
      }
      const blockTimestamp = blockTimestamps.get(log.blockNumber);

      results.push({
        txHash: log.transactionHash,
        amount,
        confirmations: Math.max(tip - log.blockNumber + 1, 0),
        blockNumber: log.blockNumber,
        blockTimestamp,
      });
    }

    return results;
  });
}
