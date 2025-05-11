import React, { useEffect, useState } from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import {
  ModalBody,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../Common/Modal/styles";

import { ExternalPaymentOptions } from "@daimo/pay-common";
import { ExternalLinkIcon } from "../../../assets/icons";
import useIsMobile from "../../../hooks/useIsMobile";
import type { TrpcClient } from "../../../utils/trpc";
import Button from "../../Common/Button";
import ExternalPaymentSpinner from "../../Spinners/ExternalPaymentSpinner";

const WaitingExternal: React.FC = () => {
  const context = usePayContext();
  const { triggerResize, paymentState, setRoute } = context;
  const trpc = context.trpc as TrpcClient;
  const { isMobile } = useIsMobile();

  const {
    selectedExternalOption,
    payWithExternal,
    paymentWaitingMessage,
    daimoPayOrder,
  } = paymentState;

  let isPaymentApp = false;
  if (selectedExternalOption) {
    isPaymentApp =
      selectedExternalOption.id === ExternalPaymentOptions.Venmo ||
      selectedExternalOption.id === ExternalPaymentOptions.CashApp ||
      selectedExternalOption.id === ExternalPaymentOptions.MercadoPago ||
      selectedExternalOption.id === ExternalPaymentOptions.Revolut ||
      selectedExternalOption.id === ExternalPaymentOptions.Wise;
  }

  const [externalURL, setExternalURL] = useState<string | null>(null);

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

  useEffect(() => {
    if (!selectedExternalOption) return;
    payWithExternal(selectedExternalOption.id).then((url) => {
      setExternalURL(url);
      openExternalWindow(url);
    });
  }, [selectedExternalOption]);

  const openExternalWindow = (url: string) => {
    if (isMobile || isPaymentApp) {
      // on mobile: open in a new tab
      window.open(url, "_blank");
    } else {
      // on desktop: open in a popup window in
      // portrait mode in the center of the screen
      const width = 500;
      const height = 700;
      const left = Math.max(
        0,
        Math.floor((window.innerWidth - width) / 2) + window.screenX,
      );
      const top = Math.max(
        0,
        Math.floor((window.innerHeight - height) / 2) + window.screenY,
      );

      window.open(
        url,
        "popupWindow",
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`,
      );
    }
  };

  const waitingMessageLength = paymentWaitingMessage?.length;

  useEffect(() => {
    triggerResize();
  }, [waitingMessageLength, externalURL]);

  if (!selectedExternalOption) {
    return <PageContent></PageContent>;
  }

  return (
    <PageContent>
      <ExternalPaymentSpinner
        logo={selectedExternalOption.logo}
        logoShape={selectedExternalOption.logoShape}
      />
      <ModalContent style={{ marginLeft: 24, marginRight: 24 }}>
        <ModalH1>Waiting For Payment</ModalH1>
        {paymentWaitingMessage && (
          <ModalBody style={{ marginTop: 12, marginBottom: 12 }}>
            {paymentWaitingMessage}
          </ModalBody>
        )}
      </ModalContent>
      <Button
        icon={<ExternalLinkIcon />}
        onClick={() => {
          if (externalURL) {
            openExternalWindow(externalURL);
          }
        }}
      >
        {selectedExternalOption.cta}
      </Button>
    </PageContent>
  );
};

export default WaitingExternal;
