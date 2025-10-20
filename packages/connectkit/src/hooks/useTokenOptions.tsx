import {
  getChainName,
  RozoPayToken,
  WalletPaymentOption,
} from "@rozoai/intent-common";
import { useCallback, useEffect, useRef } from "react";
import { Option } from "../components/Common/OptionsList";
import TokenChainLogo from "../components/Common/TokenChainLogo";
import { ROUTES } from "../constants/routes";
import { formatUsd, roundTokenAmount } from "../utils/format";
import { usePayContext } from "./usePayContext";

/// Gets token options when paying from a connected wallet. Supports both EVM
/// and Solana tokens. See OptionsList.
export function useTokenOptions(mode: "evm" | "solana" | "stellar" | "all"): {
  optionsList: Option[];
  isLoading: boolean;
  refreshOptions: () => Promise<void>;
} {
  const { setRoute, paymentState } = usePayContext();
  const {
    isDepositFlow,
    walletPaymentOptions,
    solanaPaymentOptions,
    stellarPaymentOptions,
    setSelectedTokenOption,
    setSelectedSolanaTokenOption,
    setSelectedStellarTokenOption,
  } = paymentState;

  let optionsList: Option[] = [];
  let isLoading = false;
  let hasAnyData = false;

  if (["evm", "all"].includes(mode)) {
    const evmOptions = getEvmTokenOptions(
      walletPaymentOptions.options ?? [],
      isDepositFlow,
      setSelectedTokenOption,
      setRoute
    );
    optionsList.push(...evmOptions);
    isLoading ||= walletPaymentOptions.isLoading;
    hasAnyData ||= (walletPaymentOptions.options?.length ?? 0) > 0;
  }

  if (["solana", "all"].includes(mode)) {
    const solanaOptions = getSolanaTokenOptions(
      solanaPaymentOptions.options ?? [],
      isDepositFlow,
      setSelectedSolanaTokenOption,
      setRoute
    );
    optionsList.push(...solanaOptions);
    isLoading ||= solanaPaymentOptions.isLoading;
    hasAnyData ||= (solanaPaymentOptions.options?.length ?? 0) > 0;
  }

  if (["stellar", "all"].includes(mode)) {
    const stellarOptions = getStellarTokenOptions(
      stellarPaymentOptions.options ?? [],
      isDepositFlow,
      setSelectedStellarTokenOption,
      setRoute
    );
    optionsList.push(...stellarOptions);
    isLoading ||= stellarPaymentOptions.isLoading;
    hasAnyData ||= (stellarPaymentOptions.options?.length ?? 0) > 0;
  }

  optionsList.sort((a, b) => {
    const dDisabled = (a.disabled ? 1 : 0) - (b.disabled ? 1 : 0);
    if (dDisabled !== 0) return dDisabled;
    const dSort = (b.sortValue ?? 0) - (a.sortValue ?? 0);
    return dSort;
  });

  // Smart refresh function that only refreshes hooks that need it
  const refreshOptions = useCallback(async () => {
    const { ethWalletAddress, solanaPubKey, stellarPubKey } = paymentState;
    const refreshPromises: Promise<void>[] = [];

    // Only refresh EVM options if we have EVM address and need EVM data
    if (
      ["evm", "all"].includes(mode) &&
      ethWalletAddress &&
      (!walletPaymentOptions.options ||
        walletPaymentOptions.options.length === 0)
    ) {
      refreshPromises.push(walletPaymentOptions.refreshOptions());
    }

    // Only refresh Solana options if we have Solana address and need Solana data
    if (
      ["solana", "all"].includes(mode) &&
      solanaPubKey &&
      (!solanaPaymentOptions.options ||
        solanaPaymentOptions.options.length === 0)
    ) {
      refreshPromises.push(solanaPaymentOptions.refreshOptions());
    }

    // Only refresh Stellar options if we have Stellar address and need Stellar data
    if (
      ["stellar", "all"].includes(mode) &&
      stellarPubKey &&
      (!stellarPaymentOptions.options ||
        stellarPaymentOptions.options.length === 0)
    ) {
      refreshPromises.push(stellarPaymentOptions.refreshOptions());
    }

    await Promise.all(refreshPromises);
  }, [
    mode,
    paymentState.ethWalletAddress,
    paymentState.solanaPubKey,
    paymentState.stellarPubKey,
    paymentState.orderUsdAmount,
    walletPaymentOptions.options,
    solanaPaymentOptions.options,
    stellarPaymentOptions.options,
  ]);

  // Smart refresh that only fetches when necessary
  const debouncedRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshAddresses = useRef<string>("");
  const lastOrderAmount = useRef<number | undefined>(undefined);
  const hasDataForCurrentMode = useRef<boolean>(false);
  const isRefreshingRef = useRef<boolean>(false);

  const smartRefresh = useCallback(() => {
    const { ethWalletAddress, solanaPubKey, stellarPubKey, orderUsdAmount } =
      paymentState;
    const currentAddresses = `${ethWalletAddress || ""}-${solanaPubKey || ""}-${
      stellarPubKey || ""
    }`;

    // Check if we have data for the current mode
    const hasRelevantData = (() => {
      if (mode === "all") {
        return optionsList.length > 0;
      } else if (mode === "evm") {
        return Boolean(
          walletPaymentOptions.options &&
            walletPaymentOptions.options.length > 0
        );
      } else if (mode === "solana") {
        return Boolean(
          solanaPaymentOptions.options &&
            solanaPaymentOptions.options.length > 0
        );
      } else if (mode === "stellar") {
        return Boolean(
          stellarPaymentOptions.options &&
            stellarPaymentOptions.options.length > 0
        );
      }
      return false;
    })();

    // Check if addresses have changed
    const addressesChanged = lastRefreshAddresses.current !== currentAddresses;

    // Check if order amount has changed
    const orderAmountChanged = lastOrderAmount.current !== orderUsdAmount;

    // Only refresh if:
    // 1. Addresses have changed AND we're not already refreshing, OR
    // 2. Order amount has changed AND we're not already refreshing, OR
    // 3. We have no relevant data for the current mode AND we're not already refreshing
    const shouldRefresh =
      (addressesChanged && !isRefreshingRef.current) ||
      (orderAmountChanged && !isRefreshingRef.current) ||
      (!hasRelevantData && !isRefreshingRef.current);

    if (!shouldRefresh) {
      return; // Skip refresh if we already have data for these addresses and mode
    }
    isRefreshingRef.current = true;
    lastRefreshAddresses.current = currentAddresses;
    lastOrderAmount.current = orderUsdAmount;
    hasDataForCurrentMode.current = hasRelevantData;

    if (debouncedRefreshRef.current) {
      clearTimeout(debouncedRefreshRef.current);
    }
    debouncedRefreshRef.current = setTimeout(async () => {
      try {
        await refreshOptions();
      } finally {
        isRefreshingRef.current = false;
      }
    }, 300); // 300ms debounce
  }, [
    paymentState.ethWalletAddress,
    paymentState.solanaPubKey,
    paymentState.stellarPubKey,
    paymentState.orderUsdAmount,
    mode,
    optionsList.length,
    walletPaymentOptions.options,
    solanaPaymentOptions.options,
    stellarPaymentOptions.options,
    isLoading,
  ]);

  // Smart auto-refresh when wallet addresses change or when we need data
  useEffect(() => {
    const { ethWalletAddress, solanaPubKey, stellarPubKey } = paymentState;

    // Only auto-refresh if we have at least one connected wallet
    if (ethWalletAddress || solanaPubKey || stellarPubKey) {
      smartRefresh();
    }

    // Cleanup timeout on unmount
    return () => {
      if (debouncedRefreshRef.current) {
        clearTimeout(debouncedRefreshRef.current);
      }
    };
  }, [
    paymentState.ethWalletAddress,
    paymentState.solanaPubKey,
    paymentState.stellarPubKey,
    paymentState.orderUsdAmount,
  ]);

  // Clear options immediately when wallet addresses change to prevent stale data display
  useEffect(() => {
    const { ethWalletAddress, solanaPubKey, stellarPubKey } = paymentState;

    // If we have wallet addresses, clear the options immediately to show loading state
    // This prevents showing stale "insufficient balance" messages
    if (ethWalletAddress || solanaPubKey || stellarPubKey) {
      // The individual hooks will handle clearing their own options
      // This effect just ensures we don't show stale data during transitions
    }
  }, [
    paymentState.ethWalletAddress,
    paymentState.solanaPubKey,
    paymentState.stellarPubKey,
  ]);

  // Manual refresh function for user-triggered refreshes (like clicking refresh button)
  const manualRefresh = useCallback(async () => {
    // Force refresh all relevant payment options regardless of current state
    const refreshPromises: Promise<void>[] = [];

    if (["evm", "all"].includes(mode) && walletPaymentOptions.refreshOptions) {
      refreshPromises.push(walletPaymentOptions.refreshOptions());
    }

    if (
      ["solana", "all"].includes(mode) &&
      solanaPaymentOptions.refreshOptions
    ) {
      refreshPromises.push(solanaPaymentOptions.refreshOptions());
    }

    if (
      ["stellar", "all"].includes(mode) &&
      stellarPaymentOptions.refreshOptions
    ) {
      refreshPromises.push(stellarPaymentOptions.refreshOptions());
    }

    await Promise.all(refreshPromises);
  }, [mode]);

  // Prevent flickering by only showing loading when we have no data at all
  // and we're actually loading, or when we have some data but are still loading more
  const shouldShowLoading =
    isLoading && (!hasAnyData || optionsList.length === 0);

  return {
    optionsList,
    isLoading: shouldShowLoading,
    refreshOptions: manualRefresh,
  };
}

