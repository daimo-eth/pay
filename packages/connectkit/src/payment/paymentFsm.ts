import {
  assert,
  ExternalPaymentOptionsString,
  isHydrated,
  RozoPayHydratedOrderWithOrg,
  RozoPayIntentStatus,
  RozoPayOrder,
  RozoPayOrderID,
  RozoPayOrderMode,
  RozoPayOrderWithOrg,
  RozoPayUserMetadata,
  SolanaPublicKey,
  StellarPublicKey,
  WalletPaymentOption,
} from "@rozoai/intent-common";
import { Address, Hex, parseUnits } from "viem";

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
  /** The final stellar address to transfer to. */
  toStellarAddress?: string;
  /** The final solana address to transfer to. */
  toSolanaAddress?: string;
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
  metadata?: RozoPayUserMetadata;
  /** The address to refund to if the payment bounces or a refund is requested. */
  refundAddress?: Address;
}

export type PaymentState =
  // payParams and payId are set
  | { type: "idle" }
  // payParams are set, payId is not set. A preview order has been created
  // but not saved to the db
  | {
      type: "preview";
      order: RozoPayOrderWithOrg;
      payParamsData: PayParamsData;
    }
  // payId is set, payParams are not set. An unhydrated order has been created
  // and saved to the db
  | { type: "unhydrated"; order: RozoPayOrderWithOrg }
  // Order was hydrated and is waiting to be paid
  | { type: "payment_unpaid"; order: RozoPayHydratedOrderWithOrg }
  // Order was paid, destination was not processed
  | { type: "payment_started"; order: RozoPayHydratedOrderWithOrg }
  // Order was paid and processed successfully
  | { type: "payment_completed"; order: RozoPayHydratedOrderWithOrg }
  // Order was paid but the destination failed to process
  | { type: "payment_bounced"; order: RozoPayHydratedOrderWithOrg }
  // An error occurred
  | { type: "error"; order: RozoPayOrder | undefined; message: string };

export type PaymentStateType = PaymentState["type"];

export const initialPaymentState: PaymentState = { type: "idle" };

export type PaymentEvent =
  /* command events (kick off an effect) */
  | { type: "set_pay_params"; payParams: PayParams }
  | { type: "set_pay_id"; payId: RozoPayOrderID }
  // HACK: edit the order in-memory to change the amount in deposit flow
  | { type: "set_chosen_usd"; usd: number }
  | {
      type: "hydrate_order";
      refundAddress?: Address;
      walletPaymentOption?: WalletPaymentOption;
    }
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
  | {
      type: "pay_stellar_source";
      paymentTxHash: string;
      sourceToken: StellarPublicKey;
    }
  /* result events (effect finished) */
  | {
      type: "preview_generated";
      order: RozoPayOrderWithOrg;
      payParamsData: PayParamsData;
    }
  | { type: "order_loaded"; order: RozoPayOrderWithOrg }
  | { type: "order_hydrated"; order: RozoPayHydratedOrderWithOrg }
  | {
      type: "payment_verified";
      order: RozoPayHydratedOrderWithOrg;
    }
  | {
      type: "order_refreshed";
      order: RozoPayOrderWithOrg | RozoPayHydratedOrderWithOrg;
    }
  | { type: "dest_processed"; order: RozoPayHydratedOrderWithOrg }
  /* failure / util */
  | {
      type: "error";
      order: RozoPayOrder | undefined;
      message: string;
    }
  | { type: "reset" };

type PayParamsData = {
  appId: string;
  toStellarAddress?: string;
  toSolanaAddress?: string;
  toAddress?: string;
  rozoAppId?: string;
};

/**
 * Master payment reducer.
 */
export function paymentReducer(
  state: PaymentState,
  event: PaymentEvent
): PaymentState {
  console.log(state);
  console.log(event);
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
  event: PaymentEvent
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
    case "reset":
      return initialPaymentState;
    default:
      return state;
  }
}

