import React from "react";
import { usePayContext } from "../../../hooks/usePayContext";

import {
  ModalBody,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../Common/Modal/styles";

import { ExternalLinkIcon } from "../../../assets/icons";
import Button from "../../Common/Button";
import WalletPaymentSpinner from "../../Spinners/WalletPaymentSpinner";

const WaitingWallet: React.FC = () => {
  const context = usePayContext();
  const { paymentState } = context;

  const { selectedWallet, paymentWaitingMessage, selectedWalletDeepLink } =
    paymentState;

  const openWalletWindow = (url: string) => {
    window.open(url, "_blank");
  };

  if (!selectedWallet) {
    return <PageContent> No wallet selected </PageContent>;
  }

  return (
    <PageContent>
      <WalletPaymentSpinner
        logo={selectedWallet.icon}
        logoShape={
          selectedWallet.iconShape === "square"
            ? "squircle"
            : selectedWallet.iconShape || "squircle"
        }
      />
      <ModalContent style={{ marginLeft: 24, marginRight: 24 }}>
        <ModalH1>
          Continue in {selectedWallet.shortName ?? selectedWallet.name}
        </ModalH1>
        {paymentWaitingMessage && (
          <ModalBody style={{ marginTop: 12, marginBottom: 12 }}>
            {paymentWaitingMessage}
          </ModalBody>
        )}
      </ModalContent>
      <Button
        icon={<ExternalLinkIcon />}
        onClick={() => {
          if (selectedWalletDeepLink) {
            openWalletWindow(selectedWalletDeepLink);
          }
        }}
      >
        {`Open ${selectedWallet.name}`}
      </Button>
    </PageContent>
  );
};

export default WaitingWallet;
