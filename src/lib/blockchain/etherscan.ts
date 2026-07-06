const ETHERSCAN_V2_BASE = "https://api.etherscan.io/v2/api";
export const ETHEREUM_CHAIN_ID = 1;

export function buildEtherscanV2Url(
  apiKey: string,
  params: Record<string, string>,
  chainId = ETHEREUM_CHAIN_ID
): string {
  const search = new URLSearchParams({
    chainid: String(chainId),
    apikey: apiKey,
    ...params,
  });
  return `${ETHERSCAN_V2_BASE}?${search.toString()}`;
}

export async function etherscanV2Fetch(
  apiKey: string,
  params: Record<string, string>,
  chainId = ETHEREUM_CHAIN_ID
): Promise<Response> {
  return fetch(buildEtherscanV2Url(apiKey, params, chainId), { cache: "no-store" });
}

export async function parseEtherscanV2Json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`Etherscan HTTP ${res.status}`);
  }
  const data = (await res.json()) as { status?: string; message?: string; result?: T };
  if (data.status !== "1") {
    const detail =
      typeof data.result === "string"
        ? data.result
        : data.message ?? "Etherscan request failed";
    throw new Error(detail);
  }
  return data.result as T;
}
