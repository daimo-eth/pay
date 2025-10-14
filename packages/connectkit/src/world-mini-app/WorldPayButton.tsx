import {
  assertNotNull,
  DaimoPayEventType,
  DaimoPayUserMetadata,
  getDaimoPayOrderView,
  getOrderDestChainId,
  getOrderSourceChainId,
  PaymentBouncedEvent,
  PaymentCompletedEvent,
  PaymentStartedEvent,
  writeDaimoPayOrderID,
} from "@daimo/pay-common";
import { ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { Address, Hex } from "viem";
import ThemedButton, {
  ThemeContainer,
} from "../components/Common/ThemedButton";
import { DaimoPayButtonInner } from "../components/DaimoPayButton";
import { ROUTES } from "../constants/routes";
import { useDaimoPay } from "../hooks/useDaimoPay";
import { usePayContext } from "../hooks/usePayContext";
import { ResetContainer } from "../styles";
import { CustomTheme, Mode, Theme } from "../types";
import { promptWorldcoinPayment } from "./promptWorldPayment";

import { MiniKit } from "@worldcoin/minikit-js";
import useIsMobile from "../hooks/useIsMobile";

export type WorldPayButtonPaymentProps =
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
       */
      toUnits: string;
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
       * External ID. E.g. a correlation ID.
       */
      externalId?: string;
      /**
       * Developer metadata. E.g. correlation ID.
       * */
      metadata?: DaimoPayUserMetadata;
      /**
       * The address to refund to if the payment bounces.
       */
      refundAddress?: Address;
    }
  | {
      /** The payment ID, generated via the Daimo Pay API. Replaces params above. */
      payId: string;
    };

type WorldPayButtonCommonProps = WorldPayButtonPaymentProps & {
  /** Called when user sends payment and transaction is seen on chain */
  onPaymentStarted?: (event: PaymentStartedEvent) => void;
  /** Called when destination transfer or call completes successfully */
  onPaymentCompleted?: (event: PaymentCompletedEvent) => void;
  /** Called when destination call reverts and funds are refunded */
  onPaymentBounced?: (event: PaymentBouncedEvent) => void;
  /** Open the modal by default. */
  defaultOpen?: boolean;
  /** Automatically close the modal after a successful payment. */
  closeOnSuccess?: boolean;
  /** Reset the payment after a successful payment. */
  resetOnSuccess?: boolean;
};

export type WorldPayButtonProps = WorldPayButtonCommonProps & {
  /** Light mode, dark mode, or auto. */
  mode?: Mode;
  /** Named theme. See docs for options. */
  theme?: Theme;
  /** Custom theme. See docs for options. */
  customTheme?: CustomTheme;
  /** Disable interaction. */
  disabled?: boolean;
};

export type WorldPayButtonCustomProps = WorldPayButtonCommonProps & {
  children: (renderProps: {
    show: () => void;
    isMiniKitReady: boolean;
  }) => ReactElement;
};

export function WorldPayButton(props: WorldPayButtonProps) {
  const { theme, mode, customTheme } = props;
  const context = usePayContext();

  return (
    <WorldPayButtonCustom {...props}>
      {({ show, isMiniKitReady }) => (
        <ResetContainer
          $useTheme={theme ?? context.theme}
          $useMode={mode ?? context.mode}
          $customTheme={customTheme ?? context.customTheme}
        >
          <ThemeContainer
            onClick={props.disabled || !isMiniKitReady ? undefined : show}
          >
            <ThemedButton>
              <DaimoPayButtonInner />
            </ThemedButton>
          </ThemeContainer>
        </ResetContainer>
      )}
    </WorldPayButtonCustom>
  );
}

