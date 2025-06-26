import React, { useEffect } from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import WalletIcon from "../../../assets/wallet";
import {
  Disclaimer,
  ModalBody,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../Common/Modal/styles";
import {
  InfoBox,
  InfoBoxButtons,
  LearnMoreButton,
  LearnMoreContainer,
} from "./styles";

import { DaimoPayOrderMode } from "@daimo/pay-common";
import { useDaimoPay } from "../../../hooks/useDaimoPay";
import useIsMobile from "../../../hooks/useIsMobile";
import useLocales from "../../../hooks/useLocales";
import Button from "../../Common/Button";
import ConnectorList from "../../Common/ConnectorList";
import { OrderHeader } from "../../Common/OrderHeader";

const Wallets: React.FC = () => {
  const context = usePayContext();
  const locales = useLocales({});

  const { isMobile } = useIsMobile();
  const { hydrateOrder, order } = useDaimoPay();

  // If we're on mobile & not in deposit mode, hydrate immediately.
  useEffect(() => {
    if (
      isMobile &&
      !context.paymentState.isDepositFlow &&
      order != null &&
      order.mode !== DaimoPayOrderMode.HYDRATED
    ) {
      hydrateOrder();
    }
  }, [isMobile, context.paymentState.isDepositFlow, hydrateOrder, order]);

  // Show new-user education buttons
  const showLearnMore = !context.options?.hideQuestionMarkCTA;
  const showGetWallet = !context.options?.hideNoWalletCTA;

  return (
    <PageContent>
      <OrderHeader minified />
      <ConnectorList />

      {isMobile ? (
        <>
          <InfoBox>
            <ModalContent style={{ padding: 0, textAlign: "left" }}>
              <ModalH1 $small>{locales.connectorsScreen_h1}</ModalH1>
              <ModalBody>{locales.connectorsScreen_p}</ModalBody>
            </ModalContent>
            <InfoBoxButtons>
              {showLearnMore && (
                <Button
                  variant={"tertiary"}
                  onClick={() => context.setRoute(ROUTES.ABOUT)}
                >
                  {locales.learnMore}
                </Button>
              )}
              {showGetWallet && (
                <Button
                  variant={"tertiary"}
                  onClick={() => context.setRoute(ROUTES.ONBOARDING)}
                >
                  {locales.getWallet}
                </Button>
              )}
            </InfoBoxButtons>
          </InfoBox>
        </>
      ) : (
        <>
          {showGetWallet && (
            <LearnMoreContainer>
              <LearnMoreButton
                onClick={() => context.setRoute(ROUTES.ONBOARDING)}
              >
                <WalletIcon /> {locales.connectorsScreen_newcomer}
              </LearnMoreButton>
            </LearnMoreContainer>
          )}
        </>
      )}
      {context.options?.disclaimer && (
        <Disclaimer style={{ visibility: "hidden", pointerEvents: "none" }}>
          <div>{context.options?.disclaimer}</div>
        </Disclaimer>
      )}
    </PageContent>
  );
};

export default Wallets;
