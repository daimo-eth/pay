import React from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import { PageContent } from "../../Common/Modal/styles";

import { getAddressContraction } from "@rozoai/intent-common";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connector, useAccount, useDisconnect } from "wagmi";
import {
  Arbitrum,
  Base,
  Ethereum,
  Optimism,
  Polygon,
  Solana,
  Stellar,
} from "../../../assets/chains";
import {
  MetaMask,
  Phantom,
  Rabby,
  Rainbow,
  Trust,
  WalletIcon,
} from "../../../assets/logos";
import useIsMobile from "../../../hooks/useIsMobile";
import { useStellar } from "../../../provider/StellarContextProvider";
import { walletConfigs } from "../../../wallets/walletConfigs";
import { Option, OptionsList } from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";
import PoweredByFooter from "../../Common/PoweredByFooter";
import WalletChainLogo from "../../Common/WalletChainLogo";

export default function SelectMethod() {
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
    wallets: solanaWallets,
    disconnect: disconnectSolana,
    publicKey,
  } = useWallet();
  const { setRoute, paymentState, log, disableMobileInjector } =
    usePayContext();
  const { showSolanaPaymentMethod } = paymentState;
  const { disconnectAsync } = useDisconnect();

  // Stellar Support
  const {
    connector: stellarConnector,
    setConnector: setStellarConnector,
    isConnected: isStellarConnected,
    disconnect: disconnectStellar,
    publicKey: stellarPublicKey,
  } = useStellar();

  const { externalPaymentOptions, senderEnsName, showStellarPaymentMethod } =
    paymentState;

  // Decide whether to show the connected eth account, solana account, or both.
  // Desktop: Always show connected wallets when available
  // Mobile: Only show connected wallets when mobile injector is enabled (!disableMobileInjector)
  const showConnectedEth =
    isEthConnected && (!isMobile || !disableMobileInjector);
  const showConnectedSolana =
    isSolanaConnected && (!isMobile || !disableMobileInjector);
  const showConnectedStellar =
    isStellarConnected && (!isMobile || !disableMobileInjector);

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
        title: `Pay with ${ethWalletDisplayName}`,
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
        publicKey?.toBase58() ?? ""
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
        title: `Pay with ${solWalletDisplayName}`,
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

    if (showConnectedStellar) {
      const stellarWalletDisplayName = getAddressContraction(
        stellarPublicKey ?? ""
      );

      const connectedStellarWalletOption = {
        id: "connectedStellarWallet",
        title: `Pay with ${stellarWalletDisplayName}`,
        icons: stellarConnector?.icon
          ? [
              <WalletChainLogo
                key="stellar-wallet"
                walletIcon={stellarConnector.icon}
                walletName={stellarConnector.name}
                chainLogo={<Stellar />}
              />,
            ]
          : [
              <WalletChainLogo
                key="stellar-wallet"
                walletIcon={<Stellar />}
                walletName="Default wallet icon"
                chainLogo={<Stellar />}
              />,
            ],
        onClick: () => {
          paymentState.setTokenMode("stellar");
          setRoute(ROUTES.SELECT_TOKEN, {
            event: "click-wallet",
            walletId: stellarConnector?.id,
            chainId: "stellar",
            address: stellarPublicKey,
          });
        },
      };

      connectedOptions.push(connectedStellarWalletOption);
    }

    return connectedOptions;
  };

  const connectedWalletOptions = getConnectedWalletOptions();
  const unconnectedWalletOption = {
    id: "unconnectedWallet",
    title:
      isEthConnected || isSolanaConnected || isStellarConnected
        ? `Pay with another wallet`
        : `Pay with wallet`,
    icons: getBestUnconnectedWalletIcons(connector, isMobile),
    onClick: async () => {
      await disconnectAsync();
      await disconnectSolana();
      await disconnectStellar();
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
    `[SELECT_METHOD] loading: ${
      externalPaymentOptions.loading
    }, options: ${JSON.stringify(externalPaymentOptions.options)}`
  );

  if (showStellarPaymentMethod) {
    options.push({
      id: "stellar",
      title: "Pay with Stellar",
      icons: [<Stellar key="stellar" />],
      onClick: async () => {
        await disconnectAsync();
        await disconnectSolana();
        await disconnectStellar();
        setRoute(ROUTES.STELLAR_CONNECT);
      },
    });
  }

  // Pay with Exchange
  const exchangeOptions = externalPaymentOptions.options.get("exchange") ?? [];

  const showExchangePaymentMethod = exchangeOptions.length > 0;
  if (showExchangePaymentMethod) {
    options.push({
      id: "exchange",
      title: "Pay with exchange",
      icons: exchangeOptions.slice(0, 3).map((option) => option.logoURI),
      onClick: () => {
        setRoute(ROUTES.SELECT_EXCHANGE, {
          event: "click-option",
          option: "exchange",
        });
      },
    });
  }

  // Pay with Deposit Address
  const depositAddressOption = getDepositAddressOption(setRoute);
  options.push(depositAddressOption);

  // ZKP2P is currently only available on desktop. Check if the user is on
  // desktop and if any ZKP2P options are available.
  const zkp2pOptions = externalPaymentOptions.options.get("zkp2p") ?? [];
  const showZkp2pPaymentMethod = !isMobile && zkp2pOptions.length > 0;
  if (showZkp2pPaymentMethod) {
    options.push({
      id: "ZKP2P",
      title: "Pay via payment app",
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
      {/* TODO: Hide Tron and Ethereum from the deposit address options */}
      <OrderHeader excludeLogos={["tron", "eth"]} />

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
  isMobile: boolean
) {
  const icons: JSX.Element[] = [];
  const strippedId = connector?.id.toLowerCase(); // some connector ids can have weird casing and or suffixes and prefixes
  const [isRainbow, isTrust, isPhantom, isCoinbase, isMetamask, isRabby] = [
    strippedId?.includes("rainbow"),
    strippedId?.includes("trust"),
    strippedId?.includes("phantom"),
    strippedId?.includes("coinbase"),
    strippedId?.includes("metamask"),
    strippedId?.includes("rabby"),
  ];

  if (isMobile) {
    if (!isTrust) icons.push(<Trust background />);
    if (!isRainbow) icons.push(<Rainbow />);
    if (!isPhantom) icons.push(<Phantom />);
  } else {
    if (!isRainbow) icons.push(<Rainbow />);
    if (!isPhantom) icons.push(<Phantom />);
    if (!isRabby) icons.push(<Rabby />);
    if (!isMetamask && icons.length < 3) icons.push(<MetaMask />);
  }

  return icons;
}

function getDepositAddressOption(
  setRoute: (route: ROUTES, data?: Record<string, any>) => void
) {
  return {
    id: "depositAddress",
    title: "Pay to address",
    icons: [
      <Base key="base" />,
      <Arbitrum key="arbitrum" />,
      <Optimism key="optimism" />,
      <Polygon key="polygon" />,
    ],
    onClick: () => {
      setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN);
    },
  };
}
