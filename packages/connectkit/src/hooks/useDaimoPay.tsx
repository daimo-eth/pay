// hooks/useRozoPay.ts
import {
  RozoPayHydratedOrderWithOrg,
  RozoPayIntentStatus,
  RozoPayOrderID,
  RozoPayOrderStatusSource,
  RozoPayOrderWithOrg,
  SolanaPublicKey,
  StellarPublicKey,
  WalletPaymentOption,
} from "@rozoai/intent-common";
import {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Address, Hex } from "viem";
import { PaymentEvent, PaymentState, PayParams } from "../payment/paymentFsm";
import { waitForPaymentState } from "../payment/paymentStore";
import { PaymentContext } from "../provider/PaymentProvider";

type RozoPayFunctions = {
  /**
   * Create a new Rozo Pay order preview with the given parameters.
   * Call this to start a new payment flow.
   *
   * @param params - Parameters describing the payment to be created.
   */
  createPreviewOrder: (
    params: PayParams
  ) => Promise<Extract<PaymentState, { type: "preview" }>>;

  /**
   * Set the order ID to fetch and manage an existing Rozo Pay order.
   * Useful for resuming or referencing a previously created order.
   *
   * @param id - The Rozo Pay order ID to set.
   */
  setPayId: (id: RozoPayOrderID) => Promise<
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
    walletPaymentOption?: WalletPaymentOption
  ) => Promise<Extract<PaymentState, { type: "payment_unpaid" }>>;

  /**
   * Hydrate the current order, bypassing the normal hydration process.
   * This is used for Rozo payments.
   */
  hydrateOrderRozo: (
    refundAddress?: Address,
    walletPaymentOption?: WalletPaymentOption
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
   * Register a Stellar payment source for the current order.
   * Call this after the user has submitted a Stellar payment transaction.
   *
   * @param args - Details about the Stellar payment transaction.
   */
  payStellarSource: (args: {
    paymentTxHash: string;
    sourceToken: StellarPublicKey;
    rozoOrderId: string;
  }) => Promise<Extract<PaymentState, { type: "payment_completed" }>>;

  setPaymentStarted: (
    rozoPaymentId: string,
    order?: RozoPayOrderWithOrg | RozoPayHydratedOrderWithOrg
  ) => Promise<Extract<PaymentState, { type: "payment_started" }>>;

  setPaymentUnpaid: (
    rozoPaymentId: string,
    order?: RozoPayOrderWithOrg | RozoPayHydratedOrderWithOrg
  ) => Promise<Extract<PaymentState, { type: "payment_unpaid" }>>;

  /**
   * Directly set the payment state to completed.
   * Use this to mark a payment as completed without going through the normal flow.
   *
   * @param txHash - The transaction hash to associate with the completed payment.
   */
  setPaymentCompleted: (
    txHash: string,
    rozoPaymentId?: string
  ) => Promise<Extract<PaymentState, { type: "payment_completed" }>>;

  /**
   * Directly set the payment state to payout completed.
   * Use this to mark a payment as payout completed without going through the normal flow.
   *
   * @param paymentTxHash - The transaction hash to associate with the completed payment.
   * @param payoutTxHash - The transaction hash to associate with the payout.
   * @param rozoPaymentId - The Rozo payment ID to associate with the payout.
   */
  setPaymentPayoutCompleted: (
    payoutTxHash: string,
    rozoPaymentId?: string
  ) => Promise<Extract<PaymentState, { type: "payout_completed" }>>;

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

  setPaymentRozoCompleted: (completed: boolean) => void;
  paymentRozoCompleted: boolean;

  setPayoutRozoCompleted: (completed: boolean) => void;
  payoutRozoCompleted: boolean;
};

// Enforce that order is typed correctly based on paymentState.
// E.g. if paymentState is "payment_completed", then order must be hydrated.
type RozoPayState = {
  [S in PaymentState as S["type"]]: {
    paymentState: S["type"];
    order: S extends { order: infer O } ? O : null;
    paymentErrorMessage: S extends { message: infer M } ? M : null;
  };
}[PaymentState["type"]] & {
  rozoPaymentId: string | null;
};

export type UseRozoPay = RozoPayFunctions & RozoPayState;

/**
 * React hook for interacting with Rozo Pay orders and payments. Use this hook
 * to manage the lifecycle of a Rozo Pay payment in your application.
 *
 * This hook provides a simple interface to create, hydrate, pay, and reset
 * Rozo Pay orders.
 *
 * @returns {UseRozoPay} An object with current payment state and methods to
 * manage Rozo Pay orders and payments.
 */
