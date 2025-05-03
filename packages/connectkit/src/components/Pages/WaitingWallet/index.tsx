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
import useIsMobile from "../../../hooks/useIsMobile";
import type { TrpcClient } from "../../../utils/trpc";
import Button from "../../Common/Button";
import ExternalPaymentSpinner from "../../Spinners/ExternalPaymentSpinner";

const WaitingWallet: React.FC = () => {
  const context = usePayContext();
  const { triggerResize, paymentState, setRoute } = context;
  const { daimoPayOrder } = paymentState;
  const trpc = context.trpc as TrpcClient;
  const { isMobile } = useIsMobile();

  // Poll for payment
  useEffect(() => {
    const checkForSourcePayment = async () => {
      if (!daimoPayOrder) return;
      const orderId = daimoPayOrder.id.toString();
      const found = await trpc.findSourcePayment.query({ orderId });
      if (!found) return;
      setRoute(ROUTES.CONFIRMATION, { event: "found-source-payment" });
    };

    const interval = setInterval(checkForSourcePayment, 600);
    return () => clearInterval(interval);
  }, [daimoPayOrder?.id]);

  const url =
    "https://pay.daimo.com/checkout?id=3HopcUhf1KfTybQK37Vgz5pFqjc5DPMmEAhSNf21nj6D";
  const deepLinkUrl = `rainbow://dapp?url=${encodeURIComponent(url)}`;

  return (
    <PageContent>
      <ExternalPaymentSpinner
        logoURI={
          "https://assets.super.so/b7ac5b4c-2f39-474d-8a3c-4c0e68f5c2f6/uploads/logo/c36500d2-7e4b-40f5-a48b-3e6e364d7248.png"
        }
        logoShape={"squircle"}
      />
      <ModalContent style={{ marginLeft: 24, marginRight: 24 }}>
        <ModalH1>Waiting For Payment</ModalH1>
        <ModalBody style={{ marginTop: 12, marginBottom: 12 }}>
          Complete in Rainbow
        </ModalBody>
      </ModalContent>
      <Button
        icon={<ExternalLinkIcon />}
        onClick={() => window.open(deepLinkUrl, "_blank")}
      >
        Open in Rainbow
      </Button>
    </PageContent>
  );
};

export default WaitingWallet;
