import {
  assert,
  DaimoPayOrderMode,
  DaimoPayOrderWithOrg,
  getOrderDestChainId,
} from "@daimo/pay-common";
import { formatUnits, getAddress } from "viem";
import { PollHandle, startPolling } from "../utils/polling";
import { TrpcClient } from "../utils/trpc";
import { PaymentEvent, PaymentState } from "./paymentFsm";
import { PaymentStore } from "./paymentStore";

// Maps poller identifier to poll handle which terminates the poller
// key = `${type}:${orderId}`
const pollers = new Map<string, PollHandle>();

enum PollerType {
  FIND_SOURCE_PAYMENT = "find_source_payment",
  REFRESH_ORDER = "refresh_order",
}

function stopPoller(key: string) {
  pollers.get(key)?.();
  pollers.delete(key);
}

/**
 * Add a subscriber to the payment store that runs side effects in response to
 * events.
 *
 * @param store The payment store to subscribe to.
 * @param trpc TRPC client pointing to the Daimo Pay API.
 * @param log The logger to use for logging.
 * @returns A function that can be used to unsubscribe from the store.
 */
export function attachPaymentEffectHandlers(
  store: PaymentStore,
  trpc: TrpcClient,
  log: (msg: string) => void,
): () => void {
  const unsubscribe = store.subscribe(({ prev, next, event }) => {
    log(
      `[EFFECT] processing effects for event ${event.type} on state transition ${prev.type} -> ${next.type}`,
    );
    /* --------------------------------------------------
     * State-driven effects
     * -------------------------------------------------- */
    if (prev.type !== next.type) {
      // Start watching for source payment
      if (next.type === "payment_unpaid") {
        pollFindSourcePayment(store, trpc, next.order.id);
      }

      // Refresh the order to watch for destination processing
      if (next.type === "payment_started") {
        pollRefreshOrder(store, trpc, next.order.id);
      }

      // Stop all pollers when the payment flow is completed or reset
      if (
        ["payment_completed", "payment_bounced", "error", "idle"].includes(
          next.type,
        )
      ) {
        if ("order" in prev && prev.order) {
          stopPoller(`${PollerType.FIND_SOURCE_PAYMENT}:${prev.order.id}`);
          stopPoller(`${PollerType.REFRESH_ORDER}:${prev.order.id}`);
        }
      }
    }

    /* --------------------------------------------------
     * Event-driven effects
     * -------------------------------------------------- */
    switch (event.type) {
      case "set_pay_params":
        runSetPayParamsEffects(store, trpc, event);
        break;
      case "set_pay_id":
        runSetPayIdEffects(store, trpc, event);
        break;
      case "hydrate_order": {
        if (prev.type === "preview") {
          runHydratePayParamsEffects(store, trpc, prev, event);
        } else if (prev.type === "unhydrated") {
          runHydratePayIdEffects(store, trpc, prev, event);
        } else {
          log(`[EFFECT] Invalid event ${event.type} on state ${prev.type}`);
        }
        break;
      }
      case "pay_ethereum_source": {
        if (prev.type === "payment_unpaid") {
          runPayEthereumSourceEffects(store, trpc, prev, event);
        } else {
          log(`[EFFECT] Invalid event ${event.type} on state ${prev.type}`);
        }
        break;
      }
      case "pay_solana_source": {
        if (prev.type === "payment_unpaid") {
          runPaySolanaSourceEffects(store, trpc, prev, event);
        }
        log(`[EFFECT] Invalid event ${event.type} on state ${prev.type}`);
        break;
      }
      default:
        log(
          `[EFFECT] No effects to run for event ${event.type} on state ${prev.type}`,
        );
        break;
    }
  });

  const cleanup = () => {
    unsubscribe();
    pollers.forEach((_, key) => stopPoller(key));
    log("[EFFECT] unsubscribed from payment store and stopped all pollers");
  };

  return cleanup;
}

async function pollFindSourcePayment(
  store: PaymentStore,
  trpc: TrpcClient,
  orderId: bigint,
) {
  const key = `${PollerType.FIND_SOURCE_PAYMENT}:${orderId}`;

  const stopPolling = startPolling({
    key,
    intervalMs: 1_000,
    pollFn: () => trpc.findSourcePayment.query({ orderId: orderId.toString() }),
    onResult: (found) => {
      const state = store.getState();
      // Check that we're still in the payment_unpaid state
      if (state.type !== "payment_unpaid") return;
      if (found) {
        store.dispatch({ type: "payment_started", order: state.order });
        stopPolling();
      }
    },
    onError: () => {},
  });

  pollers.set(key, stopPolling);
}

async function pollRefreshOrder(
  store: PaymentStore,
  trpc: TrpcClient,
  orderId: bigint,
) {
  const key = `${PollerType.REFRESH_ORDER}:${orderId}`;

  const stopPolling = startPolling({
    key,
    intervalMs: 300,
    pollFn: () => trpc.getOrder.query({ id: orderId.toString() }),
    onResult: (res) => {
      const state = store.getState();
      // Check that we're still in the payment_started state
      if (state.type !== "payment_started") return;

      const order = res.order;
      store.dispatch({ type: "order_refreshed", order });

      if (
        order.intentStatus === "payment_completed" ||
        order.intentStatus === "payment_bounced"
      ) {
        assert(
          order.mode === DaimoPayOrderMode.HYDRATED,
          `[PAYMENT_EFFECTS] order ${order.id} is ${order.intentStatus} but not hydrated`,
        );
        store.dispatch({ type: "dest_processed", order });
        stopPolling();
      }
    },
    onError: () => {},
  });

  pollers.set(key, stopPolling);
}

