import {
  DaimoPayOrderMode,
  ExternalPaymentOptionMetadata,
  ExternalPaymentOptions,
  PlatformType,
} from "@daimo/pay-common";
import { useEffect, useState } from "react";
import { TrpcClient } from "../utils/trpc";

const DEFAULT_EXTERNAL_PAYMENT_OPTIONS = Object.values(
  ExternalPaymentOptions,
).filter(
  (opt) =>
    // Solana and ExternalChains are handled in the SelectMethod component.
    opt !== ExternalPaymentOptions.Solana &&
    opt !== ExternalPaymentOptions.ExternalChains &&
    opt !== ExternalPaymentOptions.Daimo,
);

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
  mode: DaimoPayOrderMode | undefined;
}): {
  /// Exteral options, organized by optionType
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

  useEffect(() => {
    const refreshExternalPaymentOptions = async (
      usd: number,
      mode: DaimoPayOrderMode,
    ) => {
      if (!platform) return;

      setLoading(true);
      try {
        const newOptions = await trpc.getExternalPaymentOptions.query({
          platform,
          mode,
          usdRequired: usd,
        });

        // Filter out options not in options JSON
        const enabledExtPaymentOptions =
          filterIds || DEFAULT_EXTERNAL_PAYMENT_OPTIONS;

        const hasAllPaymentApps = enabledExtPaymentOptions.includes(
          ExternalPaymentOptions.AllPaymentApps,
        );
        const hasAllExchanges = enabledExtPaymentOptions.includes(
          ExternalPaymentOptions.AllExchanges,
        );

        const filteredOptions = newOptions.filter(
          (option: ExternalPaymentOptionMetadata) =>
            enabledExtPaymentOptions.includes(option.id) ||
            (hasAllPaymentApps && option.optionType === "zkp2p") ||
            (hasAllExchanges && option.optionType === "exchange"),
        );
        const optionsByType: Map<
          "external" | "zkp2p" | "exchange",
          ExternalPaymentOptionMetadata[]
        > = new Map();
        filteredOptions.forEach((option) => {
          const { optionType } = option;
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
    // TODO: this is an ugly way to handle polling/refresh
    // Notice the load-bearing JSON.stringify() to prevent a visible infinite
    // refresh glitch on the SelectMethod screen. Replace this useEffect().
    //
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usdRequired, JSON.stringify(filterIds), platform, mode, trpc]);

  return { options, loading };
}
