import { Connector } from "wagmi";

import { assertNotNull } from "@daimo/pay-common";
import { useConnectors } from "../hooks/useConnectors";
import { usePayContext } from "../hooks/usePayContext";
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
  const context = usePayContext();

  if (isMobile) {
    const mobileWallets: WalletProps[] = [];
    // Add injected wallet (if any) first
    connectors.forEach((connector) => {
      if (connector.id === "metaMask") return;
      if (connector.id === "walletConnect") return;
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
    addIfNotPresent(
      "metaMask, metaMask-io, io.metamask, io.metamask.mobile, metaMaskSDK",
    );

    // Add WalletConnect last
    const walletConnectConnector = connectors.find(
      (c) => c.id === "walletConnect",
    );
    if (walletConnectConnector) {
      mobileWallets.push({
        id: walletConnectConnector.id,
        connector: walletConnectConnector,
        ...walletConfigs[walletConnectConnector.id],
      });
    }

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
      iconShape: "squircle",
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

  return (
    wallets
      // remove duplicate ids
      .filter(
        (wallet, index, self) =>
          self.findIndex((w) => w.id === wallet.id) === index,
      )
      // Replace walletConnect's name with the one from options
      .map((wallet) => {
        if (wallet.id === "walletConnect") {
          return {
            ...wallet,
            name: context.options?.walletConnectName || wallet.name,
            shortName: context.options?.walletConnectName || wallet.shortName,
          };
        }
        return wallet;
      })
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
      // move walletConnect to the end
      .sort((a, b) => {
        if (a.id === "walletConnect") return 1;
        if (b.id === "walletConnect") return -1;
        return 0;
      })
  );
};
