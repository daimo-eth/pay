import { assertNotNull } from "@daimo/pay-common";
import { Connector } from "wagmi";

import Logos from "../assets/logos";
import ScanIconWithLogos from "../assets/ScanIconWithLogos";
import { useConnectors } from "../hooks/useConnectors";
import { isCoinbaseWalletConnector, isInjectedConnector } from "../utils";
import { WalletConfigProps, walletConfigs } from "./walletConfigs";

export type WalletProps = {
  id: string;
  connector?: Connector;
  isInstalled?: boolean;
} & WalletConfigProps;

export const useWallet = (id: string): WalletProps | null => {
  const wallets = useWallets();
  const wallet = wallets.find((c) => c.id === id);
  if (!wallet) return null;
  return wallet;
};
export const useWallets = (isMobile?: boolean): WalletProps[] => {
  const connectors = useConnectors();

  if (isMobile) {
    const mobileWallets: WalletProps[] = [];
    // Add injected wallet (if any) first
    connectors.forEach((connector) => {
      if (connector.id === "metaMask") return;
      if (isCoinbaseWalletConnector(connector.id)) return;
      mobileWallets.push({
        id: connector.id,
        connector,
        shortName: connector.name,
        iconConnector: <img src={connector.icon} alt={connector.name} />,
        iconShape: "squircle",
      });
    });

    function addIfNotPresent(idList: string) {
      if (mobileWallets.find((w) => idList.includes(w.id))) return;
      const wallet = assertNotNull(
        walletConfigs[idList],
        () => `missing ${idList}`,
      );
      mobileWallets.push({
        id: idList,
        ...wallet,
      });
    }

    addIfNotPresent("com.trustwallet.app");
    addIfNotPresent("me.rainbow");

    // Add other wallet
    mobileWallets.push({
      id: "other",
      name: "Other Wallets",
      shortName: "Other",
      iconConnector: <Logos.OtherWallets />,
      iconShape: "square",
      showInMobileConnectors: false,
    });

    return mobileWallets;
  }

  const wallets = connectors.map((connector): WalletProps => {
    // use overrides
    const walletId = Object.keys(walletConfigs).find(
      // where id is comma seperated list
      (id) =>
        id
          .split(",")
          .map((i) => i.trim())
          .indexOf(connector.id) !== -1,
    );

    const c: WalletProps = {
      id: connector.id,
      name: connector.name ?? connector.id ?? connector.type,
      icon: (
        <img
          src={connector.icon}
          alt={connector.name}
          width={"100%"}
          height={"100%"}
        />
      ),
      connector,
      iconShape: connector.id === "io.rabby" ? "circle" : "squircle",
      isInstalled:
        connector.type === "mock" ||
        (connector.type === "injected" && connector.id !== "metaMask") ||
        connector.type === "farcasterFrame" ||
        isCoinbaseWalletConnector(connector.id), // always run coinbase wallet SDK
    };

    if (walletId) {
      const wallet = walletConfigs[walletId];
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
    id: "Mobile Wallets",
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
          transform: "scale(1.4)",
          transformOrigin: "center center",
        }}
      >
        <ScanIconWithLogos showQR={false} />
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
          transform: "scale(1.4)",
          transformOrigin: "center center",
        }}
      >
        <ScanIconWithLogos showQR={false} />
      </div>
    ),
  });

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
      // order last mobile wallets
      .sort((a, b) => {
        if (a.id === "Mobile Wallets") return 1;
        if (b.id === "Mobile Wallets") return -1;
        return 0;
      })
  );
};
