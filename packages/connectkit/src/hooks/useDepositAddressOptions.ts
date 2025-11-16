import {
  base,
  bsc,
  DepositAddressPaymentOptions,
  polygon,
  RozoPayOrderMode,
} from "@rozoai/intent-common";
import { useCallback, useEffect, useMemo, useState } from "react";
import { chainToLogo } from "../assets/chains";
import { TrpcClient } from "../utils/trpc";

// Type definitions for better type safety
export interface DepositAddressOption {
  id: DepositAddressPaymentOptions;
  logoURI: string | React.ReactNode;
  minimumUsd: number;
}

export interface UseDepositAddressOptionsParams {
  trpc: TrpcClient;
  usdRequired: number | undefined;
  mode: RozoPayOrderMode | undefined;
  appId?: string;
}

export interface UseDepositAddressOptionsReturn {
  options: DepositAddressOption[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook for managing deposit address payment options.
 *
 * This hook provides a list of available deposit address options for users
 * to send payments to, including various blockchain networks with their
 * respective minimum USD requirements and logos.
 *
 * Currently supported chains:
 * - Base (Chain ID: 8453) - Primary EVM chain
 * - Polygon (Chain ID: 137) - Secondary EVM chain
 * - BSC (Chain ID: 56) - Conditional support for MP app IDs
 */
export function useDepositAddressOptions({
  trpc,
  usdRequired,
  mode,
  appId,
}: UseDepositAddressOptionsParams): UseDepositAddressOptionsReturn {
  const [options, setOptions] = useState<DepositAddressOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized configuration for deposit address options
  const depositAddressConfig = useMemo(() => {
    const baseOptions: DepositAddressOption[] = [
      {
        id: DepositAddressPaymentOptions.BASE,
        logoURI: chainToLogo[base.chainId],
        minimumUsd: 0.1,
      },
      {
        id: DepositAddressPaymentOptions.POLYGON,
        logoURI: chainToLogo[polygon.chainId],
        minimumUsd: 0.1,
      },
      // {
      //   id: DepositAddressPaymentOptions.ARBITRUM,
      //   logoURI: chainToLogo[arbitrum.chainId],
      //   minimumUsd: 0.1,
      // },
      // {
      //   id: DepositAddressPaymentOptions.OP_MAINNET,
      //   logoURI: chainToLogo[optimism.chainId],
      //   minimumUsd: 0.1,
      // },
      // {
      //   id: DepositAddressPaymentOptions.ETH_L1,
      //   logoURI: chainToLogo[ethereum.chainId],
      //   minimumUsd: 10, // Higher minimum for Ethereum due to gas costs
      // },
      // {
      //   id: DepositAddressPaymentOptions.SOLANA,
      //   logoURI: chainToLogo[rozoSolana.chainId],
      //   minimumUsd: 0.1,
      // },
      // {
      //   id: DepositAddressPaymentOptions.STELLAR,
      //   logoURI: chainToLogo[rozoStellar.chainId],
      //   minimumUsd: 0.1,
      // },
    ];

    // Add BSC conditionally for MP app IDs
    if (appId?.includes("MP")) {
      baseOptions.push({
        id: DepositAddressPaymentOptions.BSC,
        logoURI: chainToLogo[bsc.chainId],
        minimumUsd: 0.1,
      });
    }

    return baseOptions;
  }, [appId]);

  // Memoized refresh function to prevent unnecessary re-renders
  const refreshDepositAddressOptions = useCallback(
    async (usd: number, mode: RozoPayOrderMode) => {
      setLoading(true);
      setError(null);

      try {
        // TODO: Uncomment when API endpoint is ready
        // const apiOptions = await trpc.getDepositAddressOptions.query({
        //   usdRequired: usd,
        //   mode,
        // });

        // For now, use static configuration
        // Filter options based on minimum USD requirements
        // const filteredOptions = depositAddressConfig.filter(
        //   (option) => usd >= option.minimumUsd
        // );

        setOptions(depositAddressConfig);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load deposit address options";
        setError(errorMessage);
        console.error("Error loading deposit address options:", err);

        // Fallback to static options on error
        setOptions(depositAddressConfig);
      } finally {
        setLoading(false);
      }
    },
    [depositAddressConfig]
  );

  // Effect to refresh options when dependencies change
  useEffect(() => {
    if (usdRequired != null && mode != null) {
      refreshDepositAddressOptions(usdRequired, mode);
    }
  }, [usdRequired, mode, refreshDepositAddressOptions]);

  return {
    options,
    loading,
    error,
  };
}
