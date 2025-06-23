import React, { useEffect, useState } from "react";
import { ROUTES } from "../../../../constants/routes";
import { usePayContext } from "../../../../hooks/usePayContext";

import {
  WalletSendTransactionError,
  WalletSignTransactionError,
} from "@solana/wallet-adapter-base";
import {
  ModalContent,
  ModalH1,
  PageContent,
} from "../../../Common/Modal/styles";

import { WalletPaymentOption } from "@daimo/pay-common";
import Button from "../../../Common/Button";
import PaymentBreakdown from "../../../Common/PaymentBreakdown";
import TokenLogoSpinner from "../../../Spinners/TokenLogoSpinner";
enum PayState {
  RequestingPayment = "Waiting For Payment",
  RequestCancelled = "Payment Cancelled",
  RequestFailed = "Payment Failed",
  RequestSuccessful = "Payment Successful",
}

const PayWithSolanaToken: React.FC = () => {
  const { triggerResize, paymentState, setRoute } = usePayContext();
  const { selectedSolanaTokenOption, payWithSolanaToken } = paymentState;
  const [payState, setPayState] = useState<PayState>(
    PayState.RequestingPayment,
  );

  const handleTransfer = async (option: WalletPaymentOption) => {
    setPayState(PayState.RequestingPayment);
    try {
      const successTxHash = await payWithSolanaToken(
        option.required.token.token,
      );
      if (successTxHash != null) {
        setPayState(PayState.RequestSuccessful);
        setTimeout(() => {
          setRoute(ROUTES.CONFIRMATION, { event: "wait-pay-with-solana" });
        }, 200);
      } else {
        setPayState(PayState.RequestFailed);
      }
    } catch (error) {
      console.error(error);
      if (
        error instanceof WalletSignTransactionError ||
        error instanceof WalletSendTransactionError
      ) {
        setPayState(PayState.RequestCancelled);
      } else {
        setPayState(PayState.RequestFailed);
      }
    }
  };

  useEffect(() => {
    if (!selectedSolanaTokenOption) return;

    // Give user time to see the UI before opening
    const transferTimeout = setTimeout(
      () => handleTransfer(selectedSolanaTokenOption),
      100,
    );
    return () => clearTimeout(transferTimeout);
  }, [selectedSolanaTokenOption]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    triggerResize();
  }, [payState]); // eslint-disable-line react-hooks/exhaustive-deps

  if (selectedSolanaTokenOption == null) {
    return <PageContent></PageContent>;
  }

  return (
    <PageContent>
      {selectedSolanaTokenOption && (
        <TokenLogoSpinner token={selectedSolanaTokenOption.required.token} />
      )}
      <ModalContent style={{ paddingBottom: 0 }}>
        <ModalH1>{payState}</ModalH1>
        <PaymentBreakdown paymentOption={selectedSolanaTokenOption} />
        {payState === PayState.RequestCancelled && (
          <Button onClick={() => handleTransfer(selectedSolanaTokenOption)}>
            Retry Payment
          </Button>
        )}
      </ModalContent>
    </PageContent>
  );
};

export default PayWithSolanaToken;
