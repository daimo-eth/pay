/**
 * EIP-6963: Multi Injected Provider Discovery.
 *
 * Browser extension wallets (MetaMask, Rabby, Phantom, etc.) announce
 * themselves by firing `eip6963:announceProvider` events on `window`.
 * We dispatch `eip6963:requestProvider` to trigger announcements, then
 * collect each provider's metadata (name, icon, rdns, uuid) and its
 * EIP-1193 provider object.
 *
 * See https://eips.ethereum.org/EIPS/eip-6963
 */
import { useEffect, useState } from "react";

import type { EthereumProvider } from "./walletProvider.js";

export type InjectedWalletInfo = {
  name: string;
  icon: string;
  rdns: string;
  uuid: string;
};

export type InjectedWallet = {
  info: InjectedWalletInfo;
  provider: EthereumProvider;
};

type EIP6963AnnounceEvent = Event & {
  detail: {
    info: InjectedWalletInfo;
    provider: EthereumProvider;
  };
};

export function useInjectedWallets(): InjectedWallet[] {
  const [wallets, setWallets] = useState<InjectedWallet[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAnnounce = (event: Event) => {
      const { detail } = event as EIP6963AnnounceEvent;
      if (!detail?.info?.rdns) return;
      setWallets((prev) => {
        if (prev.some((w) => w.info.rdns === detail.info.rdns)) return prev;
        return [...prev, { info: detail.info, provider: detail.provider }];
      });
    };

    window.addEventListener("eip6963:announceProvider", handleAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleAnnounce);
    };
  }, []);

  return wallets;
}
