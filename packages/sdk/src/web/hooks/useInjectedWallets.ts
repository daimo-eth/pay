/**
 * Multi-chain injected wallet discovery.
 *
 * EVM: EIP-6963 announceProvider events on window, with window.ethereum
 *      fallback for in-app browsers (MiniPay, MetaMask mobile, etc.).
 * Solana: Wallet Standard discovery (wallet-standard:register-wallet events).
 *         Works with any compliant wallet (Phantom, Tria, Backpack,
 *         Solflare, etc.).
 *
 * Wallets supporting both chains (e.g. Phantom) are deduplicated into a
 * single entry with both evmProvider and solanaProvider set.
 */
import { getWallets } from "@wallet-standard/app";
import { useEffect, useState } from "react";

import type {
  EthereumProvider,
  SolanaProvider,
  WalletStandardWallet,
} from "./walletProvider.js";
import {
  getEthereumProvider,
  getSolanaProvider,
  isSolanaWallet,
  wrapWalletStandard,
} from "./walletProvider.js";

export type InjectedWalletInfo = {
  name: string;
  icon: string;
  rdns: string;
  uuid: string;
};

export type InjectedWallet = {
  info: InjectedWalletInfo;
  evmProvider?: EthereumProvider;
  solanaProvider?: SolanaProvider;
};

type EIP6963AnnounceEvent = Event & {
  detail: {
    info: InjectedWalletInfo;
    provider: EthereumProvider;
  };
};

/** Find wallet entry index by name that's missing a given provider type. */
function findMergeable(
  wallets: InjectedWallet[],
  name: string,
  needs: "evmProvider" | "solanaProvider",
): number {
  return wallets.findIndex((w) => !w[needs] && w.info.name === name);
}

function getInitialWallets(): InjectedWallet[] {
  if (typeof window === "undefined") return [];
  const ethereum = getEthereumProvider();
  const solana = getSolanaProvider();
  if (!ethereum && !solana) return [];

  const wallets: InjectedWallet[] = [];
  if (ethereum) {
    wallets.push({
      info: {
        name: "Wallet",
        icon: "",
        rdns: "standalone.evm",
        uuid: "standalone-evm",
      },
      evmProvider: ethereum,
      solanaProvider: solana ?? undefined,
    });
  } else if (solana) {
    wallets.push({
      info: {
        name: "Solana Wallet",
        icon: "",
        rdns: "standalone.solana",
        uuid: "standalone-solana",
      },
      solanaProvider: solana,
    });
  }
  return wallets;
}

export function useInjectedWallets(): InjectedWallet[] {
  const [wallets, setWallets] = useState<InjectedWallet[]>(getInitialWallets);

  // EIP-6963 discovery. Any announcement supersedes the window.ethereum fallback.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAnnounce = (event: Event) => {
      const { detail } = event as EIP6963AnnounceEvent;
      if (!detail?.info?.rdns) return;
      setWallets((prev) => {
        if (prev.some((w) => w.info.rdns === detail.info.rdns)) return prev;
        const filtered = prev.filter((w) => w.info.rdns !== "standalone.evm");

        // Merge with wallet-standard Solana-only entry with the same name
        const wsIdx = findMergeable(filtered, detail.info.name, "evmProvider");
        if (wsIdx >= 0) {
          const updated = [...filtered];
          updated[wsIdx] = {
            info: detail.info,
            evmProvider: detail.provider,
            solanaProvider: filtered[wsIdx].solanaProvider,
          };
          return updated;
        }

        return [
          ...filtered,
          {
            info: detail.info,
            evmProvider: detail.provider,
          },
        ];
      });
    };

    window.addEventListener("eip6963:announceProvider", handleAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleAnnounce);
    };
  }, []);

  // Wallet Standard discovery for Solana wallets.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const { get, on } = getWallets();

    const processWallet = (stdWallet: WalletStandardWallet) => {
      if (!isSolanaWallet(stdWallet)) return;
      const solanaProvider = wrapWalletStandard(stdWallet);
      if (!solanaProvider) return;

      setWallets((prev) => {
        // Merge with existing EIP-6963 entry that lacks a Solana provider
        const evmIdx = findMergeable(prev, stdWallet.name, "solanaProvider");
        if (evmIdx >= 0) {
          const updated = [...prev];
          updated[evmIdx] = { ...updated[evmIdx], solanaProvider };
          return updated;
        }

        // Already tracked with Solana provider under this name? Skip.
        if (prev.some((w) => w.solanaProvider && w.info.name === stdWallet.name))
          return prev;

        // Add as standalone Solana wallet
        const slug = stdWallet.name.toLowerCase().replace(/\s+/g, "-");
        return [
          ...prev,
          {
            info: {
              name: stdWallet.name,
              icon: typeof stdWallet.icon === "string" ? stdWallet.icon : "",
              rdns: `wallet-standard.${slug}`,
              uuid: `ws-${slug}`,
            },
            solanaProvider,
          },
        ];
      });
    };

    for (const w of get()) processWallet(w as WalletStandardWallet);
    const off = on("register", (...newWallets) => {
      for (const w of newWallets) processWallet(w as WalletStandardWallet);
    });

    return off;
  }, []);

  return wallets;
}
