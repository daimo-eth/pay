import {
  assert,
  DaimoPayHydratedOrderWithOrg,
  DaimoPayIntentStatus,
  DaimoPayOrder,
  DaimoPayOrderID,
  DaimoPayOrderMode,
  DaimoPayOrderWithOrg,
  DaimoPayUserMetadata,
  ExternalPaymentOptionsString,
  isHydrated,
  SolanaPublicKey,
  UniquePaymentOptionsString,
} from "@daimo/pay-common";
import { Address, Hex, parseUnits } from "viem";
import { getDisplayExpiresAt } from "./paymentUtils";

/** Payment parameters. The payment is created only after user taps pay. */
export interface PayParams {
  /** App ID, for authentication. */
  appId: string;
  /** Destination chain ID. */
  toChain: number;
  /** The destination token to send. */
  toToken: Address;
  /**
   * The amount of the token to send.
   * If not provided, the user will be prompted to enter an amount.
   */
  toUnits?: string;
  /** The final address to transfer to or contract to call. */
  toAddress: Address;
  /** Calldata for final call, or empty data for transfer. */
  toCallData?: Hex;
  /** The intent verb, such as Pay, Deposit, or Purchase. Default: Pay */
  intent?: string;
  /** Payment options. By default, all are enabled. */
  paymentOptions?: ExternalPaymentOptionsString[];
  /** Preferred chain IDs. */
  preferredChains?: number[];
  /** Preferred tokens. These appear first in the token list. */
  preferredTokens?: { chain: number; address: Address }[];
  /** Only allow payments on these EVM chains. */
  evmChains?: number[];
  /** External ID. E.g. a correlation ID. */
  externalId?: string;
  /** Developer metadata. E.g. correlation ID. */
  metadata?: DaimoPayUserMetadata;
  /** The address to refund to if the payment bounces or a refund is requested. */
  refundAddress?: Address;
  /** Pass-through tokens. If the user pays via these tokens, they're sent directly without swapping. */
  passthroughTokens?: { chain: number; address: Address }[];
  /** Only show one payment option to the user. */
  uniquePaymentOption?: UniquePaymentOptionsString;
}

export type PaymentState =
  // payParams and payId are set
  | { type: "idle" }
  // payParams are set, payId is not set. A preview order has been created
  // but not saved to the db
  | {
      type: "preview";
      order: DaimoPayOrderWithOrg;
      payParamsData: PayParamsData;
    }
  // payId is set, payParams are not set. An unhydrated order has been created
  // and saved to the db
  | { type: "unhydrated"; order: DaimoPayOrderWithOrg }
  // Order was hydrated and is waiting to be paid
  | { type: "payment_unpaid"; order: DaimoPayHydratedOrderWithOrg }
  // Order was paid, destination was not processed
  | { type: "payment_started"; order: DaimoPayHydratedOrderWithOrg }
  // Order was paid and processed successfully
  | { type: "payment_completed"; order: DaimoPayHydratedOrderWithOrg }
  // Order was paid but the destination failed to process
  | { type: "payment_bounced"; order: DaimoPayHydratedOrderWithOrg }
  // An error occurred
  | { type: "error"; order: DaimoPayOrder | undefined; message: string }
  // A non-fatal UI pause to confirm a potentially destructive action
  // why: temporarily blocks navigation to ask user confirmation (e.g. end tron session)
  | { type: "warning"; order: DaimoPayOrder | undefined; message: string };

export type PaymentStateType = PaymentState["type"];

export const initialPaymentState: PaymentState = { type: "idle" };

