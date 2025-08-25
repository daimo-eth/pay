import { supportedChains, WalletPaymentOption } from "@rozoai/intent-common";
import { useEffect, useMemo, useState } from "react";
import { TrpcClient } from "../utils/trpc";

/** Wallet payment options. User picks one. */
export function useWalletPaymentOptions({
  trpc,
  address,
  usdRequired,
  destChainId,
  preferredChains,
  preferredTokens,
  evmChains,
  isDepositFlow,
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
  log: (msg: string) => void;
}) {
  const [options, setOptions] = useState<WalletPaymentOption[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Create stable array dependencies that only change when content actually changes
  const stablePreferredChains = useMemo(() => {
    if (!preferredChains || preferredChains.length === 0) return undefined;
    // Sort to ensure consistent comparison
    return [...preferredChains].sort((a, b) => a - b);
  }, [preferredChains]);

  const stablePreferredTokens = useMemo(() => {
    if (!preferredTokens || preferredTokens.length === 0) return undefined;
    // Sort by chain first, then by address for consistent comparison
    return [...preferredTokens].sort((a, b) => {
      if (a.chain !== b.chain) return a.chain - b.chain;
      return a.address.localeCompare(b.address);
    });
  }, [preferredTokens]);

  const stableEvmChains = useMemo(() => {
    if (!evmChains || evmChains.length === 0) return undefined;
    // Sort to ensure consistent comparison
    return [...evmChains].sort((a, b) => a - b);
  }, [evmChains]);

  useEffect(() => {
    const refreshWalletPaymentOptions = async () => {
      if (address == null || usdRequired == null || destChainId == null) return;

      setOptions(null);
      setIsLoading(true);
      try {
        const queryParams: any = {
          payerAddress: address,
          // API expects undefined for deposit flow.
          usdRequired: isDepositFlow ? undefined : usdRequired,
          destChainId,
        };

        // Only include array parameters if they have values
        if (stablePreferredChains) {
          queryParams.preferredChains = stablePreferredChains;
        }
        if (stablePreferredTokens) {
          queryParams.preferredTokens = stablePreferredTokens;
        }
        if (stableEvmChains) {
          queryParams.evmChains = stableEvmChains;
        }

        const newOptions = await trpc.getWalletPaymentOptions.query(
          queryParams
        );

        // Filter out chains we don't support yet.
        const isSupported = (o: WalletPaymentOption) =>
          supportedChains.some((c) => c.chainId === o.balance.token.chainId);
        const filteredOptions = newOptions.filter(isSupported);
        if (filteredOptions.length < newOptions.length) {
          log(
            `[WALLET]: skipping ${
              newOptions.length - filteredOptions.length
            } unsupported-chain balances on ${address}`
          );
        }

        setOptions(filteredOptions);
      } catch (error) {
        console.error(error);
      } finally {
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
    stablePreferredChains,
    stablePreferredTokens,
    stableEvmChains,
    trpc,
  ]);

  return {
    options,
    isLoading,
  };
}
