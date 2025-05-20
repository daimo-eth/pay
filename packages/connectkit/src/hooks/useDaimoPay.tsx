// hooks/useDaimoPay.ts
import {
  DaimoPayOrder,
  DaimoPayOrderID,
  SolanaPublicKey,
} from "@daimo/pay-common";
import { useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { Address, Hex } from "viem";
import {
  PaymentEvent,
  PaymentState,
  PaymentStateType,
  PayParams,
} from "../payment/paymentFsm";
import { waitForPaymentState } from "../payment/paymentStore";
import { PaymentContext } from "../provider/PaymentProvider";

export interface UseDaimoPay {
  /** The current Daimo Pay order, or null if no order is active. */
  order: DaimoPayOrder | null;
  /** The current state of the payment flow. */
  paymentState: PaymentStateType;

  /**
   * Create a new Daimo Pay order preview with the given parameters.
   * Call this to start a new payment flow.
   *
   * @param params - Parameters describing the payment to be created.
   */
  createPreviewOrder: (
    params: PayParams,
  ) => Promise<Extract<PaymentState, { type: "preview" }>>;

  /**
   * Set the order ID to fetch and manage an existing Daimo Pay order.
   * Useful for resuming or referencing a previously created order.
   *
   * @param id - The Daimo Pay order ID to set.
   */
  setPayId: (id: DaimoPayOrderID) => Promise<
    Extract<
      PaymentState,
      {
        type:
          | "unhydrated"
          | "payment_unpaid"
          | "payment_started"
          | "payment_completed"
          | "payment_bounced";
      }
    >
  >;

  /**
   * Hydrate the current order, locking in the payment intent details and
   * token swap prices.
   */
  hydrateOrder: (
    refundAddress?: Address,
  ) => Promise<Extract<PaymentState, { type: "payment_unpaid" }>>;

  /**
   * Register an Ethereum payment source for the current order.
   * Call this after the user has submitted an Ethereum payment transaction.
   *
   * @param args - Details about the Ethereum payment transaction.
   */
  payEthSource: (args: {
    paymentTxHash: Hex;
    sourceChainId: number;
    payerAddress: Address;
    sourceToken: Address;
    sourceAmount: bigint;
  }) => void;

  /**
   * Register a Solana payment source for the current order.
   * Call this after the user has submitted a Solana payment transaction.
   *
   * @param args - Details about the Solana payment transaction.
   */
  paySolanaSource: (args: {
    paymentTxHash: string;
    sourceToken: SolanaPublicKey;
  }) => void;

  /**
   * Reset the current payment state and clear the active order.
   * Call this to start a new payment flow.
   */
  reset: () => void;

  /**
   * Update the user's chosen amount in USD. Applies only to deposit flow.
   *
   * @deprecated
   */
  setChosenUsd: (usd: number) => void;
}

/**
 * React hook for interacting with Daimo Pay orders and payments. Use this hook
 * to manage the lifecycle of a Daimo Pay payment in your application.
 *
 * This hook provides a simple interface to create, hydrate, pay, and reset
 * Daimo Pay orders.
 *
 * @returns {UseDaimoPay} An object with current payment state and methods to
 * manage Daimo Pay orders and payments.
 */
export function useDaimoPay(): UseDaimoPay {
  const store = useContext(PaymentContext);
  if (!store) {
    throw new Error("useDaimoPay must be used within <PaymentProvider>");
  }

  /* --------------------------------------------------
     Order state
  ---------------------------------------------------*/

  // Subscribe to the store and keep an up-to-date copy of the payment.
  const paymentFsmState = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );

  // Wrap `order` in `useMemo` for reference stability. This allows downstream
  // components to use `order` as a dependency to avoid unnecessary re-renders.
  const order = useMemo(() => {
    if (paymentFsmState.type === "idle") return null;
    return paymentFsmState.order ?? null;
  }, [paymentFsmState]);

  const paymentState = paymentFsmState.type;

  /* --------------------------------------------------
     Order event dispatch helpers
  ---------------------------------------------------*/

  // Internal helper to dispatch events to the store.
  const dispatch = useCallback((e: PaymentEvent) => store.dispatch(e), [store]);

  const createPreviewOrder = useCallback(
    async (payParams: PayParams) => {
      dispatch({ type: "set_pay_params", payParams });

      // Wait for the order to enter the "preview" state, which means it
      // has been successfully created.
      const previewOrderState = await waitForPaymentState(
        store,
        (s): s is Extract<PaymentState, { type: "preview" }> =>
          s.type === "preview",
      );

      return previewOrderState;
    },
    [dispatch, store],
  );

  const setPayId = useCallback(
    async (payId: DaimoPayOrderID) => {
      dispatch({ type: "set_pay_id", payId });

      // Wait for the order to be queried from the API. Using payId could
      // result in the order being in any state.
      const previewOrderState = await waitForPaymentState(
        store,
        (
          s,
        ): s is Extract<
          PaymentState,
          {
            type:
              | "unhydrated"
              | "payment_unpaid"
              | "payment_started"
              | "payment_completed"
              | "payment_bounced";
          }
        > =>
          s.type === "unhydrated" ||
          s.type === "payment_unpaid" ||
          s.type === "payment_started" ||
          s.type === "payment_completed" ||
          s.type === "payment_bounced",
      );

      return previewOrderState;
    },
    [dispatch, store],
  );

  const hydrateOrder = useCallback(
    async (refundAddress?: Address) => {
      dispatch({ type: "hydrate_order", refundAddress });

      // Wait for the order to enter the "payment_unpaid" state, which means it
      // has been successfully hydrated.
      const hydratedOrderState = await waitForPaymentState(
        store,
        (s): s is Extract<PaymentState, { type: "payment_unpaid" }> =>
          s.type === "payment_unpaid",
      );

      return hydratedOrderState;
    },
    [dispatch, store],
  );

  const payEthSource = useCallback(
    (args: {
      paymentTxHash: Hex;
      sourceChainId: number;
      payerAddress: Address;
      sourceToken: Address;
      sourceAmount: bigint;
    }) => dispatch({ type: "pay_ethereum_source", ...args }),
    [dispatch],
  );

  const paySolanaSource = useCallback(
    (args: { paymentTxHash: string; sourceToken: SolanaPublicKey }) =>
      dispatch({ type: "pay_solana_source", ...args }),
    [dispatch],
  );

  const reset = useCallback(() => dispatch({ type: "reset" }), [dispatch]);

  const setChosenUsd = useCallback(
    (usd: number) => dispatch({ type: "set_chosen_usd", usd }),
    [dispatch],
  );

  return {
    order,
    paymentState,
    createPreviewOrder,
    hydrateOrder,
    setPayId,
    payEthSource,
    paySolanaSource,
    reset,
    setChosenUsd,
  };
}