async function runSetPayParamsEffects(
  store: PaymentStore,
  trpc: TrpcClient,
  event: Extract<PaymentEvent, { type: "set_pay_params" }>,
) {
  const payParams = event.payParams;
  // toUnits is undefined if and only if we're in deposit flow.
  // Set dummy value for deposit flow, since user can edit the amount.
  const toUnits = payParams.toUnits == null ? "0" : payParams.toUnits;

  try {
    const orderPreview = await trpc.previewOrder.query({
      appId: payParams.appId,
      toChain: payParams.toChain,
      toToken: payParams.toToken,
      toUnits,
      toAddress: payParams.toAddress,
      toCallData: payParams.toCallData,
      isAmountEditable: payParams.toUnits == null,
      metadata: {
        intent: payParams.intent ?? "Pay",
        items: [],
        payer: {
          paymentOptions: payParams.paymentOptions,
          preferredChains: payParams.preferredChains,
          preferredTokens: payParams.preferredTokens,
          evmChains: payParams.evmChains,
        },
      },
      externalId: payParams.externalId,
      userMetadata: payParams.metadata,
      refundAddress: payParams.refundAddress,
    });

    store.dispatch({
      type: "preview_generated",
      // TODO: Properly type this and fix hacky type casting
      order: orderPreview as unknown as DaimoPayOrderWithOrg,
      payParamsData: {
        appId: payParams.appId,
      },
    });
  } catch (e: any) {
    store.dispatch({ type: "error", order: undefined, message: e.message });
  }
}

async function runSetPayIdEffects(
  store: PaymentStore,
  trpc: TrpcClient,
  event: Extract<PaymentEvent, { type: "set_pay_id" }>,
) {
  try {
    const { order } = await trpc.getOrder.query({ id: event.payId });

    store.dispatch({
      type: "order_loaded",
      order,
    });
  } catch (e: any) {
    store.dispatch({ type: "error", order: undefined, message: e.message });
  }
}

async function runHydratePayParamsEffects(
  store: PaymentStore,
  trpc: TrpcClient,
  prev: Extract<PaymentState, { type: "preview" }>,
  event: Extract<PaymentEvent, { type: "hydrate_order" }>,
) {
  const order = prev.order;

  const toUnits = formatUnits(
    BigInt(order.destFinalCallTokenAmount.amount),
    order.destFinalCallTokenAmount.token.decimals,
  );
  try {
    const { hydratedOrder } = await trpc.createOrder.mutate({
      appId: prev.payParamsData.appId,
      paymentInput: {
        id: order.id.toString(),
        toChain: getOrderDestChainId(order),
        toToken: getAddress(order.destFinalCallTokenAmount.token.token),
        toUnits,
        toAddress: getAddress(order.destFinalCall.to),
        toCallData: order.destFinalCall.data,
        isAmountEditable: order.mode === DaimoPayOrderMode.CHOOSE_AMOUNT,
        metadata: order.metadata,
        userMetadata: order.userMetadata,
      },
      refundAddress: event.refundAddress,
    });

    store.dispatch({
      type: "order_hydrated",
      order: hydratedOrder,
    });
  } catch (e: any) {
    store.dispatch({ type: "error", order: prev.order, message: e.message });
  }
}

async function runHydratePayIdEffects(
  store: PaymentStore,
  trpc: TrpcClient,
  prev: Extract<PaymentState, { type: "unhydrated" }>,
  event: Extract<PaymentEvent, { type: "hydrate_order" }>,
) {
  const order = prev.order;

  try {
    const { hydratedOrder } = await trpc.hydrateOrder.query({
      id: order.id.toString(),
      refundAddress: event.refundAddress,
    });

    store.dispatch({
      type: "order_hydrated",
      order: hydratedOrder,
    });
  } catch (e: any) {
    store.dispatch({ type: "error", order: prev.order, message: e.message });
  }
}

async function runPayEthereumSourceEffects(
  store: PaymentStore,
  trpc: TrpcClient,
  prev: Extract<PaymentState, { type: "payment_unpaid" }>,
  event: Extract<PaymentEvent, { type: "pay_ethereum_source" }>,
) {
  const orderId = prev.order.id;

  try {
    await trpc.processSourcePayment.mutate({
      orderId: orderId.toString(),
      sourceInitiateTxHash: event.paymentTxHash,
      sourceChainId: event.sourceChainId,
      sourceFulfillerAddr: event.payerAddress,
      sourceToken: event.sourceToken,
      sourceAmount: event.sourceAmount.toString(),
    });

    // TODO: Update order state with updated txHash
    store.dispatch({ type: "payment_started", order: prev.order });
  } catch (e: any) {
    store.dispatch({ type: "error", order: prev.order, message: e.message });
  }
}

async function runPaySolanaSourceEffects(
  store: PaymentStore,
  trpc: TrpcClient,
  prev: Extract<PaymentState, { type: "payment_unpaid" }>,
  event: Extract<PaymentEvent, { type: "pay_solana_source" }>,
) {
  const orderId = prev.order.id;

  try {
    await trpc.processSolanaSourcePayment.mutate({
      orderId: orderId.toString(),
      startIntentTxHash: event.paymentTxHash,
      token: event.sourceToken,
    });

    // TODO: Update order state with updated txHash
    store.dispatch({ type: "payment_started", order: prev.order });
  } catch (e: any) {
    store.dispatch({ type: "error", order: prev.order, message: e.message });
  }
}
