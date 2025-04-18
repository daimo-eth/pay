import {
  DaimoPayIntentStatus,
  DaimoPayOrder,
  DaimoPayOrderMode,
  DaimoPayOrderStatusSource,
  debugJson,
  retryBackoff,
} from "@daimo/pay-common";
import { Buffer } from "buffer";
import React, {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ThemeProvider } from "styled-components";
import { useAccount, WagmiContext } from "wagmi";

import { ROUTES } from "../constants/routes";
import { REQUIRED_CHAINS } from "../defaultConfig";
import { useChainIsSupported } from "../hooks/useChainIsSupported";
import { useChains } from "../hooks/useChains";
import {
  useConnectCallback,
  useConnectCallbackProps,
} from "../hooks/useConnectCallback";
import { useExtractWcWallet } from "../hooks/useExtractWcWallet";
import { useThemeFont } from "../hooks/useGoogleFont";
import { PayContext, PayContextValue } from "../hooks/usePayContext";
import { usePaymentState } from "../hooks/usePaymentState";
import defaultTheme from "../styles/defaultTheme";
import {
  CustomTheme,
  DaimoPayContextOptions,
  DaimoPayModalOptions,
  Languages,
  Mode,
  Theme,
} from "../types";
import { createTrpcClient } from "../utils/trpc";
import { DaimoPayModal } from "./DaimoPayModal";
import { SolanaContextProvider, SolanaWalletName } from "./contexts/solana";
import { Web3ContextProvider } from "./contexts/web3";

type DaimoPayProviderProps = {
  children?: React.ReactNode;
  theme?: Theme;
  mode?: Mode;
  customTheme?: CustomTheme;
  options?: DaimoPayContextOptions;
  debugMode?: boolean;
  /**
   * Be careful with this endpoint, some endpoints (incl. Alchemy) don't support
   * `signatureSubscribe` which leads to txes behaving erratically
   * (ex. successful txes take minutes to confirm instead of seconds)
   */
  solanaRpcUrl?: string;
  /** Custom Pay API, useful for test and staging. */
  payApiUrl?: string;
} & useConnectCallbackProps;

