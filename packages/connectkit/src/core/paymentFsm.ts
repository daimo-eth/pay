import {
  DaimoPayIntentStatus,
  DaimoPayOrder,
  DaimoPayOrderID,
  DaimoPayOrderMode,
  SolanaPublicKey,
} from "@daimo/pay-common";
import { Address, Hex } from "viem";
import { PayParams } from "../hooks/usePaymentState";

export type PaymentState =
  // payParams and payId are set
  | { tag: "idle" }
  // payParams are set, payId is not set. A preview order has been created
  // but not saved to the db
  // TODO: can remove either order or payParamsData from this state. Order
  // previews seem to be an artifact of the old state management system.
  | {
      tag: "preview";
      order: DaimoPayOrder;
      payParamsData: PayParamsData;
    }
  // payId is set, payParams are not set. An unhydrated order has been created
  // and saved to the db
  | { tag: "unhydrated"; order: DaimoPayOrder }
  // Order was hydrated and is waiting to be paid
  | { tag: "payment_unpaid"; order: DaimoPayOrder }
  // Order was paid, destination was not processed
  | { tag: "payment_started"; order: DaimoPayOrder }
  // Order was paid and processed successfully
  | { tag: "payment_completed"; order: DaimoPayOrder }
  // Order was paid but the destination failed to process
  | { tag: "payment_bounced"; order: DaimoPayOrder }
  // An error occurred
  | { tag: "error"; message: string };

export const initialPaymentState: PaymentState = { tag: "idle" };

export type PaymentEvent =
  /* command events (kick off an effect) */
  | { type: "set_pay_params"; payload: PayParams }
  | { type: "set_pay_id"; payload: DaimoPayOrderID }
  | { type: "hydrate_order" }
  | {
      type: "pay_ethereum_source";
      payload: {
        paymentTxHash: Hex;
        sourceChainId: number;
        payerAddress: Address;
        sourceToken: Address;
        sourceAmount: Address;
      };
    }
  | {
      type: "pay_solana_source";
      payload: {
        paymentTxHash: string;
        sourceToken: SolanaPublicKey;
      };
    }
  /* result events (effect finished) */
  | {
      type: "set_pay_params_succeeded";
      payload: {
        order: DaimoPayOrder;
        payParamsData: PayParamsData;
      };
    }
  | { type: "set_pay_id_succeeded"; payload: DaimoPayOrder }
  | { type: "hydrate_order_succeeded"; payload: DaimoPayOrder }
  | { type: "poll_refresh"; payload: DaimoPayOrder }
  | { type: "dest_processed"; payload: DaimoPayOrder }
  /* failure / util */
  | { type: "error"; payload: string }
  | { type: "reset" };

type PayParamsData = {
  appId: string;
  refundAddress: Address | undefined;
};

/**
 * Master payment reducer.
 */
export function paymentReducer(
  state: PaymentState,
  event: PaymentEvent,
): PaymentState {
  switch (state.tag) {
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
      // state tags are handled
      const _exhaustive: never = state;
      return _exhaustive;
  }
}

/* --------------------------------------------------
   reducer helpers – one function per state
---------------------------------------------------*/

function reduceIdle(
  state: Extract<PaymentState, { tag: "idle" }>,
  event: PaymentEvent,
): PaymentState {
  switch (event.type) {
    case "set_pay_params_succeeded":
      return {
        tag: "preview",
        order: event.payload.order,
        payParamsData: event.payload.payParamsData,
      };
    // Handle cases where the order id is already partially processed
    case "set_pay_id_succeeded": {
      const order = event.payload;
      if (order.intentStatus === DaimoPayIntentStatus.COMPLETED) {
        return { tag: "payment_completed", order };
      } else if (order.intentStatus === DaimoPayIntentStatus.BOUNCED) {
        return { tag: "payment_bounced", order };
      } else if (order.intentStatus === DaimoPayIntentStatus.STARTED) {
        return { tag: "payment_started", order };
      } else if (order.mode === DaimoPayOrderMode.HYDRATED) {
        return { tag: "payment_unpaid", order };
      } else {
        return { tag: "unhydrated", order };
      }
    }
    case "error":
      return { tag: "error", message: event.payload };
    case "reset":
      return initialPaymentState;
    default:
      return state;
  }
}

function reducePreview(
  state: Extract<PaymentState, { tag: "preview" }>,
  event: PaymentEvent,
): PaymentState {
  switch (event.type) {
    case "hydrate_order_succeeded":
      return { tag: "payment_unpaid", order: event.payload };
    case "error":
      return { tag: "error", message: event.payload };
    case "reset":
      return initialPaymentState;
    default:
      return state;
  }
}

function reduceUnhydrated(
  state: Extract<PaymentState, { tag: "unhydrated" }>,
  event: PaymentEvent,
): PaymentState {
  switch (event.type) {
    case "hydrate_order_succeeded":
      return { tag: "payment_unpaid", order: event.payload };
    case "error":
      return { tag: "error", message: event.payload };
    case "reset":
      return initialPaymentState;
    default:
      return state;
  }
}

function reducePaymentUnpaid(
  state: Extract<PaymentState, { tag: "payment_unpaid" }>,
  event: PaymentEvent,
): PaymentState {
  switch (event.type) {
    case "pay_ethereum_source":
    case "pay_solana_source":
      // TODO: update order state
      return { tag: "payment_started", order: state.order };
    case "dest_processed":
      // It is possible the order jumps straight to completed (fast-finish)
      return event.payload.intentStatus === DaimoPayIntentStatus.COMPLETED
        ? { tag: "payment_completed", order: event.payload }
        : { tag: "payment_bounced", order: event.payload };
    case "poll_refresh": {
      return { ...state, order: event.payload };
    }
    case "error":
      return { tag: "error", message: event.payload };
    case "reset":
      return initialPaymentState;
    default:
      return state;
  }
}

function reducePaymentStarted(
  state: Extract<PaymentState, { tag: "payment_started" }>,
  event: PaymentEvent,
): PaymentState {
  switch (event.type) {
    case "dest_processed":
      return event.payload.intentStatus === DaimoPayIntentStatus.COMPLETED
        ? { tag: "payment_completed", order: event.payload }
        : { tag: "payment_bounced", order: event.payload };
    case "poll_refresh":
      return { ...state, order: event.payload };
    case "error":
      return { tag: "error", message: event.payload };
    case "reset":
      return initialPaymentState;
    default:
      return state;
  }
}

function reduceTerminal(
  state: Extract<
    PaymentState,
    { tag: "payment_completed" | "payment_bounced" | "error" }
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
