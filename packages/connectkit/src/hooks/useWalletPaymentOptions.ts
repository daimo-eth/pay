import {
  base,
  baseUSDC,
  bsc,
  bscUSDT,
  polygon,
  polygonUSDC,
  WalletPaymentOption,
} from "@rozoai/intent-common";
import { useEffect, useMemo, useRef, useState } from "react";
import { PayParams } from "../payment/paymentFsm";
import { TrpcClient } from "../utils/trpc";

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
 * - BSC (Chain ID: 56) - USDT (when conditions are met)
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

  useEffect(() => {
    const refreshWalletPaymentOptions = async () => {
      if (address == null || usdRequired == null || destChainId == null) return;

      const fullParamsKey = JSON.stringify({
        address,
        destChainId,
        memoizedPreferredChains,
        memoizedPreferredTokens,
        memoizedEvmChains,
        stableAppId,
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
        const newOptions = await trpc.getWalletPaymentOptions.query({
          payerAddress: address,
          // API expects undefined for deposit flow.
          usdRequired: isDepositFlow ? undefined : usdRequired,
          destChainId,
          preferredChains: memoizedPreferredChains,
          preferredTokens: memoizedPreferredTokens,
          evmChains: memoizedEvmChains,
        });

        // SUPPORTED CHAINS: Only these chains are currently active in wallet payment options
        // To add more chains, add them to both arrays below and ensure they're defined in pay-common
        const supportedChainsList = [base, polygon];

        // SUPPORTED TOKENS: Only these specific tokens are currently active
        // Each token corresponds to its respective chain above
        const supportedTokens = [baseUSDC.token, polygonUSDC.token];

        // Show BSC USDT for MugglePay apps or when BSC is preferred
        const showBSCUSDT =
          stableAppId?.includes("MP") ||
          memoizedPreferredChains?.includes(bsc.chainId) ||
          memoizedEvmChains?.includes(bsc.chainId);

        if (showBSCUSDT) {
          supportedChainsList.push(bsc);
          supportedTokens.push(bscUSDT.token);
        }

        // Filter out chains/tokens we don't support yet in wallet payment options
        // API may return more options, but we only show these filtered ones to users
        const isSupported = (o: WalletPaymentOption) =>
          supportedChainsList.some(
            (c) =>
              c.chainId === o.balance.token.chainId &&
              supportedTokens.includes(o.balance.token.token)
          );
        const filteredOptions = newOptions.filter(isSupported);
        if (filteredOptions.length < newOptions.length) {
          log(
            `[WALLET]: skipping ${
              newOptions.length - filteredOptions.length
            } unsupported-chain balances on ${address}`
          );
        }

        setOptions(filteredOptions);
        log(
          `[WALLET] API call completed, filtered options: ${filteredOptions.length}`
        );
      } catch (error) {
        log(`[WALLET] API call failed: ${error}`);
      } finally {
        isApiCallInProgress.current = false;
        setIsLoading(false);
      }
    };

    if (address != null && usdRequired != null && destChainId != null) {
      refreshWalletPaymentOptions();
    }
  }, [
    address,
    usdRequired,
    destChainId,
    isDepositFlow,
    memoizedPreferredChains,
    memoizedPreferredTokens,
    memoizedEvmChains,
    stableAppId,
    trpc,
    log,
  ]);

  return {
    options,
    isLoading,
  };
}
