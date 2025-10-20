import {
  base,
  baseUSDC,
  bsc,
  bscUSDT,
  polygon,
  polygonUSDC,
  WalletPaymentOption,
} from "@rozoai/intent-common";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAddress } from "viem";
import { PayParams } from "../payment/paymentFsm";
import { TrpcClient } from "../utils/trpc";
import { createRefreshFunction } from "./refreshUtils";

/**
 * Wallet payment options. User picks one.
 *
 * This hook manages wallet-based payment options by:
 * 1. Fetching available payment options from the API based on user's wallet balance
 * 2. Filtering to only show currently supported chains and tokens
 *
 * CURRENTLY SUPPORTED CHAINS & TOKENS IN WALLET PAYMENT OPTIONS:
 * - Base (Chain ID: 8453) - USDC
 * - Polygon (Chain ID: 137) - USDC
 * - BSC (Chain ID: 56) - USDT (when MugglePay app, BSC preferred, or user has BSC USDT balance, even if disabled)
 * - Rozo Solana - USDC (native Solana USDC)
 * - Rozo Stellar - USDC/XLM (native Stellar tokens)
 *
 * Note: The SDK supports many more chains/tokens (see pay-common/src/chain.ts and token.ts)
 * but wallet payment options are currently filtered to the above for optimal user experience.
 */
export function useWalletPaymentOptions({
  trpc,
  address,
  usdRequired,
  destChainId,
  preferredChains,
  preferredTokens,
  evmChains,
  isDepositFlow,
  payParams,
  log,
}: {
  trpc: TrpcClient;
  address: string | undefined;
  usdRequired: number | undefined;
  destChainId: number | undefined;
  preferredChains: number[] | undefined;
  preferredTokens: { chain: number; address: string }[] | undefined;
  evmChains: number[] | undefined;
  isDepositFlow: boolean;
  payParams: PayParams | undefined;
  log: (msg: string) => void;
}) {
  const [options, setOptions] = useState<WalletPaymentOption[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Track the last executed parameters to prevent duplicate API calls
  const lastExecutedParams = useRef<string | null>(null);

  // Track if we're currently making an API call to prevent concurrent requests
  const isApiCallInProgress = useRef<boolean>(false);

  // Extract appId to avoid payParams object recreation causing re-runs
  const stableAppId = useMemo(() => {
    return payParams?.appId;
  }, [payParams?.appId]);

  // Memoize array dependencies to prevent unnecessary re-fetches
  // TODO: this is an ugly way to handle polling/refresh
  // Notice the load-bearing JSON.stringify() to prevent a visible infinite
  // refresh glitch on the SelectMethod screen. Replace this useEffect().
  const memoizedPreferredChains = useMemo(
    () => preferredChains,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(preferredChains)]
  );
  const memoizedPreferredTokens = useMemo(
    () => preferredTokens,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(preferredTokens)]
  );
  const memoizedEvmChains = useMemo(
    () => evmChains,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(evmChains)]
  );

  // Smart clearing: only clear if we don't have data for this address
  useEffect(() => {
    if (address && !options) {
      // Only set loading if we don't have options yet
      setIsLoading(true);
    }
  }, [address, options]);

  // Shared fetch function for wallet payment options
  const fetchWalletPaymentOptions = useCallback(async () => {
    if (address == null || usdRequired == null || destChainId == null) return;

    setOptions(null);
    setIsLoading(true);

    try {
      const newOptions = await trpc.getWalletPaymentOptions.query({
        payerAddress: address,
        usdRequired: isDepositFlow ? undefined : usdRequired,
        destChainId,
        preferredChains: memoizedPreferredChains,
        preferredTokens: memoizedPreferredTokens,
        evmChains: memoizedEvmChains,
      });

      // SUPPORTED CHAINS: Only these chains are currently active in wallet payment options
      const supportedChainsList = [base, polygon];
      const supportedTokens = [baseUSDC.token, polygonUSDC.token];

      // Check if user has BSC USDT balance (including disabled options)
      const hasBSCUSDTBalance = newOptions.some(
        (option) =>
          Number(option.balance.token.chainId) === bsc.chainId &&
          getAddress(option.balance.token.token) === getAddress(bscUSDT.token)
      );

      // Show BSC USDT in these cases:
      // 1. MugglePay apps (MP prefix in appId)
      // 2. BSC is in preferred chains
      // 3. BSC is in evmChains
      // 4. User actually has BSC USDT balance (regardless of preferences or disabled state)
      const showBSCUSDT =
        stableAppId?.includes("MP") ||
        memoizedPreferredChains?.includes(bsc.chainId) ||
        memoizedEvmChains?.includes(bsc.chainId);

      if (showBSCUSDT) {
        supportedChainsList.push(bsc);
        supportedTokens.push(bscUSDT.token);
      }

      // Filter out chains/tokens we don't support yet in wallet payment options
      const isSupported = (o: WalletPaymentOption) =>
        supportedChainsList.some(
          (c) =>
            c.chainId === o.balance.token.chainId &&
            supportedTokens.includes(o.balance.token.token)
        );
      const filteredOptions = newOptions.filter(isSupported);
      if (filteredOptions.length < newOptions.length) {
        const skippedOptions = newOptions.filter((o) => !isSupported(o));
        const skippedChains = Array.from(
          new Set(skippedOptions.map((o) => o.balance.token.chainId))
        );
        log(
          `[WALLET]: skipping ${
            newOptions.length - filteredOptions.length
          } unsupported-chain balances on ${address}: chains [${skippedChains.join(
            ", "
          )}]`
        );
      }

      setOptions(filteredOptions);
      const loadedChains = Array.from(
        new Set(filteredOptions.map((o) => o.balance.token.chainId))
      );
      log(
        `[WALLET]: loaded ${
          filteredOptions.length
        } payment options for ${address} on chains [${loadedChains.join(", ")}]`
      );
    } catch (error) {
      console.error(error);
      setOptions([]);
    } finally {
      isApiCallInProgress.current = false;
      setIsLoading(false);
    }
  }, [
    address,
    destChainId,
    memoizedPreferredChains,
    memoizedPreferredTokens,
    memoizedEvmChains,
    stableAppId,
    usdRequired,
    isDepositFlow,
    trpc,
    log,
  ]);

  // Create refresh function using shared utility
  const refreshOptions = createRefreshFunction(fetchWalletPaymentOptions, {
    lastExecutedParams,
    isApiCallInProgress,
  });

  // Initial fetch when hook mounts with valid parameters or when key parameters change
  useEffect(() => {
    if (address != null && usdRequired != null && destChainId != null) {
      refreshOptions();
    }
  }, [address, usdRequired, destChainId]);

  return {
    options,
    isLoading,
    refreshOptions,
  };
}
