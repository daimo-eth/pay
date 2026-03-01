import { VersionedTransaction } from "@solana/web3.js";

/** EVM wallet provider (window.ethereum) */
export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    callback: (...args: unknown[]) => void,
  ) => void;
  isMiniPay?: boolean;
};

/** Solana wallet provider (window.phantom?.solana or window.solana) */
export type SolanaProvider = {
  publicKey: { toBase58: () => string } | null;
  connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
  signAndSendTransaction: (
    tx: VersionedTransaction,
    options?: { skipPreflight?: boolean },
  ) => Promise<{ signature: string }>;
  on?: (event: string, callback: (...args: unknown[]) => void) => void;
  off?: (event: string, callback: (...args: unknown[]) => void) => void;
};

type WindowWithWallets = Window & {
  ethereum?: EthereumProvider;
  phantom?: { solana?: SolanaProvider };
  solana?: SolanaProvider;
};

/** Get the EVM wallet provider from window.ethereum */
export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return (window as WindowWithWallets).ethereum ?? null;
}

/** Get the Solana wallet provider from window.phantom?.solana or window.solana */
export function getSolanaProvider(): SolanaProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as WindowWithWallets;
  return w.phantom?.solana ?? w.solana ?? null;
}

/** Get the Solana provider for a known multi-chain wallet by EIP-6963 rdns. */
export function getSolanaProviderForRdns(rdns: string): SolanaProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as WindowWithWallets;
  if (rdns === "app.phantom") return w.phantom?.solana ?? null;
  return null;
}
