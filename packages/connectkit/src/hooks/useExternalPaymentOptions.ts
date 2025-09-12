import {
  ExternalPaymentOptionMetadata,
  ExternalPaymentOptions,
  PlatformType,
  RozoPayOrderMode,
} from "@rozoai/intent-common";
import { useEffect, useMemo, useState } from "react";
import { TrpcClient } from "../utils/trpc";

/**
 * DEFAULT EXTERNAL PAYMENT OPTIONS
 *
 * These are the external payment methods available by default, excluding options
 * that are handled separately in the SelectMethod component.
 *
 * EXCLUDED FROM DEFAULT LIST:
 * - Solana: Handled separately in SelectMethod component for Solana wallet integration
 * - ExternalChains: Handled separately for multi-chain wallet connections
 * - Rozo: Internal routing, not an external payment method
 * - Stellar: Handled separately in SelectMethod component for Stellar wallet integration
 *
 * INCLUDED EXTERNAL PAYMENT OPTIONS:
 * - Exchanges: Coinbase, Binance, Lemon + AllExchanges
 * - Payment Apps (ZKP2P): Venmo, CashApp, MercadoPago, Revolut, Wise + AllPaymentApps
 * - Other: RampNetwork
 */
const DEFAULT_EXTERNAL_PAYMENT_OPTIONS = Object.values(
  ExternalPaymentOptions
).filter(
  (opt) =>
    // Solana and ExternalChains are handled in the SelectMethod component.
    opt !== ExternalPaymentOptions.Solana &&
    opt !== ExternalPaymentOptions.ExternalChains &&
    opt !== ExternalPaymentOptions.Rozo &&
    opt !== ExternalPaymentOptions.Stellar
);

/**
 * External payment options hook for non-wallet payment methods.
 *
 * This hook manages external payment options by:
 * 1. Fetching available external payment methods from the API
 * 2. Organizing them by payment type (external, zkp2p, exchange)
 * 3. Filtering based on enabled payment options and platform requirements
 *
 * EXTERNAL PAYMENT OPTION TYPES:
 * - "exchange": Cryptocurrency exchanges (Coinbase, Binance, Lemon)
 * - "zkp2p": Zero-Knowledge Proof to Payment apps (Venmo, CashApp, MercadoPago, Revolut, Wise)
 * - "external": Other external methods (RampNetwork, deposit addresses)
 *
 * SPECIAL FILTER OPTIONS:
 * - AllPaymentApps: Automatically includes all ZKP2P payment apps
 * - AllExchanges: Automatically includes all exchange options
 *
 * Note: Currently returns hardcoded Coinbase option as example.
 * Production API call is commented out - uncomment when API is ready.
 */
export function useExternalPaymentOptions({
  trpc,
  filterIds,
  platform,
  usdRequired,
  mode,
}: {
  trpc: TrpcClient;
  filterIds: string[] | undefined;
  platform: PlatformType | undefined;
  usdRequired: number | undefined;
  mode: RozoPayOrderMode | undefined;
}): {
  /// External options, organized by optionType
  options: Map<
    "external" | "zkp2p" | "exchange",
    ExternalPaymentOptionMetadata[]
  >;
  loading: boolean;
} {
  const [options, setOptions] = useState<
    Map<"external" | "zkp2p" | "exchange", ExternalPaymentOptionMetadata[]>
  >(new Map());
  const [loading, setLoading] = useState(false);

  // Create stable filterIds dependency that only changes when content actually changes
  const stableFilterIds = useMemo(() => {
    if (!filterIds) return null;
    // Sort to ensure consistent comparison
    return [...filterIds].sort();
  }, [filterIds]);

  useEffect(() => {
    const refreshExternalPaymentOptions = async (
      usd: number,
      mode: RozoPayOrderMode
    ) => {
      if (!platform) return;

      setLoading(true);
      try {
        // PRODUCTION API CALL (currently commented out)
        // Uncomment when the getExternalPaymentOptions API endpoint is ready
        // const newOptions = await trpc.getExternalPaymentOptions.query({
        //   platform,
        //   mode,
        //   usdRequired: usd,
        // });

        // TEMPORARY HARDCODED EXAMPLE OPTIONS
        // This provides a sample Coinbase exchange option for testing
        // In production, this will be replaced by the API response above
        const newOptions: ExternalPaymentOptionMetadata[] = [
          {
            id: ExternalPaymentOptions.Coinbase, // Must match ExternalPaymentOptions enum value
            optionType: "exchange" as const, // Categorizes this as an exchange payment method
            paymentToken: {
              chainId: 8453, // Base chain
              token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
              symbol: "USDC",
              usd: 1,
              priceFromUsd: 1,
              decimals: 6,
              displayDecimals: 2,
              logoSourceURI: "https://pay.daimo.com/coin-logos/usdc.png",
              logoURI: "https://pay.daimo.com/coin-logos/usdc.png",
              maxAcceptUsd: 100000,
              maxSendUsd: 0,
            },
            cta: "Pay with Coinbase", // Call-to-action button text
            logoURI: "https://pay.daimo.com/wallet-logos/coinbase-logo.svg",
            logoShape: "circle" as const, // UI styling for logo
            disabled: true, // Currently disabled
            message: "Minimum $5.00", // User-facing message about restrictions
            minimumUsd: 5, // Minimum payment amount
          },
        ];

        // PAYMENT OPTION FILTERING
        // Use provided filterIds or fall back to default external payment options
        const enabledExtPaymentOptions =
          filterIds || DEFAULT_EXTERNAL_PAYMENT_OPTIONS;

        // Check for special "All" options that include entire categories
        const hasAllPaymentApps = enabledExtPaymentOptions.includes(
          ExternalPaymentOptions.AllPaymentApps // Includes all ZKP2P payment apps
        );
        const hasAllExchanges = enabledExtPaymentOptions.includes(
          ExternalPaymentOptions.AllExchanges // Includes all exchange options
        );

        // Filter options based on:
        // 1. Explicit inclusion in enabledExtPaymentOptions
        // 2. Category inclusion via "All" options (AllPaymentApps includes all zkp2p, etc.)
        const filteredOptions = newOptions.filter(
          (option: ExternalPaymentOptionMetadata) =>
            enabledExtPaymentOptions.includes(option.id) ||
            (hasAllPaymentApps && option.optionType === "zkp2p") ||
            (hasAllExchanges && option.optionType === "exchange")
        );
        // ORGANIZE OPTIONS BY TYPE
        // Group filtered options into categories for UI organization:
        // - "exchange": Coinbase, Binance, Lemon
        // - "zkp2p": Venmo, CashApp, MercadoPago, Revolut, Wise
        // - "external": RampNetwork, deposit addresses
        const optionsByType: Map<
          "external" | "zkp2p" | "exchange",
          ExternalPaymentOptionMetadata[]
        > = new Map();

        filteredOptions.forEach((option) => {
          const optionType = option.optionType as
            | "external"
            | "zkp2p"
            | "exchange";
          if (!optionsByType.has(optionType)) {
            optionsByType.set(optionType, []);
          }
          optionsByType.get(optionType)!.push(option);
        });

        setOptions(optionsByType);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (usdRequired != null && mode != null) {
      refreshExternalPaymentOptions(usdRequired, mode);
    }
  }, [usdRequired, stableFilterIds, platform, mode, trpc]);

  return { options, loading };
}
