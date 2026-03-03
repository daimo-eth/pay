/**
 * Multi-chain injected wallet discovery.
 *
 * EVM: EIP-6963 announceProvider events on window, with window.ethereum
 *      fallback for in-app browsers (MiniPay, MetaMask mobile, etc.).
 * Solana: Known window globals (e.g. window.phantom.solana).
 *
 * Wallets supporting both chains (e.g. Phantom) are deduplicated into a
 * single entry with both evmProvider and solanaProvider set.
 */
import { useEffect, useState } from "react";

import type { EthereumProvider, SolanaProvider } from "./walletProvider.js";
import {
  getEthereumProvider,
  getSolanaProvider,
  getSolanaProviderForRdns,
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
        const solanaProvider = getSolanaProviderForRdns(detail.info.rdns) ?? undefined;
        const filtered = prev.filter((w) => w.info.rdns !== "standalone.evm");
        return [
          ...filtered,
          {
            info: detail.info,
            evmProvider: detail.provider,
            solanaProvider,
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

  // Add standalone Solana wallets with no EVM match.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const solana = getSolanaProvider();
    if (!solana) return;

    setWallets((prev) => {
      if (prev.some((w) => w.solanaProvider === solana)) return prev;
      return [
        ...prev,
        {
          info: {
            name: "Solana Wallet",
            icon: "",
            rdns: "standalone.solana",
            uuid: "standalone-solana",
          },
          solanaProvider: solana,
        },
      ];
    });
  }, [wallets.length]);

  return wallets;
}
