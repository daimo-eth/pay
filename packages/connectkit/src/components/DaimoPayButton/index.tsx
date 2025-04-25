import { ReactElement, useEffect, useRef } from "react";

import { usePayContext } from "../../hooks/usePayContext";
import { TextContainer } from "./styles";

import {
  assertNotNull,
  DaimoPayIntentStatus,
  DaimoPayOrderMode,
  DaimoPayOrderView,
  DaimoPayUserMetadata,
  getDaimoPayOrderView,
  PaymentBouncedEvent,
  PaymentCompletedEvent,
  writeDaimoPayOrderID,
} from "@daimo/pay-common";
import { AnimatePresence, Variants } from "framer-motion";
import { Address, Hex } from "viem";
import { PayParams } from "../../hooks/usePaymentState";
import { ResetContainer } from "../../styles";
import { CustomTheme, Mode, PaymentOption, Theme } from "../../types";
import ThemedButton, { ThemeContainer } from "../Common/ThemedButton";

// TODO: decouple from @daimo/pay-common
/** Payment details and status. */
export type DaimoPayment = DaimoPayOrderView;
/** Passed to both `onPayment*` event handlers and webhooks. */
export type DaimoPayEvent = {
  /**
   * A payment is started once the user has sent payment. Completed means
   * the payment was sent on the destination chain and custom contract call,
   * if any, was successful. Bounced means that a destination contract call
   * reverted and funds were refunded.
   */
  type: "payment_started" | "payment_completed" | "payment_bounced";
  /**
   * The unique ID for this payment.
   */
  paymentId: string;
  /**
   * The chain for this event--source chain for payment_started, destination
   * chain for payment_completed/payment_bounced.
   */
  chainId: number;
  /**
   * Payment details.
   */
  payment: DaimoPayment;
};
export type DaimoPayStartedEvent = DaimoPayEvent & {
  type: "payment_started";
  /**
   * The transaction hash sent by the user, if found. (There are rare edge cases
   * where a payment can be paid without a txhash.) Hex for all EVM events,
   * Base58 for payment_started on Solana.
   */
  txHash: Hex | string | null;
};
export type DaimoPayCompletedEvent = DaimoPayEvent & {
  type: "payment_completed";
  /** The transaction hash completing this payment. */
  txHash: Hex;
};
export type DaimoPayBouncedEvent = DaimoPayEvent & {
  type: "payment_bounced";
  /** The transaction hash containing the reverted final call and refund. */
  txHash: Hex;
};

/** Props for DaimoPayButton. */
type PayButtonPaymentProps =
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
      paymentOptions?: PaymentOption[];
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
      metadata?: DaimoPayUserMetadata;
      /**
       * The address to refund to if the payment bounces or a refund is requested.
       */
      refundAddress?: Address;
    }
  | {
      /** The payment ID, generated via the Daimo Pay API. Replaces params above. */
      payId: string;
    };

type PayButtonCommonProps = PayButtonPaymentProps & {
  /** Called when user sends payment and transaction is seen on chain */
  onPaymentStarted?: (event: DaimoPayStartedEvent) => void;
  /** Called when destination transfer or call completes successfully */
  onPaymentCompleted?: (event: DaimoPayCompletedEvent) => void;
  /** Called when destination call reverts and funds are refunded */
  onPaymentBounced?: (event: DaimoPayBouncedEvent) => void;
  /** Called when the modal is opened. */
  onOpen?: () => void;
  /** Called when the modal is closed. */
  onClose?: () => void;
  /** Automatically close the modal after a successful payment. */
  closeOnSuccess?: boolean;
  /** Open the modal by default. */
  defaultOpen?: boolean;
  /** Custom message to display on confirmation page. */
  confirmationMessage?: string;
  /** Redirect URL to return to the app. E.g. after Coinbase, Binance, RampNetwork. */
  redirectReturnUrl?: string;
};

export type DaimoPayButtonProps = PayButtonCommonProps & {
  /** Light mode, dark mode, or auto. */
  mode?: Mode;
  /** Named theme. See docs for options. */
  theme?: Theme;
  /** Custom theme. See docs for options. */
  customTheme?: CustomTheme;
  /** Disable interaction. */
  disabled?: boolean;
};

export type DaimoPayButtonCustomProps = PayButtonCommonProps & {
  /** Custom renderer */
  children: (renderProps: {
    show: () => void;
    hide: () => void;
  }) => ReactElement;
};

/**
 * A button that shows the Daimo Pay checkout. Replaces the traditional
 * Connect Wallet » approve » execute sequence with a single action.
 */
