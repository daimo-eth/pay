import { rozoSolanaUSDC, WalletPaymentOption } from "@rozoai/intent-common";
import { useEffect, useRef, useState } from "react";
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

  // Track the last executed parameters to prevent duplicate API calls
  const lastExecutedParams = useRef<string | null>(null);

  // Track if we're currently making an API call to prevent concurrent requests
  const isApiCallInProgress = useRef<boolean>(false);

  useEffect(() => {
    const refreshWalletPaymentOptions = async () => {
      if (address == null || usdRequired == null) return;

      const fullParamsKey = JSON.stringify({
        address,
        usdRequired,
        isDepositFlow,
      });

      // Skip if we've already executed with these exact parameters
      if (lastExecutedParams.current === fullParamsKey) {
        return;
      }

      // Skip if we're already making an API call to prevent concurrent requests
      if (isApiCallInProgress.current) {
        return;
      }

      lastExecutedParams.current = fullParamsKey;
      isApiCallInProgress.current = true;
      setOptions(null);
      setIsLoading(true);

      try {
        const newOptions = await trpc.getSolanaPaymentOptions.query({
          pubKey: address,
          // API expects undefined for deposit flow.
          usdRequired: isDepositFlow ? undefined : usdRequired,
        });

        // Filter out options that are not Rozo Solana USDC
        const filteredOptions = newOptions.filter(
          (option) => option.balance.token.token === rozoSolanaUSDC.token
        );

        setOptions(filteredOptions);
      } catch (error) {
        console.error(error);
      } finally {
        isApiCallInProgress.current = false;
        setIsLoading(false);
      }
    };

    if (address != null && usdRequired != null) {
      refreshWalletPaymentOptions();
    }
  }, [address, usdRequired, isDepositFlow, trpc]);

  return {
    options,
    isLoading,
  };
}
