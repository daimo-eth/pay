import React from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import { PageContent } from "../../Common/Modal/styles";

import {
  getAddressContraction,
  PaymentMethod,
  PaymentMethodMetadata,
  PaymentMethodType,
} from "@daimo/pay-common";
import { useWallet, WalletContextState } from "@solana/wallet-adapter-react";
import {
  Connector,
  useAccount,
  UseAccountReturnType,
  useDisconnect,
} from "wagmi";
import { Ethereum, Solana } from "../../../assets/chains";
import { Coinbase, MetaMask, Rabby, Rainbow } from "../../../assets/logos";
import useIsMobile from "../../../hooks/useIsMobile";
import OptionsList from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";
import PoweredByFooter from "../../Common/PoweredByFooter";
import WalletChainLogo from "../../Common/WalletChainLogo";

type PaymentMethodDisplay = {
  id: string;
  title: string;
  subtitle?: string;
  icons: (React.ReactNode | string)[];
  onClick: () => void;
  disabled?: boolean;
};

export default function SelectMethod() {
  const isOnMobile = useIsMobile();

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
    publicKey,
  } = useWallet();
  const { setRoute, paymentState, wcWallet, log } = usePayContext();
  const { disconnectAsync } = useDisconnect();

  const {
    setSelectedExternalOption,
    externalPaymentOptions,
    senderEnsName,
    paymentMethods,
  } = paymentState;
  console.log("[SELECT_METHOD] paymentMethods***", paymentMethods);

  const getConnectedWalletOptions = () => {
    const showChainLogo = isEthConnected && isSolanaConnected;

    const connectedOptions: PaymentMethodDisplay[] = [];

    if (isEthConnected) {
      const ethWalletDisplayName =
        senderEnsName ?? (address ? getAddressContraction(address) : "wallet");

      let walletIcon: JSX.Element;
      if (connector?.icon) {
        log("[SELECT_METHOD] connector?.icon", connector?.icon);
        walletIcon = (
          <div style={{ borderRadius: "22.5%", overflow: "hidden" }}>
            <img src={connector.icon} alt={connector.name} />
          </div>
        );
      } else if (wcWallet?.icon) {
        log("[SELECT_METHOD] wcWallet.icon", wcWallet.icon);
        walletIcon = (
          <div style={{ borderRadius: "22.5%", overflow: "hidden" }}>
            {typeof wcWallet.icon === "string" ? (
              <img src={wcWallet.icon} alt={wcWallet.name} />
            ) : (
              wcWallet.icon
            )}
          </div>
        );
      } else {
        log("[SELECT_METHOD] else");
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

  log(
    `[SELECT_METHOD] loading: ${externalPaymentOptions.loading}, options: ${JSON.stringify(
      externalPaymentOptions.options,
    )}`,
  );

  const handleDepositAddressOnClick = () => {
    setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN);
  };

  const handleEVMOnClick = async () => {
    await disconnectAsync();
    setRoute(ROUTES.CONNECTORS);
  };

  const handleExternalOnClick = (option: PaymentMethodMetadata) => {
    setSelectedExternalOption(option);
    const meta = { event: "click-option", option: option.id };
    if (paymentState.isDepositFlow) {
      setRoute(ROUTES.SELECT_EXTERNAL_AMOUNT, meta);
    } else {
      setRoute(ROUTES.WAITING_EXTERNAL, meta);
    }
  };

  const handleSolanaOnClick = () => {
    setRoute(ROUTES.SOLANA_CONNECT);
  };

  // // External payment options, e.g. Binance, Coinbase, etc.
  // options.push(
  //   ...(externalPaymentOptions.options ?? []).map((option) => ({
  //     id: option.id,
  //     title: option.cta,
  //     icons: [option.logoURI],
  //     onClick: () => {
  //       setSelectedExternalOption(option);
  //       const meta = { event: "click-option", option: option.id };
  //       if (paymentState.isDepositFlow) {
  //         setRoute(ROUTES.SELECT_EXTERNAL_AMOUNT, meta);
  //       } else {
  //         setRoute(ROUTES.WAITING_EXTERNAL, meta);
  //       }
  //     },
  //     disabled: option.disabled,
  //     subtitle: option.message,
  //   })),
  // );

  // if (includeDepositAddressOption) {
  //   const depositAddressOption = getDepositAddressOption(depositAddressOptions);
  //   options.push(depositAddressOption);
  // }

  let options: PaymentMethodDisplay[] = paymentMethods.methods.map(
    (method) => ({
      id: method.id,
      title: method.cta,
      icons: method.logos?.map((logo) => logo.uri) || [],
      onClick: async () => {
        if (method.type === PaymentMethodType.DepositAddress) {
          handleDepositAddressOnClick();
        } else if (method.type === PaymentMethodType.EVMWallets) {
          await handleEVMOnClick();
        } else if (method.type === PaymentMethodType.External) {
          handleExternalOnClick(method);
        } else if (method.type === PaymentMethodType.SolanaWallets) {
          handleSolanaOnClick();
        }
      },
      disabled: method.disabled,
      subtitle: method.message,
    }),
  );

  const connectedWalletOptions = getConnectedWalletOptions();
  options = [...connectedWalletOptions, ...options];

  // Fill in the logos for the other EVM wallets option
  const evmWalletsMethod = options.find(
    (method) => method.id === PaymentMethod.EVMWallets,
  );
  if (evmWalletsMethod) {
    evmWalletsMethod.icons = getBestUnconnectedEVMWalletIcons(connector);
    evmWalletsMethod.title = `Pay with ${
      isEthConnected ? "another wallet" : "wallet"
    }`;
  }

  // Remove solana option if no solana wallets are connected on desktop.
  // If there are no available solana wallets on mobile, we show deeplink
  // options for the most popular solana wallets.
  const isMobile = useIsMobile();
  if (solanaWallets.length === 0 && !isMobile) {
    options = options.filter(
      (method) => method.id !== PaymentMethod.SolanaWallets,
    );
  }

  return (
    <PageContent>
      <OrderHeader />

      <OptionsList
        requiredSkeletons={isOnMobile ? 4 : 3} // TODO: programmatically determine skeletons to best avoid layout shifts
        isLoading={externalPaymentOptions.loading}
        options={externalPaymentOptions.loading ? [] : options}
      />
      <PoweredByFooter />
    </PageContent>
  );
}

/** Hydrate payment methods with local data like connected wallets. */
function hydratePaymentMethods(
  paymentMethods: PaymentMethodDisplay[],
  evmWallet: UseAccountReturnType,
  senderEnsName: string | undefined,
  solWallet: WalletContextState,
) {
  // Fill in the logos for the other EVM wallets option
  const evmWalletsMethod = paymentMethods.find(
    (method) => method.id === PaymentMethod.EVMWallets,
  );
  if (evmWalletsMethod) {
    evmWalletsMethod.icons = getBestUnconnectedEVMWalletIcons(
      evmWallet.connector,
    );
    evmWalletsMethod.title = `Pay with ${
      evmWallet.isConnected ? "another wallet" : "wallet"
    }`;
  }

  // Remove solana option if no solana wallets are connected on desktop.
  // If there are no available solana wallets on mobile, we show deeplink
  // options for the most popular solana wallets.
  const isMobile = useIsMobile();
  if (solWallet.wallets.length === 0 && !isMobile) {
    paymentMethods = paymentMethods.filter(
      (method) => method.id !== PaymentMethod.SolanaWallets,
    );
  }

  return paymentMethods;
}

// Get 3 icons, skipping the one that is already connected
function getBestUnconnectedEVMWalletIcons(connector: Connector | undefined) {
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
