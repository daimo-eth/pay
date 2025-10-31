import React, { useEffect } from "react";
import { usePayContext } from "../../../hooks/usePayContext";

import { Disclaimer, PageContent } from "../../Common/Modal/styles";

import { DaimoPayOrderMode } from "@daimo/pay-common";
import { useDaimoPay } from "../../../hooks/useDaimoPay";
import ConnectorList from "../../Common/ConnectorList";
import { OrderHeader } from "../../Common/OrderHeader";

const Wallets: React.FC = () => {
  const context = usePayContext();

  const { hydrateOrder, order } = useDaimoPay();

  // If we're not in deposit mode, hydrate immediately.
  useEffect(() => {
    if (
      !context.paymentState.isDepositFlow &&
      order != null &&
      order.mode !== DaimoPayOrderMode.HYDRATED
    ) {
      hydrateOrder();
    }
  }, [context.paymentState.isDepositFlow, hydrateOrder, order]);

  return (
    <PageContent>
      <OrderHeader minified />
      <ConnectorList />
      {context.options?.disclaimer && (
        <Disclaimer style={{ visibility: "hidden", pointerEvents: "none" }}>
          <div>{context.options?.disclaimer}</div>
        </Disclaimer>
      )}
    </PageContent>
  );
};

export default Wallets;
