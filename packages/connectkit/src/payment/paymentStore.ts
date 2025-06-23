import { createStore, waitForState } from "../stateStore";
import {
  initialPaymentState,
  PaymentEvent,
  paymentReducer,
  PaymentState,
} from "./paymentFsm";

export type PaymentStore = ReturnType<
  typeof createStore<PaymentState, PaymentEvent>
>;

export function createPaymentStore(): PaymentStore {
  const store = createStore(paymentReducer, initialPaymentState);
  return store;
}

/**
 * Wait for the `PaymentStore` to enter a state matching any of `validTypes`,
 * or reject as soon as it hits the `"error"` state.
 *
 * @returns Promise<T> resolving with the first matching state or rejecting with
 * the error message
 */
export function waitForPaymentState<
  const T extends readonly PaymentState["type"][],
>(
  store: PaymentStore,
  ...validTypes: T
): Promise<Extract<PaymentState, { type: T[number] }>> {
  return waitForState<
    PaymentState,
    PaymentEvent,
    Extract<PaymentState, { type: T[number] }>
  >(
    store,
    (s): s is Extract<PaymentState, { type: T[number] }> =>
      (validTypes as readonly PaymentState["type"][]).includes(s.type),
    (s) => s.type === "error",
    (s) => (s as Extract<PaymentState, { type: "error" }>).message,
  );
}
