import { rozoSolanaUSDC, WalletPaymentOption } from "@rozoai/intent-common";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TrpcClient } from "../utils/trpc";
import {
  createRefreshFunction,
  setupRefreshState,
  shouldSkipRefresh,
} from "./refreshUtils";

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

  const filteredOptions = useMemo(() => {
    if (!options) return [];

    return options
      .filter((option) => option.balance.token.token === rozoSolanaUSDC.token)
      .map((item) => {
        const usd = isDepositFlow ? 0 : usdRequired || 0;

        const value: WalletPaymentOption = {
          ...item,
          required: {
            ...item.required,
            usd,
          },
        };

        // Set `disabledReason` manually (based on current usdRequired state, not API Request)
        if (item.balance.usd < usd) {
          value.disabledReason = `Balance too low: $${item.balance.usd.toFixed(
            2
          )}`;
        }

        return value;
      }) as WalletPaymentOption[];
  }, [options, isDepositFlow, usdRequired]);

  // Shared fetch function for Solana payment options
  const fetchSolanaPaymentOptions = useCallback(async () => {
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
      setOptions([]);
    } finally {
      isApiCallInProgress.current = false;
      setIsLoading(false);
    }
  }, [address, usdRequired, isDepositFlow, trpc]);

  // Create refresh function using shared utility
  const refreshOptions = createRefreshFunction(fetchSolanaPaymentOptions, {
    lastExecutedParams,
    isApiCallInProgress,
  });

  // Smart clearing: only clear if we don't have data for this address
  useEffect(() => {
    if (address && !options) {
      // Only set loading if we don't have options yet
      setIsLoading(true);
    }
  }, [address, options]);

  useEffect(() => {
    if (address == null || usdRequired == null) return;

    const fullParamsKey = JSON.stringify({
      address,
      usdRequired,
      isDepositFlow,
    });

    // Skip if we've already executed with these exact parameters
    if (
      shouldSkipRefresh(fullParamsKey, {
        lastExecutedParams,
        isApiCallInProgress,
      })
    ) {
      return;
    }

    // Set up refresh state
    setupRefreshState(fullParamsKey, {
      lastExecutedParams,
      isApiCallInProgress,
    });
  }, [address, usdRequired, isDepositFlow]);

  // Initial fetch when hook mounts with valid parameters or when key parameters change
  useEffect(() => {
    if (address != null && usdRequired != null) {
      refreshOptions();
    }
  }, [address, usdRequired]);

  return {
    options: filteredOptions,
    isLoading,
    refreshOptions,
  };
}
