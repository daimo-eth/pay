import { ReactElement, useCallback, useEffect, useMemo, useRef } from "react";

import { usePayContext } from "../../hooks/usePayContext";
import { TextContainer } from "./styles";

import {
  assertNotNull,
  ExternalPaymentOptionsString,
  getChainExplorerTxUrl,
  getRozoPayOrderView,
  PaymentBouncedEvent,
  PaymentCompletedEvent,
  PaymentPayoutCompletedEvent,
  PaymentStartedEvent,
  RozoPayEventType,
  RozoPayHydratedOrderWithOrg,
  RozoPayOrderView,
  RozoPayUserMetadata,
  rozoSolana,
  rozoStellar,
  writeRozoPayOrderID,
} from "@rozoai/intent-common";
import { AnimatePresence, Variants } from "framer-motion";
import { Address, Hex } from "viem";
import { useRozoPay } from "../../hooks/useDaimoPay";
import { PayParams } from "../../payment/paymentFsm";
import { ResetContainer } from "../../styles";
import { CustomTheme, Mode, Theme } from "../../types";
import ThemedButton, { ThemeContainer } from "../Common/ThemedButton";

/** Payment details and status. */
export type RozoPayment = RozoPayOrderView;

/** Props for RozoPayButton. */
export type PayButtonPaymentProps =
  | {
      /**
       * Your public app ID. Specify either (payId) or (appId + parameters).
       */
      appId: string;
      /**
       * Destination chain ID.
       */
      toChain: number;
      /**
       * The destination token to send, completing payment. Must be an ERC-20
       * token or the zero address, indicating the native token / ETH.
       */
      toToken: Address;
      /**
       * The amount of destination token to send (transfer or approve).
       * If not provided, the user will be prompted to enter an amount.
       */
      toUnits?: string;
      /**
       * The destination address to transfer to, or contract to call.
       */
      toAddress: Address;
      /**
       * The destination stellar address to transfer to.
       */
      toStellarAddress?: string;
      /**
       * The destination solana address to transfer to.
       */
      toSolanaAddress?: string;
      /**
       * Optional calldata to call an arbitrary function on `toAddress`.
       */
      toCallData?: Hex;
      /**
       * The intent verb, such as "Pay", "Deposit", or "Purchase".
       */
      intent?: string;
      /**
       * Payment options. By default, all are enabled.
       */
      paymentOptions?: ExternalPaymentOptionsString[];
      /**
       * Preferred chain IDs. Assets on these chains will appear first.
       */
      preferredChains?: number[];
      /**
       * Preferred tokens. These appear first in the token list.
       */
      preferredTokens?: { chain: number; address: Address }[];
      /**
       * Only allow payments on these EVM chains.
       */
      evmChains?: number[];
      /**
       * External ID. E.g. a correlation ID.
       */
      externalId?: string;
      /**
       * Developer metadata. E.g. correlation ID.
       * */
      metadata?: RozoPayUserMetadata;
      /**
       * The address to refund to if the payment bounces.
       */
      refundAddress?: Address;
    }
  | {
      /** The payment ID, generated via the Rozo Pay API. Replaces params above. */
      payId: string;
      /** Payment options. By default, all are enabled. */
      paymentOptions?: ExternalPaymentOptionsString[];
    };

