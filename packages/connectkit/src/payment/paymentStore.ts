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
 * Wait for the `PaymentStore` to enter a state matching `predicate`,
 * or reject as soon as it hits the `"error"` state.
 *
 * @returns Promise<T> resolving with the first matching state or rejecting with
 * the error message
 */
export function waitForPaymentState<T extends PaymentState>(
  store: PaymentStore,
  predicate: (s: PaymentState) => s is T,
): Promise<T> {
  return waitForState<PaymentState, PaymentEvent, T>(
    store,
    predicate,
    // isError
    (s) => s.type === "error",
    // getErrorMessage
    (s) => (s as Extract<PaymentState, { type: "error" }>).message,
  );
}
