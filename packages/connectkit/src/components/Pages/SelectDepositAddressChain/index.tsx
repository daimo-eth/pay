import React from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import { ModalContent, ModalH1, PageContent } from "../../Common/Modal/styles";

import Button from "../../Common/Button";
import OptionsList from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";

const SelectDepositAddressChain: React.FC = () => {
  const { setRoute, paymentState } = usePayContext();
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
            <Button onClick={() => setRoute(ROUTES.SELECT_METHOD)}>
              Select Another Method
            </Button>
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
          }) ?? []
        }
      />
    </PageContent>
  );
};

export default SelectDepositAddressChain;
