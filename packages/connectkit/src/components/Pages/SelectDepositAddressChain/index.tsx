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
    externalPaymentOptions,
  } = paymentState;
  const orderUsd = isDepositFlow ? null : order?.destFinalCallTokenAmount.usd;

  // Filter deposit address options based on parsed paymentOptions config
  const { addressOrder } = externalPaymentOptions.parsedConfig;
  const allOptions = depositAddressOptions.options ?? [];
  const filteredOptions =
    addressOrder.length > 0
      ? allOptions.filter((opt) => {
          // Map option IDs to payment option types
          const optionMap = new Map([
            [DepositAddressPaymentOptions.TRON_USDT, "Tron"],
            [DepositAddressPaymentOptions.BASE, "Base"],
            [DepositAddressPaymentOptions.ARBITRUM, "Arbitrum"],
            [DepositAddressPaymentOptions.OP_MAINNET, "Optimism"],
            [DepositAddressPaymentOptions.POLYGON, "Polygon"],
            [DepositAddressPaymentOptions.ETH_L1, "Ethereum"],
          ]);
          const mappedType = optionMap.get(opt.id);
          return mappedType && addressOrder.includes(mappedType as any);
        })
      : allOptions;

  return (
    <PageContent>
      <OrderHeader minified />

      {!depositAddressOptions.loading && filteredOptions.length === 0 && (
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
        options={filteredOptions
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
