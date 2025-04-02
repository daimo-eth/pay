import { DaimoPayToken, getChainName } from "@daimo/pay-common";
import React, { useMemo } from "react";
import { ROUTES } from "../../../constants/routes";
import useIsMobile from "../../../hooks/useIsMobile";
import { usePayContext } from "../../../hooks/usePayContext";
import { formatUsd, roundTokenAmount } from "../../../utils/format";
import Button from "../../Common/Button";
import { ModalContent, ModalH1, PageContent } from "../../Common/Modal/styles";
import OptionsList from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";
import TokenChainLogo from "../../Common/TokenChainLogo";

function getDaimoTokenKey(token: DaimoPayToken) {
  return `${token.chainId}-${token.token}`;
}

const SelectToken: React.FC = () => {
  const isMobile = useIsMobile();
  const isOnIOS = useMemo(() => {
    return /iPad|iPhone/.test(navigator.userAgent);
  }, []);
  const { setRoute, paymentState, wcWallet } = usePayContext();
  const { isDepositFlow, walletPaymentOptions, setSelectedTokenOption } =
    paymentState;

  const optionsList =
    walletPaymentOptions.options?.map((option) => {
      const chainName = getChainName(option.balance.token.chainId);
      const titlePrice = isDepositFlow
        ? formatUsd(option.balance.usd)
        : roundTokenAmount(option.required.amount, option.required.token);
      const title = `${titlePrice} ${option.balance.token.symbol} on ${chainName}`;

      const balanceStr = `${roundTokenAmount(option.balance.amount, option.balance.token)} ${option.balance.token.symbol}`;
      const subtitle =
        option.disabledReason ??
        `${isDepositFlow ? "" : "Balance: "}${balanceStr}`;
      const disabled = option.disabledReason != null;

      return {
        id: getDaimoTokenKey(option.balance.token),
        title,
        subtitle,
        icons: [
          <TokenChainLogo
            key={getDaimoTokenKey(option.balance.token)}
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
            if (isMobile && isOnIOS) {
              window.open(wcWallet?.getWalletConnectDeeplink?.(""), "_blank");
            }
          }
        },
        disabled,
      };
    }) ?? [];

  return (
    <PageContent>
      <OrderHeader minified />

      {!walletPaymentOptions.isLoading && optionsList.length === 0 && (
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
          <Button onClick={() => setRoute(ROUTES.SELECT_METHOD)}>
            Select Another Method
          </Button>
        </ModalContent>
      )}

      <OptionsList
        requiredSkeletons={4}
        isLoading={walletPaymentOptions.isLoading}
        options={optionsList}
      />
    </PageContent>
  );
};

export default SelectToken;