type PayButtonCommonProps = PayButtonPaymentProps & {
  /** Called when user sends payment and transaction is seen on chain */
  onPaymentStarted?: (event: PaymentStartedEvent) => void;
  /** Called when destination transfer or call completes successfully */
  onPaymentCompleted?: (event: PaymentCompletedEvent) => void;
  /** Called when destination call reverts and funds are refunded */
  onPaymentBounced?: (event: PaymentBouncedEvent) => void;
  /** Called when payout completes */
  onPayoutCompleted?: (event: PaymentPayoutCompletedEvent) => void;
  /** Called when the modal is opened. */
  onOpen?: () => void;
  /** Called when the modal is closed. */
  onClose?: () => void;
  /** Open the modal by default. */
  defaultOpen?: boolean;
  /** Automatically close the modal after a successful payment. */
  closeOnSuccess?: boolean;
  /** Reset the payment after a successful payment. */
  resetOnSuccess?: boolean;
  /** Go directly to tokens in already-connected Ethereum and Solana wallet(s).
   * Don't let the user pick any other payment method. Used in embedded flows.*/
  connectedWalletOnly?: boolean;
  /** Custom message to display on confirmation page. */
  confirmationMessage?: string;
  /** Redirect URL to return to the app. E.g. after Coinbase, Binance, RampNetwork. */
  redirectReturnUrl?: string;
  /** Optional configuration to show processing pay out loading when payment completed */
  showProcessingPayout?: boolean;
};

export type RozoPayButtonProps = PayButtonCommonProps & {
  /** Light mode, dark mode, or auto. */
  mode?: Mode;
  /** Named theme. See docs for options. */
  theme?: Theme;
  /** Custom theme. See docs for options. */
  customTheme?: CustomTheme;
  /** Disable interaction. */
  disabled?: boolean;
};

export type RozoPayButtonCustomProps = PayButtonCommonProps & {
  /** Custom renderer */
  children: (renderProps: {
    show: () => void;
    hide: () => void;
  }) => ReactElement;
};

/**
 * A button that shows the Rozo Pay checkout. Replaces the traditional
 * Connect Wallet » approve » execute sequence with a single action.
 */
export function RozoPayButton(props: RozoPayButtonProps): JSX.Element {
  const { theme, mode, customTheme } = props;
  const context = usePayContext();

  return (
    <RozoPayButtonCustom {...props}>
      {({ show }) => (
        <ResetContainer
          $useTheme={theme ?? context.theme}
          $useMode={mode ?? context.mode}
          $customTheme={customTheme ?? context.customTheme}
        >
          <ThemeContainer onClick={props.disabled ? undefined : show}>
            <ThemedButton
              theme={theme ?? context.theme}
              mode={mode ?? context.mode}
              customTheme={customTheme ?? context.customTheme}
            >
              <RozoPayButtonInner />
            </ThemedButton>
          </ThemeContainer>
        </ResetContainer>
      )}
    </RozoPayButtonCustom>
  );
}

