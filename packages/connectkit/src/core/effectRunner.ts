import {
  DaimoPayOrderMode,
  DaimoPayOrderWithOrg,
  debugJson,
  getOrderDestChainId,
} from "@daimo/pay-common";
import { formatUnits, getAddress } from "viem";
import { PaymentStore } from ".";
import { TrpcClient } from "../utils/trpc";
import { PaymentEvent, PaymentState } from "./paymentFsm";

export function runEffects(
  store: PaymentStore,
  trpc: TrpcClient,
  log: (msg: string) => void,
) {
  store.subscribe(({ prev, next, event }) => {
    if (event.type === "set_pay_params") {
      runSetPayParamsEffects(store, trpc, event, log);
    } else if (event.type === "set_pay_id") {
      runSetPayIdEffects(store, trpc, event, log);
    } else if (event.type === "hydrate_order") {
      if (prev.tag === "preview") {
        runHydratePayParamsEffects(store, trpc, prev, log);
      } else if (prev.tag === "unhydrated") {
        runHydratePayIdEffects(store, trpc, prev, log);
      } else {
        store.dispatch({
          type: "error",
          payload: `Invalid state transition. State: ${prev.tag}, Event: ${event.type}`,
        });
      }
    } else if (event.type === "pay_ethereum_source") {
    } else if (event.type === "pay_solana_source") {
    } else if (event.type === "set_pay_params_succeeded") {
      log(`[EFFECT] preview succeeded: ${debugJson(event.payload.order)}`);
      // Order state update happens in reducer
    } else if (event.type === "set_pay_id_succeeded") {
      log(`[EFFECT] set payId succeeded: ${debugJson(event.payload)}`);
      // Order state update happens in reducer
    } else if (event.type === "hydrate_order_succeeded") {
    } else if (event.type === "poll_refresh") {
    } else if (event.type === "dest_processed") {
    } else if (event.type === "error") {
    } else if (event.type === "reset") {
    }
  });
}

async function runSetPayParamsEffects(
  store: PaymentStore,
  trpc: TrpcClient,
  event: Extract<PaymentEvent, { type: "set_pay_params" }>,
  log: (msg: string) => void,
) {
  log("[EFFECT] setting payParams");
  const payParams = event.payload;
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
      payload: {
        // TODO: Properly type this and fix hacky type casting
        order: orderPreview as unknown as DaimoPayOrderWithOrg,
        payParamsData: {
          appId: payParams.appId,
          refundAddress: payParams.refundAddress,
        },
      },
    });
  } catch (e: any) {
    store.dispatch({ type: "error", payload: e.message });
  }
}

async function runSetPayIdEffects(
  store: PaymentStore,
  trpc: TrpcClient,
  event: Extract<PaymentEvent, { type: "set_pay_id" }>,
  log: (msg: string) => void,
) {
  const payId = event.payload;
  log(`[EFFECT] setting payId: ${payId}`);

  try {
    const { order } = await trpc.getOrder.query({ id: payId });

    store.dispatch({
      type: "set_pay_id_succeeded",
      payload: order,
    });
  } catch (e: any) {
    store.dispatch({ type: "error", payload: e.message });
  }
}

async function runHydratePayParamsEffects(
  store: PaymentStore,
  trpc: TrpcClient,
  prev: Extract<PaymentState, { tag: "preview" }>,
  log: (msg: string) => void,
) {
  const order = prev.order;
  log(`[EFFECT] creating + hydrating payParams order ${order.id}`);

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
      refundAddress: prev.payParamsData.refundAddress,
    });

    store.dispatch({
      type: "hydrate_order_succeeded",
      payload: hydratedOrder,
    });
  } catch (e: any) {
    store.dispatch({ type: "error", payload: e.message });
  }
}

async function runHydratePayIdEffects(
  store: PaymentStore,
  trpc: TrpcClient,
  prev: Extract<PaymentState, { tag: "unhydrated" }>,
  log: (msg: string) => void,
) {
  const order = prev.order;
  log(`[EFFECT] hydrating payId order ${order.id}`);

  try {
    const { hydratedOrder } = await trpc.hydrateOrder.query({
      id: order.id.toString(),
    });

    store.dispatch({
      type: "hydrate_order_succeeded",
      payload: hydratedOrder,
    });
  } catch (e: any) {
    store.dispatch({ type: "error", payload: e.message });
  }
}
