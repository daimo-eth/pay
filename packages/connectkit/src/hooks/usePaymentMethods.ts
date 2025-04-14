import {
  DaimoPayOrderMode,
  PaymentMethodMetadata,
  PlatformType,
} from "@daimo/pay-common";
import { useEffect, useState } from "react";
import { TrpcClient } from "../utils/trpc";

export function usePaymentMethods({
  trpc,
  isOrderReady,
  platform,
  paymentMethods,
  usdRequired,
  mode,
  destChainId,
}: {
  trpc: TrpcClient;
  isOrderReady: boolean;
  platform: PlatformType | undefined;
  paymentMethods: string[] | undefined;
  usdRequired: number | undefined;
  mode: DaimoPayOrderMode | undefined;
  destChainId: number | undefined;
}) {
  const [methods, setMethods] = useState<PaymentMethodMetadata[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const refreshExternalPaymentOptions = async (
      usdRequired: number,
      mode: DaimoPayOrderMode,
      platform: PlatformType,
      destChainId: number,
    ) => {
      setLoading(true);
      try {
        const newMethods = await trpc.getPaymentMethods.query({
          paymentMethods,
          usdRequired,
          mode,
          destChainId,
          platform,
        });

        setMethods(newMethods);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (
      isOrderReady &&
      platform != null &&
      usdRequired != null &&
      mode != null &&
      destChainId != null
    ) {
      refreshExternalPaymentOptions(usdRequired, mode, platform, destChainId);
    }
  }, [isOrderReady, platform, paymentMethods, usdRequired, mode, destChainId]);

  return {
    methods,
    loading,
  };
}
