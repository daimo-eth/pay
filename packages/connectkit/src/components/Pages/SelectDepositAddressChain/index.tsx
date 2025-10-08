import React from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import { ModalContent, ModalH1, PageContent } from "../../Common/Modal/styles";

import { DepositAddressPaymentOptions } from "@daimo/pay-common";
import { useDaimoPay } from "../../../hooks/useDaimoPay";
import { OptionsList } from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";
import SelectAnotherMethodButton from "../../Common/SelectAnotherMethodButton";

const SelectDepositAddressChain: React.FC = () => {
  const { setRoute, paymentState } = usePayContext();
  const pay = useDaimoPay();
  const { order } = pay;
  const {
    isDepositFlow,
    setSelectedDepositAddressOption,
    depositAddressOptions,
    untronAvailable,
  } = paymentState;
  const orderUsd = isDepositFlow ? null : order?.destFinalCallTokenAmount.usd;

  return (
    <PageContent>
      <OrderHeader minified />

      {!depositAddressOptions.loading &&
        depositAddressOptions.options?.length === 0 && (
          <ModalContent
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 16,
              paddingBottom: 16,
            }}
          >
            <ModalH1>Chains unavailable.</ModalH1>
            <SelectAnotherMethodButton />
          </ModalContent>
        )}

      <OptionsList
        requiredSkeletons={4}
        isLoading={depositAddressOptions.loading}
        options={(depositAddressOptions.options ?? [])
          .map((option) => {
            const disabled =
              // Disable if usd below min
              (option.minimumUsd > 0 &&
                orderUsd != null &&
                orderUsd < option.minimumUsd) ||
              // Disable if TRON_USDT unavailable
              (option.id === DepositAddressPaymentOptions.TRON_USDT &&
                untronAvailable === false);

            return {
              id: option.id,
              title: option.id,
              icons: [option.logoURI],
              disabled,
              onClick: () => {
                setSelectedDepositAddressOption(option);
                const meta = { event: "click-option", option: option.id };
                if (isDepositFlow) {
                  setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_AMOUNT, meta);
                } else {
                  setRoute(ROUTES.WAITING_DEPOSIT_ADDRESS, meta);
                }
              },
            };
          })
          // Push disabled options to the bottom of the list
          .sort((a, b) => Number(a.disabled) - Number(b.disabled))}
      />
    </PageContent>
  );
};

export default SelectDepositAddressChain;
