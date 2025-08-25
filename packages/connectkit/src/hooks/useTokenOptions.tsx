import {
  getChainName,
  RozoPayToken,
  WalletPaymentOption,
} from "@rozoai/intent-common";
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
  if (["evm", "all"].includes(mode)) {
    optionsList.push(
      ...getEvmTokenOptions(
        walletPaymentOptions.options ?? [],
        isDepositFlow,
        setSelectedTokenOption,
        setRoute
      )
    );
    isLoading ||= walletPaymentOptions.isLoading;
  }
  if (["solana", "all"].includes(mode)) {
    optionsList.push(
      ...getSolanaTokenOptions(
        solanaPaymentOptions.options ?? [],
        isDepositFlow,
        setSelectedSolanaTokenOption,
        setRoute
      )
    );
    isLoading ||= solanaPaymentOptions.isLoading;
  }
  if ("stellar".includes(mode)) {
    optionsList.push(
      ...getStellarTokenOptions(
        stellarPaymentOptions.options ?? [],
        isDepositFlow,
        setSelectedStellarTokenOption,
        setRoute
      )
    );
    isLoading ||= stellarPaymentOptions.isLoading;
  }
  optionsList.sort((a, b) => {
    const dDisabled = (a.disabled ? 1 : 0) - (b.disabled ? 1 : 0);
    if (dDisabled !== 0) return dDisabled;
    const dSort = (b.sortValue ?? 0) - (a.sortValue ?? 0);
    return dSort;
  });

  return { optionsList, isLoading };
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
