import { createStore } from "./createStore";
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
