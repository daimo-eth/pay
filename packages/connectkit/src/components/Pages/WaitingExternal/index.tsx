import React, { useEffect, useState } from "react";
import { usePayContext } from "../../../hooks/usePayContext";

import {
  ModalBody,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../Common/Modal/styles";

import {
  ExternalPaymentOptions,
  shouldShowExternalQRCodeOnDesktop,
} from "@daimo/pay-common";
import { ExternalLinkIcon } from "../../../assets/icons";
import useIsMobile from "../../../hooks/useIsMobile";
import useLocales from "../../../hooks/useLocales";
import Button from "../../Common/Button";
import ConnectWithQRCode from "../../DaimoPayModal/ConnectWithQRCode";
import ExternalPaymentSpinner from "../../Spinners/ExternalPaymentSpinner";

const WaitingExternal: React.FC = () => {
  const context = usePayContext();
  const { triggerResize, paymentState } = context;
  const { isMobile } = useIsMobile();
  const locales = useLocales();
  const { selectedExternalOption, payWithExternal, paymentWaitingMessage } =
    paymentState;

  let isCoinbase = false;
  if (selectedExternalOption) {
    isCoinbase = selectedExternalOption.id === ExternalPaymentOptions.Coinbase;
  }

  const [externalURL, setExternalURL] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedExternalOption) return;
    payWithExternal(selectedExternalOption.id).then((url) => {
      setExternalURL(url);
      if (!shouldShowExternalQRCodeOnDesktop) {
        openExternalWindow(url);
      }
    });
  }, [selectedExternalOption]); // eslint-disable-line react-hooks/exhaustive-deps

  const openExternalWindow = (url: string) => {
    if (!isCoinbase || isMobile) {
      // for non-exchange apps: open in a new tab
      window.open(url, "_blank");
    } else {
      // for Coinbase: open in a popup window
      // in portrait mode in the center of the screen
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

  return shouldShowExternalQRCodeOnDesktop(selectedExternalOption.id) &&
    !isMobile ? (
    <ConnectWithQRCode externalUrl={externalURL ?? ""} />
  ) : (
    <PageContent>
      <ExternalPaymentSpinner
        logoURI={selectedExternalOption.logoURI}
        logoShape={selectedExternalOption.logoShape}
      />
      <ModalContent style={{ marginLeft: 24, marginRight: 24 }}>
        <ModalH1>{locales.waitingForPayment}</ModalH1>
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
