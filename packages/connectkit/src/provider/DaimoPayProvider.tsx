import {
  RozoPayOrderMode,
  RozoPayOrderStatusSource,
  debugJson,
} from "@rozoai/intent-common";
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
import { WagmiContext } from "wagmi";

import type { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import { RozoPayModal } from "../components/DaimoPayModal";
import { ROUTES } from "../constants/routes";
import { REQUIRED_CHAINS } from "../defaultConfig";
import { useChains } from "../hooks/useChains";
import {
  useConnectCallback,
  useConnectCallbackProps,
} from "../hooks/useConnectCallback";
import { useRozoPay } from "../hooks/useDaimoPay";
import { usePaymentState } from "../hooks/usePaymentState";
import defaultTheme from "../styles/defaultTheme";
import {
  CustomTheme,
  Languages,
  Mode,
  RozoPayContextOptions,
  RozoPayModalOptions,
  Theme,
} from "../types";
import { createTrpcClient } from "../utils/trpc";
import { setInWalletPaymentUrlFromApiUrl } from "../wallets/walletConfigs";
import { PayContext, PayContextValue } from "./PayContext";
import { PaymentContext, PaymentProvider } from "./PaymentProvider";
import {
  SolanaContextProvider,
  SolanaWalletName,
} from "./SolanaContextProvider";
import {
  StellarContextProvider,
  StellarWalletName,
} from "./StellarContextProvider";
import { Web3ContextProvider } from "./Web3ContextProvider";

type RozoPayUIProviderProps = {
  children?: React.ReactNode;
  theme?: Theme;
  mode?: Mode;
  customTheme?: CustomTheme;
  options?: RozoPayContextOptions;
  debugMode?: boolean;
  /** Custom Pay API, useful for test and staging. */
  payApiUrl: string;
  log: (msg: string, ...props: any[]) => void;
} & useConnectCallbackProps;

const RozoPayUIProvider = ({
  children,
  theme = "auto",
  mode = "auto",
  customTheme,
  options,
  onConnect,
  onDisconnect,
  debugMode = false,
  payApiUrl,
  log,
}: RozoPayUIProviderProps) => {
  if (!React.useContext(PaymentContext)) {
    throw Error("RozoPayProvider must be within a PaymentProvider");
  }

  if (!React.useContext(WagmiContext)) {
    throw Error("RozoPayProvider must be within a WagmiProvider");
  }

  // Only allow for mounting RozoPayProvider once, so we avoid weird global
  // state collisions.
  if (React.useContext(PayContext)) {
    throw new Error(
      "Multiple, nested usages of RozoPayProvider detected. Please use only one."
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
        `Rozo Pay requires chains ${REQUIRED_CHAINS.map((c) => c.name).join(
          ", "
        )}. Use \`getDefaultConfig\` to automatically configure required chains.`
      );
    }
  }

  // Default config options
  const defaultOptions: RozoPayContextOptions = {
    language: "en-US",
    hideBalance: false,
    hideTooltips: false,
    hideQuestionMarkCTA: false,
    hideNoWalletCTA: false,
    hideRecentBadge: false,
    avoidLayoutShift: true,
    embedGoogleFonts: false,
    truncateLongENSAddress: true,
    reducedMotion: false,
    disclaimer: null,
    bufferPolyfill: true,
    customAvatar: undefined,
    initialChainId: undefined,
    enforceSupportedChains: false,
    ethereumOnboardingUrl: undefined,
    walletOnboardingUrl: undefined,
    overlayBlur: undefined,
    disableMobileInjector: false,
  };

  const opts: RozoPayContextOptions = Object.assign(
    {},
    defaultOptions,
    options
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

  const pay = useRozoPay();

  const [ckTheme, setTheme] = useState<Theme>(theme);
  const [ckMode, setMode] = useState<Mode>(mode);
  const [ckCustomTheme, setCustomTheme] = useState<CustomTheme | undefined>(
    customTheme ?? {}
  );
  const [ckLang, setLang] = useState<Languages>("en-US");
  const [disableMobileInjector, setDisableMobileInjector] = useState<boolean>(
    opts.disableMobileInjector ?? false
  );

  const onOpenRef = useRef<(() => void) | undefined>();
  const onCloseRef = useRef<(() => void) | undefined>();
  const setOnOpen = useCallback((fn?: () => void) => {
    onOpenRef.current = fn;
  }, []);
  const setOnClose = useCallback((fn?: () => void) => {
    onCloseRef.current = fn;
  }, []);
  const [open, setOpenState] = useState<boolean>(false);
  const [lockPayParams, setLockPayParams] = useState<boolean>(false);
  const [paymentCompleted, setPaymentCompleted] = useState<boolean>(false);
  const [route, setRouteState] = useState<ROUTES>(ROUTES.SELECT_METHOD);
  const [modalOptions, setModalOptions] = useState<RozoPayModalOptions>();

  // Rozo Pay context
  const [pendingConnectorId, setPendingConnectorId] = useState<
    string | undefined
  >(undefined);
  // Track sessions. Each generates separate intent IDs unless using externalId.
  const [sessionId] = useState(() => crypto.randomUUID().replaceAll("-", ""));
  const [solanaConnector, setSolanaConnector] = useState<
    SolanaWalletName | undefined
  >();

  const [stellarConnector, setStellarConnector] = useState<
    StellarWalletName | undefined
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
  // Connect to the Rozo Pay TRPC API
  const trpc = useMemo(() => {
    return createTrpcClient(payApiUrl, sessionId);
  }, [payApiUrl, sessionId]);
  const [resize, onResize] = useState<number>(0);

  useEffect(() => {
    setInWalletPaymentUrlFromApiUrl(payApiUrl);
  }, [payApiUrl]);

  const setOpen = useCallback(
    (open: boolean, meta?: Record<string, any>) => {
      setOpenState(open);

      // Lock pay params starting from the first time the modal is opened to
      // prevent the rozopay order from changing from under the user
      if (open) {
        setLockPayParams(true);
      }
      // Reset payment state on close if resetOnSuccess is true
      if (!open && paymentCompleted && modalOptions?.resetOnSuccess) {
        setPaymentCompleted(false);
        setLockPayParams(false);
        paymentState.resetOrder();
      }

      // Log the open/close event
      // trpc.nav.mutate({
      //   action: open ? "navOpenPay" : "navClosePay",
      //   orderId: pay.order?.id?.toString(),
      //   data: meta ?? {},
      // });

      // Run the onOpen and onClose callbacks
      if (open) onOpenRef.current?.();
      else onCloseRef.current?.();
    },
    // We don't have good caching on paymentState, so don't include it as a dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trpc, pay.order?.id, modalOptions?.resetOnSuccess, paymentCompleted]
  );

  // Callback when a payment is successfully completed (regardless of whether
  // the final call succeeded or bounced)
  const onSuccess = useCallback(() => {
    if (modalOptions?.closeOnSuccess) {
      setTimeout(() => setOpen(false, { event: "wait-success" }), 1000);
    }
    setPaymentCompleted(true);
  }, [modalOptions?.closeOnSuccess]);

  const setRoute = useCallback(
    (route: ROUTES, data?: Record<string, any>) => {
      const action = route.replace("rozoPay", "");
      log(`[SET ROUTE] ${action} ${pay.order?.id} ${debugJson(data ?? {})}`);
      // trpc.nav.mutate({
      //   action,
      //   orderId: pay.order?.id?.toString(),
      //   data: data ?? {},
      // });
      setRouteState(route);
    },
    [trpc, pay.order?.id, log]
  );

  // Other Configuration
  useEffect(() => setTheme(theme), [theme]);
  useEffect(() => setLang(opts.language || "en-US"), [opts.language]);
  useEffect(
    () => setDisableMobileInjector(opts.disableMobileInjector ?? false),
    [opts.disableMobileInjector]
  );
  useEffect(() => setErrorMessage(null), [route, open]);

  const paymentState = usePaymentState({
    trpc,
    lockPayParams,
    setRoute,
    log,
    redirectReturnUrl,
  });

  const showPayment = async (modalOptions: RozoPayModalOptions) => {
    const id = pay.order?.id;
    log(
      `[PAY] showing modal ${debugJson({
        id,
        modalOptions,
        paymentFsmState: pay.paymentState,
      })}`
    );

    setModalOptions(modalOptions);
    setOpen(true);
    if (modalOptions.connectedWalletOnly) {
      paymentState.setTokenMode("all");
    }

    if (pay.paymentState === "error") {
      setRoute(ROUTES.ERROR);
    } else if (
      pay.paymentState === "payment_started" ||
      pay.paymentState === "payment_completed" ||
      pay.paymentState === "payment_bounced"
    ) {
      setRoute(ROUTES.CONFIRMATION);
    } else if (modalOptions.connectedWalletOnly) {
      setRoute(ROUTES.SELECT_TOKEN);
    } else {
      setRoute(ROUTES.SELECT_METHOD);
    }
  };

  // Watch when the order gets paid and navigate to confirmation
  // ...if underpaid, go to the deposit addr screen, let the user finish paying.
  const isUnderpaid =
    pay.order?.mode === RozoPayOrderMode.HYDRATED &&
    pay.order.sourceStatus === RozoPayOrderStatusSource.WAITING_PAYMENT &&
    pay.order.sourceTokenAmount != null;
  useEffect(() => {
    if (
      pay.paymentState === "payment_started" ||
      pay.paymentState === "payment_completed" ||
      pay.paymentState === "payment_bounced"
    ) {
      setRoute(ROUTES.CONFIRMATION, { event: "payment-started" });
    } else if (isUnderpaid) {
      paymentState.setSelectedDepositAddressOption(undefined);
      setRoute(ROUTES.WAITING_DEPOSIT_ADDRESS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pay.paymentState, setRoute, isUnderpaid]);

  const value: PayContextValue = {
    theme: ckTheme,
    setTheme,
    mode: ckMode,
    setMode,
    customTheme,
    setCustomTheme,
    lang: ckLang,
    setLang,
    disableMobileInjector,
    setDisableMobileInjector,
    setOnOpen,
    setOnClose,
    open,
    setOpen,
    route,
    setRoute,
    // Rozo Pay context
    pendingConnectorId,
    setPendingConnectorId,
    sessionId,
    solanaConnector,
    setSolanaConnector,
    stellarConnector,
    setStellarConnector,
    onConnect,
    // Other configuration
    options: opts,
    errorMessage,
    onSuccess,
    confirmationMessage,
    setConfirmationMessage,
    redirectReturnUrl,
    setRedirectReturnUrl,
    debugMode,
    log,
    displayError: (message: string | React.ReactNode | null, code?: any) => {
      setErrorMessage(message);
      log("---------ROZO PAY DEBUG---------");
      log(JSON.stringify(message, null, 2));
      if (code) console.table(code);
      log("---------/ROZO PAY DEBUG---------");
    },
    resize,
    triggerResize: () => onResize((prev) => prev + 1),

    // Above: generic ConnectKit context
    // Below: Rozo Pay context
    showPayment,
    paymentState,
    trpc,
  };

  return createElement(
    PayContext.Provider,
    { value },
    <Web3ContextProvider>
      <ThemeProvider theme={defaultTheme}>
        {children}
        <RozoPayModal
          lang={ckLang}
          theme={ckTheme}
          mode={mode}
          customTheme={ckCustomTheme}
          disableMobileInjector={disableMobileInjector}
        />
      </ThemeProvider>
    </Web3ContextProvider>
  );
};

type RozoPayProviderProps = {
  children?: React.ReactNode;
  theme?: Theme;
  mode?: Mode;
  customTheme?: CustomTheme;
  options?: RozoPayContextOptions;
  debugMode?: boolean;
  /**
   * Be careful with this endpoint, some endpoints (incl. Alchemy) don't support
   * `signatureSubscribe` which leads to txes behaving erratically
   * (ex. successful txes take minutes to confirm instead of seconds)
   */
  solanaRpcUrl?: string;
  stellarRpcUrl?: string;
  stellarKit?: StellarWalletsKit;
  /** Custom Pay API, useful for test and staging. */
  payApiUrl?: string;
} & useConnectCallbackProps;

/**
 * Provides context for RozoPayButton and hooks. Place in app root or layout.
 */
export const RozoPayProvider = (props: RozoPayProviderProps) => {
  const payApiUrl = props.payApiUrl ?? "https://intentapi.rozo.ai";
  const log = useMemo(
    () =>
      props.debugMode ? (...args: any[]) => console.log(...args) : () => {},
    [props.debugMode]
  );

  return (
    <PaymentProvider payApiUrl={payApiUrl} log={log}>
      <SolanaContextProvider rpcUrl={props.solanaRpcUrl}>
        <StellarContextProvider
          rpcUrl={props.stellarRpcUrl}
          kit={props.stellarKit}
        >
          <RozoPayUIProvider {...props} payApiUrl={payApiUrl} log={log} />
        </StellarContextProvider>
      </SolanaContextProvider>
    </PaymentProvider>
  );
};
