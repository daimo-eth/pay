import { WalletPaymentOption } from "@rozoai/intent-common";
import { useEffect, useState } from "react";
import { TrpcClient } from "../utils/trpc";

/** Wallet payment options. User picks one. */
export function useSolanaPaymentOptions({
  trpc,
  address,
  usdRequired,
  isDepositFlow,
}: {
  trpc: TrpcClient;
  address: string | undefined;
  usdRequired: number | undefined;
  isDepositFlow: boolean;
}) {
  const [options, setOptions] = useState<WalletPaymentOption[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
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
        console.log("newOptions", JSON.stringify(newOptions));
        setOptions(newOptions);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    if (address != null && usdRequired != null) {
      refreshWalletPaymentOptions();
    }
  }, [address, usdRequired, isDepositFlow]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    options,
    isLoading,
  };
}
