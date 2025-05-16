import { useMemo } from "react";
import { createPaymentStore } from "../core";
import { createTrpcClient } from "../utils/trpc";
import { setInWalletPaymentUrlFromApiUrl } from "../wallets/walletConfigs";

type PaymentProviderProps = {
  children: React.ReactNode;
  payApiUrl: string;
  sessionId: string;
};

export function PaymentProvider({
  children,
  payApiUrl,
  sessionId,
}: PaymentProviderProps) {
  const trpc = useMemo(() => {
    setInWalletPaymentUrlFromApiUrl(payApiUrl);
    return createTrpcClient(payApiUrl, sessionId);
  }, [payApiUrl, sessionId]);
  const store = useMemo(() => {
    return createPaymentStore();
  }, []);

  return <>{children}</>;
}
