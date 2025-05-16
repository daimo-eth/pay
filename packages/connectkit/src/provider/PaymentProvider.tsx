import { createContext, useEffect, useMemo, useState } from "react";
import { attachPaymentEffectHandlers } from "../payment/paymentEffects";
import { createPaymentStore, PaymentStore } from "../payment/paymentStore";
import { createTrpcClient } from "../utils/trpc";

export const PaymentContext = createContext<PaymentStore | null>(null);

type PaymentProviderProps = {
  children: React.ReactNode;
  payApiUrl: string;
  log?: (msg: string) => void;
};

export function PaymentProvider({
  children,
  payApiUrl,
  log = console.log,
}: PaymentProviderProps) {
  // Generate unique sessionId for tracking in the backend
  const [sessionId] = useState(() => crypto.randomUUID().replaceAll("-", ""));
  const trpc = useMemo(() => {
    return createTrpcClient(payApiUrl, sessionId);
  }, [payApiUrl, sessionId]);

  const store = useMemo(() => {
    return createPaymentStore();
  }, []);

  // Attach subscriber to run side effects in response to events
  useEffect(() => {
    const unsubscribe = attachPaymentEffectHandlers(store, trpc, log);
    return unsubscribe;
  }, [store, trpc, log]);

  return (
    <PaymentContext.Provider value={store}>{children}</PaymentContext.Provider>
  );
}
