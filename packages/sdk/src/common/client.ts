import type {
  CreateSessionParams,
  Session,
  WalletPaymentOption,
} from "./session.js";

export interface DaimoClient {
  createSession(params: CreateSessionParams): Promise<Session>;
  getSession(params: {
    sessionId?: string;
    locale?: string;
  }): Promise<Session>;
  pollSession(params: {
    sessionId: string;
    daAddr: string;
  }): Promise<Session>;
  recreateSession(params: { sessionId: string }): Promise<Session>;
  getWalletPaymentOptions(params: {
    sessionId: string;
    evmAddress?: string;
    solanaAddress?: string;
  }): Promise<WalletPaymentOption[]>;
  prepareSolanaBurnTx(params: {
    sessionId: string;
    userPublicKey: string;
    inputTokenMint: string;
    amountUsd: number;
  }): Promise<{ tx: string; fulfillmentId: string }>;
  processSolanaPayment(params: {
    sessionId: string;
    fulfillmentId: string;
    startTxHash: string;
    sourceToken: string;
  }): Promise<void>;
  createTronAddress(params: {
    sessionId: string;
    amountUsd: number;
  }): Promise<{ address: string; expiresAt: number } | { error: string }>;
  getExchangeUrl(params: {
    sessionId: string;
    daAddr: string;
    exchangeId: string;
    amountUsd: number;
    platform?: string;
  }): Promise<{ url: string; waitingMessage: string } | null>;
  logNavEvent(params: {
    sessionId: string;
    action: string;
    data: Record<string, unknown>;
  }): Promise<void>;
}

const DEFAULT_API_URL = "https://pay-api.daimo.xyz";

/**
 * Create a DaimoClient backed by the Daimo Pay API.
 * Uses plain fetch — no TRPC dependency.
 */
export function createDaimoClient(apiUrl?: string): DaimoClient {
  const base = (apiUrl ?? DEFAULT_API_URL).replace(/\/$/, "");

  async function query<T>(procedure: string, input: unknown): Promise<T> {
    const encoded = encodeURIComponent(JSON.stringify({ json: input }));
    const res = await fetch(`${base}/${procedure}?input=${encoded}`);
    if (!res.ok) {
      throw new Error(`${procedure} failed: ${res.status}`);
    }
    const body = await res.json();
    return extractResult(body);
  }

  async function mutate<T>(procedure: string, input: unknown): Promise<T> {
    const res = await fetch(`${base}/${procedure}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: input }),
    });
    if (!res.ok) {
      throw new Error(`${procedure} failed: ${res.status}`);
    }
    const body = await res.json();
    return extractResult(body);
  }

  return {
    createSession: (p) => mutate("createSession", p),
    getSession: (p) => query("getSession", p),
    pollSession: (p) => query("pollSession", p),
    recreateSession: (p) => mutate("recreateSession", p),
    getWalletPaymentOptions: (p) => query("getSessionWalletPaymentOptions", p),
    prepareSolanaBurnTx: (p) => mutate("prepareSessionSolanaBurnTx", p),
    processSolanaPayment: (p) => mutate("processSessionSolanaPayment", p),
    createTronAddress: (p) => mutate("createSessionTronAddress", p),
    getExchangeUrl: (p) => query("getSessionExchangeUrl", p),
    logNavEvent: (p) => mutate("nav", p),
  };
}

/** Extract the result from a TRPC JSON response envelope. */
function extractResult(body: any): any {
  // Standard TRPC response: { result: { data: { json: T } } }
  // Batched responses wrap in an array: [{ result: ... }]
  const entry = Array.isArray(body) ? body[0] : body;
  return entry?.result?.data?.json ?? entry?.result?.data ?? entry;
}
