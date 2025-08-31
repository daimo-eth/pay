import React from "react";

import { ModalH1, PageContent } from "../../Common/Modal/styles";

import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";
import { OptionsList } from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";

const SelectZKP: React.FC = () => {
  const { paymentState, setRoute } = usePayContext();
  const { externalPaymentOptions, setSelectedExternalOption } = paymentState;
  const zkp2pOptions = externalPaymentOptions.options.get("zkp2p");

  if (!zkp2pOptions) {
    return (
      <PageContent>
        <OrderHeader minified show="zkp2p" />
        <ModalH1>No ZKP2P options available</ModalH1>
      </PageContent>
    );
  }

  const options = zkp2pOptions.map((option) => ({
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
      <OrderHeader minified show="zkp2p" />
      <OptionsList options={options} />
    </PageContent>
  );
};

export default SelectZKP;
