import { WalletPaymentOption } from "@rozoai/intent-common";
import { useCallback, useEffect, useState } from "react";
import { useStellar } from "../provider/StellarContextProvider";
import {
  STELLAR_XLM_TOKEN_INFO,
  STELLAR_USDC_TOKEN_INFO,
  STELLAR_USDC_ASSET_CODE,
  STELLAR_USDC_ISSUER_PK,
} from "../constants/rozoConfig";

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
}: {
  address: string | undefined;
  usdRequired: number | undefined;
  isDepositFlow: boolean;
}) {
  const [options, setOptions] = useState<WalletPaymentOption[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { server, account } = useStellar();

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
   * Fetches the current XLM price from an external API
   */
  const fetchXlmPrice = async (): Promise<number> => {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd"
      );
      const data = await response.json();
      return data.stellar.usd;
    } catch (error) {
      console.error("Error fetching XLM price:", error);
      return STELLAR_XLM_TOKEN_INFO.usd; // Fallback to default price
    }
  };

  /**
   * Processes a native XLM balance
   */
  const processXlmBalance = async (
    balance: StellarBalance,
    usdRequired: number
  ): Promise<WalletPaymentOption> => {
    // Get current XLM price
    const xlmPrice = await fetchXlmPrice();

    // Create a copy of the token info to avoid mutating the original
    const xlmTokenInfo = {
      ...STELLAR_XLM_TOKEN_INFO,
      usd: xlmPrice,
      priceFromUsd: 1 / xlmPrice,
    };

    // Calculate amounts
    const amount = parseFloat(balance.balance);

    return createPaymentOption({
      token: xlmTokenInfo,
      balance: amount,
      minimumRequired: 0, // Minimum required for XLM
      fees: 0.00001, // Standard XLM transaction fee
      usdRequired,
    });
  };

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

      setIsLoading(true);
      try {
        const structuredBalances: WalletPaymentOption[] = [];

        // Process XLM (native) balance
        const nativeBalance = account?.balances.find(
          (b) => b.asset_type === "native"
        );

        console.log("Balances:", account?.balances);
        console.log("Native Balance:", nativeBalance);

        if (nativeBalance) {
          const xlmOption = await processXlmBalance(nativeBalance, usdRequired);
          structuredBalances.push(xlmOption);
        }

        // Process USDC balance
        const usdcBalance = account?.balances.find(
          (b) =>
            b.asset_type === "credit_alphanum4" &&
            b.asset_code === STELLAR_USDC_ASSET_CODE &&
            b.asset_issuer === STELLAR_USDC_ISSUER_PK
        );

        const usdcOption = processUsdcBalance(usdcBalance, usdRequired);
        structuredBalances.push(usdcOption);

        setOptions(structuredBalances);
        console.log(
          "Structured Balances:",
          JSON.stringify(structuredBalances, null, 2)
        );
      } catch (error) {
        console.error("Error fetching balances:", error);
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      server,
      usdRequired,
      account,
      createPaymentOption,
      processXlmBalance,
      processUsdcBalance,
    ]
  );

  useEffect(() => {
    if (address && usdRequired !== undefined && account) {
      fetchBalances(address);
    }
  }, [address, usdRequired, account]);

  return {
    options,
    isLoading,
  };
}
