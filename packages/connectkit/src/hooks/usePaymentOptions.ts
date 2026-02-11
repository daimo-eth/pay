import {
  DepositAddressPaymentOptionMetadata,
  ExternalPaymentOptionMetadata,
  ExternalPaymentOptions,
  PlatformType,
  supportedChains,
  WalletPaymentOption,
} from "@daimo/pay-common";
import { useEffect, useMemo, useState } from "react";
import { Address } from "viem";
import { inferTopLevelFromArray } from "../constants/paymentOptions";
import { TrpcClient } from "../utils/trpc";

const DEFAULT_EXTERNAL_PAYMENT_OPTIONS = Object.values(
  ExternalPaymentOptions,
).filter((opt) => opt !== ExternalPaymentOptions.AllAddresses);

export type PaymentOptionsResult = {
  externalPaymentOptions: {
    options: Map<"external" | "exchange", ExternalPaymentOptionMetadata[]>;
    loading: boolean;
    parsedConfig: { walletOrder: string[] };
  };
  walletPaymentOptions: {
    options: WalletPaymentOption[] | null;
    isLoading: boolean;
  };
  solanaPaymentOptions: {
    options: WalletPaymentOption[] | null;
    isLoading: boolean;
  };
  depositAddressOptions: {
    options: DepositAddressPaymentOptionMetadata[];
    loading: boolean;
  };
};

