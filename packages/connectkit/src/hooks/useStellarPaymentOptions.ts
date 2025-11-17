import { rozoStellarUSDC, WalletPaymentOption } from "@rozoai/intent-common";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  STELLAR_USDC_TOKEN_INFO,
  STELLAR_XLM_TOKEN_INFO,
} from "../constants/rozoConfig";
import { PayParams } from "../payment/paymentFsm";
import { useStellar } from "../provider/StellarContextProvider";
import { createRefreshFunction } from "./refreshUtils";

// Define the BigIntStr type to match the common package
type BigIntStr = `${bigint}`;

// Define StellarBalance interface for type safety
interface StellarBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

/** Wallet payment options. User picks one. */
export function useStellarPaymentOptions({
  address,
  usdRequired,
  isDepositFlow,
  payParams,
}: {
  address: string | undefined;
  usdRequired: number | undefined;
  isDepositFlow: boolean;
  payParams: PayParams | undefined;
}) {
  const [options, setOptions] = useState<WalletPaymentOption[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  const stableAppId = useMemo(() => {
    return payParams?.appId;
  }, [payParams?.appId]);

  const { server, account, isAccountExists, refreshAccount } = useStellar();

  const usdcBalance = useMemo(
    () =>
      account?.balances.find(
        (b) =>
          b.asset_type === "credit_alphanum4" &&
          b.asset_code === "USDC" &&
          b.asset_issuer === rozoStellarUSDC.token
      ),
    [account]
  );

  // --- ⭐️ Updated function to fetch and structure balances to match JSON format ---
  /**
   * Converts a floating point number to a BigInt string with proper decimal precision
   */
  const toBigIntString = useCallback(
    (amount: number, decimals: number): BigIntStr => {
      return BigInt(
        Math.round(amount * 10 ** decimals)
      ).toString() as BigIntStr;
    },
    []
  );

  /**
   * Creates a token amount object with proper formatting
   */
  const createTokenAmount = useCallback(
    (token: typeof STELLAR_XLM_TOKEN_INFO, amount: number) => {
      return {
        token,
        amount: toBigIntString(amount, token.decimals),
        usd: amount * token.usd,
      };
    },
    [toBigIntString]
  );

  /**
   * Creates a payment option with all required fields
   */
  const createPaymentOption = useCallback(
    (params: {
      token: typeof STELLAR_XLM_TOKEN_INFO;
      balance: number;
      minimumRequired: number;
      fees: number;
      usdRequired: number;
    }): WalletPaymentOption => {
      const { token, balance, minimumRequired, fees, usdRequired } = params;
      const balanceUsd = balance * token.usd;
      const requiredAmount = usdRequired / token.usd;

      return {
        balance: createTokenAmount(token, balance),
        minimumRequired: createTokenAmount(token, minimumRequired),
        fees: createTokenAmount(token, fees),
        required: createTokenAmount(token, requiredAmount),
        disabledReason:
          balanceUsd < usdRequired
            ? `Balance of $${balanceUsd.toFixed(
                2
              )} is less than required $${usdRequired.toFixed(2)}`
            : undefined,
      };
    },
    [createTokenAmount]
  );

  /**
   * Processes a USDC balance
   */
  const processUsdcBalance = (
    balance: StellarBalance | undefined,
    usdRequired: number
  ): WalletPaymentOption => {
    const amount = balance ? parseFloat(balance.balance) : 0;

    return createPaymentOption({
      token: STELLAR_USDC_TOKEN_INFO,
      balance: amount,
      minimumRequired: 0,
      fees: 0,
      usdRequired,
    });
  };

  /**
   * Main function to fetch balances and create payment options
   */
  const fetchBalances = useCallback(
    async (pk: string) => {
      if (!pk || !server || usdRequired === undefined) return;

      setIsRequesting(true);
      setIsLoading(true);
      try {
        // Process USDC balance
        const usdcBalance = account?.balances.find(
          (b) =>
            b.asset_type === "credit_alphanum4" &&
            b.asset_code === "USDC" &&
            b.asset_issuer === rozoStellarUSDC.token
        );

        const usdcOption = processUsdcBalance(usdcBalance, usdRequired);
        setOptions([usdcOption]);
      } catch (error) {
        console.error("Error fetching balances:", error);
        setOptions([]);
      } finally {
        setIsLoading(false);
        setIsRequesting(false);
      }
    },
    [
      server,
      usdRequired,
      account,
      isAccountExists,
      createPaymentOption,
      processUsdcBalance,
    ]
  );

  // Keep loading state until we have attempted to fetch balances
  useEffect(() => {
    if (
      address &&
      usdRequired !== undefined &&
      account &&
      isAccountExists &&
      !isRequesting
    ) {
      // Only set loading to false if we have options or completed a fetch attempt
      if (options !== null) {
        setIsLoading(false);
      }
    }
  }, [address, usdRequired, account, isAccountExists, isRequesting, options]);

  // Reset loading state when address changes (new wallet connection)
  useEffect(() => {
    if (address) {
      setIsLoading(true);
      setOptions(null);
    }
  }, [address]);

  useEffect(() => {
    if (address && usdRequired !== undefined && account && isAccountExists) {
      fetchBalances(address);
    }
  }, [address, usdRequired, account, isAccountExists]);

  // Create refresh function using shared utility
  const refreshOptions = createRefreshFunction(
    () =>
      address && usdRequired !== undefined
        ? refreshAccount()
        : Promise.resolve(undefined),
    {
      lastExecutedParams: { current: null },
      isApiCallInProgress: { current: false },
    }
  );

  const filteredOptions = useMemo(() => {
    return [processUsdcBalance(usdcBalance, usdRequired ?? 0)];
  }, [usdcBalance, usdRequired]);

  return {
    options: filteredOptions,
    isLoading,
    refreshOptions,
  };
}
