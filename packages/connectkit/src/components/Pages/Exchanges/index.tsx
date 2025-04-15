import React from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import { PageContent } from "../../Common/Modal/styles";

import { arbitrumUSDC, ExternalPaymentOptions } from "@daimo/pay-common";
import useIsMobile from "../../../hooks/useIsMobile";
import OptionsList from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";
import PoweredByFooter from "../../Common/PoweredByFooter";

const Exchanges: React.FC = () => {
  const { setRoute, paymentState } = usePayContext();
  const { isMobile } = useIsMobile();

  const { setSelectedExternalOption, externalPaymentOptions } = paymentState;

  // Only show coinbase and binance
  const exchangeOptions = (externalPaymentOptions.options ?? []).filter(
    (option) => option.id === ExternalPaymentOptions.Coinbase,
  );
  // TEMP HACK: hardcode binance option
  exchangeOptions.push({
    id: ExternalPaymentOptions.Binance,
    cta: "Pay with Binance",
    logoURI: "https://pay.daimo.com/wallet-logos/binance-logo.svg",
    logoShape: "circle",
    paymentToken: {
      ...arbitrumUSDC,
      usd: 1.0,
      priceFromUsd: 1.0,
      maxAcceptUsd: 10_000.0,
      maxSendUsd: 10_000.0,
      displayDecimals: 2,
      fiatIso: "USD",
      fiatSymbol: "$",
    },
    disabled: false,
    minimumUsd: 0.2,
  });

  const options = exchangeOptions.map((option) => ({
    id: option.id,
    title: option.cta,
    icons: [option.logoURI],
    onClick: () => {
      setSelectedExternalOption(option);
      const meta = { event: "click-option", option: option.id };
      if (paymentState.isDepositFlow) {
        setRoute(ROUTES.SELECT_EXTERNAL_AMOUNT, meta);
      } else {
        if (option.id === ExternalPaymentOptions.Coinbase) {
          setRoute(ROUTES.WAITING_EXTERNAL, meta);
        } else {
          setRoute(ROUTES.WAITING_DEPOSIT_ADDRESS_EXCHANGE, meta);
        }
      }
    },
    disabled: option.disabled,
    subtitle: option.message,
  }));

  return (
    <PageContent>
      <OrderHeader minified />

      <OptionsList
        requiredSkeletons={isMobile ? 4 : 3} // TODO: programmatically determine skeletons to best avoid layout shifts
        isLoading={externalPaymentOptions.loading}
        options={externalPaymentOptions.loading ? [] : options}
      />
      <PoweredByFooter />
    </PageContent>
  );
};

export default Exchanges;
