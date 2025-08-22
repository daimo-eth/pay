import React from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import { PageContent } from "../../Common/Modal/styles";

import { getAddressContraction } from "@daimo/pay-common";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connector, useAccount, useDisconnect } from "wagmi";
import { Base, Ethereum, Solana, Tron } from "../../../assets/chains";
import {
  MetaMask,
  Phantom,
  Rabby,
  Rainbow,
  Trust,
  WalletIcon,
} from "../../../assets/logos";
import useIsMobile from "../../../hooks/useIsMobile";
import useLocales from "../../../hooks/useLocales";
import { flattenChildren } from "../../../utils";
import { walletConfigs } from "../../../wallets/walletConfigs";
import { Option, OptionsList } from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";
import PoweredByFooter from "../../Common/PoweredByFooter";
import WalletChainLogo from "../../Common/WalletChainLogo";

export default function SelectMethod() {
  const locales = useLocales();
  const payWithString = flattenChildren(locales.payWith).join("");
  const { isMobile, isIOS, isAndroid } = useIsMobile();

  const {
    address,
    chain,
    isConnected: isEthConnected,
    connector,
  } = useAccount();
  const {
    connected: isSolanaConnected,
    wallet: solanaWallet,
    disconnect: disconnectSolana,
    publicKey,
  } = useWallet();
  const { setRoute, paymentState, log, disableMobileInjector } =
    usePayContext();
  const { showSolanaPaymentMethod } = paymentState;
  const { disconnectAsync } = useDisconnect();

  const { externalPaymentOptions, senderEnsName } = paymentState;

  // Decide whether to show the connected eth account, solana account, or both.
  // Desktop: Always show connected wallets when available
  // Mobile: Only show connected wallets when mobile injector is enabled (!disableMobileInjector)
  const showConnectedEth =
    isEthConnected && (!isMobile || !disableMobileInjector);
  const showConnectedSolana =
    isSolanaConnected && (!isMobile || !disableMobileInjector);

  const getConnectedWalletOptions = () => {
    const showChainLogo =
      isEthConnected && isSolanaConnected && showSolanaPaymentMethod;

    const connectedOptions: Option[] = [];

    if (showConnectedEth) {
      const ethWalletDisplayName =
        senderEnsName ?? (address ? getAddressContraction(address) : "wallet");

      // Prefer icon from walletConfigs if there's a name match, otherwise fall back
      // to the connector-provided icon, and finally to the generic WalletIcon.
      let walletIcon: JSX.Element;

      const matchedConfig = Object.values(walletConfigs).find((cfg) => {
        if (!cfg.name || !connector?.name) return false;
        const cfgName = cfg.name.toLowerCase();
        const connName = connector.name.toLowerCase();
        return cfgName.includes(connName) || connName.includes(cfgName);
      });

      if (matchedConfig?.icon) {
        walletIcon =
          typeof matchedConfig.icon === "string" ? (
            <img src={matchedConfig.icon} alt={matchedConfig.name} />
          ) : (
            (matchedConfig.icon as JSX.Element)
          );
      } else if (connector?.icon) {
        walletIcon = (
          <div style={{ borderRadius: "22.5%", overflow: "hidden" }}>
            <img src={connector.icon} alt={connector.name} />
          </div>
        );
      } else {
        walletIcon = <WalletIcon />;
      }

      const connectedEthWalletOption = {
        id: "connectedWallet",
        title: `${payWithString} ${ethWalletDisplayName}`,
        icons: [
          <WalletChainLogo
            key="eth"
            walletIcon={walletIcon}
            walletName={connector?.name || "Wallet"}
            chainLogo={showChainLogo ? <Ethereum /> : null}
          />,
        ],
        onClick: () => {
          paymentState.setTokenMode("evm");
          setRoute(ROUTES.SELECT_TOKEN, {
            event: "click-wallet",
            walletId: connector?.id,
            chainId: chain?.id,
            address: address,
          });
        },
      };
      connectedOptions.push(connectedEthWalletOption);
    }

    if (showConnectedSolana && showSolanaPaymentMethod) {
      const solWalletDisplayName = getAddressContraction(
        publicKey?.toBase58() ?? "",
      );

      // Prefer icon from walletConfigs if available
      let solWalletIcon: React.ReactNode;
      const solMatchedConfig = Object.values(walletConfigs).find((cfg) => {
        if (!cfg.name) return false;
        const cfgName = cfg.name.toLowerCase();
        const solName = solanaWallet?.adapter.name.toLowerCase() || "";
        return cfgName.includes(solName) || solName.includes(cfgName);
      });

      if (solMatchedConfig?.icon) {
        solWalletIcon =
          typeof solMatchedConfig.icon === "string" ? (
            <img src={solMatchedConfig.icon} alt={solMatchedConfig.name} />
          ) : (
            (solMatchedConfig.icon as JSX.Element)
          );
      } else if (solanaWallet?.adapter.icon) {
        solWalletIcon = solanaWallet.adapter.icon;
      } else {
        solWalletIcon = <Solana />;
      }

      const connectedSolWalletOption = {
        id: "connectedSolanaWallet",
        title: `${payWithString} ${solWalletDisplayName}`,
        icons: [
          <WalletChainLogo
            key="sol-wallet"
            walletIcon={solWalletIcon}
            walletName={solanaWallet?.adapter.name || "Wallet"}
            chainLogo={showChainLogo && <Solana />}
          />,
        ],
        onClick: () => {
          paymentState.setTokenMode("solana");
          setRoute(ROUTES.SELECT_TOKEN, {
            event: "click-wallet",
            walletId: solanaWallet?.adapter.name,
            chainId: "solana",
            address: publicKey?.toBase58(),
          });
        },
      };

      connectedOptions.push(connectedSolWalletOption);
    }

    return connectedOptions;
  };

  const connectedWalletOptions = getConnectedWalletOptions();
  const unconnectedWalletOption = {
    id: "unconnectedWallet",
    title:
      isEthConnected || isSolanaConnected
        ? locales.payWithAnotherWallet
        : locales.payWithWallet,
    icons: getBestUnconnectedWalletIcons(connector, isMobile),
    onClick: async () => {
      await disconnectAsync();
      await disconnectSolana();
      setRoute(ROUTES.CONNECTORS);
    },
  };

  const options: {
    id: string;
    title: string;
    subtitle?: string;
    icons: (React.ReactNode | string)[];
    onClick: () => void;
    disabled?: boolean;
  }[] = [];
  options.push(...connectedWalletOptions);
  options.push(unconnectedWalletOption);

  log(
    `[SELECT_METHOD] loading: ${externalPaymentOptions.loading}, options: ${JSON.stringify(
      externalPaymentOptions.options,
    )}`,
  );

  // Pay with Exchange
  const exchangeOptions = externalPaymentOptions.options.get("exchange") ?? [];

  const showExchangePaymentMethod = exchangeOptions.length > 0;
  if (showExchangePaymentMethod) {
    options.push({
      id: "exchange",
      title: locales.payWithExchange,
      icons: exchangeOptions.slice(0, 3).map((option) => option.logoURI),
      onClick: () => {
        setRoute(ROUTES.SELECT_EXCHANGE, {
          event: "click-option",
          option: "exchange",
        });
      },
    });
  }

  const depositAddressOption = getDepositAddressOption(setRoute, locales);
  options.push(depositAddressOption);

  // ZKP2P is currently only available on desktop. Check if the user is on
  // desktop and if any ZKP2P options are available.
  const zkp2pOptions = externalPaymentOptions.options.get("zkp2p") ?? [];
  const showZkp2pPaymentMethod = !isMobile && zkp2pOptions.length > 0;
  if (showZkp2pPaymentMethod) {
    options.push({
      id: "ZKP2P",
      title: locales.payViaPaymentApp,
      icons: zkp2pOptions.slice(0, 2).map((option) => option.logoURI),
      onClick: () => {
        setRoute(ROUTES.SELECT_ZKP2P);
      },
    });
  }

  // Order disabled to bottom
  options.sort((a, b) => (a.disabled ? 1 : 0) - (b.disabled ? 1 : 0));

  return (
    <PageContent>
      <OrderHeader />

      <OptionsList
        requiredSkeletons={isMobile ? 4 : 3} // TODO: programmatically determine skeletons to best avoid layout shifts
        isLoading={externalPaymentOptions.loading}
        options={externalPaymentOptions.loading ? [] : options}
      />
      <PoweredByFooter />
    </PageContent>
  );
}

