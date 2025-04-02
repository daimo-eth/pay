import React, { useEffect, useMemo } from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import { PageContent } from "../../Common/Modal/styles";

import {
  DepositAddressPaymentOptionMetadata,
  ExternalPaymentOptions,
  getAddressContraction,
} from "@daimo/pay-common";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connector, useAccount, useDisconnect } from "wagmi";
import { Bitcoin, Ethereum, Solana, Tron, Zcash } from "../../../assets/chains";
import { Coinbase, MetaMask, Rabby, Rainbow } from "../../../assets/logos";
import useIsMobile from "../../../hooks/useIsMobile";
import { walletConfigs } from "../../../wallets/walletConfigs";
import OptionsList from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";
import PoweredByFooter from "../../Common/PoweredByFooter";
import WalletChainLogo from "../../Common/WalletChainLogo";

// Get 3 icons, skipping the one that is already connected
function getBestUnconnectedWalletIcons(connector: Connector | undefined) {
  const icons: JSX.Element[] = [];
  const strippedId = connector?.id.toLowerCase(); // some connector ids can have weird casing and or suffixes and prefixes
  const [isMetaMask, isRainbow, isCoinbase] = [
    strippedId?.includes("metamask"),
    strippedId?.includes("rainbow"),
    strippedId?.includes("coinbase"),
  ];

  if (!isMetaMask) icons.push(<MetaMask />);
  if (!isRainbow) icons.push(<Rainbow />);
  if (!isCoinbase) icons.push(<Coinbase />);
  if (icons.length < 3) icons.push(<Rabby />);

  return icons;
}

function getSolanaOption(isOnIOS: boolean) {
  const { wallets } = useWallet();
  const { setRoute } = usePayContext();

  if (wallets.length === 0 && !isOnIOS) return null;

  return {
    id: "solana",
    title: "Pay on Solana",
    icons: [<Solana />],
    onClick: () => {
      setRoute(ROUTES.SOLANA_CONNECT);
    },
  };
}

function getDepositAddressOption(depositAddressOptions: {
  loading: boolean;
  options: DepositAddressPaymentOptionMetadata[];
}) {
  const { setRoute, paymentState } = usePayContext();

  // TODO: API should serve the subtitle and disabled
  const disabled =
    !paymentState.isDepositFlow &&
    !depositAddressOptions.loading &&
    depositAddressOptions.options.length === 0;
  const subtitle = disabled ? "Minimum $20.00" : "Bitcoin, Tron, Zcash...";

  return {
    id: "depositAddress",
    title: "Pay on another chain",
    subtitle,
    icons: [<Bitcoin />, <Tron />, <Zcash />],
    onClick: () => {
      setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN);
    },
    disabled,
  };
}

const SelectMethod: React.FC = () => {
  const isMobile = useIsMobile();
  const isOnIOS = useMemo(() => {
    return /iPad|iPhone/.test(navigator.userAgent);
  }, []);

  const {
    address,
    chain,
    isConnected: isEthConnected,
    connector,
  } = useAccount();
  const {
    connected: isSolanaConnected,
    wallet: solanaWallet,
    publicKey,
  } = useWallet();
  const { setRoute, paymentState, wcWallet, setWcWallet, log } =
    usePayContext();
  const { disconnectAsync } = useDisconnect();

  const {
    daimoPayOrder,
    setSelectedExternalOption,
    externalPaymentOptions,
    depositAddressOptions,
    senderEnsName,
  } = paymentState;
  const paymentOptions = daimoPayOrder?.metadata.payer?.paymentOptions;

  // Extract the currently connect WalletConnect wallet
  useEffect(() => {
    connector?.getProvider()?.then((p: any) => {
      let name = p.session?.peer?.metadata?.name;
      if (p.isCoinbaseWallet) name = "Coinbase Wallet";
      if (name == null) name = "Unknown";
      const wallet = Object.values(walletConfigs).find(
        (c) => c.name === name || name.includes(c.shortName),
      );
      log(`[SELECT_METHOD] wcWallet: ${wallet?.name} ${wallet != null}`, p);
      //case MetaMask
      if (wallet != null) {
        setWcWallet(wallet);
      }
    });
  }, [connector]);

  const getConnectedWalletOptions = () => {
    const showChainLogo = isEthConnected && isSolanaConnected;

    const connectedOptions: {
      id: string;
      title: string;
      icons: JSX.Element[];
      onClick: () => void;
    }[] = [];

    if (isEthConnected) {
      const ethWalletDisplayName =
        senderEnsName ?? (address ? getAddressContraction(address) : "wallet");

      let walletIcon: JSX.Element;
      if (connector?.icon) {
        walletIcon = <img src={connector.icon} alt={connector.name} />;
      } else if (wcWallet?.icon) {
        walletIcon = (
          <div style={{ borderRadius: "22.5%", overflow: "hidden" }}>
            {wcWallet.icon}
          </div>
        );
      } else {
        walletIcon = <MetaMask />;
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

    if (isSolanaConnected) {
      const solWalletDisplayName = getAddressContraction(
        publicKey?.toBase58() ?? "",
      );

      const connectedSolWalletOption = {
        id: "connectedSolanaWallet",
        title: `Pay with ${solWalletDisplayName}`,
        icons: solanaWallet?.adapter.icon
          ? [
              <WalletChainLogo
                walletIcon={solanaWallet.adapter.icon}
                walletName={solanaWallet.adapter.name}
                chainLogo={showChainLogo && <Solana />}
              />,
            ]
          : [
              <WalletChainLogo
                walletIcon={<Solana />}
                walletName="Default wallet icon"
                chainLogo={null}
              />,
            ],
        onClick: () => {
          setRoute(ROUTES.SOLANA_SELECT_TOKEN, {
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

  // Solana payment option
  // Include by default if paymentOptions not provided
  const includeSolana =
    paymentOptions == null ||
    paymentOptions.includes(ExternalPaymentOptions.Solana);
  // Deposit address options, e.g. Bitcoin, Tron, Zcash, etc.
  // Include by default if paymentOptions not provided
  const includeDepositAddressOption =
    paymentOptions == null ||
    paymentOptions.includes(ExternalPaymentOptions.ExternalChains);

  const connectedWalletOptions = getConnectedWalletOptions();
  const unconnectedWalletOption = {
    id: "unconnectedWallet",
    title:
      isEthConnected || isSolanaConnected
        ? `Pay with another wallet`
        : `Pay with wallet`,
    icons: getBestUnconnectedWalletIcons(connector),
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

  if (includeSolana) {
    const solanaOption = getSolanaOption(isOnIOS);
    if (solanaOption) {
      options.push(solanaOption);
    }
  }

  // External payment options, e.g. Binance, Coinbase, etc.
  options.push(
    ...(externalPaymentOptions.options ?? []).map((option) => ({
      id: option.id,
      title: option.cta,
      icons: [option.logoURI],
      onClick: () => {
        setSelectedExternalOption(option);
        const meta = { event: "click-option", option: option.id };
        if (paymentState.isDepositFlow) {
          setRoute(ROUTES.SELECT_EXTERNAL_AMOUNT, meta);
        } else {
          setRoute(ROUTES.WAITING_EXTERNAL, meta);
        }
      },
      disabled: option.disabled,
      subtitle: option.message,
    })),
  );

  if (includeDepositAddressOption) {
    const depositAddressOption = getDepositAddressOption(depositAddressOptions);
    options.push(depositAddressOption);
  }

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
};

export default SelectMethod;