function WorldPayButtonCustom(props: WorldPayButtonCustomProps) {
  const pay = useDaimoPay();
  const context = usePayContext();
  const { paymentState, log } = context;
  const [isMiniKitReady, setIsMiniKitReady] = useState(false);
  const { isIOS } = useIsMobile();

  // Payment events: call these three event handlers.
  const { onPaymentStarted, onPaymentCompleted, onPaymentBounced } = props;

  // Install Minikit if not already installed
  useEffect(() => {
    log("[WORLD] Installing MiniKit");
    const result = MiniKit.install();
    log("[WORLD] MiniKit install result", result);
    log("[WORLD] MiniKit is installed", MiniKit.isInstalled());
    setIsMiniKitReady(MiniKit.isInstalled());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set the payParams
  useEffect(() => {
    if ("payId" in props) {
      log("[WORLD] Using payId from props: ", props.payId);
      paymentState.setPayId(props.payId);
    } else {
      log("[WORLD] Creating preview order");
      paymentState.setPayParams(props);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(props || {})]);

  // Set the showContactSupport flag
  useEffect(() => {
    // Links are broken on iOS in World App, so hide the contact support button
    context.setShowContactSupport(!isIOS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIOS]);

  // Open the modal by default if the defaultOpen prop is true
  const hasAutoOpened = useRef(false);
  useEffect(() => {
    if (!props.defaultOpen || hasAutoOpened.current) return;
    if (pay.order == null) return;
    show();
    hasAutoOpened.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pay.order, props.defaultOpen, hasAutoOpened.current]);

  // Emit onPaymentStart handler when payment state changes to payment_started
  const sentStart = useRef(false);
  useEffect(() => {
    if (sentStart.current) return;
    if (pay.paymentState !== "payment_started") return;

    // TODO: Populate source payment details immediately when the user pays.
    // Use this hack because source chain id is not immediately populated when
    // payment_started
    const sourceChainId = getOrderSourceChainId(pay.order);
    if (sourceChainId == null) return;

    sentStart.current = true;
    onPaymentStarted?.({
      type: DaimoPayEventType.PaymentStarted,
      paymentId: writeDaimoPayOrderID(pay.order.id),
      chainId: sourceChainId,
      txHash: pay.order.sourceInitiateTxHash,
      payment: getDaimoPayOrderView(pay.order),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pay.order, pay.paymentState]);

  // Emit onPaymentComplete or onPaymentBounced handler when payment state
  // changes to payment_completed or payment_bounced
  const sentComplete = useRef(false);
  useEffect(() => {
    if (sentComplete.current) return;
    if (
      pay.paymentState !== "payment_completed" &&
      pay.paymentState !== "payment_bounced"
    )
      return;

    sentComplete.current = true;
    const eventType =
      pay.paymentState === "payment_completed"
        ? DaimoPayEventType.PaymentCompleted
        : DaimoPayEventType.PaymentBounced;
    const event = {
      type: eventType,
      paymentId: writeDaimoPayOrderID(pay.order.id),
      chainId: getOrderDestChainId(pay.order),
      txHash: assertNotNull(
        pay.order.destFastFinishTxHash ?? pay.order.destClaimTxHash,
        `[WORLD PAY BUTTON] dest tx hash null on order ${pay.order.id} when intent status is ${pay.order.intentStatus}`,
      ),
      payment: getDaimoPayOrderView(pay.order),
    };

    if (pay.paymentState === "payment_completed") {
      onPaymentCompleted?.(event as PaymentCompletedEvent);
    } else if (pay.paymentState === "payment_bounced") {
      onPaymentBounced?.(event as PaymentBouncedEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pay.order, pay.paymentState]);

  // Navigate to the confirmation page in the modal to show the spinner
  const showSpinner = useCallback(() => {
    log(`[WORLD] showing spinner ${pay.order?.id}`);
    const modalOptions = {
      closeOnSuccess: props.closeOnSuccess,
      resetOnSuccess: props.resetOnSuccess,
    };
    context.showPayment(modalOptions);
    context.setRoute(ROUTES.CONFIRMATION);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pay.order?.id, log, props.closeOnSuccess, props.resetOnSuccess]);

  // Show the Worldcoin payment drawer and pop open the Daimo Pay modal
  const show = useCallback(async () => {
    log(`[WORLD] showing payment ${pay.order?.id}`);
    if (!isMiniKitReady) {
      console.error(
        "[WORLD] MiniKit is not installed. Please install @worldcoin/minikit-js to use this feature.",
      );
      return;
    }
    if (pay.paymentState === "error") {
      log("[WORLD] showing payment error page");
      const modalOptions = {
        closeOnSuccess: props.closeOnSuccess,
        resetOnSuccess: props.resetOnSuccess,
      };
      context.showPayment(modalOptions);
      return;
    }

    if (
      ["payment_started", "payment_completed", "payment_bounced"].includes(
        pay.paymentState,
      )
    ) {
      showSpinner();
      return;
    }

    log(`[WORLD] hydrating order ${pay.order?.id}`);
    const { order } = await pay.hydrateOrder();
    log(
      `[WORLD] hydrated order ${pay.order?.id}. Prompting payment with MiniKit`,
    );
    const payRes = await promptWorldcoinPayment(order, context.trpc);
    if (payRes == null || payRes.finalPayload.status == "error") {
      log("[WORLD] Failed to prompt Worldcoin payment: ", payRes);
      return;
    }

    log(`[WORLD] triggering payment search on ${pay.order?.id}`);
    pay.paySource();

    // Optimistically assume the source payment is correct and show the
    // confirmation spinner
    showSpinner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pay,
    showSpinner,
    context.trpc,
    isMiniKitReady,
    log,
    props.closeOnSuccess,
    props.resetOnSuccess,
  ]);

  return props.children({ show, isMiniKitReady });
}

WorldPayButtonCustom.displayName = "WorldPayButton.Custom";

WorldPayButton.Custom = WorldPayButtonCustom;
