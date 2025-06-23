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
} from "@daimo/pay-common";
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
  | { type: "error"; order: DaimoPayOrder | undefined; message: string };

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
    case "preview_generated":
      return {
        type: "preview",
        order: event.order,
        payParamsData: event.payParamsData,
      };
    // Handle cases where the order id is already partially processed
    case "order_loaded": {
      const order = event.order;
      if (order.intentStatus === DaimoPayIntentStatus.COMPLETED) {
        assert(
          order.mode === DaimoPayOrderMode.HYDRATED,
          `[PAYMENT_REDUCER] order ${order.id} is ${order.intentStatus} but not hydrated`,
        );
        return { type: "payment_completed", order };
      } else if (order.intentStatus === DaimoPayIntentStatus.BOUNCED) {
        assert(
          order.mode === DaimoPayOrderMode.HYDRATED,
          `[PAYMENT_REDUCER] order ${order.id} is ${order.intentStatus} but not hydrated`,
        );
        return { type: "payment_bounced", order };
      } else if (order.intentStatus === DaimoPayIntentStatus.STARTED) {
        assert(
          order.mode === DaimoPayOrderMode.HYDRATED,
          `[PAYMENT_REDUCER] order ${order.id} is ${order.intentStatus} but not hydrated`,
        );
        return { type: "payment_started", order };
      } else if (order.mode === DaimoPayOrderMode.HYDRATED) {
        return { type: "payment_unpaid", order };
      } else {
        return { type: "unhydrated", order };
      }
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
  event: PaymentEvent,
): PaymentState {
  assert(
    state.order.mode !== DaimoPayOrderMode.HYDRATED,
    "reducePreview called on hydrated order",
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
          message: "Payment failed"
        }
      }
      return reduceOrderRefreshed(state, event.order);
    }
    case "order_refreshed":
      return reduceOrderRefreshed(state, event.order);
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
  event: PaymentEvent,
): PaymentState {
  switch (event.type) {
    case "order_refreshed":
      return reduceOrderRefreshed(state, event.order);
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

function reduceOrderRefreshed(
  state: Extract<PaymentState, { type: "payment_started" | "payment_unpaid" }>,
  order: DaimoPayOrderWithOrg,
): PaymentState {
  assert(isHydrated(order), `[PAYMENT_REDUCER] unhydrated`);
  switch (order.intentStatus) {
    case DaimoPayIntentStatus.UNPAID:
      return { type: "payment_unpaid", order };
    case DaimoPayIntentStatus.STARTED:
      return { type: "payment_started", order };
    case DaimoPayIntentStatus.COMPLETED:
      return { type: "payment_completed", order };
    case DaimoPayIntentStatus.BOUNCED:
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
  event: PaymentEvent,
): PaymentState {
  switch (event.type) {
    case "reset":
      return initialPaymentState;
    // In terminal states we ignore everything except reset
    default:
      return state;
  }
}