function reducePreview(
  state: Extract<PaymentState, { type: "preview" }>,
  event: PaymentEvent
): PaymentState {
  assert(
    state.order.mode !== RozoPayOrderMode.HYDRATED,
    "reducePreview called on hydrated order"
  );

  switch (event.type) {
    case "order_hydrated":
      return { type: "payment_unpaid", order: event.order };
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
    case "reset":
      return initialPaymentState;
    default:
      return state;
  }
}

function reduceUnhydrated(
  state: Extract<PaymentState, { type: "unhydrated" }>,
  event: PaymentEvent
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
    case "reset":
      return initialPaymentState;
    default:
      return state;
  }
}

function reducePaymentUnpaid(
  state: Extract<PaymentState, { type: "payment_unpaid" }>,
  event: PaymentEvent
): PaymentState {
  switch (event.type) {
    case "payment_verified": {
      if (event.order.intentStatus === RozoPayIntentStatus.UNPAID) {
        // The payment was not detected on chain, or some other error occurred.
        return {
          type: "error",
          order: event.order,
          message: "Payment failed",
        };
      }
      return getStateFromHydratedOrder(state, event.order);
    }
    case "order_refreshed":
      return getStateFromHydratedOrder(state, event.order);
    case "error":
      return {
        type: "error",
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
  event: PaymentEvent
): PaymentState {
  switch (event.type) {
    case "order_refreshed":
      return getStateFromHydratedOrder(state, event.order);
    case "error":
      return {
        type: "error",
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
function getStateFromOrder(order: RozoPayOrderWithOrg): PaymentState {
  if (order.intentStatus === RozoPayIntentStatus.COMPLETED) {
    assert(
      order.mode === RozoPayOrderMode.HYDRATED,
      `[PAYMENT_REDUCER] order ${order.id} is ${order.intentStatus} but not hydrated`
    );
    return { type: "payment_completed", order };
  } else if (order.intentStatus === RozoPayIntentStatus.BOUNCED) {
    assert(
      order.mode === RozoPayOrderMode.HYDRATED,
      `[PAYMENT_REDUCER] order ${order.id} is ${order.intentStatus} but not hydrated`
    );
    return { type: "payment_bounced", order };
  } else if (order.intentStatus === RozoPayIntentStatus.STARTED) {
    assert(
      order.mode === RozoPayOrderMode.HYDRATED,
      `[PAYMENT_REDUCER] order ${order.id} is ${order.intentStatus} but not hydrated`
    );
    return { type: "payment_started", order };
  } else if (order.mode === RozoPayOrderMode.HYDRATED) {
    return { type: "payment_unpaid", order };
  } else {
    // Order is not hydrated (SALE or CHOOSE_AMOUNT mode)
    return { type: "unhydrated", order };
  }
}

/**
 * Determines the appropriate payment state for a hydrated order. Progresses
 * the payment through different processing states.
 */
function getStateFromHydratedOrder(
  state: Extract<PaymentState, { type: "payment_started" | "payment_unpaid" }>,
  order: RozoPayOrderWithOrg
): PaymentState {
  assert(isHydrated(order), `[PAYMENT_REDUCER] unhydrated`);
  switch (order.intentStatus) {
    case RozoPayIntentStatus.UNPAID:
      return { type: "payment_unpaid", order };
    case RozoPayIntentStatus.STARTED:
      return { type: "payment_started", order };
    case RozoPayIntentStatus.COMPLETED:
      return { type: "payment_completed", order };
    case RozoPayIntentStatus.BOUNCED:
      return { type: "payment_bounced", order };
    default:
      return state;
  }
}

function reduceTerminal(
  state: Extract<
    PaymentState,
    { type: "payment_completed" | "payment_bounced" | "error" }
  >,
  event: PaymentEvent
): PaymentState {
  switch (event.type) {
    case "reset":
      return initialPaymentState;
    // In terminal states we ignore everything except reset
    default:
      return state;
  }
}
