import React, { useEffect } from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import {
  ModalBody,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../Common/Modal/styles";

import { ExternalLinkIcon } from "../../../assets/icons";
import type { TrpcClient } from "../../../utils/trpc";
import Button from "../../Common/Button";
import ExternalPaymentSpinner from "../../Spinners/ExternalPaymentSpinner";

const WaitingExternal: React.FC = () => {
  const context = usePayContext();
  const { triggerResize, paymentState, setRoute } = context;
  const trpc = context.trpc as TrpcClient;

  const {
    selectedWallet,
    paymentWaitingMessage,
    daimoPayOrder,
    selectedWalletDeepLink,
  } = paymentState;

  useEffect(() => {
    const checkForSourcePayment = async () => {
      if (!daimoPayOrder) return;

      const found = await trpc.findSourcePayment.query({
        orderId: daimoPayOrder.id.toString(),
      });

      if (found) {
        setRoute(ROUTES.CONFIRMATION, { event: "found-source-payment" });
      }
    };

    const interval = setInterval(checkForSourcePayment, 1000);
    return () => clearInterval(interval);
  }, [daimoPayOrder?.id]);

  const openWalletWindow = (url: string) => {
    window.open(url, "_blank");
  };

  const waitingMessageLength = paymentWaitingMessage?.length;

  useEffect(() => {
    triggerResize();
  }, [waitingMessageLength]);

  if (!selectedWallet) {
    return <PageContent> No wallet selected </PageContent>;
  }

  return (
    <PageContent>
      <ExternalPaymentSpinner
        logo={selectedWallet.icon}
        logoShape={
          selectedWallet.iconShape === "square"
            ? "squircle"
            : selectedWallet.iconShape || "squircle"
        }
      />
      <ModalContent style={{ marginLeft: 24, marginRight: 24 }}>
        <ModalH1>Finish Your Payment in {selectedWallet.name}</ModalH1>
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
        {`Open ${selectedWallet.shortName || selectedWallet.name}`}
      </Button>
    </PageContent>
  );
};

export default WaitingExternal;
