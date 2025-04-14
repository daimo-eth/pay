import {
  DaimoPayToken,
  ExternalPaymentOptions,
  getChainName,
} from "@daimo/pay-common";
import { Connector, useAccount, useDisconnect } from "wagmi";
import { Bitcoin, Solana } from "../../../assets/chains";
import { Coinbase, MetaMask, Rabby, Rainbow } from "../../../assets/logos";
import { ROUTES } from "../../../constants/routes";
import useIsMobile from "../../../hooks/useIsMobile";
import { usePayContext } from "../../../hooks/usePayContext";
import { formatUsd, roundTokenAmount } from "../../../utils/format";
import Button from "../../Common/Button";
import { ModalContent, ModalH1, PageContent } from "../../Common/Modal/styles";
import OptionsList from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";
import TokenChainLogo from "../../Common/TokenChainLogo";

export default function SelectToken() {
  const { isMobile, isIOS } = useIsMobile();
  const { setRoute, paymentState, wcWallet, open } = usePayContext();
  const {
    isDepositFlow,
    walletPaymentOptions,
    setSelectedTokenOption,
    payParams,
    externalPaymentOptions,
  } = paymentState;

  const { connector } = useAccount();
  const { disconnectAsync } = useDisconnect();
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
              if (wcWallet?.walletDeepLink) {
                window.open(wcWallet?.walletDeepLink, "_blank");
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

  const selectMethodOption = {
    id: "select-method",
    title: `${payParams?.intent && payParams.intent.length <= 7 ? payParams.intent : "Pay"} With Another Method`,
    icons: getBestPaymentMethod(),
    onClick: () => {
      setRoute(ROUTES.SELECT_METHOD);
    },
  };

  const selectWalletOption = {
    id: "select-wallet",
    title: "Select Another Wallet",
    icons: getBestUnconnectedWalletIcons(connector),
    onClick: async () => {
      await disconnectAsync();
      setRoute(ROUTES.CONNECTORS);
    },
  };

  function getBestUnconnectedWalletIcons(connector: Connector | undefined) {
    const icons: JSX.Element[] = [];
    const strippedId = connector?.id.toLowerCase(); // some connector ids can have weird casing and or suffixes and prefixes
    const [isMetaMask, isRainbow, isCoinbase] = [
      strippedId?.includes("metamask"),
      strippedId?.includes("rainbow"),
      strippedId?.includes("coinbase"),
    ];

    if (!isRainbow) icons.push(<Rainbow />);
    if (!isMetaMask) icons.push(<MetaMask />);
    if (!isCoinbase) icons.push(<Coinbase />);
    if (icons.length < 3) icons.push(<Rabby />);

    return icons;
  }

  function getBestPaymentMethod() {
    const icons: JSX.Element[] = [];
    icons.push(
      ...externalPaymentOptions.options
        .filter((option) => option.id !== ExternalPaymentOptions.Daimo)
        .map((option, index) => (
          <div
            key={index}
            style={{ borderRadius: "22.5%", overflow: "hidden" }}
          >
            <img src={option.logoURI} alt="" />
          </div>
        )),
    );
    if (icons.length < 3) {
      icons.push(<Solana />);
    }
    if (icons.length < 3) {
      icons.push(<Bitcoin />);
    }
    return icons;
  }

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
        shortScroll={isMobile}
        orDivider={optionsList.length != 0}
      />
      {optionsList.length != 0 && (
        <div className="mt-2">
          <OptionsList
            options={
              externalPaymentOptions.options.length > 0
                ? [selectMethodOption]
                : [selectWalletOption]
            }
          />
        </div>
      )}
    </PageContent>
  );
}

function getDaimoTokenKey(token: DaimoPayToken) {
  return `${token.chainId}-${token.token}`;
}
