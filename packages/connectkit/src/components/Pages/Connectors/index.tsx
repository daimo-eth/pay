import React, { useEffect, useRef } from "react";
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

import { RozoPayOrderMode } from "@rozoai/intent-common";
import { useRozoPay } from "../../../hooks/useDaimoPay";
import useIsMobile from "../../../hooks/useIsMobile";
import useLocales from "../../../hooks/useLocales";
import Button from "../../Common/Button";
import ConnectorList from "../../Common/ConnectorList";
import { OrderHeader } from "../../Common/OrderHeader";

const Wallets: React.FC = () => {
  const context = usePayContext();
  const locales = useLocales({});

  const { isMobile } = useIsMobile();
  const { hydrateOrder, order, setRozoPaymentId } = useRozoPay();

  const hasCustomDeeplink = React.useMemo(() => {
    return order?.metadata && order?.metadata.customDeeplinkUrl != null;
  }, [order?.metadata]);

  // Track if hydration has already been attempted to prevent multiple runs
  const hasHydratedRef = useRef(false);
  const lastOrderIdRef = useRef<bigint | null>(null);

  // If we're not in deposit mode, hydrate immediately (only once per order)
  useEffect(() => {
    // Reset hydration flag if we have a new order
    if (order?.id !== lastOrderIdRef.current) {
      hasHydratedRef.current = false;
      lastOrderIdRef.current = order?.id || null;
    }

    if (
      !hasHydratedRef.current &&
      !context.paymentState.isDepositFlow &&
      order != null &&
      order.mode !== RozoPayOrderMode.HYDRATED &&
      isMobile &&
      !hasCustomDeeplink
    ) {
      context.log("HYDRATING ORDER", order, context);
      hasHydratedRef.current = true;
      hydrateOrder();
    }

    if (hasCustomDeeplink) {
      hasHydratedRef.current = true;
    }
  }, [context.paymentState.isDepositFlow, order, isMobile, hasCustomDeeplink]);

  useEffect(() => {
    if (order?.externalId) {
      setRozoPaymentId(order.externalId);
    }
  }, [order]);

  // Show new-user education buttons
  const showLearnMore = !context.options?.hideQuestionMarkCTA;
  const showGetWallet = !context.options?.hideNoWalletCTA;

  return (
    <PageContent>
      <OrderHeader
        minified
        excludeLogos={["tron", "eth", "arbitrum", "optimism"]}
      />
      <ConnectorList
        customDeeplink={
          hasCustomDeeplink ? order?.metadata?.customDeeplinkUrl : null
        }
      />

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
