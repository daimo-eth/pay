import { useEffect, useState } from "react";
import { Connector } from "wagmi";
import { WalletConfigProps, walletConfigs } from "../wallets/walletConfigs";
import { PayLogFn } from "./usePayContext";

/** Extracts wcWallet from the current WalletConnect connector. */
export function useExtractWcWallet({
  log,
  connector,
}: {
  log: PayLogFn;
  connector?: Connector;
}) {
  const [wcWallet, setWcWallet] = useState<WalletConfigProps>();

  // Extract the currently connect WalletConnect, avoid having the old wcWallet
  // context in the button "pay with"
  useEffect(() => {
    if (connector == null) {
      setWcWallet(undefined);
      // Clear any stored deeplink choice when using a known wallet
      localStorage.removeItem("WALLETCONNECT_DEEPLINK_CHOICE");
    } else {
      // Check if getProvider exists and is a function before calling
      if (typeof connector.getProvider === "function") {
        connector
          .getProvider()
          .then((p: any) => setWcWallet(extractWcWalletFromProvider(p, log)))
          .catch((e: any) =>
            console.error(`[WCWALLET] err getting provider`, e),
          );
      } else {
        // Log a warning if getProvider is not available
        console.warn(
          `[WCWALLET] connector does not have getProvider method`,
          connector,
        );
        // Potentially reset wcWallet state if the connector is invalid/unexpected
        setWcWallet(undefined);
      }
    }
  }, [connector]);

  return wcWallet;
}

function extractWcWalletFromProvider(p: any, log: PayLogFn) {
  // First, try to find our own walletConfig matching the connected wallet.
  // This requires heuristic matching due to WalletConnect lack of ID.
  let name = p.session?.peer?.metadata?.name;
  if (p.isCoinbaseWallet) name = "Coinbase Wallet";
  if (name == null) name = "Unknown";
  let wallet = Object.values(walletConfigs).find(
    (c) => c.name === name || name.includes(c.shortName ?? c.name),
  );

  // If the wallet is not in the walletConfigs, it is a new wallet given by
  // the WalletConnect provider. Show whatever icon they provide.
  if (wallet === undefined || wallet.isWcMobileConnector === true) {
    const deeplinkJson = localStorage["WALLETCONNECT_DEEPLINK_CHOICE"];
    let deeplinkUrl: string | undefined;
    try {
      deeplinkUrl = JSON.parse(deeplinkJson).href;
      console.log(`[WCWALLET] deeplinkUrl: ${deeplinkUrl}`);
    } catch {}
    wallet = {
      name: name,
      icon: p.session?.peer?.metadata?.icons[0],
      walletDeepLink: deeplinkUrl,
      isWcMobileConnector: true,
    };
  }

  log(
    `[WCWALLET] name: ${name} wcWallet: ${wallet?.name} isWcMobileConnector: ${wallet?.isWcMobileConnector} provider: ${p}`,
  );
  return wallet;
}