export function DaimoPayButton(props: DaimoPayButtonProps): JSX.Element {
  const { theme, mode, customTheme } = props;
  const context = usePayContext();

  return (
    <DaimoPayButtonCustom {...props}>
      {({ show }) => (
        <ResetContainer
          $useTheme={theme ?? context.theme}
          $useMode={mode ?? context.mode}
          $customTheme={customTheme ?? context.customTheme}
        >
          <ThemeContainer onClick={!props.disabled && show}>
            <ThemedButton
              theme={theme ?? context.theme}
              mode={mode ?? context.mode}
              customTheme={customTheme ?? context.customTheme}
            >
              <DaimoPayButtonInner disabled={props.disabled} />
            </ThemedButton>
          </ThemeContainer>
        </ResetContainer>
      )}
    </DaimoPayButtonCustom>
  );
}

/** Like DaimoPayButton, but with custom styling. */
function DaimoPayButtonCustom(props: DaimoPayButtonCustomProps): JSX.Element {
  const context = usePayContext();

  // Pre-load payment info in background.
  // Reload when any of the info changes.
  let payParams: PayParams | null =
    "appId" in props
      ? {
          appId: props.appId,
          toChain: props.toChain,
          toAddress: props.toAddress,
          toToken: props.toToken,
          toUnits: props.toUnits,
          toCallData: props.toCallData,
          intent: props.intent,
          paymentOptions: props.paymentOptions,
          preferredChains: props.preferredChains,
          preferredTokens: props.preferredTokens,
          evmChains: props.evmChains,
          externalId: props.externalId,
          metadata: props.metadata,
          refundAddress: props.refundAddress,
        }
      : null;
  let payId = "payId" in props ? props.payId : null;

  const { paymentState } = context;

  // Set the payId or payParams
  useEffect(() => {
    if (payId != null) {
      paymentState.setPayId(payId);
    } else if (payParams != null) {
      paymentState.setPayParams(payParams);
    }
  }, [payId, JSON.stringify(payParams || {})]);

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
  const { onPaymentStarted, onPaymentCompleted, onPaymentBounced } = props;

  const order = paymentState.daimoPayOrder;
  const intentStatus = order?.intentStatus;
  const hydOrder = order?.mode === DaimoPayOrderMode.HYDRATED ? order : null;

  // Functions to show and hide the modal
  const { children, closeOnSuccess } = props;
  const modalOptions = { closeOnSuccess };
  const show = () => {
    if (paymentState.daimoPayOrder == null) return;
    context.showPayment(modalOptions);
  };
  const hide = () => context.setOpen(false);

  // Emit event handlers when payment status changes
  const sentStart = useRef(false);
  useEffect(() => {
    if (hydOrder == null) return;
    if (intentStatus === DaimoPayIntentStatus.UNPAID) return;

    if (!sentStart.current && hydOrder.sourceTokenAmount) {
      sentStart.current = true;
      onPaymentStarted?.({
        type: DaimoPayIntentStatus.STARTED,
        paymentId: writeDaimoPayOrderID(hydOrder.id),
        chainId: hydOrder.sourceTokenAmount?.token.chainId,
        txHash: hydOrder.sourceInitiateTxHash ?? null,
        payment: getDaimoPayOrderView(hydOrder),
      });
    }
    if (
      intentStatus === DaimoPayIntentStatus.COMPLETED ||
      intentStatus === DaimoPayIntentStatus.BOUNCED
    ) {
      const event = {
        type: intentStatus,
        paymentId: writeDaimoPayOrderID(hydOrder.id),
        chainId: hydOrder.destFinalCallTokenAmount.token.chainId,
        txHash: assertNotNull(
          hydOrder.destFastFinishTxHash ?? hydOrder.destClaimTxHash,
          `[PAY BUTTON] dest tx hash null on order ${hydOrder.id} when intent status is ${intentStatus}`,
        ),
        payment: getDaimoPayOrderView(hydOrder),
      };

      if (intentStatus === DaimoPayIntentStatus.COMPLETED) {
        onPaymentCompleted?.(event as PaymentCompletedEvent);
      } else if (intentStatus === DaimoPayIntentStatus.BOUNCED) {
        onPaymentBounced?.(event as PaymentBouncedEvent);
      }
    }
  }, [hydOrder?.id, intentStatus, hydOrder?.sourceTokenAmount?.token.chainId]);

  // Open the modal by default if the defaultOpen prop is true
  useEffect(() => {
    if (props.defaultOpen && order != null) {
      show();
    }
  }, [order != null, props.defaultOpen]);

  // Validation
  if ((payId == null) == (payParams == null)) {
    throw new Error("Must specify either payId or appId, not both");
  }

  return children({ show, hide });
}

DaimoPayButtonCustom.displayName = "DaimoPayButton.Custom";

DaimoPayButton.Custom = DaimoPayButtonCustom;

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

function DaimoPayButtonInner({ disabled }: { disabled?: boolean }) {
  const { paymentState } = usePayContext();
  const label = paymentState?.daimoPayOrder?.metadata?.intent ?? "Pay";

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
