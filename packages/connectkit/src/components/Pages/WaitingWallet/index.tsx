import React, { useEffect } from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import {
  ModalBody,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../Common/Modal/styles";

import { DaimoPayOrderMode } from "@daimo/pay-common";
import { ExternalLinkIcon } from "../../../assets/icons";
import type { TrpcClient } from "../../../utils/trpc";
import Button from "../../Common/Button";
import WalletPaymentSpinner from "../../Spinners/WalletPaymentSpinner";

const WaitingWallet: React.FC = () => {
  const context = usePayContext();
  const { triggerResize, paymentState, setRoute } = context;
  const trpc = context.trpc as TrpcClient;

  const {
    selectedWallet,
    paymentWaitingMessage,
    daimoPayOrder,
    selectedWalletDeepLink,
    refreshOrder,
  } = paymentState;

  useEffect(() => {
    if (daimoPayOrder?.id == null) return;

    const checkForSourcePayment = async () => {
      const found = await trpc.findSourcePayment.query({
        orderId: daimoPayOrder.id.toString(),
      });
      if (found) {
        setRoute(ROUTES.CONFIRMATION, { event: "found-source-payment" });
      }
    };

    const pollFn =
      daimoPayOrder?.mode === DaimoPayOrderMode.HYDRATED
        ? checkForSourcePayment
        : refreshOrder;
    const interval = setInterval(pollFn, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daimoPayOrder?.id, daimoPayOrder?.mode]);

  const openWalletWindow = (url: string) => {
    window.open(url, "_blank");
  };

  if (!selectedWallet) {
    return <PageContent> No wallet selected </PageContent>;
  }

  return (
    <PageContent>
      <WalletPaymentSpinner
        logo={selectedWallet.icon}
        logoShape={
          selectedWallet.iconShape === "square"
            ? "squircle"
            : selectedWallet.iconShape || "squircle"
        }
      />
      <ModalContent style={{ marginLeft: 24, marginRight: 24 }}>
        <ModalH1>
          Continue in {selectedWallet.shortName ?? selectedWallet.name}
        </ModalH1>
        {paymentWaitingMessage && (
          <ModalBody style={{ marginTop: 12, marginBottom: 12 }}>
            {paymentWaitingMessage}
          </ModalBody>
        )}
      </ModalContent>
      <Button
        icon={<ExternalLinkIcon />}
        onClick={() => {
          if (selectedWalletDeepLink) {
            openWalletWindow(selectedWalletDeepLink);
          }
        }}
      >
        {`Open ${selectedWallet.name}`}
      </Button>
    </PageContent>
  );
};

export default WaitingWallet;