function getEvmTokenOptions(
  options: WalletPaymentOption[],
  isDepositFlow: boolean,
  setSelectedTokenOption: (option: WalletPaymentOption) => void,
  setRoute: (route: ROUTES, meta?: any) => void
) {
  return options.map((option) => {
    const chainName = getChainName(option.balance.token.chainId);
    const titlePrice = isDepositFlow
      ? formatUsd(option.balance.usd)
      : roundTokenAmount(option.required.amount, option.required.token);
    const title = `${titlePrice} ${option.balance.token.symbol} on ${chainName}`;

    const balanceStr = `${roundTokenAmount(
      option.balance.amount,
      option.balance.token
    )} ${option.balance.token.symbol}`;
    const subtitle =
      option.disabledReason ??
      `${isDepositFlow ? "" : "Balance: "}${balanceStr}`;
    const disabled = option.disabledReason != null;

    return {
      id: getRozoTokenKey(option.balance.token),
      sortValue: option.balance.usd,
      title,
      subtitle,
      icons: [
        <TokenChainLogo
          key={getRozoTokenKey(option.balance.token)}
          token={option.balance.token}
        />,
      ],
      onClick: () => {
        setSelectedTokenOption(option);
        const meta = {
          event: "click-token",
          tokenSymbol: option.balance.token.symbol,
          chainId: option.balance.token.chainId,
        };
        if (isDepositFlow) {
          setRoute(ROUTES.SELECT_AMOUNT, meta);
        } else {
          setRoute(ROUTES.PAY_WITH_TOKEN, meta);
        }
      },
      disabled,
    };
  });
}

