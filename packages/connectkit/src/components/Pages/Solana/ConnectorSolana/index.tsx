import React, { useEffect } from "react";

import {
  ModalBody,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../../Common/Modal/styles";

import { useWallet } from "@solana/wallet-adapter-react";
import { AnimatePresence, motion } from "framer-motion";
import styled from "../../../../styles/styled";
import { ROUTES, useContext } from "../../../DaimoPay";
import SquircleSpinner from "../../../Spinners/SquircleSpinner";
import { LoadingContainer } from "../../WaitingOther";

const ConnectSolana: React.FC = () => {
  const solanaWallets = useWallet();
  const isConnected = solanaWallets.connected;

  const { solanaConnector, setRoute } = useContext();

  const selectedWallet = solanaWallets.wallets.find(
    (wallet) => wallet.adapter.name === solanaConnector,
  );

  useEffect(() => {
    if (!solanaConnector) return;
    async function connect() {
      if (!solanaConnector) return;

      try {
        solanaWallets.select(solanaConnector);
        await solanaWallets.connect();
      } catch (error) {
        console.error("Error connecting to wallet", error);
      }
    }
    connect();
  }, [solanaConnector]);

  useEffect(() => {
    if (isConnected) {
      // Wait so user can see it's connected
      setTimeout(() => setRoute(ROUTES.SOLANA_SELECT_TOKEN), 100);
    }
  }, [isConnected]);

  if (!solanaConnector) return null;

  return (
    <PageContent>
      <LoadingContainer>
        <AnimationContainer>
          <AnimatePresence>
            <SquircleSpinner
              logo={
                <div style={{ borderRadius: "22.5%", overflow: "hidden" }}>
                  <img
                    src={selectedWallet?.adapter.icon}
                    alt={selectedWallet?.adapter.name}
                  />
                </div>
              }
              loading={true}
            />
          </AnimatePresence>
        </AnimationContainer>
      </LoadingContainer>
      <ModalContent style={{ paddingBottom: 0 }}>
        <ModalH1>Requesting Connection</ModalH1>
        <ModalBody>Open {selectedWallet?.adapter.name} to continue.</ModalBody>
      </ModalContent>
    </PageContent>
  );
};

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

export default ConnectSolana;
