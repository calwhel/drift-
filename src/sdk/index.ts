export interface DriftClientOptions {
  apiKey: string;
  baseUrl: string;
}

export interface CreatePaymentLinkParams {
  title: string;
  description?: string;
  amount: number;
  currency: string;
  network?: string;
  expiry?: string;
  redirect_url?: string;
}

export interface PaymentLink {
  id: string;
  shortCode: string;
  depositAddress: string;
  checkout_url: string;
  amount: string;
  currency: string;
  status: string;
}

export class DriftClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: DriftClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `Request failed: ${res.status}`);
    }

    return res.json();
  }

  paymentLinks = {
    create: (params: CreatePaymentLinkParams) =>
      this.request<PaymentLink>("POST", "/api/payment-links", params),
    list: () => this.request<PaymentLink[]>("GET", "/api/payment-links"),
    get: (id: string) => this.request<PaymentLink>("GET", `/api/payment-links/${id}`),
    deactivate: (id: string) => this.request<{ ok: boolean }>("DELETE", `/api/payment-links/${id}`),
  };

  transactions = {
    list: (params?: { page?: number; limit?: number; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.page) qs.set("page", String(params.page));
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.status) qs.set("status", params.status);
      return this.request<{ data: unknown[]; total: number }>(
        "GET",
        `/api/transactions?${qs}`
      );
    },
  };

  wallets = {
    list: () => this.request<{ wallets: unknown[]; totalBalance: number }>("GET", "/api/wallets"),
  };

  withdrawals = {
    create: (params: { amount: number; currency: string; to_address: string }) =>
      this.request("POST", "/api/withdrawals", params),
    list: () => this.request("GET", "/api/withdrawals"),
  };
}

export function verifyWebhookSignature(
  secret: string,
  body: string,
  signature: string
): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHmac } = require("crypto");
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}
