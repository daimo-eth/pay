import React from "react";
import { ROUTES } from "../../../../constants/routes";
import { usePayContext } from "../../../../hooks/usePayContext";

import {
  ModalContent,
  ModalH1,
  PageContent,
} from "../../../Common/Modal/styles";

import { DaimoPayToken } from "@daimo/pay-common";
import { useAccount } from "wagmi";
import defaultTheme from "../../../../constants/defaultTheme";
import useIsMobile from "../../../../hooks/useIsMobile";
import { formatUsd, roundTokenAmount } from "../../../../utils/format";
import OptionsList from "../../../Common/OptionsList";
import { OrderHeader } from "../../../Common/OrderHeader";
import SelectAnotherMethodButton from "../../../Common/SelectAnotherMethodButton";
import TokenChainLogo from "../../../Common/TokenChainLogo";

function getDaimoSolanaTokenKey(token: DaimoPayToken) {
  return `${token.chainId}-${token.token}`;
}

const SelectSolanaToken: React.FC = () => {
  const { paymentState, setRoute } = usePayContext();
  const { isDepositFlow, solanaPaymentOptions, setSelectedSolanaTokenOption } =
    paymentState;
  const { isMobile } = useIsMobile();
  const isMobileFormat =
    isMobile || window?.innerWidth < defaultTheme.mobileWidth;
  const { isConnected: isEvmConnected } = useAccount();

  const optionsList =
    solanaPaymentOptions.options?.map((option) => {
      const titlePrice = isDepositFlow
        ? formatUsd(option.balance.usd)
        : roundTokenAmount(option.required.amount, option.required.token);
      const title = `${titlePrice} ${option.balance.token.symbol} on Solana`;
      const balanceStr = `${roundTokenAmount(option.balance.amount, option.balance.token)} ${option.balance.token.symbol}`;
      const subtitle =
        option.disabledReason ??
        `${isDepositFlow ? "" : "Balance: "}${balanceStr}`;
      const disabled = option.disabledReason != null;

      return {
        id: getDaimoSolanaTokenKey(option.balance.token),
        title,
        subtitle,
        icons: [
          <TokenChainLogo
            key={getDaimoSolanaTokenKey(option.balance.token)}
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
    }) ?? [];

  // IsAnotherMethodButtonVisible is true when there are token options and we are in desktop mode or in mobile mode using a wallet connect connector or if we are connected to solana and evm in mobile mode
  const isAnotherMethodButtonVisible =
    (optionsList.length != 0 && !isMobileFormat) ||
    (optionsList.length != 0 && isEvmConnected);

  return (
    <PageContent>
      <OrderHeader minified showSolana={true} />

      {!solanaPaymentOptions.isLoading && optionsList.length === 0 && (
        <ModalContent
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 16,
            paddingBottom: 16,
          }}
        >
          <ModalH1>Insufficient balance.</ModalH1>
          <SelectAnotherMethodButton />
        </ModalContent>
      )}

      <OptionsList
        requiredSkeletons={4}
        isLoading={solanaPaymentOptions.isLoading}
        options={optionsList}
        scrollHeight={
          isAnotherMethodButtonVisible && isMobileFormat ? 225 : 300
        }
        orDivider={isAnotherMethodButtonVisible}
      />
      {isAnotherMethodButtonVisible && <SelectAnotherMethodButton />}
    </PageContent>
  );
};

export default SelectSolanaToken;