export function useRozoPay(): UseRozoPay {
  const [paymentRozoCompleted, setPaymentRozoCompleted] = useState(false);
  const [payoutRozoCompleted, setPayoutRozoCompleted] = useState(false);
  const lastPayoutTxHash = useRef<string | null>(null);
  const store = useContext(PaymentContext);
  if (!store) {
    throw new Error("useRozoPay must be used within <PaymentProvider>");
  }

  /* --------------------------------------------------
     Order state
  ---------------------------------------------------*/

  // Subscribe to the store and keep an up-to-date copy of the payment.
  const paymentFsmState = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState
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
  const rozoPaymentId = useMemo(() => {
    return order?.externalId ?? null;
  }, [order]);

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
    [dispatch, store]
  );

  const setPayId = useCallback(
    async (payId: RozoPayOrderID) => {
      dispatch({ type: "set_pay_id", payId });

      // Wait for the order to be queried from the API. Using payId could
      // result in the order being in any state.
      const previewOrderState = await waitForPaymentState(
        store,
        "unhydrated",
        "payment_unpaid",
        "payment_started",
        "payment_completed",
        "payment_bounced"
      );

      return previewOrderState;
    },
    [dispatch, store]
  );

  const hydrateOrder = useCallback(
    async (
      refundAddress?: Address,
      walletPaymentOption?: WalletPaymentOption
    ) => {
      dispatch({
        type: "hydrate_order",
        refundAddress,
        walletPaymentOption,
      });

      // Wait for the order to enter the "payment_unpaid" state, which means it
      // has been successfully hydrated.
      const hydratedOrderState = await waitForPaymentState(
        store,
        "payment_unpaid"
      );

      return hydratedOrderState;
    },
    [dispatch, store, paymentFsmState.type, order?.id]
  );

  const hydrateOrderRozo = useCallback(
    async (
      refundAddress?: Address,
      walletPaymentOption?: WalletPaymentOption
    ) => {
      dispatch({
        type: "hydrate_order",
        refundAddress,
        walletPaymentOption,
      });

      const hydratedOrderState = await waitForPaymentState(
        store,
        "payment_unpaid"
      );

      return hydratedOrderState;
    },
    []
  );

  const paySource = useCallback(
    () => dispatch({ type: "pay_source" }),
    [dispatch]
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
        "payment_bounced"
      );

      return paidState;
    },
    [dispatch, store]
  );

  const paySolanaSource = useCallback(
    async (args: { paymentTxHash: string; sourceToken: SolanaPublicKey }) => {
      dispatch({ type: "pay_solana_source", ...args });

      // Will throw if the payment is not verified by the server.
      const paidState = await waitForPaymentState(
        store,
        "payment_started",
        "payment_completed",
        "payment_bounced"
      );

      return paidState;
    },
    [dispatch, store]
  );

  const payStellarSource = useCallback(
    async (args: {
      paymentTxHash: string;
      sourceToken: StellarPublicKey;
      rozoOrderId: string;
    }) => {
      // Get the current order from the state
      const currentState = store.getState();

      if (currentState.type === "idle" || !currentState.order) {
        throw new Error("Cannot complete Stellar payment: No active order");
      }

      // First dispatch the pay_stellar_source event to record the payment attempt
      dispatch({ type: "pay_stellar_source", ...args });

      // Then immediately mark the payment as completed by updating the order
      // with the transaction hash and setting the state to completed
      const hydratedOrder = currentState.order as RozoPayHydratedOrderWithOrg;

      // Update the order with the transaction hash
      const updatedOrder = {
        ...hydratedOrder,
        sourceStartTxHash: args.paymentTxHash as Hex,
        // Set source status to completed
        sourceStatus: RozoPayOrderStatusSource.PROCESSED,
      };

      // Directly dispatch a payment_verified event to set the state to completed
      dispatch({
        type: "payment_verified",
        order: updatedOrder,
      });

      // Wait for the state to change to payment_completed
      const paidState = await waitForPaymentState(store, "payment_completed");

      return paidState;
    },
    [dispatch, store]
  );

  const reset = useCallback(() => dispatch({ type: "reset" }), [dispatch]);

  const setChosenUsd = useCallback(
    (usd: number) => dispatch({ type: "set_chosen_usd", usd }),
    [dispatch]
  );

  const setPaymentCompleted = useCallback(
    async (txHash: string, rozoPaymentId?: string) => {
      // Get the current order from the state
      const currentState = store.getState();

      if (currentState.type === "idle" || !currentState.order) {
        throw new Error("Cannot complete payment: No active order");
      }

      // Check if the order is already hydrated
      /* if (
        currentState.type !== "payment_unpaid" &&
        currentState.type !== "payment_started" &&
        currentState.type !== "unhydrated"
      ) {
        throw new Error(
          `Cannot complete payment: Invalid state ${currentState.type}`
        );
      } */

      // For TypeScript safety, we need to ensure the order is treated as hydrated
      // This is safe because the payment_verified handler will validate the order
      const hydratedOrder = currentState.order as RozoPayHydratedOrderWithOrg;

      // Since we can't directly add txHash to the metadata (it's not in the schema),
      // we'll just use the existing order and let the payment state machine
      // handle the transition to completed state

      // Store the transaction hash in sourceStartTxHash if possible
      const updatedOrder = {
        ...hydratedOrder,
        sourceStartTxHash: txHash as Hex, // Cast to Hex as required by the type
      };

      // Directly dispatch a payment_verified event to set the state to completed
      // dispatch({
      //   type: "payment_verified",
      //   order: updatedOrder,
      // });

      dispatch({
        type: "order_refreshed",
        order: {
          ...updatedOrder,
          externalId: rozoPaymentId ?? updatedOrder?.externalId ?? "",
          destFastFinishTxHash: txHash as any,
          intentStatus: RozoPayIntentStatus.COMPLETED,
        },
      });

      // Wait for the state to change to payment_completed
      const completedState = await waitForPaymentState(
        store,
        "payment_completed"
      );

      return completedState;
    },
    [dispatch, store]
  );

  const setPaymentPayoutCompleted = useCallback(
    async (payoutTxHash: string, rozoPaymentId?: string) => {
      // Prevent duplicate calls with the same payout transaction hash
      if (lastPayoutTxHash.current === payoutTxHash) {
        console.log(
          "[PAY] Skipping duplicate payout completion call for hash:",
          payoutTxHash
        );
        // Return current state without dispatching
        const currentState = store.getState();
        if (currentState.type === "payout_completed") {
          return currentState;
        }
        // Wait for the ongoing transition to complete
        return await waitForPaymentState(store, "payout_completed");
      }

      lastPayoutTxHash.current = payoutTxHash;

      // Get the current order from the state
      const currentState = store.getState();

      if (currentState.type === "idle" || !currentState.order) {
        throw new Error("Cannot complete payout: No active order");
      }

      const hydratedOrder = currentState.order as RozoPayHydratedOrderWithOrg;

      dispatch({
        type: "order_refreshed",
        order: {
          ...hydratedOrder,
          intentStatus: RozoPayIntentStatus.PAYOUT_COMPLETED,
          externalId: rozoPaymentId ?? order?.externalId ?? "",
          payoutTransactionHash: payoutTxHash,
        },
      });

      const payoutCompletedState = await waitForPaymentState(
        store,
        "payout_completed"
      );

      setPayoutRozoCompleted(true);

      return payoutCompletedState;
    },
    [dispatch, store, paymentFsmState.type, order?.id]
  );

  const setPaymentStarted = useCallback(
    async (
      rozoPaymentId: string,
      order?: RozoPayOrderWithOrg | RozoPayHydratedOrderWithOrg
    ) => {
      const currentState = store.getState();

      if (currentState.type !== "payment_unpaid") {
        throw new Error(
          "Cannot set payment started: Order is not in payment_unpaid state"
        );
      }

      const updatedOrder = {
        ...currentState.order,
        ...order,
        intentStatus: RozoPayIntentStatus.STARTED,
        externalId: rozoPaymentId ?? currentState.order.externalId,
      };

      dispatch({
        type: "order_refreshed",
        order: updatedOrder,
      });

      const startedState = await waitForPaymentState(store, "payment_started");
      return startedState;
    },
    [dispatch, store]
  );

  const setPaymentUnpaid = useCallback(
    async (rozoPaymentId: string) => {
      const currentState = store.getState();

      if (currentState.type !== "payment_started") {
        throw new Error(
          "Cannot set payment unpaid: Order is not in payment_started state"
        );
      }

      const updatedOrder = {
        ...currentState.order,
        intentStatus: RozoPayIntentStatus.UNPAID,
        externalId: rozoPaymentId ?? currentState.order.externalId,
      };

      dispatch({
        type: "order_refreshed",
        order: updatedOrder,
      });

      const unpaidState = await waitForPaymentState(store, "payment_unpaid");
      return unpaidState;
    },
    [dispatch, store]
  );

  return {
    order,
    paymentState,
    paymentErrorMessage,
    rozoPaymentId,
    createPreviewOrder,
    hydrateOrder,
    hydrateOrderRozo,
    setPayId,
    paySource,
    payEthSource,
    paySolanaSource,
    payStellarSource,
    setPaymentStarted,
    setPaymentUnpaid,
    setPaymentCompleted,
    setPaymentPayoutCompleted,
    reset,
    setChosenUsd,
    setPaymentRozoCompleted,
    paymentRozoCompleted,
    setPayoutRozoCompleted,
    payoutRozoCompleted,
  } as UseRozoPay;
}
