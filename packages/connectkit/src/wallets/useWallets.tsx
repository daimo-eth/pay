import { assertNotNull } from "@daimo/pay-common";
import { Connector } from "wagmi";

import { useWallet as useSolanaWalletAdapter } from "@solana/wallet-adapter-react";
import Logos, { SquircleIcon, WalletIcon } from "../assets/logos";
import MobileWithLogos from "../assets/MobileWithLogos";
import { useConnectors } from "../hooks/useConnectors";
import useLocales from "../hooks/useLocales";
import { usePayContext } from "../hooks/usePayContext";
import { SolanaWalletName } from "../provider/SolanaContextProvider";
import {
  flattenChildren,
  isCoinbaseWalletConnector,
  isInjectedConnector,
} from "../utils";
import { WalletConfigProps, walletConfigs } from "./walletConfigs";

/** Special wallet ID for "other wallets" option. */
export const WALLET_ID_OTHER_WALLET = "otherWallet";
/** Special wallet ID for "mobile wallets" option. */
export const WALLET_ID_MOBILE_WALLETS = "mobileWallets";

export type WalletProps = {
  id: string;
  connector?: Connector;
  isInstalled?: boolean;
  /** Name of the matching Solana wallet adapter (if any) */
  solanaConnectorName?: SolanaWalletName;
} & WalletConfigProps;

export const useWallet = (id: string): WalletProps | null => {
  const wallets = useWallets();
  const wallet = wallets.find((c) => c.id === id);
  if (!wallet) return null;
  return wallet;
};

