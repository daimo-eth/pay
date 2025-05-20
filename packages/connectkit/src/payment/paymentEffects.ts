import {
  assert,
  DaimoPayOrderMode,
  DaimoPayOrderWithOrg,
  getOrderDestChainId,
} from "@daimo/pay-common";
import { formatUnits, getAddress } from "viem";
import { TrpcClient } from "../utils/trpc";
import { PaymentEvent, PaymentState } from "./paymentFsm";
import { PaymentStore } from "./paymentStore";

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
      case "poll_source_payment": {
        if (prev.type === "payment_unpaid") {
          runPollSourcePaymentEffects(store, trpc, prev, event);
        } else {
          log(
            `[EFFECT] Stopping poll_source_payment. State: ${prev.type}, Event: ${event.type}`,
          );
        }
        break;
      }
      case "poll_refresh_order": {
        if (prev.type === "payment_started") {
          runPollRefreshOrderEffects(store, trpc, prev, event, log);
        } else {
          log(
            `[EFFECT] Stopping poll_refresh_order. State: ${prev.type}, Event: ${event.type}`,
          );
        }
        break;
      }
      default:
        log(
          `[EFFECT] No effects to run for event ${event.type} on state ${prev.type}`,
        );
        break;
    }
  });

  return unsubscribe;
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
      type: "set_pay_params_succeeded",
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
      type: "set_pay_id_succeeded",
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
      type: "hydrate_order_succeeded",
      order: hydratedOrder,
    });
    // Start polling API to watch when the order gets paid
    store.dispatch({
      type: "poll_source_payment",
      pollIntervalMs: 1000,
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
      type: "hydrate_order_succeeded",
      order: hydratedOrder,
    });
    // Start polling API to watch when the order gets paid
    store.dispatch({
      type: "poll_source_payment",
      pollIntervalMs: 1000,
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
    // Start polling API to watch when the order gets processed
    store.dispatch({
      type: "poll_refresh_order",
      pollIntervalMs: 300,
    });
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
    // Start polling API to watch when the order gets processed
    store.dispatch({
      type: "poll_refresh_order",
      pollIntervalMs: 300,
    });
  } catch (e: any) {
    store.dispatch({ type: "error", order: prev.order, message: e.message });
  }
}

async function runPollRefreshOrderEffects(
  store: PaymentStore,
  trpc: TrpcClient,
  prev: Extract<PaymentState, { type: "payment_started" }>,
  event: Extract<PaymentEvent, { type: "poll_refresh_order" }>,
  log: (msg: string) => void,
) {
  const orderId = prev.order.id;

  // Sleep for the specified interval before polling
  await new Promise((resolve) => setTimeout(resolve, event.pollIntervalMs));

  try {
    const { order } = await trpc.getOrder.query({ id: orderId.toString() });

    log(
      `[EFFECT] polled refresh order: ${prev.order.intentStatus} -> ${order.intentStatus}`,
    );
    store.dispatch({ type: "refresh_order_succeeded", order });

    if (
      order.intentStatus === "payment_completed" ||
      order.intentStatus === "payment_bounced"
    ) {
      assert(
        order.mode === DaimoPayOrderMode.HYDRATED,
        `[PAYMENT_EFFECTS] order ${order.id} is ${order.intentStatus} but not hydrated`,
      );
      store.dispatch({ type: "dest_processed", order });
    } else {
      // Keep polling until the order destination is processed
      store.dispatch({
        type: "poll_refresh_order",
        pollIntervalMs: event.pollIntervalMs,
      });
    }
  } catch (e: any) {
    store.dispatch({ type: "error", order: prev.order, message: e.message });
  }
}

async function runPollSourcePaymentEffects(
  store: PaymentStore,
  trpc: TrpcClient,
  prev: Extract<PaymentState, { type: "payment_unpaid" }>,
  event: Extract<PaymentEvent, { type: "poll_source_payment" }>,
) {
  const orderId = prev.order.id;

  // Sleep for the specified interval before polling
  await new Promise((resolve) => setTimeout(resolve, event.pollIntervalMs));

  try {
    const found = await trpc.findSourcePayment.query({
      orderId: orderId.toString(),
    });

    if (found) {
      // TODO: update order state with updated txHash
      store.dispatch({ type: "payment_started", order: prev.order });
      // Start polling to watch when the order gets processed
      store.dispatch({
        type: "poll_refresh_order",
        pollIntervalMs: 300,
      });
    } else {
      // Keep polling to check if the source payment has been made
      store.dispatch({
        type: "poll_source_payment",
        pollIntervalMs: event.pollIntervalMs,
      });
    }
  } catch (e: any) {
    store.dispatch({ type: "error", order: prev.order, message: e.message });
  }
}
