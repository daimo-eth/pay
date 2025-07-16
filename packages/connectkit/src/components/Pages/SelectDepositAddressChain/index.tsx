import React, { useEffect, useState } from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import { ModalContent, ModalH1, PageContent } from "../../Common/Modal/styles";

import {
  DaimoPayOrderMode,
  DepositAddressPaymentOptions,
} from "@daimo/pay-common";
import { useDaimoPay } from "../../../hooks/useDaimoPay";
import { OptionsList } from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";
import SelectAnotherMethodButton from "../../Common/SelectAnotherMethodButton";

const SelectDepositAddressChain: React.FC = () => {
  const { setRoute, paymentState, trpc } = usePayContext();
  const pay = useDaimoPay();
  const { order } = pay;
  const {
    isDepositFlow,
    setSelectedDepositAddressOption,
    depositAddressOptions,
  } = paymentState;

  // Track Untron receiver availability
  const [untronAvailable, setUntronAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const available = await trpc.untronHasAvailableReceivers.query();
        setUntronAvailable(available);
      } catch (e) {
        console.error("Failed to check Untron availability", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                // Disable if usd below min
                (option.minimumUsd > 0 &&
                  order?.mode === DaimoPayOrderMode.HYDRATED &&
                  order.usdValue < option.minimumUsd) ||
                // Disable if TRON_USDT unavailable
                (option.id === DepositAddressPaymentOptions.TRON_USDT &&
                  untronAvailable === false),
              subtitle:
                option.id === DepositAddressPaymentOptions.TRON_USDT &&
                untronAvailable === false
                  ? "currently unavailable"
                  : undefined,
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
