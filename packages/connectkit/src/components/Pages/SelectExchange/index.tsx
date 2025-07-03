import React from "react";

import { ModalH1, PageContent } from "../../Common/Modal/styles";

import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";
import { OptionsList } from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";

const SelectExchange: React.FC = () => {
  const { paymentState, setRoute } = usePayContext();
  const { externalPaymentOptions, setSelectedExternalOption } = paymentState;
  const exchangeOptions = externalPaymentOptions.options.get("exchange");

  if (!exchangeOptions) {
    return (
      <PageContent>
        <OrderHeader minified showZKP2P />
        <ModalH1>No Exchange options available</ModalH1>
      </PageContent>
    );
  }

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