export type PaymentEvent =
  /* command events (kick off an effect) */
  | { type: "set_pay_params"; payParams: PayParams }
  | { type: "set_pay_id"; payId: DaimoPayOrderID }
  // HACK: edit the order in-memory to change the amount in deposit flow
  | { type: "set_chosen_usd"; usd: number }
  | { type: "hydrate_order"; refundAddress?: Address }
  | {
      type: "pay_source";
    }
  | {
      type: "pay_ethereum_source";
      paymentTxHash: Hex;
      sourceChainId: number;
      payerAddress: Address;
      sourceToken: Address;
      sourceAmount: bigint;
    }
  | {
      type: "pay_solana_source";
      paymentTxHash: string;
      sourceToken: SolanaPublicKey;
    }
  /* result events (effect finished) */
  | {
      type: "preview_generated";
      order: DaimoPayOrderWithOrg;
      payParamsData: PayParamsData;
    }
  | { type: "order_loaded"; order: DaimoPayOrderWithOrg }
  | { type: "order_hydrated"; order: DaimoPayHydratedOrderWithOrg }
  | {
      type: "payment_verified";
      order: DaimoPayHydratedOrderWithOrg;
    }
  | {
      type: "order_refreshed";
      order: DaimoPayOrderWithOrg | DaimoPayHydratedOrderWithOrg;
    }
  | { type: "dest_processed"; order: DaimoPayHydratedOrderWithOrg }
  /* failure / util */
  | {
      type: "error";
      order: DaimoPayOrder | undefined;
      message: string;
    }
  // enter the temporary confirmation screen with a user-facing message
  | {
      type: "warning";
      order: DaimoPayOrder | undefined;
      message: string;
    }
  // exit the warning screen; if an order snapshot is provided, resume its derived state,
  // otherwise fall back to initial state
  | {
      type: "dismiss_warning";
      order: DaimoPayOrderWithOrg | DaimoPayHydratedOrderWithOrg | undefined;
    }
  | { type: "reset" };

type PayParamsData = {
  appId: string;
};

/**
 * Master payment reducer.
 */
export function paymentReducer(
  state: PaymentState,
  event: PaymentEvent,
): PaymentState {
  switch (state.type) {
    case "idle":
      return reduceIdle(state, event);
    case "preview":
      return reducePreview(state, event);
    case "unhydrated":
      return reduceUnhydrated(state, event);
    case "payment_unpaid":
      return reducePaymentUnpaid(state, event);
    case "payment_started":
      return reducePaymentStarted(state, event);
    case "payment_completed":
    case "payment_bounced":
    case "error":
    case "warning":
      return reduceTerminal(state, event);
    /* satisfies exhaustiveness */
    default:
      // Exhaustive check: Using `never` will cause lint failure if not all
      // state types are handled
      const _exhaustive: never = state;
      return _exhaustive;
  }
}

/* --------------------------------------------------
   reducer helpers – one function per state
---------------------------------------------------*/

function reduceIdle(
  state: Extract<PaymentState, { type: "idle" }>,
  event: PaymentEvent,
): PaymentState {
  switch (event.type) {
    case "preview_generated": {
      const stateFromOrder = getStateFromOrder(event.order);

      // If order is already hydrated or in terminal state, use that state
      if (stateFromOrder.type !== "unhydrated") {
        return stateFromOrder;
      }

      // Order is not hydrated/processed, handle as preview
      return {
        type: "preview",
        order: event.order,
        payParamsData: event.payParamsData,
      };
    }
    case "order_loaded": {
      return getStateFromOrder(event.order);
    }
    case "error":
      return {
        type: "error",
        order: event.order,
        message: event.message,
      };
    case "warning":
      return {
        type: "warning",
        order: event.order,
        message: event.message,
      };
    case "reset":
      return initialPaymentState;
    default:
      return state;
  }
}

function reducePreview(
  state: Extract<PaymentState, { type: "preview" }>,
  event: PaymentEvent,
): PaymentState {
  assert(
    state.order.mode !== DaimoPayOrderMode.HYDRATED,
    "reducePreview called on hydrated order",
  );

  switch (event.type) {
    case "order_hydrated":
      return getStateFromHydratedOrder(event.order);
    case "set_chosen_usd": {
      const token = state.order.destFinalCallTokenAmount.token;
      const tokenUnits = (event.usd / token.priceFromUsd).toString();
      const tokenAmount = parseUnits(tokenUnits, token.decimals);

      // Stay in preview state, but update the order's destFinalCallTokenAmount
      return {
        type: "preview",
        order: {
          ...state.order,
          destFinalCallTokenAmount: {
            token,
            amount: tokenAmount.toString() as `${bigint}`,
            usd: event.usd,
          },
        },
        payParamsData: state.payParamsData,
      };
    }
    case "error":
      return {
        type: "error",
        order: event.order,
        message: event.message,
      };
    case "warning":
      return {
        type: "warning",
        order: event.order,
        message: event.message,
      };
    case "reset":
      return initialPaymentState;
    default:
      return state;
  }
}

