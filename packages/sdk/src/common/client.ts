import type {
  CreateSessionParams,
  ModalSession,
  WalletPaymentOption,
} from "./session.js";

export interface DaimoClient {
  createSession(params: CreateSessionParams): Promise<ModalSession>;
  getSession(params: {
    sessionId?: string;
    locale?: string;
  }): Promise<ModalSession>;
  pollSession(params: {
    sessionId: string;
    daAddr: string;
  }): Promise<ModalSession>;
  recreateSession(params: { sessionId: string }): Promise<ModalSession>;
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
    const encoded = encodeURIComponent(JSON.stringify(input));
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
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      throw new Error(`${procedure} failed: ${res.status}`);
    }
    const body = await res.json();
    return extractResult(body);
  }

  return {
    createSession: (p) => mutate("createSession", p).then(toModalSession),
    getSession: (p) => query("getSession", p).then(toModalSession),
    pollSession: (p) => query("pollSession", p).then(toModalSession),
    recreateSession: (p) => mutate("recreateSession", p).then(toModalSession),
    getWalletPaymentOptions: (p) => query("getSessionWalletPaymentOptions", p),
    prepareSolanaBurnTx: (p) => mutate("prepareSessionSolanaBurnTx", p),
    processSolanaPayment: (p) => mutate("processSessionSolanaPayment", p),
    createTronAddress: (p) => mutate("createSessionTronAddress", p),
    getExchangeUrl: (p) => query("getSessionExchangeUrl", p),
    logNavEvent: (p) => mutate("nav", p),
  };
}

/** Extract the result from a TRPC response envelope. */
function extractResult(body: any): any {
  const entry = Array.isArray(body) ? body[0] : body;
  return entry?.result?.data ?? entry;
}

/** Map raw API response to ModalSession (state→status, depositAddress→receivers). */
export function toModalSession(raw: any): ModalSession {
  return {
    ...raw,
    status: raw.status ?? raw.state,
    receivers: raw.receivers ?? { evm: { address: raw.depositAddress } },
  };
}
