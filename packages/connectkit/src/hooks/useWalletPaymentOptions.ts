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
  enableCaching = true,
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
  enableCaching?: boolean;
}) {
  const [options, setOptions] = useState<WalletPaymentOption[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Track the last executed parameters to prevent duplicate API calls
  const lastExecutedParams = useRef<string | null>(null);

  // Track if we're currently making an API call to prevent concurrent requests
  const isApiCallInProgress = useRef<boolean>(false);

  // Cache balance data separately from payment amount to avoid unnecessary refetches
  const cachedBalanceData = useRef<WalletPaymentOption[] | null>(null);
  const lastBalanceParams = useRef<string | null>(null);
  const cacheTimestamp = useRef<number | null>(null);

  // Cache expiration time: 5 minutes
  const CACHE_EXPIRY_MS = 5 * 60 * 1000;

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

      // Create separate keys for balance data vs payment amount
      const balanceParamsKey = JSON.stringify({
        address,
        destChainId,
        memoizedPreferredChains,
        memoizedPreferredTokens,
        memoizedEvmChains,
        stableAppId,
      });

      const fullParamsKey = JSON.stringify({
        ...JSON.parse(balanceParamsKey),
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

      // Check if we can reuse cached balance data (only payment amount changed)
      // Cache expires after 1 minute to ensure balance data is fresh
      const isCacheValid =
        enableCaching &&
        cacheTimestamp.current !== null &&
        Date.now() - cacheTimestamp.current < CACHE_EXPIRY_MS;

      const canReuseCache =
        enableCaching &&
        cachedBalanceData.current !== null &&
        lastBalanceParams.current === balanceParamsKey &&
        lastExecutedParams.current !== null &&
        isCacheValid;

      log(
        `[WALLET CACHE] Cache check: enableCaching=${enableCaching}, hasCachedData=${
          cachedBalanceData.current !== null
        }, balanceParamsMatch=${
          lastBalanceParams.current === balanceParamsKey
        }, isCacheValid=${isCacheValid}, cacheAgeSeconds=${
          cacheTimestamp.current
            ? Math.round((Date.now() - cacheTimestamp.current) / 1000)
            : null
        }, canReuseCache=${canReuseCache}, usdRequired=${usdRequired}`
      );

      if (cacheTimestamp.current && !isCacheValid && enableCaching) {
        log(
          `[WALLET CACHE] Cache expired after ${Math.round(
            (Date.now() - cacheTimestamp.current) / 1000
          )} seconds`
        );
      }

      if (!enableCaching) {
        log(
          "[WALLET CACHE] Caching is disabled - will always fetch fresh data"
        );
      }

      if (canReuseCache && cachedBalanceData.current) {
        log("[WALLET CACHE] Using cached data, updating payment amount only");
        // Reuse cached balance data and just update the payment amount
        const updatedOptions = cachedBalanceData.current.map((option) => {
          const newRequiredAmount = isDepositFlow
            ? 0n
            : (BigInt(
                Math.floor(
                  usdRequired * Math.pow(10, option.required.token.decimals)
                )
              ) as unknown as `${bigint}`);

          // Recalculate disabledReason based on new payment amount
          let newDisabledReason: string | undefined;
          if (option.balance.usd < usdRequired) {
            newDisabledReason = `Balance too low: $${option.balance.usd.toFixed(
              2
            )}`;
          } else if (option.balance.usd < option.minimumRequired.usd) {
            newDisabledReason = `Balance too low: $${option.balance.usd.toFixed(
              2
            )}`;
          } else {
            newDisabledReason = undefined;
          }

          // Log if disabledReason changed
          if (option.disabledReason !== newDisabledReason) {
            log(
              `[WALLET CACHE] Updated disabledReason for ${option.balance.token.symbol}: ${option.disabledReason} -> ${newDisabledReason}`
            );
          }

          return {
            ...option,
            required: {
              ...option.required,
              usd: usdRequired,
              amount: newRequiredAmount,
            },
            disabledReason: newDisabledReason,
          };
        }) as WalletPaymentOption[];

        // Apply the same filtering logic
        const supportedChainsList = [base, polygon];
        const supportedTokens = [baseUSDC.token, polygonUSDC.token];
        const showBSCUSDT =
          stableAppId?.includes("MP") ||
          memoizedPreferredChains?.includes(bsc.chainId) ||
          memoizedEvmChains?.includes(bsc.chainId);

        if (showBSCUSDT) {
          supportedChainsList.push(bsc);
          supportedTokens.push(bscUSDT.token);
        }

        const isSupported = (o: WalletPaymentOption) =>
          supportedChainsList.some(
            (c) =>
              c.chainId === o.balance.token.chainId &&
              supportedTokens.includes(o.balance.token.token)
          );

        const filteredOptions = updatedOptions.filter(isSupported);
        setOptions(filteredOptions);
        lastExecutedParams.current = fullParamsKey;
        log("[WALLET CACHE] Cache hit - no API call needed");
        return;
      }

      // Need to fetch fresh data from API
      log(
        enableCaching
          ? "[WALLET CACHE] Cache miss - fetching fresh data from API"
          : "[WALLET CACHE] Caching disabled - fetching fresh data from API"
      );
      lastExecutedParams.current = fullParamsKey;
      if (enableCaching) {
        lastBalanceParams.current = balanceParamsKey;
      }
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

        // Cache the raw balance data (before filtering) with timestamp (only if caching is enabled)
        if (enableCaching) {
          cachedBalanceData.current = newOptions;
          cacheTimestamp.current = Date.now();
          log(
            `[WALLET CACHE] Cached fresh data with timestamp: ${new Date(
              cacheTimestamp.current
            ).toLocaleTimeString()}`
          );
        }

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
          `[WALLET CACHE] API call completed, filtered options: ${filteredOptions.length}`
        );
      } catch (error) {
        log(`[WALLET CACHE] API call failed: ${error}`);
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
  ]);

  return {
    options,
    isLoading,
  };
}
