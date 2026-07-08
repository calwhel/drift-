export interface NetworkPollHealth {
  network: string;
  failures: number;
  lastError: string | null;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
}

const health = new Map<string, NetworkPollHealth>();

function key(network: string, currency: string) {
  return `${network}|${currency}`;
}

export function recordPollSuccess(network: string, currency: string) {
  const k = key(network, currency);
  const existing = health.get(k);
  health.set(k, {
    network,
    failures: 0,
    lastError: null,
    lastFailureAt: existing?.lastFailureAt ?? null,
    lastSuccessAt: new Date().toISOString(),
  });
}

export function recordPollFailure(network: string, currency: string, error: string) {
  const k = key(network, currency);
  const existing = health.get(k);
  health.set(k, {
    network,
    failures: (existing?.failures ?? 0) + 1,
    lastError: error,
    lastFailureAt: new Date().toISOString(),
    lastSuccessAt: existing?.lastSuccessAt ?? null,
  });
}

export function getPollHealthSnapshot(): NetworkPollHealth[] {
  return Array.from(health.values());
}

export function isPollDegraded(): boolean {
  return Array.from(health.values()).some((h) => h.failures >= 3);
}
