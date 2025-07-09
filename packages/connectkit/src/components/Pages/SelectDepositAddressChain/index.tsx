import React from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import { ModalContent, ModalH1, PageContent } from "../../Common/Modal/styles";

import { DaimoPayOrderMode } from "@daimo/pay-common";
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
  } = paymentState;

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
        options={
          depositAddressOptions.options?.map((option) => {
            return {
              id: option.id,
              title: option.id,
              icons: [option.logoURI],
              disabled:
                option.minimumUsd > 0 &&
                order?.mode === DaimoPayOrderMode.HYDRATED &&
                order.usdValue < option.minimumUsd,
              onClick: () => {
                setSelectedDepositAddressOption(option);
                const meta = { event: "click-option", option: option.id };
                setRoute(ROUTES.WAITING_DEPOSIT_ADDRESS, meta);
              },
            };
          }) ?? []
        }
      />
    </PageContent>
  );
};

export default SelectDepositAddressChain;