// Get 3 icons, skipping the one that is already connected
function getBestUnconnectedWalletIcons(
  connector: Connector | undefined,
  isMobile: boolean,
) {
  const icons: JSX.Element[] = [];
  const strippedId = connector?.id.toLowerCase(); // some connector ids can have weird casing and or suffixes and prefixes
  const [isRainbow, isPhantom, isRabby, isMetaMask] = [
    strippedId?.includes("rainbow"),
    strippedId?.includes("trust"),
    strippedId?.includes("phantom"),
    strippedId?.includes("coinbase"),
    strippedId?.includes("metamask"),
    strippedId?.includes("rabby"),
    strippedId?.includes("metamask"),
  ];

  if (isMobile) {
    icons.push(<MetaMask />);
    icons.push(<Trust background />);
    icons.push(<Rainbow />);
  } else {
    if (!isMetaMask) icons.push(<MetaMask />);
    if (!isRainbow) icons.push(<Rainbow />);
    if (!isPhantom) icons.push(<Phantom />);
    if (!isRabby && icons.length < 3) icons.push(<Rabby />);
  }

  return icons;
}

function getDepositAddressOption(
  setRoute: (route: ROUTES, data?: Record<string, any>) => void,
  locales: ReturnType<typeof useLocales>,
) {
  return {
    id: "depositAddress",
    title: locales.payToAddress,
    icons: [<Ethereum key="eth" />, <Tron key="tron" />, <Base key="base" />],
    onClick: () => {
      setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN);
    },
  };
}