export const useWallets = (isMobile?: boolean): WalletProps[] => {
  const connectors = useConnectors();
  const context = usePayContext();
  const { showSolanaPaymentMethod } = context.paymentState;
  const { disableMobileInjector } = context;
  // Solana wallets available in the session (desktop & mobile)
  const solanaWallet = useSolanaWalletAdapter();
  const locales = useLocales();
  if (isMobile) {
    const mobileWallets: WalletProps[] = [];

    // Add injected wallet (if any) first, unless disabled
    if (!disableMobileInjector) {
      connectors.forEach((connector) => {
        if (isCoinbaseWalletConnector(connector.id)) return;
        if (!isInjectedConnector(connector.type)) return;
        // Skip any connectors that mention WalletConnect
        if (connector.name?.toLowerCase().includes("walletconnect")) return;
        mobileWallets.push({
          id: connector.id,
          connector,
          shortName: connector.name,
          iconConnector: connector.icon ? (
            <img src={connector.icon} alt={connector.name} />
          ) : (
            <WalletIcon />
          ),
          iconShape: "squircle",
        });
      });
    }

    function addIfNotPresent(idList: string) {
      if (mobileWallets.find((w) => idList.includes(w.id))) return;
      if (mobileWallets.length >= 3) return;
      const wallet = assertNotNull(
        walletConfigs[idList],
        () => `missing ${idList}`,
      );
      mobileWallets.push({
        id: idList,
        ...wallet,
      });
    }

    addIfNotPresent(
      "metaMask, metaMask-io, io.metamask, io.metamask.mobile, metaMaskSDK",
    );
    addIfNotPresent("com.trustwallet.app");
    const otherWalletsString = flattenChildren(locales.otherWallets).join("");
    const otherString = flattenChildren(locales.other).join("");
    // Add other wallet
    mobileWallets.push({
      id: WALLET_ID_OTHER_WALLET,
      name: otherWalletsString,
      shortName: otherString,
      iconConnector: <Logos.OtherWallets />,
      iconShape: "square",
      showInMobileConnectors: false,
    });

    return mobileWallets;
  }

  const wallets = connectors
    .filter((connector) => {
      // Skip any connectors that mention WalletConnect
      return !connector.name?.toLowerCase().includes("walletconnect");
    })
    .map((connector): WalletProps => {
      // First, attempt to find a config by matching connector.id (existing logic).
      let walletConfigKey: string | undefined = Object.keys(walletConfigs).find(
        (id) =>
          id
            .split(",")
            .map((i) => i.trim())
            .includes(connector.id),
      );

      // If not found by id, attempt a fuzzy match on connector.name.
      if (!walletConfigKey && connector.name) {
        walletConfigKey = Object.keys(walletConfigs).find((key) => {
          const cfgName = walletConfigs[key].name?.toLowerCase();
          const connName = connector.name!.toLowerCase();
          return (
            cfgName &&
            (cfgName.includes(connName) || connName.includes(cfgName))
          );
        });
      }

      const c: WalletProps = {
        id: connector.id,
        name: connector.name ?? connector.id ?? connector.type,
        icon: connector.icon ? (
          <img
            src={connector.icon}
            alt={connector.name}
            width={"100%"}
            height={"100%"}
          />
        ) : (
          <WalletIcon />
        ),
        connector,
        iconShape: connector.id === "io.rabby" ? "circle" : "squircle",
        isInstalled:
          connector.type === "mock" ||
          (connector.type === "injected" && connector.id !== "metaMask") ||
          connector.type === "farcasterFrame" ||
          isCoinbaseWalletConnector(connector.id),
      };

      if (walletConfigKey) {
        const wallet = walletConfigs[walletConfigKey];
        return {
          ...c,
          iconConnector: connector.icon ? (
            <img
              src={connector.icon}
              alt={connector.name}
              width={"100%"}
              height={"100%"}
            />
          ) : undefined,
          ...wallet,
        };
      }

      return c;
    });

  wallets.push({
    id: WALLET_ID_MOBILE_WALLETS,
    name: "Mobile Wallets",
    shortName: "Mobile",
    icon: (
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "scale(1.2)",
          transformOrigin: "center center",
        }}
      >
        <MobileWithLogos />
      </div>
    ),
    iconConnector: (
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "scale(1.2)",
          transformOrigin: "center center",
        }}
      >
        <MobileWithLogos />
      </div>
    ),
  });

  if (showSolanaPaymentMethod) {
    const solanaAdapters = solanaWallet.wallets ?? [];

    // Merge by fuzzy name matching (includes comparison)
    wallets.forEach((w) => {
      // Skip wallets without a usable name to avoid matching everything
      if (!w.name) return;

      const evm = w.name.toLowerCase();
      const match = solanaAdapters.find((sw) => {
        const sol = sw.adapter.name.toLowerCase();
        return evm.includes(sol) || sol.includes(evm);
      });

      if (match) {
        w.solanaConnectorName = match.adapter.name;
      }
    });

    const unmatched = solanaAdapters.filter(
      (sw) => !wallets.find((w) => w.solanaConnectorName === sw.adapter.name),
    );

    unmatched.forEach((sw) => {
      wallets.push({
        id: `solana-${sw.adapter.name}`,
        name: sw.adapter.name,
        shortName: sw.adapter.name,
        icon: <SquircleIcon icon={sw.adapter.icon} alt={sw.adapter.name} />,
        iconConnector: (
          <SquircleIcon icon={sw.adapter.icon} alt={sw.adapter.name} />
        ),
        iconShape: "squircle",
        solanaConnectorName: sw.adapter.name,
      });
    });
  }

  return (
    wallets
      // remove duplicate ids
      .filter(
        (wallet, index, self) =>
          self.findIndex((w) => w.id === wallet.id) === index,
      )
      // remove wallet with id coinbaseWalletSDK if wallet with id 'com.coinbase.wallet' exists
      .filter(
        (wallet, index, self) =>
          !(
            wallet.id === "coinbaseWalletSDK" &&
            self.find((w) => w.id === "com.coinbase.wallet")
          ),
      )
      // remove wallet with id io.metamask if wallet with id 'metaMask' exists
      .filter(
        (wallet, index, self) =>
          !(
            (wallet.id === "metaMaskSDK" || wallet.id === "metaMask") &&
            self.find(
              (w) => w.id === "io.metamask" || w.id === "io.metamask.mobile",
            )
          ),
      )
      // remove wallet with id 'com.warpcast.mobile' if wallet with id 'farcaster' exists
      .filter(
        (wallet, index, self) =>
          !(
            wallet.id === "com.warpcast.mobile" &&
            self.find((w) => w.id === "farcaster")
          ),
      )
      // order by isInstalled injected connectors first
      .sort((a, b) => {
        const AisInstalled =
          a.isInstalled && isInjectedConnector(a.connector?.type);
        const BisInstalled =
          b.isInstalled && isInjectedConnector(b.connector?.type);

        if (AisInstalled && !BisInstalled) return -1;
        if (!AisInstalled && BisInstalled) return 1;
        return 0;
      })
      // order "mobile wallets" option last
      .sort((a, b) => {
        if (a.id === WALLET_ID_MOBILE_WALLETS) return 1;
        if (b.id === WALLET_ID_MOBILE_WALLETS) return -1;
        return 0;
      })
  );
};
