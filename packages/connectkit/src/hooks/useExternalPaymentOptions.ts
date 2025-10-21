import {
  DaimoPayOrderMode,
  ExternalPaymentOptionMetadata,
  ExternalPaymentOptions,
  isAddressOption,
  isExchangeOption,
  isPaymentAppOption,
  isWalletOption,
  ParsedPaymentOptions,
  parsePaymentOptions,
  PaymentOptionsConfig,
  PlatformType,
} from "@daimo/pay-common";
import { useEffect, useMemo, useState } from "react";
import { TrpcClient } from "../utils/trpc";

export function useExternalPaymentOptions({
  trpc,
  paymentOptionsConfig,
  platform,
  usdRequired,
  mode,
}: {
  trpc: TrpcClient;
  paymentOptionsConfig: PaymentOptionsConfig | undefined;
  platform: PlatformType | undefined;
  usdRequired: number | undefined;
  mode: DaimoPayOrderMode | undefined;
}): {
  /// External options, organized by optionType
  options: Map<
    "external" | "zkp2p" | "exchange",
    ExternalPaymentOptionMetadata[]
  >;
  loading: boolean;
  parsedConfig: ParsedPaymentOptions;
} {
  const [options, setOptions] = useState<
    Map<"external" | "zkp2p" | "exchange", ExternalPaymentOptionMetadata[]>
  >(new Map());
  const [loading, setLoading] = useState(false);

  const parsedConfig = useMemo(
    () => parsePaymentOptions(paymentOptionsConfig),
    [paymentOptionsConfig],
  );

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

        const { topLevelOptions, walletOrder, exchangeOrder, addressOrder } =
          parsedConfig;

        const hasAllWallets = topLevelOptions.includes(
          ExternalPaymentOptions.AllWallets,
        );
        const hasAllExchanges = topLevelOptions.includes(
          ExternalPaymentOptions.AllExchanges,
        );
        const hasAllPaymentApps = topLevelOptions.includes(
          ExternalPaymentOptions.AllPaymentApps,
        );
        const hasAllAddress = topLevelOptions.includes(
          ExternalPaymentOptions.AllAddress,
        );

        const filteredOptions = newOptions.filter(
          (option: ExternalPaymentOptionMetadata) => {
            if (topLevelOptions.includes(option.id)) return true;
            if (hasAllWallets && isWalletOption(option.id)) return true;
            if (hasAllExchanges && isExchangeOption(option.id)) return true;
            if (hasAllPaymentApps && isPaymentAppOption(option.id)) return true;
            if (hasAllAddress && isAddressOption(option.id)) return true;
            return false;
          },
        );

        // apply ordering
        const applyOrdering = (
          opts: ExternalPaymentOptionMetadata[],
          order: ExternalPaymentOptions[],
        ): ExternalPaymentOptionMetadata[] => {
          if (order.length === 0) return opts;
          const ordered: ExternalPaymentOptionMetadata[] = [];
          const remaining = [...opts];
          for (const orderId of order) {
            const idx = remaining.findIndex((o) => o.id === orderId);
            if (idx !== -1) {
              ordered.push(remaining[idx]);
              remaining.splice(idx, 1);
            }
          }
          return ordered;
        };

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

        // apply wallet ordering
        if (walletOrder.length > 0) {
          const external = optionsByType.get("external") || [];
          optionsByType.set("external", applyOrdering(external, walletOrder));
        }

        // apply exchange ordering
        if (exchangeOrder.length > 0) {
          const exchanges = optionsByType.get("exchange") || [];
          optionsByType.set(
            "exchange",
            applyOrdering(exchanges, exchangeOrder),
          );
        }

        // apply zkp2p ordering (payment apps)
        const zkp2pOrder = topLevelOptions.filter(isPaymentAppOption);
        if (zkp2pOrder.length > 0) {
          const zkp2p = optionsByType.get("zkp2p") || [];
          optionsByType.set("zkp2p", applyOrdering(zkp2p, zkp2pOrder));
        }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usdRequired, JSON.stringify(parsedConfig), platform, mode, trpc]);

  return { options, loading, parsedConfig };
}
