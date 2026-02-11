import React from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import { PageContent } from "../../Common/Modal/styles";

import {
  DepositAddressPaymentOptions,
  getAddressContraction,
} from "@daimo/pay-common";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connector, useAccount, useConnections, useDisconnect } from "wagmi";
import { Base, Ethereum, Polygon, Solana, Tron } from "../../../assets/chains";
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
  const { isMobile } = useIsMobile();

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
  const { disconnectAsync } = useDisconnect();
  const connections = useConnections();

  const { externalPaymentOptions, senderEnsName, topOptionsOrder } =
    paymentState;

  // Decide whether to show the connected eth account, solana account, or both.
  // Desktop: Always show connected wallets when available
  // Mobile: Only show connected wallets when mobile injector is enabled (!disableMobileInjector)
  const showConnectedEth =
    isEthConnected && (!isMobile || !disableMobileInjector);
  const showConnectedSolana =
    isSolanaConnected && (!isMobile || !disableMobileInjector);

  const getConnectedWalletOptions = () => {
    const showChainLogo = isEthConnected && isSolanaConnected;

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

    if (showConnectedSolana) {
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

  // Get custom wallet list if specified
  const walletOrder =
    paymentState.externalPaymentOptions.parsedConfig.walletOrder;

  const unconnectedWalletOption = {
    id: "unconnectedWallet",
    title:
      isEthConnected || isSolanaConnected
        ? locales.payWithAnotherWallet
        : locales.payWithWallet,
    icons: getBestUnconnectedWalletIcons(connector, isMobile, walletOrder),
    onClick: async () => {
      // Disconnect all wagmi connections in parallel
      await Promise.allSettled(
        connections.map((connection) =>
          disconnectAsync({ connector: connection.connector }),
        ),
      );
      await disconnectSolana();
      setRoute(ROUTES.CONNECTORS);
    },
  };

  log(
    `[SELECT_METHOD] loading: ${externalPaymentOptions.loading}, options: ${JSON.stringify(
      externalPaymentOptions.options,
    )}`,
  );

  // Build categorized options
  type CategorizedOption = {
    id: string;
    title: string;
    subtitle?: string;
    icons: (React.ReactNode | string)[];
    onClick: () => void;
    disabled?: boolean;
    category: string;
  };

  const categorizedOptions: CategorizedOption[] = [];

  // Connected wallets always appear first
  connectedWalletOptions.forEach((opt) =>
    categorizedOptions.push({ ...opt, category: "connected" }),
  );

  // Wallet options (unconnected) - only if AllWallets is in topOptionsOrder
  if (topOptionsOrder.includes("AllWallets")) {
    categorizedOptions.push({
      ...unconnectedWalletOption,
      category: "AllWallets",
    });
  }

  // Exchange options - only if AllExchanges is in topOptionsOrder
  const exchangeOptions = externalPaymentOptions.options.get("exchange") ?? [];
  const showExchangePaymentMethod =
    exchangeOptions.length > 0 && topOptionsOrder.includes("AllExchanges");
  if (showExchangePaymentMethod) {
    categorizedOptions.push({
      id: "exchange",
      title: locales.payWithExchange,
      icons: exchangeOptions.slice(0, 3).map((option) => option.logoURI),
      onClick: () => {
        setRoute(ROUTES.SELECT_EXCHANGE, {
          event: "click-option",
          option: "exchange",
        });
      },
      category: "AllExchanges",
    });
  }

  // Tron option - only if Tron is in topOptionsOrder
  if (topOptionsOrder.includes("Tron")) {
    const tronOption = paymentState.depositAddressOptions.options?.find(
      (option) => option.id === DepositAddressPaymentOptions.TRON_USDT,
    );
    if (tronOption) {
      categorizedOptions.push({
        id: "tron",
        title: tronOption.id, // Use the actual title like "USDT on Tron"
        icons: [tronOption.logoURI],
        onClick: () => {
          paymentState.setSelectedDepositAddressOption(tronOption);
          setRoute(
            paymentState.isDepositFlow
              ? ROUTES.SELECT_DEPOSIT_ADDRESS_AMOUNT
              : ROUTES.WAITING_DEPOSIT_ADDRESS,
            { event: "select_tron" },
          );
        },
        category: "Tron",
      });
    }
  }

  // Deposit address options - only if AllAddresses is in topOptionsOrder
  if (topOptionsOrder.includes("AllAddresses")) {
    const depositAddressOption = getDepositAddressOption(
      setRoute,
      locales,
      topOptionsOrder.includes("Tron"), // exclude Tron if shown separately
    );
    categorizedOptions.push({
      ...depositAddressOption,
      category: "AllAddresses",
    });
  }

  // Sort based on topOptionsOrder, keeping connected wallets first
  const sortedOptions = categorizedOptions.sort((a, b) => {
    // Connected wallets always first
    if (a.category === "connected") return -1;
    if (b.category === "connected") return 1;

    // Then sort by topOptionsOrder
    const aIndex = topOptionsOrder.indexOf(a.category);
    const bIndex = topOptionsOrder.indexOf(b.category);

    // If not in order list, put at the end
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;

    return aIndex - bIndex;
  });

  // Remove category field for final options
  const options = sortedOptions.map(({ category, ...opt }) => opt);

  // Order disabled to bottom
  options.sort((a, b) => (a.disabled ? 1 : 0) - (b.disabled ? 1 : 0));

  return (
    <PageContent>
      <OrderHeader />

      <OptionsList
        requiredSkeletons={3}
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
  walletOrder?: string[],
) {
  const icons: JSX.Element[] = [];
  const strippedId = connector?.id.toLowerCase();

  // If custom wallet list is provided, use those wallets
  if (walletOrder && walletOrder.length > 0 && isMobile) {
    const maxIcons = 3;
    for (const walletName of walletOrder) {
      if (icons.length >= maxIcons) break;

      // Skip if this wallet is already connected
      if (strippedId?.includes(walletName.toLowerCase())) continue;

      // Find wallet config
      const walletId = Object.keys(walletConfigs).find((id) => {
        const wallet = walletConfigs[id];
        const nameLower = walletName.toLowerCase();
        return (
          wallet.name?.toLowerCase().includes(nameLower) ||
          wallet.shortName?.toLowerCase().includes(nameLower) ||
          id.toLowerCase().includes(nameLower)
        );
      });

      if (walletId) {
        const wallet = walletConfigs[walletId];
        const icon = wallet.iconConnector || wallet.icon;
        if (icon) {
          icons.push(
            <div
              key={walletId}
              style={{ borderRadius: "22.5%", overflow: "hidden" }}
            >
              {icon}
            </div>,
          );
        }
      }
    }

    if (icons.length > 0) return icons;
  }

  // Default icons (fallback)
  const [isRainbow, isTrust, isPhantom, isMetaMask, isRabby] = [
    strippedId?.includes("rainbow"),
    strippedId?.includes("trust"),
    strippedId?.includes("phantom"),
    strippedId?.includes("coinbase"),
    strippedId?.includes("metamask"),
    strippedId?.includes("rabby"),
  ];

  if (isMobile) {
    if (!isMetaMask) icons.push(<MetaMask />);
    if (!isTrust) icons.push(<Trust background />);
    if (!isRainbow && icons.length < 3) icons.push(<Rainbow />);
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
  excludeTron: boolean = false,
) {
  const icons = excludeTron
    ? [<Ethereum key="eth" />, <Polygon key="polygon" />, <Base key="base" />]
    : [<Ethereum key="eth" />, <Tron key="tron" />, <Base key="base" />];

  return {
    id: "depositAddress",
    title: locales.payToAddress,
    icons,
    onClick: () => {
      setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN);
    },
  };
}
