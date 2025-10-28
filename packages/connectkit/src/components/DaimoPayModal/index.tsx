import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import { useAccount } from "wagmi";

import {
  DepositAddressPaymentOptions,
  ExternalPaymentOptions,
} from "@daimo/pay-common";
import { ROUTES } from "../../constants/routes";
import { getAppName } from "../../defaultConfig";
import { useChainIsSupported } from "../../hooks/useChainIsSupported";
import { useDaimoPay } from "../../hooks/useDaimoPay";
import useIsMobile from "../../hooks/useIsMobile";
import { usePayContext } from "../../hooks/usePayContext";
import { CustomTheme, Languages, Mode, Theme } from "../../types";
import {
  isExternalWallet,
  useWallet as useWalletById,
} from "../../wallets/useWallets";
import { walletConfigs } from "../../wallets/walletConfigs";
import Modal from "../Common/Modal";
import { DaimoPayThemeProvider } from "../DaimoPayThemeProvider/DaimoPayThemeProvider";
import About from "../Pages/About";
import Confirmation from "../Pages/Confirmation";
import Connectors from "../Pages/Connectors";
import DownloadApp from "../Pages/DownloadApp";
import ErrorPage from "../Pages/Error";
import MobileConnectors from "../Pages/MobileConnectors";
import Onboarding from "../Pages/Onboarding";
import PayWithToken from "../Pages/PayWithToken";
import SelectAmount from "../Pages/SelectAmount";
import SelectDepositAddressAmount from "../Pages/SelectDepositAddressAmount";
import SelectDepositAddressChain from "../Pages/SelectDepositAddressChain";
import SelectExchange from "../Pages/SelectExchange";
import SelectExternalAmount from "../Pages/SelectExternalAmount";
import SelectMethod from "../Pages/SelectMethod";
import SelectToken from "../Pages/SelectToken";
import SelectWalletAmount from "../Pages/SelectWalletAmount";
import SelectWalletChain from "../Pages/SelectWalletChain";
import SelectZKP from "../Pages/SelectZKP";
import ConnectorSolana from "../Pages/Solana/ConnectorSolana";
import PayWithSolanaToken from "../Pages/Solana/PayWithSolanaToken";
import SelectSolanaAmount from "../Pages/Solana/SelectSolanaAmount";
import SwitchNetworks from "../Pages/SwitchNetworks";
import WaitingDepositAddress, {
  beforeLeave as waitingDepositAddressBeforeLeave,
} from "../Pages/WaitingDepositAddress";
import WaitingExternal from "../Pages/WaitingExternal";
import WaitingWallet from "../Pages/WaitingWallet";
import ConnectUsing from "./ConnectUsing";

/** Helper to check if option is a wallet (not exchange, address, etc) */
function isWalletOption(option: string): boolean {
  const knownNonWalletOptions = [
    "AllWallets",
    "AllExchanges",
    "AllAddresses",
    "Tron",
    "Base",
    "Arbitrum",
    "Optimism",
    "Polygon",
    "Ethereum",
    "Binance",
    "Coinbase",
    "Lemon",
  ];
  return !knownNonWalletOptions.includes(option);
}

