import React, { useEffect, useState } from "react";
import { useDaimoPay } from "../../../hooks/useDaimoPay";
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
import styled from "../../../styles/styled";
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
  const { order } = useDaimoPay();

  let isCoinbase = false;
  let isBinance = false;
  if (selectedExternalOption) {
    isCoinbase = selectedExternalOption.id === ExternalPaymentOptions.Coinbase;
    isBinance = selectedExternalOption.id === ExternalPaymentOptions.Binance;
  }

  const [externalURL, setExternalURL] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

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

  const regenerateOrder = async () => {
    if (!selectedExternalOption) return;

    setIsRegenerating(true);
    setExternalURL(null);
    try {
      payWithExternal(selectedExternalOption.id).then((url) => {
        setExternalURL(url);
        setIsRegenerating(false);
      });
    } catch (error) {
      console.error("failed to regenerate order:", error);
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
    <>
      <ConnectWithQRCode externalUrl={externalURL ?? ""} />
      {isBinance && paymentWaitingMessage && !isRegenerating && (
        <RegenerateContainer>
          <RegenerateLink
            as="button"
            onClick={regenerateOrder}
            disabled={isRegenerating}
          >
            <span>
              {locales.notWorking}{" "}
              <Underline>{locales.regenerateOrder}</Underline>
            </span>
          </RegenerateLink>
        </RegenerateContainer>
      )}
    </>
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
      {isBinance && paymentWaitingMessage && (
        <RegenerateContainer>
          <RegenerateLink
            as="button"
            onClick={regenerateOrder}
            disabled={isRegenerating}
          >
            <span>
              {isRegenerating ? (
                <>{locales.generatingNewOrder}</>
              ) : (
                <>
                  {locales.notWorking}{" "}
                  <Underline>{locales.regenerateOrder}</Underline>
                </>
              )}
            </span>
          </RegenerateLink>
        </RegenerateContainer>
      )}
    </PageContent>
  );
};

const RegenerateContainer = styled.div`
  text-align: center;
  margin-top: 16px;
  margin-bottom: -4px;
`;

const RegenerateLink = styled.a`
  appearance: none;
  user-select: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 42px;
  padding: 0 16px;
  border-radius: 6px;
  border: none;
  background: none;
  color: var(--ck-body-color-muted);
  text-decoration-color: var(--ck-body-color-muted);
  font-size: 15px;
  line-height: 18px;
  font-weight: 400;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  span {
    opacity: 1;
    transition: opacity 300ms ease;
  }
`;

const Underline = styled.span`
  text-underline-offset: 2px;
  text-decoration: underline;
`;

export default WaitingExternal;
