// hooks/useDaimoPay.ts
import {
  DaimoPayOrderID,
  DaimoPayOrderView,
  getDaimoPayOrderView,
  SolanaPublicKey,
} from "@daimo/pay-common";
import { useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { Address, Hex } from "viem";
import { PaymentEvent, PayParams } from "../payment/paymentFsm";
import { PaymentContext } from "../provider/PaymentProvider";

export interface UseDaimoPay {
  /** The current Daimo Pay order, or null if no order is active. */
  payment: DaimoPayOrderView | null;

  /**
   * Create a new Daimo Pay order with the given parameters.
   * Call this to start a new payment flow.
   *
   * @param params - Parameters describing the payment to be created.
   */
  createOrder: (params: PayParams) => void;

  /**
   * Hydrate the current order, locking in the payment intent details and
   * token swap prices.
   */
  hydrateOrder: () => void;

  /**
   * Set the order ID to fetch and manage an existing Daimo Pay order.
   * Useful for resuming or referencing a previously created order.
   *
   * @param id - The Daimo Pay order ID to set.
   */
  setPayId: (id: DaimoPayOrderID) => void;

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
    sourceAmount: Address;
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
  if (!store)
    throw new Error("useDaimoPay must be used within <PaymentProvider>");

  // Subscribe to the store and keep an up-to-date copy of the payment.
  const paymentFsmState = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );
  const payment = useMemo(() => {
    if (paymentFsmState.type === "idle") return null;
    const order = paymentFsmState.order;
    return order ? getDaimoPayOrderView(order) : null;
  }, [paymentFsmState]);

  // Internal helper to dispatch events to the store.
  const dispatch = useCallback((e: PaymentEvent) => store.dispatch(e), [store]);

  const createOrder = useCallback(
    (params: PayParams) =>
      dispatch({ type: "set_pay_params", payload: params }),
    [dispatch],
  );

  const hydrateOrder = useCallback(
    () => dispatch({ type: "hydrate_order" }),
    [dispatch],
  );

  const setPayId = useCallback(
    (id: DaimoPayOrderID) => dispatch({ type: "set_pay_id", payload: id }),
    [dispatch],
  );

  const payEthSource = useCallback(
    (args: {
      paymentTxHash: Hex;
      sourceChainId: number;
      payerAddress: Address;
      sourceToken: Address;
      sourceAmount: Address;
    }) => dispatch({ type: "pay_ethereum_source", ...args }),
    [dispatch],
  );

  const paySolanaSource = useCallback(
    (args: { paymentTxHash: string; sourceToken: SolanaPublicKey }) =>
      dispatch({ type: "pay_solana_source", ...args }),
    [dispatch],
  );

  const reset = useCallback(() => dispatch({ type: "reset" }), [dispatch]);

  return {
    payment,
    createOrder,
    hydrateOrder,
    setPayId,
    payEthSource,
    paySolanaSource,
    reset,
  };
}