export const DaimoPayModal: React.FC<{
  mode: Mode;
  theme: Theme;
  customTheme: CustomTheme;
  lang: Languages;
  disableMobileInjector: boolean;
}> = ({
  mode,
  theme,
  customTheme,
  lang,
  disableMobileInjector,
}: {
  mode: Mode;
  theme: Theme;
  customTheme: CustomTheme;
  lang: Languages;
  disableMobileInjector: boolean;
}) => {
  const context = usePayContext();
  const {
    setMode,
    setTheme,
    setCustomTheme,
    setLang,
    setDisableMobileInjector,
  } = context;
  const paymentState = context.paymentState;
  const {
    generatePreviewOrder,
    isDepositFlow,
    setPaymentWaitingMessage,
    setSelectedExternalOption,
    setSelectedTokenOption,
    setSelectedSolanaTokenOption,
    setSelectedDepositAddressOption,
    setSelectedWallet,
  } = paymentState;
  const daimo = useDaimoPay();
  const { paymentState: paymentFsmState, order } = daimo;

  const {
    isConnected: isEthConnected,
    connector,
    chain,
    address,
  } = useAccount();
  const { connected: isSolanaConnected } = useWallet();
  const chainIsSupported = useChainIsSupported(chain?.id);
  const pendingWallet = useWalletById(context.pendingConnectorId || "");

  // if chain is unsupported we enforce a "switch chain" prompt
  // closeable is independent of the warning state; warning is handled separately below
  const closeable = !(
    context.options?.enforceSupportedChains &&
    isEthConnected &&
    !chainIsSupported
  );

  const showBackButton =
    closeable &&
    context.route !== context.uniquePaymentMethodPage &&
    context.route !== ROUTES.SELECT_METHOD &&
    context.route !== ROUTES.CONFIRMATION &&
    context.route !== ROUTES.SELECT_TOKEN &&
    context.route !== ROUTES.ERROR &&
    paymentFsmState !== "error" &&
    paymentFsmState !== "warning";

  const onBack = () => {
    const meta = { event: "click-back" };
    if (context.route === ROUTES.DOWNLOAD) {
      context.setRoute(ROUTES.CONNECT, meta);
    } else if (context.route === ROUTES.CONNECTORS) {
      context.setRoute(context.uniquePaymentMethodPage, meta);
    } else if (context.route === ROUTES.SELECT_AMOUNT) {
      setSelectedTokenOption(undefined);
      context.setRoute(ROUTES.SELECT_TOKEN, meta);
    } else if (context.route === ROUTES.SELECT_EXTERNAL_AMOUNT) {
      setSelectedExternalOption(undefined);
      context.setRoute(context.uniquePaymentMethodPage, meta);
    } else if (context.route === ROUTES.SELECT_DEPOSIT_ADDRESS_AMOUNT) {
      // If Tron is a top-level option and we're on Tron, go back to SELECT_METHOD
      const isTronTopLevel = paymentState.topOptionsOrder.includes("Tron");
      const isTronSelected =
        paymentState.selectedDepositAddressOption?.id ===
        DepositAddressPaymentOptions.TRON_USDT;

      setSelectedDepositAddressOption(undefined);
      if (isTronTopLevel && isTronSelected) {
        context.setRoute(ROUTES.SELECT_METHOD, meta);
      } else {
        context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN, meta);
      }
    } else if (context.route === ROUTES.WAITING_EXTERNAL) {
      setPaymentWaitingMessage(undefined);
      if (isDepositFlow) {
        generatePreviewOrder();
        context.setRoute(ROUTES.SELECT_EXTERNAL_AMOUNT, meta);
      } else {
        setSelectedExternalOption(undefined);
        context.setRoute(context.uniquePaymentMethodPage, meta);
      }
    } else if (context.route === ROUTES.PAY_WITH_TOKEN) {
      if (isDepositFlow) {
        generatePreviewOrder();
        context.setRoute(ROUTES.SELECT_AMOUNT, meta);
      } else {
        setSelectedTokenOption(undefined);
        context.setRoute(ROUTES.SELECT_TOKEN, meta);
      }
    } else if (context.route === ROUTES.ONBOARDING) {
      context.setRoute(ROUTES.CONNECTORS, meta);
    } else if (context.route === ROUTES.WAITING_DEPOSIT_ADDRESS) {
      // If Tron is a top-level option and we're on Tron, go back to SELECT_METHOD
      const isTronTopLevel = paymentState.topOptionsOrder.includes("Tron");
      const isTronSelected =
        paymentState.selectedDepositAddressOption?.id ===
        DepositAddressPaymentOptions.TRON_USDT;

      if (isDepositFlow) {
        if (paymentState.selectedDepositAddressOption === undefined) {
          context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN, meta);
        } else {
          generatePreviewOrder();
          context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_AMOUNT, meta);
        }
      } else {
        setSelectedDepositAddressOption(undefined);
        if (isTronTopLevel && isTronSelected) {
          context.setRoute(ROUTES.SELECT_METHOD, meta);
        } else {
          context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN, meta);
        }
      }
    } else if (context.route === ROUTES.WAITING_WALLET) {
      if (isDepositFlow) {
        generatePreviewOrder();
        context.setRoute(ROUTES.SELECT_WALLET_AMOUNT, meta);
      } else {
        setSelectedWallet(undefined);
        context.setRoute(ROUTES.CONNECTORS, meta);
      }
    } else if (context.route === ROUTES.SOLANA_SELECT_AMOUNT) {
      setSelectedSolanaTokenOption(undefined);
      context.setRoute(ROUTES.SELECT_TOKEN, meta);
    } else if (context.route === ROUTES.SOLANA_PAY_WITH_TOKEN) {
      if (isDepositFlow) {
        generatePreviewOrder();
        context.setRoute(ROUTES.SOLANA_SELECT_AMOUNT, meta);
      } else {
        setSelectedSolanaTokenOption(undefined);
        context.setRoute(ROUTES.SELECT_TOKEN, meta);
      }
    } else if (context.route === ROUTES.CONNECT) {
      // For external wallets (World, MiniPay) in deposit mode, go back to amount selection
      if (isDepositFlow && isExternalWallet(pendingWallet)) {
        generatePreviewOrder();
        context.setRoute(ROUTES.SELECT_WALLET_AMOUNT, meta);
      } else {
        context.setRoute(context.uniquePaymentMethodPage, meta);
      }
    } else {
      context.setRoute(context.uniquePaymentMethodPage, meta);
    }
  };

  const pages: Record<ROUTES, React.ReactNode> = {
    [ROUTES.SELECT_METHOD]: <SelectMethod />,
    [ROUTES.SELECT_TOKEN]: <SelectToken />,
    [ROUTES.SELECT_AMOUNT]: <SelectAmount />,
    [ROUTES.SELECT_EXTERNAL_AMOUNT]: <SelectExternalAmount />,
    [ROUTES.SELECT_EXCHANGE]: <SelectExchange />,
    [ROUTES.SELECT_DEPOSIT_ADDRESS_AMOUNT]: <SelectDepositAddressAmount />,
    [ROUTES.SELECT_WALLET_AMOUNT]: <SelectWalletAmount />,
    [ROUTES.SELECT_WALLET_CHAIN]: <SelectWalletChain />,
    [ROUTES.WAITING_EXTERNAL]: <WaitingExternal />,
    [ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN]: <SelectDepositAddressChain />,
    [ROUTES.WAITING_DEPOSIT_ADDRESS]: <WaitingDepositAddress />,
    [ROUTES.SELECT_ZKP2P]: <SelectZKP />,
    [ROUTES.WAITING_WALLET]: <WaitingWallet />,
    [ROUTES.CONFIRMATION]: <Confirmation />,
    [ROUTES.ERROR]: <ErrorPage />,
    [ROUTES.PAY_WITH_TOKEN]: <PayWithToken />,
    [ROUTES.SOLANA_CONNECTOR]: <ConnectorSolana />,
    [ROUTES.SOLANA_SELECT_AMOUNT]: <SelectSolanaAmount />,
    [ROUTES.SOLANA_PAY_WITH_TOKEN]: <PayWithSolanaToken />,
    // Unused routes. Kept to minimize connectkit merge conflicts.
    [ROUTES.ONBOARDING]: <Onboarding />,
    [ROUTES.ABOUT]: <About />,
    [ROUTES.DOWNLOAD]: <DownloadApp />,
    [ROUTES.CONNECTORS]: <Connectors />,
    [ROUTES.MOBILECONNECTORS]: <MobileConnectors />,
    [ROUTES.CONNECT]: <ConnectUsing />,
    [ROUTES.SWITCHNETWORKS]: <SwitchNetworks />,
  };

  // Registry of page-level leave guards (hooks that run before navigation)
  // For WAITING_DEPOSIT_ADDRESS, we need to pass trpc and orderId
  const leaveGuards: Partial<Record<ROUTES, () => Promise<boolean> | boolean>> =
    {
      [ROUTES.WAITING_DEPOSIT_ADDRESS]: () =>
        waitingDepositAddressBeforeLeave(context.trpc, order?.id?.toString()),
    };

  // Helper to wrap navigation actions with leave guard check
  const guardedAction = async (action: () => void) => {
    const guard = leaveGuards[context.route];

    // If no guard exists for current page, proceed with action
    if (!guard) {
      action();
      return;
    }

    // Otherwise, call the guard and check if navigation is allowed
    let canProceed = false;
    try {
      canProceed = await guard();
    } catch (error) {
      console.error("error in leave guard:", error);
      return;
    }

    if (!canProceed) return;

    try {
      action();
    } catch (error) {
      console.error("error performing guarded action:", error);
      return;
    }

    // dismiss warning after navigation to avoid intermediate flash
    if (paymentFsmState === "warning") {
      try {
        daimo.dismissWarning();
      } catch (error) {
        console.error("error dismissing warning:", error);
      }
    }
  };

  function hide() {
    if (isDepositFlow) {
      generatePreviewOrder();
    }
    context.setOpen(false, { event: "click-close" });
  }

  const goToManualAddressScreen = (eventSuffix: string) => {
    if (paymentState.isDepositFlow) {
      context.setUniquePaymentMethodPage(ROUTES.SELECT_DEPOSIT_ADDRESS_AMOUNT);
      context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_AMOUNT, {
        event: `unique_payment_option_deposit_${eventSuffix}`,
      });
    } else {
      context.setUniquePaymentMethodPage(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN);
      context.setRoute(ROUTES.WAITING_DEPOSIT_ADDRESS, {
        event: `unique_payment_option_${eventSuffix}`,
      });
    }
  };

  const goToExternalScreen = (eventSuffix: string) => {
    if (paymentState.isDepositFlow) {
      context.setUniquePaymentMethodPage(ROUTES.SELECT_EXTERNAL_AMOUNT);
      context.setRoute(ROUTES.SELECT_EXTERNAL_AMOUNT, {
        event: `unique_payment_option_${eventSuffix}_deposit`,
      });
    } else {
      context.setUniquePaymentMethodPage(ROUTES.WAITING_EXTERNAL);
      context.setRoute(ROUTES.WAITING_EXTERNAL, {
        event: `unique_payment_option_${eventSuffix}`,
      });
    }
  };

  const { isMobile } = useIsMobile();

  // Override the first screen upon opening the modal.
  // 1. If paymentOptions has exactly one option, navigate to that screen directly
  // 2. If the user has a wallet already connected upon opening the modal, go
  // straight to the select token screen
  // 3. If the user has no wallet connected upon opening the modal, go to the
  // select method screen
  useEffect(() => {
    if (!context.open) return;
    if (context.route !== ROUTES.SELECT_METHOD) return;

    const paymentOptions = paymentState.buttonProps?.paymentOptions;
    const hasUniqueOption = paymentOptions && paymentOptions.length === 1;

    if (hasUniqueOption) {
      const option = paymentOptions[0];
      // Handle nested array (wallet list)
      if (Array.isArray(option)) {
        context.setUniquePaymentMethodPage(ROUTES.CONNECTORS);
        context.setRoute(ROUTES.CONNECTORS, {
          event: "unique_payment_option_wallets",
        });
        return;
      }
      // Handle single string option
      switch (option) {
        case "Tron":
          // Find the Tron option from available deposit address options
          const tronOption = paymentState.depositAddressOptions.options?.find(
            (option) => option.id === DepositAddressPaymentOptions.TRON_USDT,
          );
          if (tronOption) {
            setSelectedDepositAddressOption(tronOption);
            goToManualAddressScreen("tron");
          } else if (!paymentState.depositAddressOptions.loading) {
            // Data loaded but option not found, fallback to chain selection
            context.setUniquePaymentMethodPage(
              ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN,
            );
            context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN, {
              event: "unique_payment_option_tron_fallback",
            });
          }
          // If still loading, do nothing and wait for next render
          break;
        case "AllExchanges":
          // Open exchanges list directly
          context.setUniquePaymentMethodPage(ROUTES.SELECT_EXCHANGE);
          context.setRoute(ROUTES.SELECT_EXCHANGE, {
            event: "unique_payment_option_all_exchanges",
          });
          break;
        case "AllAddresses":
          context.setUniquePaymentMethodPage(
            ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN,
          );
          context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN, {
            event: "unique_payment_option_manual_address",
          });
          break;
        case "Base":
          // Find the Base option from available deposit address options
          const baseOption = paymentState.depositAddressOptions.options?.find(
            (option) => option.id === DepositAddressPaymentOptions.BASE,
          );
          if (baseOption) {
            setSelectedDepositAddressOption(baseOption);
            goToManualAddressScreen("base");
          } else if (!paymentState.depositAddressOptions.loading) {
            context.setUniquePaymentMethodPage(
              ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN,
            );
            context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN, {
              event: "unique_payment_option_base_fallback",
            });
          }
          break;
        case "Arbitrum":
          // Find the Arbitrum option from available deposit address options
          const arbitrumOption =
            paymentState.depositAddressOptions.options?.find(
              (option) => option.id === DepositAddressPaymentOptions.ARBITRUM,
            );
          if (arbitrumOption) {
            setSelectedDepositAddressOption(arbitrumOption);
            goToManualAddressScreen("arbitrum");
          } else if (!paymentState.depositAddressOptions.loading) {
            context.setUniquePaymentMethodPage(
              ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN,
            );
            context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN, {
              event: "unique_payment_option_arbitrum_fallback",
            });
          }
          break;
        case "Optimism":
          // Find the Optimism option from available deposit address options
          const optimismOption =
            paymentState.depositAddressOptions.options?.find(
              (option) => option.id === DepositAddressPaymentOptions.OP_MAINNET,
            );
          if (optimismOption) {
            setSelectedDepositAddressOption(optimismOption);
            goToManualAddressScreen("optimism");
          } else if (!paymentState.depositAddressOptions.loading) {
            context.setUniquePaymentMethodPage(
              ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN,
            );
            context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN, {
              event: "unique_payment_option_optimism_fallback",
            });
          }
          break;
        case "Polygon":
          // Find the Polygon option from available deposit address options
          const polygonOption =
            paymentState.depositAddressOptions.options?.find(
              (option) => option.id === DepositAddressPaymentOptions.POLYGON,
            );
          if (polygonOption) {
            setSelectedDepositAddressOption(polygonOption);
            goToManualAddressScreen("polygon");
          } else if (!paymentState.depositAddressOptions.loading) {
            context.setUniquePaymentMethodPage(
              ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN,
            );
            context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN, {
              event: "unique_payment_option_polygon_fallback",
            });
          }
          break;
        case "Ethereum":
          // Find the Ethereum option from available deposit address options
          const ethereumOption =
            paymentState.depositAddressOptions.options?.find(
              (option) => option.id === DepositAddressPaymentOptions.ETH_L1,
            );
          if (ethereumOption) {
            setSelectedDepositAddressOption(ethereumOption);
            goToManualAddressScreen("ethereum");
          } else if (!paymentState.depositAddressOptions.loading) {
            context.setUniquePaymentMethodPage(
              ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN,
            );
            context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN, {
              event: "unique_payment_option_ethereum_fallback",
            });
          }
          break;
        case "Binance":
          // Find the Binance option from available exchange options
          const exchangeOptions =
            paymentState.externalPaymentOptions.options.get("exchange");
          const binanceOption = exchangeOptions?.find(
            (option) => option.id === ExternalPaymentOptions.Binance,
          );
          if (binanceOption) {
            setSelectedExternalOption(binanceOption);
            goToExternalScreen("binance");
          } else if (!paymentState.externalPaymentOptions.loading) {
            context.setUniquePaymentMethodPage(ROUTES.SELECT_EXCHANGE);
            context.setRoute(ROUTES.SELECT_EXCHANGE, {
              event: "unique_payment_option_binance_fallback",
            });
          }
          break;
        case "Coinbase":
          // Find the Coinbase option from available exchange options
          const coinbaseExchangeOptions =
            paymentState.externalPaymentOptions.options.get("exchange");
          const coinbaseOption = coinbaseExchangeOptions?.find(
            (option) => option.id === ExternalPaymentOptions.Coinbase,
          );
          if (coinbaseOption) {
            setSelectedExternalOption(coinbaseOption);
            goToExternalScreen("coinbase");
          } else if (!paymentState.externalPaymentOptions.loading) {
            context.setUniquePaymentMethodPage(ROUTES.SELECT_EXCHANGE);
            context.setRoute(ROUTES.SELECT_EXCHANGE, {
              event: "unique_payment_option_coinbase_fallback",
            });
          }
          break;
        case "Lemon":
          // Find the Lemon option from available external options
          const lemonExternalOptions =
            paymentState.externalPaymentOptions.options.get("external");
          const lemonOption = lemonExternalOptions?.find(
            (option) => option.id === ExternalPaymentOptions.Lemon,
          );
          if (lemonOption) {
            setSelectedExternalOption(lemonOption);
            goToExternalScreen("lemon");
          } else if (!paymentState.externalPaymentOptions.loading) {
            // Lemon not found - may not be available in this environment/region
            console.warn(
              "[DaimoPayModal] Lemon not found in external payment options",
            );
            context.setUniquePaymentMethodPage(ROUTES.SELECT_METHOD);
            context.setRoute(ROUTES.SELECT_METHOD, {
              event: "unique_payment_option_lemon_not_found",
            });
          }
          // If still loading, wait for next render
          break;
        case "AllWallets":
          context.setUniquePaymentMethodPage(ROUTES.CONNECTORS);
          context.setRoute(ROUTES.CONNECTORS, {
            event: "unique_payment_option_wallets",
          });
          break;
        default:
          // Single wallet options like MiniPay, World, etc
          const singleOption = option;
          if (isWalletOption(singleOption)) {
            const walletId = Object.keys(walletConfigs).find((id) => {
              const wallet = walletConfigs[id];
              const optionLower = singleOption.toLowerCase();
              return (
                wallet.name?.toLowerCase() === optionLower ||
                wallet.shortName?.toLowerCase() === optionLower ||
                wallet.name?.toLowerCase().includes(optionLower) ||
                id.toLowerCase() === optionLower ||
                id.toLowerCase().includes(optionLower)
              );
            });
            if (walletId) {
              const wallet = walletConfigs[walletId];
              paymentState.setSelectedWallet(wallet);

              if (paymentState.isDepositFlow) {
                // For deposit mode, route to amount selection first
                context.setUniquePaymentMethodPage(ROUTES.SELECT_WALLET_AMOUNT);
                context.setRoute(ROUTES.SELECT_WALLET_AMOUNT, {
                  event: "single_option_wallet_deposit",
                  wallet: singleOption,
                });
              } else if (!isMobile && wallet.getDaimoPayDeeplink) {
                // On desktop, show QR code for wallet
                context.setPendingConnectorId(walletId);
                context.setUniquePaymentMethodPage(ROUTES.CONNECT);
                context.setRoute(ROUTES.CONNECT, {
                  event: "single_option_wallet_qr",
                  wallet: singleOption,
                });
              } else {
                // Mobile or no deeplink - go to connectors
                context.setUniquePaymentMethodPage(ROUTES.CONNECTORS);
                context.setRoute(ROUTES.CONNECTORS, {
                  event: "single_option_wallet",
                  wallet: singleOption,
                });
              }
            } else {
              context.setUniquePaymentMethodPage(ROUTES.SELECT_METHOD);
            }
          } else {
            context.setUniquePaymentMethodPage(ROUTES.SELECT_METHOD);
          }
          break;
      }
    }

    const isWalletsUniquePaymentOption =
      hasUniqueOption &&
      (Array.isArray(paymentOptions[0]) || paymentOptions[0] === "AllWallets");

    // Skip to token selection if exactly one wallet is connected. If both
    // wallets are connected, stay on the SELECT_METHOD screen to allow the
    // user to select which wallet to use
    // If mobile injector is disabled, don't show the connected wallets.
    // If there's a unique payment option, and the unique payment option is not
    // "AllWallets" or a wallet list, don't auto-connect the user's wallet.
    const evmOptionsCount =
      paymentState.walletPaymentOptions.options?.length ?? 0;
    const isEvmLoading = paymentState.walletPaymentOptions.isLoading;
    const solanaOptionsCount =
      paymentState.solanaPaymentOptions.options?.length ?? 0;
    const isSolanaLoading = paymentState.solanaPaymentOptions.isLoading;
    if (
      (!hasUniqueOption || isWalletsUniquePaymentOption) &&
      isEthConnected &&
      !isSolanaConnected &&
      (!isMobile || !disableMobileInjector) &&
      !isEvmLoading &&
      evmOptionsCount > 0
    ) {
      paymentState.setTokenMode("evm");
      context.setRoute(ROUTES.SELECT_TOKEN, {
        event: "eth_connected_on_open",
        walletId: connector?.id,
        chainId: chain?.id,
        address,
      });
    } else if (
      (!hasUniqueOption || isWalletsUniquePaymentOption) &&
      isSolanaConnected &&
      !isEthConnected &&
      !disableMobileInjector &&
      !isSolanaLoading &&
      solanaOptionsCount > 0
    ) {
      paymentState.setTokenMode("solana");
      context.setRoute(ROUTES.SELECT_TOKEN, {
        event: "solana_connected_on_open",
      });
    }
    // Don't include context.route in the dependency array otherwise the user
    // can't go back from the select token screen to the select method screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    context.open,
    paymentState.walletPaymentOptions.options,
    paymentState.walletPaymentOptions.isLoading,
    paymentState.solanaPaymentOptions.options,
    paymentState.solanaPaymentOptions.isLoading,
    paymentState.externalPaymentOptions.options,
    paymentState.externalPaymentOptions.loading,
    paymentState.depositAddressOptions.options,
    paymentState.depositAddressOptions.loading,
    address,
    chain?.id,
    connector?.id,
    context.uniquePaymentMethodPage,
  ]);

  // If we're on the connect page and the user successfully connects their
  // wallet, go to the select token page
  useEffect(() => {
    if (
      context.route === ROUTES.CONNECT ||
      context.route === ROUTES.CONNECTORS ||
      context.route === ROUTES.MOBILECONNECTORS
    ) {
      if (isEthConnected) {
        paymentState.setTokenMode("evm");
        context.setRoute(ROUTES.SELECT_TOKEN, {
          event: "connected",
          walletId: connector?.id,
          chainId: chain?.id,
          address,
        });
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEthConnected, context.route, connector?.id, chain?.id, address]);

  useEffect(() => setMode(mode), [mode, setMode]);
  useEffect(() => setTheme(theme), [theme, setTheme]);
  useEffect(() => setCustomTheme(customTheme), [customTheme, setCustomTheme]);
  useEffect(() => setLang(lang), [lang, setLang]);
  useEffect(
    () => setDisableMobileInjector(disableMobileInjector),
    [disableMobileInjector, setDisableMobileInjector],
  );

  useEffect(() => {
    const appName = getAppName();
    if (!appName || !context.open) return;

    const title = document.createElement("meta");
    title.setAttribute("property", "og:title");
    title.setAttribute("content", appName);
    document.head.prepend(title);

    return () => {
      try {
        document.head.removeChild(title);
      } catch {}
    };
  }, [context.open]);

  return (
    <DaimoPayThemeProvider theme={theme} customTheme={customTheme} mode={mode}>
      <Modal
        open={context.open}
        pages={pages}
        pageId={context.route}
        onClose={
          closeable && paymentFsmState !== "warning"
            ? () => guardedAction(hide)
            : undefined
        }
        onInfo={undefined}
        onBack={showBackButton ? () => guardedAction(onBack) : undefined}
      />
    </DaimoPayThemeProvider>
  );
};
