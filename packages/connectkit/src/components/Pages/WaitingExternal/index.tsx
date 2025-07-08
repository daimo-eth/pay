import React, { useEffect, useState } from "react";
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
import Button from "../../Common/Button";
import ExternalPaymentSpinner from "../../Spinners/ExternalPaymentSpinner";

const WaitingExternal: React.FC = () => {
  const context = usePayContext();
  const { triggerResize, paymentState } = context;
  const { isMobile } = useIsMobile();

  const { selectedExternalOption, payWithExternal, paymentWaitingMessage } =
    paymentState;

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
    if (!selectedExternalOption) return;
    payWithExternal(selectedExternalOption.id).then((url) => {
      setExternalURL(url);
      openExternalWindow(url);
    });
  }, [selectedExternalOption]); // eslint-disable-line react-hooks/exhaustive-deps

  const openExternalWindow = (url: string) => {
    if (isMobile || isPaymentApp) {
      // on mobile: open in a new tab
      window.open(url, "_blank");
    } else {
      // on desktop: open in a popup window in
      // portrait mode in the center of the screen
      let width = 500;
      let height = 700;
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
  }, [waitingMessageLength, externalURL]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedExternalOption) {
    return <PageContent></PageContent>;
  }

  return (
    <PageContent>
      <ExternalPaymentSpinner
        logoURI={selectedExternalOption.logoURI}
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
