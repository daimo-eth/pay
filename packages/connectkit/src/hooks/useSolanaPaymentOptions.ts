import { WalletPaymentOption } from "@daimo/pay-common";
import { useEffect, useState } from "react";
import { TrpcClient } from "../utils/trpc";

/** Wallet payment options. User picks one. */
export function useSolanaPaymentOptions({
  trpc,
  address,
  usdRequired,
  isDepositFlow,
  showSolanaPaymentMethod,
}: {
  trpc: TrpcClient;
  address: string | undefined;
  usdRequired: number | undefined;
  isDepositFlow: boolean;
  showSolanaPaymentMethod: boolean;
}) {
  const [options, setOptions] = useState<WalletPaymentOption[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!showSolanaPaymentMethod) return;

    const refreshWalletPaymentOptions = async () => {
      if (address == null || usdRequired == null) return;

      setOptions(null);
      setIsLoading(true);
      try {
        const newOptions = await trpc.getSolanaPaymentOptions.query({
          pubKey: address,
          // API expects undefined for deposit flow.
          usdRequired: isDepositFlow ? undefined : usdRequired,
        });
        setOptions(newOptions);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    refreshWalletPaymentOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, usdRequired, isDepositFlow, showSolanaPaymentMethod]);

  return {
    options,
    isLoading,
  };
}
