// hooks/useDaimoPay.ts
import { DaimoPayOrderID, SolanaPublicKey } from "@daimo/pay-common";
import { useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { Address, Hex } from "viem";
import { PaymentEvent, PaymentState, PayParams } from "../payment/paymentFsm";
import { waitForPaymentState } from "../payment/paymentStore";
import { PaymentContext } from "../provider/PaymentProvider";

type DaimoPayFunctions = {
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

  /** Trigger search for payment on the current order. */
  paySource: () => void;

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
  }) => Promise<
    Extract<
      PaymentState,
      { type: "payment_started" | "payment_completed" | "payment_bounced" }
    >
  >;

  /**
   * Register a Solana payment source for the current order.
   * Call this after the user has submitted a Solana payment transaction.
   *
   * @param args - Details about the Solana payment transaction.
   */
  paySolanaSource: (args: {
    paymentTxHash: string;
    sourceToken: SolanaPublicKey;
  }) => Promise<
    Extract<
      PaymentState,
      { type: "payment_started" | "payment_completed" | "payment_bounced" }
    >
  >;

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
  /** Set a non-fatal warning state with a message. */
  setWarning: (message: string) => void;
  /** Dismiss a warning and return to previous state. */
  dismissWarning: () => void;
};

// Enforce that order is typed correctly based on paymentState.
// E.g. if paymentState is "payment_completed", then order must be hydrated.
type DaimoPayState = {
  [S in PaymentState as S["type"]]: {
    paymentState: S["type"];
    order: S extends { order: infer O } ? O : null;
    paymentErrorMessage: S extends { message: infer M } ? M : null;
  };
}[PaymentState["type"]];

export type UseDaimoPay = DaimoPayFunctions &
  DaimoPayState & { paymentWarningMessage: string | null };

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
  const paymentErrorMessage =
    paymentFsmState.type === "error" ? paymentFsmState.message : null;
  const paymentWarningMessage =
    paymentFsmState.type === "warning" ? paymentFsmState.message : null;

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
      const previewOrderState = await waitForPaymentState(store, "preview");

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
        "unhydrated",
        "payment_unpaid",
        "payment_started",
        "payment_completed",
        "payment_bounced",
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
        "payment_unpaid",
      );

      return hydratedOrderState;
    },
    [dispatch, store],
  );

  const paySource = useCallback(
    () => dispatch({ type: "pay_source" }),
    [dispatch],
  );

  const payEthSource = useCallback(
    async (args: {
      paymentTxHash: Hex;
      sourceChainId: number;
      payerAddress: Address;
      sourceToken: Address;
      sourceAmount: bigint;
    }) => {
      dispatch({ type: "pay_ethereum_source", ...args });

      // Will throw if the payment is not verified by the server.
      const paidState = await waitForPaymentState(
        store,
        "payment_started",
        "payment_completed",
        "payment_bounced",
      );

      return paidState;
    },
    [dispatch, store],
  );

  const paySolanaSource = useCallback(
    async (args: { paymentTxHash: string; sourceToken: SolanaPublicKey }) => {
      dispatch({ type: "pay_solana_source", ...args });

      // Will throw if the payment is not verified by the server.
      const paidState = await waitForPaymentState(
        store,
        "payment_started",
        "payment_completed",
        "payment_bounced",
      );

      return paidState;
    },
    [dispatch, store],
  );

  const reset = useCallback(() => dispatch({ type: "reset" }), [dispatch]);

  const setChosenUsd = useCallback(
    (usd: number) => dispatch({ type: "set_chosen_usd", usd }),
    [dispatch],
  );

  const setWarning = useCallback(
    (message: string) =>
      dispatch({ type: "warning", order: order ?? undefined, message }),
    [dispatch, order],
  );

  const dismissWarning = useCallback(() => {
    // Narrow to a prior state that definitely includes an order with org
    let priorOrder:
      | Extract<
          PaymentState,
          {
            type:
              | "preview"
              | "unhydrated"
              | "payment_unpaid"
              | "payment_started"
              | "payment_completed"
              | "payment_bounced";
          }
        >["order"]
      | undefined;
    switch (paymentFsmState.type) {
      case "preview":
      case "unhydrated":
      case "payment_unpaid":
      case "payment_started":
      case "payment_completed":
      case "payment_bounced":
        priorOrder = paymentFsmState.order;
        break;
      default:
        priorOrder = undefined;
    }
    dispatch({ type: "dismiss_warning", order: priorOrder });
  }, [dispatch, paymentFsmState]);

  return {
    order,
    paymentState,
    paymentErrorMessage,
    paymentWarningMessage,
    createPreviewOrder,
    hydrateOrder,
    setPayId,
    paySource,
    payEthSource,
    paySolanaSource,
    reset,
    setChosenUsd,
    setWarning,
    dismissWarning,
  } as UseDaimoPay;
}
