import { useEffect } from "react";
import { useAccount } from "wagmi";
import { WalletConfigProps, walletConfigs } from "../wallets/walletConfigs";
import { usePayContext } from "./usePayContext";

/** Extracts wcWallet from the current WalletConnect connector. */
export function useExtractWcWallet() {
  const { connector } = useAccount();

  const { wcWallet, setWcWallet, log } = usePayContext();

  // Extract the currently connect WalletConnect, avoid having the old wcWallet
  // context in the button "pay with"
  useEffect(() => {
    connector?.getProvider()?.then((p: any) => {
      let name = p.session?.peer?.metadata?.name;
      if (p.isCoinbaseWallet) name = "Coinbase Wallet";
      if (name == null) name = "Unknown";
      const wallet = Object.values(walletConfigs).find(
        (c) => c.name === name || name.includes(c.shortName ?? c.name),
      );
      // If the wallet is not in the walletConfigs, it is a new wallet given by
      // the WalletConnect provider.
      if (wallet === undefined) {
        const newWallet = {
          name: name,
          icon: p.session?.peer?.metadata?.icons[0],
          showInMobileConnectors: false,
          isWcMobileConnector: true,
        } as WalletConfigProps;
        setWcWallet(newWallet);
      }
      if (wallet?.name != null) {
        setWcWallet(wallet);
      }
      log(`[EXTRACT_WC_WALLET] name: ${name} wcWallet: ${wcWallet?.name}`, p);
    });
  }, [connector]);
}