const DaimoPayProviderWithoutSolana = ({
  children,
  theme = "auto",
  mode = "auto",
  customTheme,
  options,
  onConnect,
  onDisconnect,
  debugMode = false,
  payApiUrl = "https://pay-api.daimo.xyz",
}: DaimoPayProviderProps) => {
  // DaimoPayProvider must be within a WagmiProvider
  if (!React.useContext(WagmiContext)) {
    throw Error("DaimoPayProvider must be within a WagmiProvider");
  }

  // Only allow for mounting DaimoPayProvider once, so we avoid weird global
  // state collisions.
  if (React.useContext(PayContext)) {
    throw new Error(
      "Multiple, nested usages of DaimoPayProvider detected. Please use only one.",
    );
  }

  useConnectCallback({
    onConnect,
    onDisconnect,
  });

  const chains = useChains();

  for (const requiredChain of REQUIRED_CHAINS) {
    if (!chains.some((c) => c.id === requiredChain.id)) {
      throw new Error(
        `Daimo Pay requires chains ${REQUIRED_CHAINS.map((c) => c.name).join(", ")}. Use \`getDefaultConfig\` to automatically configure required chains.`,
      );
    }
  }

  // Default config options
  const defaultOptions: DaimoPayContextOptions = {
    language: "en-US",
    hideBalance: false,
    hideTooltips: false,
    hideQuestionMarkCTA: false,
    hideNoWalletCTA: false,
    walletConnectCTA: "link",
    hideRecentBadge: false,
    avoidLayoutShift: true,
    embedGoogleFonts: false,
    truncateLongENSAddress: true,
    walletConnectName: undefined,
    reducedMotion: false,
    disclaimer: null,
    bufferPolyfill: true,
    customAvatar: undefined,
    initialChainId: undefined,
    enforceSupportedChains: false,
    ethereumOnboardingUrl: undefined,
    walletOnboardingUrl: undefined,
    overlayBlur: undefined,
  };

  const opts: DaimoPayContextOptions = Object.assign(
    {},
    defaultOptions,
    options,
  );

  if (typeof window !== "undefined") {
    // Buffer Polyfill, needed for bundlers that don't provide Node polyfills (e.g CRA, Vite, etc.)
    if (opts.bufferPolyfill) window.Buffer = window.Buffer ?? Buffer;

    // Some bundlers may need `global` and `process.env` polyfills as well
    // Not implemented here to avoid unexpected behaviors, but leaving example here for future reference
    /*
     * window.global = window.global ?? window;
     * window.process = window.process ?? { env: {} };
     */
  }

  const [ckTheme, setTheme] = useState<Theme>(theme);
  const [ckMode, setMode] = useState<Mode>(mode);
  const [ckCustomTheme, setCustomTheme] = useState<CustomTheme | undefined>(
    customTheme ?? {},
  );
  const [ckLang, setLang] = useState<Languages>("en-US");

  const onOpenRef = useRef<(() => void) | undefined>();
  const onCloseRef = useRef<(() => void) | undefined>();
  const setOnOpen = useCallback((fn?: () => void) => {
    onOpenRef.current = fn;
  }, []);
  const setOnClose = useCallback((fn?: () => void) => {
    onCloseRef.current = fn;
  }, []);
  const [open, setOpenState] = useState<boolean>(false);
  const [route, setRouteState] = useState<ROUTES>(ROUTES.SELECT_METHOD);

  // Daimo Pay context
  const [daimoPayOrder, setDaimoPayOrderInner] = useState<DaimoPayOrder>();
  const [pendingConnectorId, setPendingConnectorId] = useState<
    string | undefined
  >(undefined);
  // Track sessions. Each generates separate intent IDs unless using externalId.
  const [sessionId] = useState(() => crypto.randomUUID().replaceAll("-", ""));
  const [solanaConnector, setSolanaConnector] = useState<
    SolanaWalletName | undefined
  >();

  // Other configuration
  const [errorMessage, setErrorMessage] = useState<
    string | React.ReactNode | null
  >("");
  const [confirmationMessage, setConfirmationMessage] = useState<
    string | undefined
  >(undefined);
  const [redirectReturnUrl, setRedirectReturnUrl] = useState<
    string | undefined
  >(undefined);
  const log = debugMode ? console.log : () => {};
  // Connect to the Daimo Pay TRPC API
  const trpc = useMemo(
    () => createTrpcClient(payApiUrl, sessionId),
    [payApiUrl],
  );
  const [resize, onResize] = useState<number>(0);

  const setOpen = useCallback(
    (open: boolean, meta?: Record<string, any>) => {
      setOpenState(open);

      trpc.nav.mutate({
        action: open ? "navOpenPay" : "navClosePay",
        orderId: daimoPayOrder?.id?.toString(),
        data: meta ?? {},
      });

      if (open) onOpenRef.current?.();
      else onCloseRef.current?.();
    },
    [trpc, daimoPayOrder?.id],
  );

  const setRoute = useCallback(
    (route: ROUTES, data?: Record<string, any>) => {
      const action = route.replace("daimoPay", "");
      log(
        `[SET ROUTE] ${action} ${daimoPayOrder?.id} ${debugJson(data ?? {})}`,
      );
      trpc.nav.mutate({
        action,
        orderId: daimoPayOrder?.id?.toString(),
        data: data ?? {},
      });
      setRouteState(route);
    },
    [trpc, daimoPayOrder?.id, log],
  );

  // Include Google Font that is needed for a themes
  if (opts.embedGoogleFonts) useThemeFont(ckTheme);

  // Other Configuration
  useEffect(() => setTheme(theme), [theme]);
  useEffect(() => setLang(opts.language || "en-US"), [opts.language]);
  useEffect(() => setErrorMessage(null), [route, open]);

  // Check if chain is supported, elsewise redirect to switches page
  const { chain, isConnected, connector } = useAccount();
  const isChainSupported = useChainIsSupported(chain?.id);

  useEffect(() => {
    if (isConnected && opts.enforceSupportedChains && !isChainSupported) {
      setOpen(true);
      if (route !== ROUTES.SWITCHNETWORKS) setRoute(ROUTES.SWITCHNETWORKS);
    }
  }, [isConnected, isChainSupported, chain, route, open]);

  // Single source of truth for the currently-connected wallet is the connector
  // exposed by wagmi. See useAccount(). We watch this connector and use it to
  // extract the current WalletConnect wallet, if any.
  const wcWallet = useExtractWcWallet({ connector, log });

  // PaymentInfo is a second, inner context object containing a DaimoPayOrder
  // plus all associated status and callbacks. In order for useContext() and
  // downstream hooks like useDaimoPayStatus() to work correctly, we must set
  // set refresh context when payment status changes; done via setDaimoPayOrder.
  const setDaimoPayOrder = useCallback(
    (order: DaimoPayOrder) => {
      setDaimoPayOrderInner(order);
      let extra = `> $${order.destFinalCallTokenAmount.usd.toFixed(2)} to ${order.destFinalCallTokenAmount.token.chainId} ${order.destFinalCall.to}`;
      if (order.mode === DaimoPayOrderMode.HYDRATED) {
        extra += ` via ${order.intentAddr} ${order.sourceStatus} ${order.intentStatus}`;
      }
      log(`[PAY] setDaimoPayOrder: ${order.id} ${extra}`);
    },
    [log],
  );
  const paymentState = usePaymentState({
    trpc,
    daimoPayOrder,
    setDaimoPayOrder,
    setOpen,
    log,
    redirectReturnUrl,
  });

  // When a payment is in progress, poll for status updates. Do this regardless
  // of whether the modal is still being displayed for useDaimoPayStatus().
  useEffect(() => {
    // Order just updated...
    if (daimoPayOrder?.mode !== DaimoPayOrderMode.HYDRATED) return;

    const { intentStatus } = daimoPayOrder;
    let intervalMs = 0;
    if (intentStatus === DaimoPayIntentStatus.UNPAID) {
      intervalMs = 2000; // additional, faster polling in WaitingOther
    } else if (intentStatus === DaimoPayIntentStatus.STARTED) {
      intervalMs = 300; // poll fast from payment started to payment completed
    } else {
      return;
    }

    log(`[PAY] polling in ${intervalMs}ms`);
    const timeout = setTimeout(
      () => retryBackoff("refreshOrder", () => paymentState.refreshOrder()),
      intervalMs,
    );

    return () => clearTimeout(timeout);
  }, [daimoPayOrder]);

  const showPayment = async (modalOptions: DaimoPayModalOptions) => {
    const id = daimoPayOrder?.id;
    log(`[PAY] showing payment ${debugJson({ id, modalOptions })}`);

    paymentState.setModalOptions(modalOptions);

    setOpen(true);

    if (
      daimoPayOrder &&
      daimoPayOrder.mode === DaimoPayOrderMode.HYDRATED &&
      (daimoPayOrder.sourceStatus !==
        DaimoPayOrderStatusSource.WAITING_PAYMENT ||
        daimoPayOrder.destFastFinishTxHash ||
        daimoPayOrder.destClaimTxHash)
    ) {
      setRoute(ROUTES.CONFIRMATION);
    } else {
      setRoute(ROUTES.SELECT_METHOD);
    }
  };

  const value: PayContextValue = {
    theme: ckTheme,
    setTheme,
    mode: ckMode,
    setMode,
    customTheme,
    setCustomTheme,
    lang: ckLang,
    setLang,
    setOnOpen,
    setOnClose,
    open,
    setOpen,
    route,
    setRoute,
    // Daimo Pay context
    pendingConnectorId,
    setPendingConnectorId,
    wcWallet,
    sessionId,
    solanaConnector,
    setSolanaConnector,
    onConnect,
    // Other configuration
    options: opts,
    errorMessage,
    confirmationMessage,
    setConfirmationMessage,
    redirectReturnUrl,
    setRedirectReturnUrl,
    debugMode,
    log,
    displayError: (message: string | React.ReactNode | null, code?: any) => {
      setErrorMessage(message);
      console.log("---------DAIMOPAY DEBUG---------");
      console.log(message);
      if (code) console.table(code);
      console.log("---------/DAIMOPAY DEBUG---------");
    },
    resize,
    triggerResize: () => onResize((prev) => prev + 1),

    // Above: generic ConnectKit context
    // Below: Daimo Pay context
    showPayment,
    paymentState,
    trpc,
  };

  return createElement(
    PayContext.Provider,
    { value },
    <Web3ContextProvider enabled={open}>
      <ThemeProvider theme={defaultTheme}>
        {children}
        <DaimoPayModal
          lang={ckLang}
          theme={ckTheme}
          mode={mode}
          customTheme={ckCustomTheme}
        />
      </ThemeProvider>
    </Web3ContextProvider>,
  );
};

/**
 * Provides context for DaimoPayButton and hooks. Place in app root or layout.
 */
export const DaimoPayProvider = (props: DaimoPayProviderProps) => {
  return (
    <SolanaContextProvider solanaRpcUrl={props.solanaRpcUrl}>
      <DaimoPayProviderWithoutSolana {...props} />
    </SolanaContextProvider>
  );
};
