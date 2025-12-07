import { createContext, useLayoutEffect, useMemo, useState } from "react";
import { attachPaymentEffectHandlers } from "../payment/paymentEffects";
import { createPaymentStore, PaymentStore } from "../payment/paymentStore";
import { createTrpcClient } from "../utils/trpc";

export const PaymentContext = createContext<PaymentStore | null>(null);

type PaymentProviderProps = {
  children: React.ReactNode;
  payApiUrl: string;
  log?: (msg: string) => void;
  debugMode?: boolean;
};

export function PaymentProvider({
  children,
  payApiUrl,
  log = console.log,
  debugMode = false,
}: PaymentProviderProps) {
  // Generate unique sessionId for tracking in the backend
  const [sessionId] = useState(() => crypto.randomUUID().replaceAll("-", ""));
  const trpc = useMemo(() => {
    return createTrpcClient(payApiUrl, sessionId);
  }, [payApiUrl, sessionId]);

  const store = useMemo(() => {
    return createPaymentStore();
  }, []);

  // Attach subscriber to run side effects in response to events. Use a
  // layout effect that runs before the first render.
  useLayoutEffect(() => {
    const unsubscribe = attachPaymentEffectHandlers(
      store,
      trpc,
      log,
      debugMode,
    );
    log("[EFFECT] subscribed to payment effects");
    return unsubscribe;
  }, [store, trpc, log, debugMode]);

  return (
    <PaymentContext.Provider value={store}>{children}</PaymentContext.Provider>
  );
}
