import { DaimoPayToken, getChainName } from "@daimo/pay-common";
import { useAccount } from "wagmi";
import defaultTheme from "../../../constants/defaultTheme";
import { ROUTES } from "../../../constants/routes";
import useIsMobile from "../../../hooks/useIsMobile";
import { usePayContext } from "../../../hooks/usePayContext";
import { formatUsd, roundTokenAmount } from "../../../utils/format";
import { ModalContent, ModalH1, PageContent } from "../../Common/Modal/styles";
import OptionsList from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";
import SelectAnotherMethodButton from "../../Common/SelectAnotherMethodButton";
import TokenChainLogo from "../../Common/TokenChainLogo";

export default function SelectToken() {
  const { isMobile, isIOS } = useIsMobile();
  const isMobileFormat =
    isMobile || window?.innerWidth < defaultTheme.mobileWidth;
  const { setRoute, paymentState, wcWallet } = usePayContext();
  const { isDepositFlow, walletPaymentOptions, setSelectedTokenOption } =
    paymentState;
  const { connector } = useAccount();
  console.log("connector", connector);
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
            if (isMobile && isIOS) {
              if (wcWallet?.deeplinkScheme) {
                window.open(wcWallet?.deeplinkScheme, "_blank");
              } else {
                //If the wallet is a wc mobile connector we don't have the deep link
                if (!wcWallet?.isWcMobileConnector) {
                  window.open(
                    wcWallet?.getWalletConnectDeeplink?.(""),
                    "_blank",
                  );
                }
              }
            }
          }
        },
        disabled,
      };
    }) ?? [];

  // IsAnotherMethodButtonVisible is true when there are token options and we are in desktop mode or in mobile mode using a wallet connect connector
  const isAnotherMethodButtonVisible = optionsList.length != 0;

  return (
    <PageContent>
      <OrderHeader minified showEth={true} />

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
          <SelectAnotherMethodButton />
        </ModalContent>
      )}
      <OptionsList
        requiredSkeletons={4}
        isLoading={walletPaymentOptions.isLoading}
        options={optionsList}
        scrollHeight={
          isAnotherMethodButtonVisible && isMobileFormat ? 225 : 300
        }
        orDivider={isAnotherMethodButtonVisible}
        hideBottomLine={!isAnotherMethodButtonVisible}
      />
      {isAnotherMethodButtonVisible && <SelectAnotherMethodButton />}
    </PageContent>
  );
}

function getDaimoTokenKey(token: DaimoPayToken) {
  return `${token.chainId}-${token.token}`;
}
