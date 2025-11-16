import { baseUSDC } from "@rozoai/intent-common";
import { useMemo } from "react";
import { PayParams } from "../payment/paymentFsm";

/**
 * Return type for the useStellarDestination hook
 */
interface StellarDestinationResult {
  /** The middleware address to use for the transaction */
  readonly destinationAddress: string | undefined;
  /** Whether this is a Stellar payment (Pay In Stellar scenarios) */
  readonly isStellarPayment: boolean;
  /** Pay In Stellar, Pay out Stellar scenario */
  readonly isPayInStellarOutStellar: boolean;
  /** Pay In Stellar, Pay Out Base scenario */
  readonly isPayInStellarOutBase: boolean;
  /** Whether toStellarAddress is provided and not empty */
  readonly hasToStellarAddress: boolean;
  /** Whether the payout destination is Base USDC */
  readonly isPayOutToBase: boolean;
  /** Pay In Base, Pay Out Stellar scenario */
  readonly isPayInBaseOutStellar: boolean;
}

/**
 * Hook to determine the correct destination address for Stellar transactions.
 *
 * Handles Pay In Stellar scenarios:
 * 1. Pay In Stellar, Pay out Stellar - use toStellarAddress
 *
 * @param payParams - Payment parameters containing transaction details
 * @returns Object with destination address and payment scenario flags
 */
export function useStellarDestination(
  payParams?: PayParams
): StellarDestinationResult {
  const hasToStellarAddress = useMemo((): boolean => {
    const address = payParams?.toStellarAddress;
    return Boolean(address && address.trim() !== "");
  }, [payParams?.toStellarAddress]);

  const isPayOutToBase = useMemo((): boolean => {
    return payParams?.toChain === baseUSDC.chainId;
  }, [payParams?.toChain]);

  const isPayInBaseOutStellar = useMemo((): boolean => {
    return payParams?.toChain === baseUSDC.chainId && hasToStellarAddress;
  }, [isPayOutToBase, hasToStellarAddress]);

  const isPayInStellarOutStellar = useMemo((): boolean => {
    return hasToStellarAddress;
  }, [hasToStellarAddress]);

  const isPayInStellarOutBase = useMemo((): boolean => {
    return isPayOutToBase && !hasToStellarAddress;
  }, [isPayOutToBase, hasToStellarAddress]);

  const isStellarPayment = useMemo((): boolean => {
    return isPayInStellarOutStellar || isPayInStellarOutBase;
  }, [isPayInStellarOutStellar, isPayInStellarOutBase]);

  const destinationAddress = useMemo((): string | undefined => {
    return (
      payParams?.toStellarAddress ||
      payParams?.toSolanaAddress ||
      payParams?.toAddress
    );
  }, [payParams]);

  return {
    destinationAddress,
    isStellarPayment,
    isPayInStellarOutStellar,
    isPayInStellarOutBase,
    hasToStellarAddress,
    isPayOutToBase,
    isPayInBaseOutStellar,
  } as const;
}