function getSolanaTokenOptions(
  options: WalletPaymentOption[],
  isDepositFlow: boolean,
  setSelectedSolanaTokenOption: (option: WalletPaymentOption) => void,
  setRoute: (route: ROUTES, meta?: any) => void
) {
  return options.map((option) => {
    const titlePrice = isDepositFlow
      ? formatUsd(option.balance.usd)
      : roundTokenAmount(option.required.amount, option.required.token);
    const title = `${titlePrice} ${option.balance.token.symbol} on Solana`;
    const balanceStr = `${roundTokenAmount(
      option.balance.amount,
      option.balance.token
    )} ${option.balance.token.symbol}`;
    const subtitle =
      option.disabledReason ??
      `${isDepositFlow ? "" : "Balance: "}${balanceStr}`;
    const disabled = option.disabledReason != null;

    return {
      id: getRozoTokenKey(option.balance.token),
      sortValue: option.balance.usd,
      title,
      subtitle,
      icons: [
        <TokenChainLogo
          key={getRozoTokenKey(option.balance.token)}
          token={option.balance.token}
        />,
      ],
      onClick: () => {
        setSelectedSolanaTokenOption(option);
        const meta = {
          event: "click-solana-token",
          tokenSymbol: option.balance.token.symbol,
          chainId: option.balance.token.chainId,
        };
        if (isDepositFlow) {
          setRoute(ROUTES.SOLANA_SELECT_AMOUNT, meta);
        } else {
          setRoute(ROUTES.SOLANA_PAY_WITH_TOKEN, meta);
        }
      },
      disabled,
    };
  });
}

function getStellarTokenOptions(
  options: WalletPaymentOption[],
  isDepositFlow: boolean,
  setSelectedStellarTokenOption: (option: WalletPaymentOption) => void,
  setRoute: (route: ROUTES, meta?: any) => void
) {
  return options.map((option) => {
    const titlePrice = isDepositFlow
      ? formatUsd(option.balance.usd)
      : roundTokenAmount(option.required.amount, option.required.token);
    const title = `${titlePrice} ${option.balance.token.symbol} on Stellar`;
    const balanceStr = `${roundTokenAmount(
      option.balance.amount,
      option.balance.token
    )} ${option.balance.token.symbol}`;
    const subtitle =
      option.disabledReason ??
      `${isDepositFlow ? "" : "Balance: "}${balanceStr}`;
    const disabled = option.disabledReason != null;

    return {
      id: getRozoTokenKey(option.balance.token),
      sortValue: option.balance.usd,
      title,
      subtitle,
      icons: [
        <TokenChainLogo
          key={getRozoTokenKey(option.balance.token)}
          token={option.balance.token}
        />,
      ],
      onClick: () => {
        setSelectedStellarTokenOption(option);
        const meta = {
          event: "click-stellar-token",
          tokenSymbol: option.balance.token.symbol,
          chainId: option.balance.token.chainId,
        };

        if (isDepositFlow) {
          setRoute(ROUTES.STELLAR_SELECT_AMOUNT, meta);
        } else {
          setRoute(ROUTES.STELLAR_PAY_WITH_TOKEN, meta);
        }
      },
      disabled,
    };
  });
}

function getRozoTokenKey(token: RozoPayToken) {
  return `${token.chainId}-${token.token}`;
}
