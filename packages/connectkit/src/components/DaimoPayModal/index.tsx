import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import { useAccount } from "wagmi";

import { ROUTES } from "../../constants/routes";
import { getAppName } from "../../defaultConfig";
import { useChainIsSupported } from "../../hooks/useChainIsSupported";
import { useDaimoPay } from "../../hooks/useDaimoPay";
import useIsMobile from "../../hooks/useIsMobile";
import { usePayContext } from "../../hooks/usePayContext";
import { CustomTheme, Languages, Mode, Theme } from "../../types";
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

  // if chain is unsupported we enforce a "switch chain" prompt
  // closeable is independent of the warning state; warning is handled separately below
  const closeable = !(
    context.options?.enforceSupportedChains &&
    isEthConnected &&
    !chainIsSupported
  );

  const showBackButton =
    closeable &&
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
      context.setRoute(ROUTES.SELECT_METHOD, meta);
    } else if (context.route === ROUTES.SELECT_AMOUNT) {
      setSelectedTokenOption(undefined);
      context.setRoute(ROUTES.SELECT_TOKEN, meta);
    } else if (context.route === ROUTES.SELECT_EXTERNAL_AMOUNT) {
      setSelectedExternalOption(undefined);
      context.setRoute(ROUTES.SELECT_METHOD, meta);
    } else if (context.route === ROUTES.SELECT_EXCHANGE) {
      context.setRoute(ROUTES.SELECT_METHOD, meta);
    } else if (context.route === ROUTES.SELECT_DEPOSIT_ADDRESS_AMOUNT) {
      setSelectedDepositAddressOption(undefined);
      context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN, meta);
    } else if (context.route === ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN) {
      context.setRoute(ROUTES.SELECT_METHOD, meta);
    } else if (context.route === ROUTES.SELECT_ZKP2P) {
      context.setRoute(ROUTES.SELECT_METHOD, meta);
    } else if (context.route === ROUTES.SELECT_WALLET_AMOUNT) {
      setSelectedWallet(undefined);
      context.setRoute(ROUTES.SELECT_METHOD, meta);
    } else if (context.route === ROUTES.WAITING_EXTERNAL) {
      setPaymentWaitingMessage(undefined);
      if (isDepositFlow) {
        generatePreviewOrder();
        context.setRoute(ROUTES.SELECT_EXTERNAL_AMOUNT, meta);
      } else {
        setSelectedExternalOption(undefined);
        context.setRoute(ROUTES.SELECT_EXCHANGE, meta);
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
      if (isDepositFlow) {
        if (paymentState.selectedDepositAddressOption === undefined) {
          context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN, meta);
        } else {
          generatePreviewOrder();
          context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_AMOUNT, meta);
        }
      } else {
        setSelectedDepositAddressOption(undefined);
        context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN, meta);
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
    } else {
      context.setRoute(ROUTES.SELECT_METHOD, meta);
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

  const { isMobile } = useIsMobile();

  // Auto-connect to wallet if already connected when opening modal.
  // Skip to token selection if exactly one wallet is connected. If both
  // wallets are connected, stay on SELECT_METHOD to let user choose.
  useEffect(() => {
    if (!context.open) return;
    if (context.route !== ROUTES.SELECT_METHOD) return;

    const evmOptionsCount =
      paymentState.walletPaymentOptions.options?.length ?? 0;
    const isEvmLoading = paymentState.walletPaymentOptions.isLoading;
    const solanaOptionsCount =
      paymentState.solanaPaymentOptions.options?.length ?? 0;
    const isSolanaLoading = paymentState.solanaPaymentOptions.isLoading;

    if (
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
    address,
    chain?.id,
    connector?.id,
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
