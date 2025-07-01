import React from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import { PageContent } from "../../Common/Modal/styles";

import { getAddressContraction } from "@rozoai/intent-common";
import { useWallet, Wallet } from "@solana/wallet-adapter-react";
import { Connector, useAccount, useDisconnect } from "wagmi";
import { Arbitrum, Base, Ethereum, Optimism, Polygon, Solana, Tron } from "../../../assets/chains";
import {
  Coinbase,
  Phantom,
  Rainbow,
  Trust,
  WalletIcon,
} from "../../../assets/logos";
import useIsMobile from "../../../hooks/useIsMobile";
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
  const { disconnectAsync } = useDisconnect();

  const {
    setSelectedExternalOption,
    externalPaymentOptions,
    showSolanaPaymentMethod,
    senderEnsName,
  } = paymentState;

  // Decide whether to show the connected eth account, solana account, or both.
  // Desktop: Always show connected wallets when available
  // Mobile: Only show connected wallets when mobile injector is enabled (!disableMobileInjector)
  const showConnectedEth =
    isEthConnected && (!isMobile || !disableMobileInjector);
  const showConnectedSolana =
    isSolanaConnected &&
    showSolanaPaymentMethod &&
    (!isMobile || !disableMobileInjector);

  const getConnectedWalletOptions = () => {
    const showChainLogo = isEthConnected && isSolanaConnected;

    const connectedOptions: Option[] = [];

    if (showConnectedEth) {
      const ethWalletDisplayName =
        senderEnsName ?? (address ? getAddressContraction(address) : "wallet");

      let walletIcon: JSX.Element;
      if (connector?.icon) {
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

    if (showConnectedSolana) {
      const solWalletDisplayName = getAddressContraction(
        publicKey?.toBase58() ?? "",
      );

      const connectedSolWalletOption = {
        id: "connectedSolanaWallet",
        title: `Pay with ${solWalletDisplayName}`,
        icons: solanaWallet?.adapter.icon
          ? [
            <WalletChainLogo
              key="sol-wallet"
              walletIcon={solanaWallet.adapter.icon}
              walletName={solanaWallet.adapter.name}
              chainLogo={showChainLogo && <Solana />}
            />,
          ]
          : [
            <WalletChainLogo
              key="sol-wallet"
              walletIcon={<Solana />}
              walletName="Default wallet icon"
              chainLogo={null}
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
        ? `Pay with another wallet`
        : `Pay with wallet`,
    icons: getBestUnconnectedWalletIcons(connector, isMobile),
    onClick: async () => {
      await disconnectAsync();
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

  if (showSolanaPaymentMethod) {
    const solanaOption = getSolanaOption(
      isIOS,
      isAndroid,
      solanaWallets,
      disconnectSolana,
      setRoute,
    );
    if (solanaOption) {
      options.push(solanaOption);
    }
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
  isMobile: boolean,
) {
  const icons: JSX.Element[] = [];
  const strippedId = connector?.id.toLowerCase(); // some connector ids can have weird casing and or suffixes and prefixes
  const [isRainbow, isTrust, isPhantom, isCoinbase] = [
    strippedId?.includes("rainbow"),
    strippedId?.includes("trust"),
    strippedId?.includes("phantom"),
    strippedId?.includes("coinbase"),
  ];

  if (isMobile) {
    if (!isTrust) icons.push(<Trust background />);
    if (!isRainbow) icons.push(<Rainbow />);
    if (!isPhantom) icons.push(<Phantom />);
    if (!isCoinbase && icons.length < 3) icons.push(<Coinbase />);
  } else {
    if (!isRainbow) icons.push(<Rainbow />);
    if (!isPhantom) icons.push(<Phantom />);
    if (!isCoinbase) icons.push(<Coinbase />);
  }

  return icons;
}

function getSolanaOption(
  isIOS: boolean,
  isAndroid: boolean,
  solanaWallets: Wallet[],
  disconnectSolana: () => Promise<void>,
  setRoute: (route: ROUTES, data?: Record<string, any>) => void,
) {
  // If we're on iOS and there are no wallets, we don't need to show the Solana option
  // If we're on Android and there are less than 2 wallets, we don't need to show the Solana option because there is always a default wallet called Mobile Wallet Adapter that is not useful
  if (
    (isIOS && solanaWallets.length === 0) ||
    (isAndroid && solanaWallets.length < 2)
  )
    return null;

  return {
    id: "solana",
    title: "Pay on Solana",
    icons: [<Solana key="solana" />],
    onClick: async () => {
      await disconnectSolana();
      setRoute(ROUTES.SOLANA_CONNECT);
    },
  };
}

function getDepositAddressOption(
  setRoute: (route: ROUTES, data?: Record<string, any>) => void,
) {
  return {
    id: "depositAddress",
    title: "Pay to address",
    icons: [<Base key="base" />, <Arbitrum key="arbitrum" />, <Optimism key="optimism" />, <Polygon key="polygon" />],
    onClick: () => {
      setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN);
    },
  };
}