export function usePaymentOptions({
  trpc,
  appId,
  orderId,
  isDepositFlow,
  usdRequired,
  solanaPubKey,
  ethWalletAddress,
  platform,
  // For filtering/preferences from order metadata
  filterIds,
  preferredChains,
  preferredTokens,
  evmChains,
  destChainId,
  passthroughTokens,
  destAddress,
  log,
}: {
  trpc: TrpcClient;
  appId: string | undefined;
  orderId: bigint | undefined;
  isDepositFlow: boolean;
  usdRequired: number | undefined;
  solanaPubKey: string | undefined;
  ethWalletAddress: string | undefined;
  platform: PlatformType | undefined;
  filterIds: (string | string[])[] | undefined;
  preferredChains: number[] | undefined;
  preferredTokens: { chain: number; address: string }[] | undefined;
  evmChains: number[] | undefined;
  destChainId: number | undefined;
  passthroughTokens: { chain: number; address: string }[] | undefined;
  destAddress: Address | undefined;
  log: (msg: string) => void;
}): PaymentOptionsResult {
  // State for each option type
  const [externalOptions, setExternalOptions] = useState<
    Map<"external" | "exchange", ExternalPaymentOptionMetadata[]>
  >(new Map());
  const [walletOptions, setWalletOptions] = useState<
    WalletPaymentOption[] | null
  >(null);
  const [solanaOptions, setSolanaOptions] = useState<
    WalletPaymentOption[] | null
  >(null);
  const [depositOptions, setDepositOptions] = useState<
    DepositAddressPaymentOptionMetadata[]
  >([]);
  const [parsedConfig, setParsedConfig] = useState<{ walletOrder: string[] }>({
    walletOrder: [],
  });
  const [loading, setLoading] = useState(false);

  // Memoize array dependencies
  const memoizedPreferredChains = useMemo(
    () => preferredChains,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(preferredChains)],
  );
  const memoizedPreferredTokens = useMemo(
    () => preferredTokens,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(preferredTokens)],
  );
  const memoizedEvmChains = useMemo(
    () => evmChains,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(evmChains)],
  );
  const memoizedFilterIds = useMemo(
    () => filterIds,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(filterIds)],
  );

  useEffect(() => {
    const fetchPaymentOptions = async () => {
      // Must have platform and at least one of appId or orderId
      if (!platform) return;
      if (!appId && !orderId) return;
      // Non-deposit flows require orderId or amount
      if (!isDepositFlow && !orderId && !usdRequired) return;

      setLoading(true);
      try {
        const result = await trpc.getPaymentOptionsV1.query({
          appId,
          orderId: orderId?.toString(),
          platform,
          ethWalletAddress: ethWalletAddress as Address | undefined,
          preferredChains: memoizedPreferredChains,
          preferredTokens: memoizedPreferredTokens,
          evmChains: memoizedEvmChains,
          destChainId,
          solanaPubKey,
          usdRequired,
          isDepositFlow,
        });

        // Process external options (filter and group by type)
        let walletOrder: string[] = [];
        if (memoizedFilterIds) {
          const nestedArray = memoizedFilterIds.find((opt) =>
            Array.isArray(opt),
          );
          if (nestedArray && Array.isArray(nestedArray)) {
            walletOrder = nestedArray as string[];
          }
        }
        setParsedConfig({ walletOrder });

        const flatFilterIds = memoizedFilterIds
          ? memoizedFilterIds.flatMap((opt) =>
              Array.isArray(opt)
                ? (inferTopLevelFromArray(opt as string[]) ?? "AllWallets")
                : opt,
            )
          : null;
        const enabledExtPaymentOptions =
          flatFilterIds || DEFAULT_EXTERNAL_PAYMENT_OPTIONS;
        const hasAllExchanges = enabledExtPaymentOptions.includes(
          ExternalPaymentOptions.AllExchanges,
        );

        const filteredExternal = result.externalOptions.filter(
          (option: ExternalPaymentOptionMetadata) =>
            enabledExtPaymentOptions.includes(option.id) ||
            (hasAllExchanges && option.optionType === "exchange"),
        );
        const optionsByType = new Map<
          "external" | "exchange",
          ExternalPaymentOptionMetadata[]
        >();
        filteredExternal.forEach((option: ExternalPaymentOptionMetadata) => {
          const { optionType } = option;
          if (!optionsByType.has(optionType)) {
            optionsByType.set(optionType, []);
          }
          optionsByType.get(optionType)!.push(option);
        });
        setExternalOptions(optionsByType);

        // Process wallet options (filter unsupported chains, add passthrough)
        if (result.walletOptions.length > 0) {
          const isSupported = (o: WalletPaymentOption) =>
            supportedChains.some((c) => c.chainId === o.balance.token.chainId);
          const filtered = result.walletOptions.filter(isSupported);
          if (filtered.length < result.walletOptions.length) {
            log(
              `[WALLET]: skipping ${result.walletOptions.length - filtered.length} unsupported-chain balances`,
            );
          }
          if (destAddress) {
            addPassthroughTokens(filtered, passthroughTokens, destAddress);
          }
          setWalletOptions(filtered);
        } else {
          setWalletOptions(ethWalletAddress ? [] : null);
        }

        // Solana options
        setSolanaOptions(solanaPubKey ? result.solanaOptions : null);

        // Deposit address options
        setDepositOptions(result.depositAddressOptions);
      } catch (error) {
        console.error("[usePaymentOptions] error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentOptions();
  }, [
    trpc,
    appId,
    orderId,
    isDepositFlow,
    usdRequired,
    solanaPubKey,
    ethWalletAddress,
    platform,
    memoizedPreferredChains,
    memoizedPreferredTokens,
    memoizedEvmChains,
    memoizedFilterIds,
    destChainId,
    destAddress,
    passthroughTokens,
    log,
  ]);

  return {
    externalPaymentOptions: {
      options: externalOptions,
      loading,
      parsedConfig,
    },
    walletPaymentOptions: {
      options: walletOptions,
      isLoading: loading,
    },
    solanaPaymentOptions: {
      options: solanaOptions,
      isLoading: loading,
    },
    depositAddressOptions: {
      options: depositOptions,
      loading,
    },
  };
}

/** Updates and sorts `options`, marking the relevant oneas as pass-through. */
export function addPassthroughTokens(
  options: WalletPaymentOption[],
  passthroughTokens: { chain: number; address: string }[] | undefined,
  passthroughAddress: Address,
) {
  if (passthroughTokens == null) return;

  for (const option of options) {
    const tok = option.balance.token;
    if (option.disabledReason != null) continue;
    const found = passthroughTokens.find(
      (t) => t.address === tok.token && t.chain == tok.chainId,
    );
    if (found == null) continue;

    option.passthroughAddress = passthroughAddress;
  }
}
