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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    address,
    usdRequired,
    destChainId,
    isDepositFlow,
    memoizedPreferredChains,
    memoizedPreferredTokens,
    memoizedEvmChains,
  ]);

  return {
    options,
    isLoading,
  };
}