/** Like RozoPayButton, but with custom styling. */
function RozoPayButtonCustom(props: RozoPayButtonCustomProps): JSX.Element {
  const context = usePayContext();

  // Simple: create stable key for object/array props to prevent infinite re-renders
  const objectPropsKey = useMemo(() => {
    if (!("appId" in props)) return null;
    return JSON.stringify({
      paymentOptions: props.paymentOptions,
      preferredChains: props.preferredChains,
      preferredTokens: props.preferredTokens,
      evmChains: props.evmChains,
      metadata: props.metadata,
    });
  }, [
    "appId" in props && props.paymentOptions,
    "appId" in props && props.preferredChains,
    "appId" in props && props.preferredTokens,
    "appId" in props && props.evmChains,
    "appId" in props && props.metadata,
  ]);

  const { payParams, payId } = useMemo(() => {
    if ("appId" in props) {
      const {
        appId,
        toChain,
        toAddress,
        toStellarAddress,
        toSolanaAddress,
        toToken,
        toUnits,
        toCallData,
        intent,
        paymentOptions,
        preferredChains,
        preferredTokens,
        evmChains,
        externalId,
        metadata,
        refundAddress,
        showProcessingPayout,
      } = props;

      return {
        payParams: {
          appId,
          toChain,
          toAddress,
          toStellarAddress,
          toSolanaAddress,
          toToken,
          toUnits,
          toCallData,
          intent,
          paymentOptions,
          preferredChains,
          preferredTokens,
          evmChains,
          externalId,
          metadata,
          refundAddress,
          showProcessingPayout,
        } as PayParams,
        payId: null,
      };
    }

    if ("payId" in props) {
      return {
        payParams: null,
        payId: props.payId,
      };
    }

    return { payParams: null, payId: null };
  }, [
    "appId" in props,
    "payId" in props,
    // Only include relevant props based on mode
    ...("appId" in props
      ? [
          props.appId,
          props.toChain,
          props.toAddress,
          props.toStellarAddress,
          props.toSolanaAddress,
          props.toToken,
          props.toUnits,
          props.toCallData,
          props.intent,
          props.externalId,
          props.refundAddress,
          props.showProcessingPayout,
          objectPropsKey, // Single dependency for all object/array props
        ]
      : []),
    ...("payId" in props ? [props.payId] : []),
  ]);

  const { paymentState, log } = context;
  const {
    order,
    paymentState: payState,
    rozoPaymentId,
    paymentRozoCompleted,
    payoutRozoCompleted,
  } = useRozoPay();

  const isToStellar = useMemo(() => {
    return payParams?.toStellarAddress != null;
  }, [payParams?.toStellarAddress]);

  const isToSolana = useMemo(() => {
    return payParams?.toSolanaAddress != null;
  }, [payParams?.toSolanaAddress]);

  // Track previous values to prevent unnecessary API calls
  const prevPayIdRef = useRef<string | null>(null);
  const prevPayParamsRef = useRef<PayParams | null>(null);

  // Set the payId or payParams when they change
  useEffect(() => {
    const payIdChanged = payId !== prevPayIdRef.current;
    const payParamsChanged = payParams !== prevPayParamsRef.current;

    if (payIdChanged && payId != null) {
      prevPayIdRef.current = payId;
      prevPayParamsRef.current = null; // Reset when switching modes
      paymentState.setPayId(payId);
    } else if (payParamsChanged && payParams != null) {
      prevPayParamsRef.current = payParams;
      prevPayIdRef.current = null; // Reset when switching modes
      paymentState.setPayParams(payParams);
    }
    // Note: paymentState is not stable/memoized, so we don't include it as a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payId, payParams]);

  // Set the confirmation message
  const { setConfirmationMessage } = context;
  useEffect(() => {
    if (props.confirmationMessage) {
      setConfirmationMessage(props.confirmationMessage);
    }
  }, [props.confirmationMessage, setConfirmationMessage]);

  // Set the redirect return url
  const { setRedirectReturnUrl } = context;
  useEffect(() => {
    if (props.redirectReturnUrl) {
      setRedirectReturnUrl(props.redirectReturnUrl);
    }
  }, [props.redirectReturnUrl, setRedirectReturnUrl]);

  // Set the onOpen and onClose callbacks
  const { setOnOpen, setOnClose } = context;
  useEffect(() => {
    setOnOpen(props.onOpen);
    return () => setOnOpen(undefined);
  }, [props.onOpen, setOnOpen]);

  useEffect(() => {
    setOnClose(props.onClose);
    return () => setOnClose(undefined);
  }, [props.onClose, setOnClose]);

  // Payment events: call these three event handlers.
  const {
    onPaymentStarted,
    onPaymentCompleted,
    onPaymentBounced,
    onPayoutCompleted,
  } = props;

  // Functions to show and hide the modal
  const { children, closeOnSuccess, resetOnSuccess, connectedWalletOnly } =
    props;
  const show = useCallback(() => {
    const modalOptions = {
      closeOnSuccess,
      resetOnSuccess,
      connectedWalletOnly,
    };
    context.showPayment(modalOptions);
  }, [connectedWalletOnly, closeOnSuccess, resetOnSuccess, context]);
  const hide = useCallback(() => context.setOpen(false), [context]);

  // Track sent flags for payment events
  const sentStart = useRef(false);
  const sentComplete = useRef(false);
  const sentPayoutComplete = useRef(false);

  // Reset the sent flags when order changes to allow events to be fired again
  useEffect(() => {
    sentStart.current = false;
    sentComplete.current = false;
    sentPayoutComplete.current = false;
  }, [order?.id]);

  // Emit onPaymentStart handler when payment state changes to payment_started
  useEffect(() => {
    const currentRozoPaymentId = rozoPaymentId ?? order?.externalId ?? null;
    if (sentStart.current) return;
    if (payState !== "payment_started") return;

    sentStart.current = true;
    const event: PaymentStartedEvent = {
      type: RozoPayEventType.PaymentStarted,
      paymentId: currentRozoPaymentId || writeRozoPayOrderID(order.id),
      chainId: order.destFinalCallTokenAmount.token.chainId,
      txHash: null,
      payment: getRozoPayOrderView(order),
    };

    onPaymentStarted?.(event);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, payState, rozoPaymentId, order?.externalId]);

  // Type guard to check if order is hydrated
  const isHydratedOrder = (
    order: any
  ): order is RozoPayHydratedOrderWithOrg => {
    return order && typeof order === "object" && "intentAddr" in order;
  };

  // Helper function to safely extract transaction hash from order
  const getDestinationTxHash = (order: any): string | null => {
    // Only proceed if order is hydrated (where tx hashes would exist)
    if (!isHydratedOrder(order)) {
      return null;
    }

    // Check for destFastFinishTxHash first (preferred)
    if ("destFastFinishTxHash" in order && order.destFastFinishTxHash) {
      return order.destFastFinishTxHash;
    }
    // Fallback to destClaimTxHash
    if ("destClaimTxHash" in order && order.destClaimTxHash) {
      return order.destClaimTxHash;
    }
    return null;
  };

  const getPayoutTxHash = (
    order: RozoPayHydratedOrderWithOrg
  ): string | null => {
    if (!isHydratedOrder(order)) {
      return null;
    }
    if ("payoutTransactionHash" in order && order.payoutTransactionHash) {
      return order.payoutTransactionHash;
    }
    return null;
  };

  // Emit onPaymentComplete or onPaymentBounced handler when payment state
  // changes to payment_completed or payment_bounced
  const lastRozoPaymentId = useRef<string | null>(null);

  useEffect(() => {
    // Reset sentComplete flags when rozoPaymentId changes
    const currentRozoPaymentId = rozoPaymentId ?? order?.externalId;
    if (currentRozoPaymentId !== lastRozoPaymentId.current) {
      sentComplete.current = false;
      sentPayoutComplete.current = false;
      lastRozoPaymentId.current = currentRozoPaymentId || null;
    }

    if (!order) return;

    // Check if payment is completed (either through payState or paymentRozoCompleted)
    const isPaymentCompleted =
      payState === "payment_completed" || paymentRozoCompleted;
    const isPaymentBounced = payState === "payment_bounced";
    const isPayoutCompleted =
      payState === "payout_completed" || payoutRozoCompleted;

    // Handle payout completion separately (can happen after payment completion)
    if (isPayoutCompleted && !sentPayoutComplete.current) {
      sentPayoutComplete.current = true;

      const sourceChain = order.destFinalCallTokenAmount.token.chainId;
      const destChain = isToStellar
        ? rozoStellar.chainId
        : isToSolana
        ? rozoSolana.chainId
        : payParams?.toChain ?? order.destFinalCallTokenAmount.token.chainId;

      const payoutEvent: PaymentPayoutCompletedEvent = {
        type: RozoPayEventType.PaymentPayoutCompleted,
        paymentId: order.externalId || writeRozoPayOrderID(order.id),
        paymentTx: {
          hash: assertNotNull(
            getDestinationTxHash(order),
            `Payment tx hash null on order ${order.id} when intent status is ${order.intentStatus}`
          ),
          chainId: sourceChain,
          url: assertNotNull(
            getChainExplorerTxUrl(
              sourceChain,
              assertNotNull(
                getDestinationTxHash(order),
                `Payment tx hash null on order ${order.id} when intent status is ${order.intentStatus}`
              )
            ),
            `Payment tx url null on order ${order.id} when intent status is ${order.intentStatus}`
          ),
        },
        payoutTx: {
          hash: assertNotNull(
            getPayoutTxHash(order as RozoPayHydratedOrderWithOrg),
            `Payout tx hash null on order ${order.id} when intent status is ${order.intentStatus}`
          ),
          chainId: destChain,
          url: assertNotNull(
            getChainExplorerTxUrl(
              destChain,
              assertNotNull(
                getPayoutTxHash(order as RozoPayHydratedOrderWithOrg),
                `Payout tx hash null on order ${order.id} when intent status is ${order.intentStatus}`
              )
            ),
            `Payout tx url null on order ${order.id} when intent status is ${order.intentStatus}`
          ),
        },
        payment: getRozoPayOrderView(order),
      };
      onPayoutCompleted?.(payoutEvent);
    }

    // Handle payment completion/bounced (only if not already sent)
    if (sentComplete.current) return;
    if (!isPaymentCompleted && !isPaymentBounced) return;

    sentComplete.current = true;
    const eventType = isPaymentCompleted
      ? RozoPayEventType.PaymentCompleted
      : RozoPayEventType.PaymentBounced;

    const event = {
      type: eventType,
      paymentId: order.externalId || writeRozoPayOrderID(order.id),
      chainId: order.destFinalCallTokenAmount.token.chainId,
      txHash: assertNotNull(
        getDestinationTxHash(order),
        `[PAY BUTTON] dest tx hash null on order ${order.id} when intent status is ${order.intentStatus}`
      ),
      payment: getRozoPayOrderView(order),
      rozoPaymentId: currentRozoPaymentId,
    };

    log("[PAY BUTTON] Event", {
      order,
      event,
      isPaymentCompleted,
    });

    if (isPaymentCompleted) {
      onPaymentCompleted?.(event as PaymentCompletedEvent);
    } else if (isPaymentBounced) {
      onPaymentBounced?.(event as PaymentBouncedEvent);
    }
  }, [
    order,
    payState,
    paymentRozoCompleted,
    payoutRozoCompleted,
    rozoPaymentId,
  ]);

  // Open the modal by default if the defaultOpen prop is true
  const hasAutoOpened = useRef(false);
  useEffect(() => {
    if (!props.defaultOpen || hasAutoOpened.current) return;
    if (order == null) return;
    show();
    hasAutoOpened.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, props.defaultOpen, hasAutoOpened.current]);

  // Validation
  if ((payId == null) == (payParams == null)) {
    throw new Error("Must specify either payId or appId, not both");
  }

  return children({ show, hide });
}

RozoPayButtonCustom.displayName = "RozoPayButton.Custom";

RozoPayButton.Custom = RozoPayButtonCustom;

const contentVariants: Variants = {
  initial: {
    zIndex: 2,
    opacity: 0,
    x: "-100%",
  },
  animate: {
    opacity: 1,
    x: 0.1,
    transition: {
      duration: 0.4,
      ease: [0.25, 1, 0.5, 1],
    },
  },
  exit: {
    zIndex: 1,
    opacity: 0,
    x: "-100%",
    pointerEvents: "none",
    position: "absolute",
    transition: {
      duration: 0.4,
      ease: [0.25, 1, 0.5, 1],
    },
  },
};

export function RozoPayButtonInner() {
  const { order } = useRozoPay();
  const label = order?.metadata?.intent ?? "Pay";

  return (
    <AnimatePresence initial={false}>
      <TextContainer
        initial={"initial"}
        animate={"animate"}
        exit={"exit"}
        variants={contentVariants}
        style={{
          height: 40,
        }}
      >
        {label}
      </TextContainer>
    </AnimatePresence>
  );
}
