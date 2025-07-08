import React, { useEffect } from "react";

import {
  ModalBody,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../../Common/Modal/styles";

import { useWallet } from "@solana/wallet-adapter-react";
import { AnimatePresence, motion } from "framer-motion";
import { ROUTES } from "../../../../constants/routes";
import { usePayContext } from "../../../../hooks/usePayContext";
import styled from "../../../../styles/styled";
import { walletConfigs } from "../../../../wallets/walletConfigs";
import SquircleSpinner from "../../../Spinners/SquircleSpinner";

const ConnectSolana: React.FC = () => {
  const solanaWallets = useWallet();
  const isConnected = solanaWallets.connected;

  const { solanaConnector, setRoute, paymentState } = usePayContext();
  const { setTokenMode } = paymentState;

  const selectedWallet = solanaWallets.wallets.find(
    (wallet) => wallet.adapter.name === solanaConnector,
  );

  // Prefer icon from walletConfigs if available
  const getWalletIcon = () => {
    if (!selectedWallet) return null;

    const matchedConfig = Object.values(walletConfigs).find((cfg) => {
      if (!cfg.name) return false;
      const cfgName = cfg.name.toLowerCase();
      const walletName = selectedWallet.adapter.name.toLowerCase();
      return cfgName.includes(walletName) || walletName.includes(cfgName);
    });

    if (matchedConfig?.icon) {
      return typeof matchedConfig.icon === "string" ? (
        <img src={matchedConfig.icon} alt={matchedConfig.name} />
      ) : (
        (matchedConfig.icon as JSX.Element)
      );
    }

    return (
      <img
        src={selectedWallet.adapter.icon}
        alt={selectedWallet.adapter.name}
      />
    );
  };

  useEffect(() => {
    if (!solanaConnector) return;
    solanaWallets.select(solanaConnector);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solanaConnector]);

  useEffect(() => {
    if (!isConnected) return;
    // Wait so user can see it's connected
    const meta = {
      event: "wait-solana-connected",
      walletName: solanaWallets.wallet?.adapter.name,
    };
    setTimeout(() => {
      setTokenMode("solana");
      setRoute(ROUTES.SELECT_TOKEN, meta);
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                  {getWalletIcon()}
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
              Open {selectedWallet?.adapter.name} to continue.
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

export default ConnectSolana;
