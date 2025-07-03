import React from "react";

import { ModalH1, PageContent } from "../../Common/Modal/styles";

import { ExternalPaymentOptions } from "@daimo/pay-common";
import { ROUTES } from "../../../constants/routes";
import useIsMobile from "../../../hooks/useIsMobile";
import { usePayContext } from "../../../hooks/usePayContext";
import { OptionsList } from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";

const SelectExchange: React.FC = () => {
  const { paymentState, setRoute } = usePayContext();
  const { externalPaymentOptions, setSelectedExternalOption } = paymentState;
  const { isMobile } = useIsMobile();
  const exchangeOptions = externalPaymentOptions.options.get("exchange");
  console.log("exchangeOptions", exchangeOptions);

  if (!exchangeOptions) {
    return (
      <PageContent>
        <OrderHeader minified showZKP2P />
        <ModalH1>No Exchange options available</ModalH1>
      </PageContent>
    );
  }

  // Filter out Lemon on desktop
  const filteredExchangeOptions = exchangeOptions.filter((option) => {
    if (!isMobile && option.id === ExternalPaymentOptions.Lemon) {
      return false;
    }
    return true;
  });

  const options = filteredExchangeOptions.map((option) => ({
    id: option.id,
    title: option.cta,
    icons: [option.logoURI],
    onClick: () => {
      setSelectedExternalOption(option);
      const meta = { event: "click-option", option: option.id };
      if (paymentState.isDepositFlow) {
        setRoute(ROUTES.SELECT_EXTERNAL_AMOUNT, meta);
      } else {
        setRoute(ROUTES.WAITING_EXTERNAL, meta);
      }
    },
    disabled: option.disabled,
    subtitle: option.message,
  }));

  return (
    <PageContent>
      <OrderHeader minified showZKP2P />
      <OptionsList options={options} />
    </PageContent>
  );
};

export default SelectExchange;
