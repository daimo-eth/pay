import type { Wallet, WalletAccount } from "@wallet-standard/base";
import type {
  StandardConnectFeature,
  StandardEventsFeature,
} from "@wallet-standard/features";
import type { SolanaSignAndSendTransactionFeature } from "@solana/wallet-standard-features";
import { base58 } from "@scure/base";
import { VersionedTransaction } from "@solana/web3.js";

export type { Wallet as WalletStandardWallet } from "@wallet-standard/base";

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

// ─── Wallet Standard ────────────────────────────────────────────────────────
//
// Wallet Standard is the Solana equivalent of EIP-6963: an event-based
// discovery protocol that works with any compliant wallet (Phantom, Tria,
// Backpack, Solflare, etc.) without hardcoding wallet-specific globals.

const SOLANA_MAINNET = "solana:mainnet" as const;

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

export function isSolanaWallet(wallet: Wallet): boolean {
  return wallet.chains.some((c) => c === SOLANA_MAINNET);
}

/**
 * Wrap a wallet-standard Wallet as our SolanaProvider interface.
 * Returns null if the wallet lacks `standard:connect` or
 * `solana:signAndSendTransaction` features (e.g. a watch-only or
 * message-sign-only wallet).
 */
export function wrapWalletStandard(wallet: Wallet): SolanaProvider | null {
  const connect = wallet.features[
    "standard:connect"
  ] as StandardConnectFeature["standard:connect"] | undefined;
  const send = wallet.features[
    "solana:signAndSendTransaction"
  ] as
    | SolanaSignAndSendTransactionFeature["solana:signAndSendTransaction"]
    | undefined;
  if (!connect || !send) return null;

  const events = wallet.features[
    "standard:events"
  ] as StandardEventsFeature["standard:events"] | undefined;

  const getSolAccount = () =>
    wallet.accounts.find((a) => a.chains.some((c) => c === SOLANA_MAINNET));

  const offFns = new Map<(...args: unknown[]) => void, () => void>();

  return {
    get publicKey() {
      const a = getSolAccount();
      return a ? { toBase58: () => a.address } : null;
    },

    async connect() {
      const { accounts } = await connect.connect();
      const a = accounts.find((ac) =>
        ac.chains.some((c) => c === SOLANA_MAINNET),
      );
      if (!a) throw new Error("no solana account");
      return { publicKey: { toBase58: () => a.address } };
    },

    async signAndSendTransaction(
      tx: VersionedTransaction,
      options?: { skipPreflight?: boolean },
    ) {
      const a = getSolAccount();
      if (!a) throw new Error("no solana account");
      const [result] = await send.signAndSendTransaction({
        account: a,
        transaction: tx.serialize(),
        chain: SOLANA_MAINNET,
        options,
      });
      return { signature: base58.encode(result.signature) };
    },

    on: events
      ? (event: string, callback: (...args: unknown[]) => void) => {
          if (event !== "accountChanged") return;
          const off = events.on("change", (props) => {
            if (!props.accounts) return;
            const a = (props.accounts as readonly WalletAccount[]).find((ac) =>
              ac.chains.some((c) => c === SOLANA_MAINNET),
            );
            callback(a ? { toBase58: () => a.address } : null);
          });
          offFns.set(callback, off);
        }
      : undefined,

    off: events
      ? (event: string, callback: (...args: unknown[]) => void) => {
          if (event !== "accountChanged") return;
          offFns.get(callback)?.();
          offFns.delete(callback);
        }
      : undefined,
  };
}
