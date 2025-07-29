import React, { useEffect } from "react";

import {
  ModalBody,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../../Common/Modal/styles";

import { AnimatePresence, motion } from "framer-motion";
import { ROUTES } from "../../../../constants/routes";
import { usePayContext } from "../../../../hooks/usePayContext";
import styled from "../../../../styles/styled";
import SquircleSpinner from "../../../Spinners/SquircleSpinner";
import { useStellar } from "../../../../provider/StellarContextProvider";

const ConnectorStellar: React.FC = () => {
  const { stellarConnector, setRoute, paymentState } = usePayContext();
  const { setTokenMode } = paymentState;

  const { connector: selectedWallet, isConnected } = useStellar();

  useEffect(() => {
    if (!isConnected) return;
    // Wait so user can see it's connected
    const meta = {
      event: "wait-stellar-connected",
      walletName: selectedWallet?.name,
    };
    setTimeout(() => {
      setTokenMode("stellar");
      setRoute(ROUTES.SELECT_TOKEN, meta);
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  if (!stellarConnector) return null;

  return (
    <PageContent>
      <LoadingContainer>
        <AnimationContainer>
          <AnimatePresence>
            <SquircleSpinner
              logo={
                <div style={{ borderRadius: "22.5%", overflow: "hidden" }}>
                  <img
                    src={selectedWallet?.icon}
                    alt={selectedWallet?.name}
                  />
                </div>
              }
              loading={true}
            />
          </AnimatePresence>
        </AnimationContainer>
      </LoadingContainer>
      <ModalContent style={{ paddingBottom: 0 }}>
        {isConnected ? (
          <ModalH1>Connected</ModalH1>
        ) : (
          <>
            <ModalH1>Requesting Connection</ModalH1>
            <ModalBody>
              Open {selectedWallet?.name} to continue.
            </ModalBody>
          </>
        )}
      </ModalContent>
    </PageContent>
  );
};

export const LoadingContainer = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px auto 16px;
  height: 120px;
`;
const AnimationContainer = styled(motion.div)`
  user-select: none;
  position: relative;
  --spinner-error-opacity: 0;
  &:before {
    content: "";
    position: absolute;
    inset: 1px;
    opacity: 0;
    background: var(--ck-body-color-danger);
  }
`;

export default ConnectorStellar;
