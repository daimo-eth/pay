import React from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import { ModalContent, ModalH1, PageContent } from "../../Common/Modal/styles";

import { RozoPayOrderMode } from "@rozoai/intent-common";
import { useRozoPay } from "../../../hooks/useDaimoPay";
import { OptionsList } from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";
import PoweredByFooter from "../../Common/PoweredByFooter";
import SelectAnotherMethodButton from "../../Common/SelectAnotherMethodButton";

const SelectDepositAddressChain: React.FC = () => {
  const { setRoute, paymentState } = usePayContext();
  const pay = useRozoPay();
  const { order } = pay;
  const {
    isDepositFlow,
    setSelectedDepositAddressOption,
    depositAddressOptions,
  } = paymentState;

  return (
    <PageContent>
      <OrderHeader
        minified
        excludeLogos={[
          "tron",
          "eth",
          "arbitrum",
          "optimism",
          "solana",
          "stellar",
        ]}
      />

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
          depositAddressOptions.options
            ?.filter(
              (option) =>
                !option.id.toLowerCase().includes("tron") &&
                !option.id.toLowerCase().includes("ethereum")
            )
            .map((option) => {
              return {
                id: option.id,
                title: option.id,
                icons: [option.logoURI],
                disabled:
                  option.minimumUsd > 0 &&
                  order?.mode === RozoPayOrderMode.HYDRATED &&
                  order.usdValue < option.minimumUsd,
                onClick: () => {
                  setSelectedDepositAddressOption(option as any);
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
      <PoweredByFooter />
    </PageContent>
  );
};

export default SelectDepositAddressChain;