function reduceUnhydrated(
  state: Extract<PaymentState, { type: "unhydrated" }>,
  event: PaymentEvent,
): PaymentState {
  switch (event.type) {
    case "order_hydrated":
      return { type: "payment_unpaid", order: event.order };
    case "error":
      return {
        type: "error",
        order: event.order,
        message: event.message,
      };
    case "warning":
      return {
        type: "warning",
        order: event.order,
        message: event.message,
      };
    case "reset":
      return initialPaymentState;
    default:
      return state;
  }
}

function reducePaymentUnpaid(
  state: Extract<PaymentState, { type: "payment_unpaid" }>,
  event: PaymentEvent,
): PaymentState {
  switch (event.type) {
    case "payment_verified": {
      if (event.order.intentStatus === DaimoPayIntentStatus.UNPAID) {
        // The payment was not detected on chain, or some other error occurred.
        return {
          type: "error",
          order: event.order,
          message: "Payment failed",
        };
      }
      return getStateFromHydratedOrder(event.order);
    }
    case "order_refreshed":
      return getStateFromHydratedOrder(event.order);
    case "error":
      return {
        type: "error",
        order: event.order,
        message: event.message,
      };
    case "warning":
      return {
        type: "warning",
        order: event.order,
        message: event.message,
      };
    case "reset":
      return initialPaymentState;
    default:
      return state;
  }
}

function reducePaymentStarted(
  state: Extract<PaymentState, { type: "payment_started" }>,
  event: PaymentEvent,
): PaymentState {
  switch (event.type) {
    case "order_refreshed":
      return getStateFromHydratedOrder(event.order);
    case "error":
      return {
        type: "error",
        order: event.order,
        message: event.message,
      };
    case "warning":
      return {
        type: "warning",
        order: event.order,
        message: event.message,
      };
    case "reset":
      return initialPaymentState;
    default:
      return state;
  }
}

/**
 * Determines the appropriate payment state based on an order's status and mode.
 * Returns the appropriate payment state based on the order's mode and intent status.
 */
function getStateFromOrder(order: DaimoPayOrderWithOrg): PaymentState {
  if (order.mode === DaimoPayOrderMode.HYDRATED) {
    return getStateFromHydratedOrder(order);
  } else {
    return { type: "unhydrated", order };
  }
}

/**
 * Determines the appropriate payment state for a hydrated order. Progresses
 * the payment through different processing states.
 */
function getStateFromHydratedOrder(order: DaimoPayOrderWithOrg): PaymentState {
  assert(isHydrated(order), `[PAYMENT_REDUCER] unhydrated`);

  // Handle finished orders first
  switch (order.intentStatus) {
    case DaimoPayIntentStatus.COMPLETED:
      return { type: "payment_completed", order };
    case DaimoPayIntentStatus.BOUNCED:
      return { type: "payment_bounced", order };
  }

  // If unfinished, check if expired
  const displayExpiresAt = getDisplayExpiresAt(order);
  if (Date.now() / 1e3 > displayExpiresAt) {
    return {
      type: "error",
      order,
      message: "Payment expired. Please restart.",
    };
  }

  // Unfinished but not expired
  switch (order.intentStatus) {
    case DaimoPayIntentStatus.UNPAID:
      return { type: "payment_unpaid", order };
    case DaimoPayIntentStatus.STARTED:
      return { type: "payment_started", order };
    default:
      return { type: "error", order, message: `Status: ${order.intentStatus}` };
  }
}

function reduceTerminal(
  state: Extract<
    PaymentState,
    { type: "payment_completed" | "payment_bounced" | "error" | "warning" }
  >,
  event: PaymentEvent,
): PaymentState {
  switch (event.type) {
    case "dismiss_warning": {
      // leave the confirmation screen and restore previous state when possible
      if (state.type === "warning") {
        if (event.order) {
          return getStateFromOrder(event.order);
        }
        return initialPaymentState;
      }
      return state;
    }
    case "reset":
      return initialPaymentState;
    // In terminal states we ignore everything except reset
    default:
      return state;
  }
}
