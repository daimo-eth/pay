import { baseUSDC } from "@rozoai/intent-common";
import { useMemo } from "react";
import { PayParams } from "../payment/paymentFsm";

/**
 * Return type for the useSolanaDestination hook
 */
interface SolanaDestinationResult {
  /** The middleware address to use for the transaction */
  readonly destinationAddress: string | undefined;
  /** Whether this is a Solana payment (Pay In Solana scenarios) */
  readonly isSolanaPayment: boolean;
  /** Pay In Solana, Pay out Solana scenario */
  readonly isPayInSolanaOutSolana: boolean;
  /** Pay In Solana, Pay Out Base scenario */
  readonly isPayInSolanaOutBase: boolean;
  /** Whether toSolanaAddress is provided and not empty */
  readonly hasToSolanaAddress: boolean;
  /** Whether the payout destination is Base USDC */
  readonly isPayOutToBase: boolean;
  /** Pay In Base, Pay Out Solana scenario */
  readonly isPayInBaseOutSolana: boolean;
}

/**
 * Hook to determine the correct destination address for Solana transactions.
 *
 * Handles Pay In Solana scenarios:
 * 1. Pay In Solana, Pay out Solana - use toSolanaAddress
 *
 * @param payParams - Payment parameters containing transaction details
 * @returns Object with destination address and payment scenario flags
 */
export function useSolanaDestination(
  payParams?: PayParams
): SolanaDestinationResult {
  const hasToSolanaAddress = useMemo((): boolean => {
    const address = payParams?.toSolanaAddress;
    return Boolean(address && address.trim() !== "");
  }, [payParams?.toSolanaAddress]);

  const isPayOutToBase = useMemo((): boolean => {
    return payParams?.toChain === baseUSDC.chainId;
  }, [payParams?.toChain]);

  const isPayOutToStellar = useMemo((): boolean => {
    return !!payParams?.toStellarAddress;
  }, [payParams?.toChain]);

  const isPayInBaseOutSolana = useMemo((): boolean => {
    return payParams?.toChain === baseUSDC.chainId && hasToSolanaAddress;
  }, [isPayOutToBase, hasToSolanaAddress]);

  const isPayInSolanaOutSolana = useMemo((): boolean => {
    return hasToSolanaAddress;
  }, [hasToSolanaAddress]);

  const isPayInSolanaOutBase = useMemo((): boolean => {
    return isPayOutToBase && !hasToSolanaAddress;
  }, [isPayOutToBase, hasToSolanaAddress]);

  const isPayInSolanaOutStellar = useMemo((): boolean => {
    return isPayOutToStellar && !hasToSolanaAddress;
  }, [isPayOutToStellar, hasToSolanaAddress]);

  const isSolanaPayment = useMemo((): boolean => {
    return isPayInSolanaOutSolana || isPayInSolanaOutBase;
  }, [isPayInSolanaOutSolana, isPayInSolanaOutBase]);

  const destinationAddress = useMemo((): string | undefined => {
    if (isPayInSolanaOutSolana) {
      return payParams?.toSolanaAddress;
    }

    if (isPayInSolanaOutBase) {
      return payParams?.toAddress;
    }

    if (isPayInSolanaOutStellar) {
      return payParams?.toStellarAddress;
    }

    return undefined;
  }, [
    isPayInSolanaOutSolana,
    isPayInSolanaOutBase,
    isPayInSolanaOutStellar,
    payParams?.toAddress,
    payParams?.toSolanaAddress,
    payParams?.toStellarAddress,
  ]);

  return {
    destinationAddress,
    isSolanaPayment,
    isPayInSolanaOutSolana,
    isPayInSolanaOutBase,
    hasToSolanaAddress,
    isPayOutToBase,
    isPayInBaseOutSolana,
  } as const;
}
