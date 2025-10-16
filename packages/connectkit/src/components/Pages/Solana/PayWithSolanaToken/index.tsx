import React, { useEffect, useState } from "react";
import { usePayContext } from "../../../../hooks/usePayContext";

import {
  Link,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../../Common/Modal/styles";

import {
  getChainExplorerTxUrl,
  RozoPayHydratedOrderWithOrg,
  rozoSolana,
  WalletPaymentOption,
} from "@rozoai/intent-common";
import {
  WalletSendTransactionError,
  WalletSignTransactionError,
} from "@solana/wallet-adapter-base";
import { ROUTES } from "../../../../constants/routes";
import { SOLANA_USDC_ASSET_CODE } from "../../../../constants/rozoConfig";
import { useRozoPay } from "../../../../hooks/useDaimoPay";
import { useSolanaDestination } from "../../../../hooks/useSolanaDestination";
import { getSupportUrl } from "../../../../utils/supportUrl";
import Button from "../../../Common/Button";
import PaymentBreakdown from "../../../Common/PaymentBreakdown";
import TokenLogoSpinner from "../../../Spinners/TokenLogoSpinner";
enum PayState {
  CreatingPayment = "Creating Payment Record...",
  RequestingPayment = "Waiting for Payment",
  RequestCancelled = "Payment Cancelled",
  RequestFailed = "Payment Failed",
  RequestSuccessful = "Payment Successful",
}

const PayWithSolanaToken: React.FC = () => {
  const { triggerResize, paymentState, setRoute, log } = usePayContext();
  const {
    selectedSolanaTokenOption,
    payWithSolanaTokenRozo: payWithSolanaTokenImpl,
    payParams,
    rozoPaymentId,
    setRozoPaymentId,
    setTxHash,
  } = paymentState;
  const {
    order,
    setPaymentRozoCompleted,
    setPaymentCompleted,
    hydrateOrderRozo,
  } = useRozoPay();
  const [payState, setPayStateInner] = useState<PayState>(
    PayState.RequestingPayment
  );
  const [txURL, setTxURL] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Get the destination address and payment direction using our custom hook
  const { destinationAddress, hasToSolanaAddress } =
    useSolanaDestination(payParams);

  const setPayState = (state: PayState) => {
    if (state === payState) return;
    setPayStateInner(state);
    log(`[PayWithSolanaToken] payState: ${state}`);
    // (trpc as TrpcClient).nav.mutate({
    //   action: "pay-with-solana-token-state",
    //   data: { state },
    // });
  };

  // @NOTE: This is Pay In Solana by Rozo
  // FOR TRANSFER ACTION
  const handleTransfer = async (option: WalletPaymentOption) => {
    setIsLoading(true);
    try {
      if (!destinationAddress) {
        throw new Error("Solana destination address is required");
      }

      const { required } = option;

      let payment: RozoPayHydratedOrderWithOrg | undefined;
      if (!payment) {
        // Use destinationAddress directly as it's now the middleware address
        // payment = await handleCreatePayment(
        //   option.required,
        //   destinationAddress
        // );
        const hydratedOrder = await hydrateOrderRozo(undefined, option);
        if (!hydratedOrder.order) {
          throw new Error("Hydrated order not found");
        }

        payment = hydratedOrder.order as any;
      }

      log("[PAY SOLANA] Payment:", { payment });

      if (!payment) {
        throw new Error("Payment not found");
      }

      setRozoPaymentId(payment.externalId as string);
      setPayState(PayState.RequestingPayment);

      const paymentData = {
        tokenAddress:
          (required.token.token as string) ?? SOLANA_USDC_ASSET_CODE,
        destAddress: (payment.destFinalCall.to as string) || destinationAddress,
        usdcAmount: String(payment.destFinalCallTokenAmount.usd),
        solanaAmount: String(payment.destFinalCallTokenAmount.usd),
      };

      if (payment.metadata?.memo) {
        Object.assign(paymentData, { memo: payment.metadata.memo as string });
      }

      log("[PAY SOLANA] Rozo payment:", { paymentData });

      const result = await payWithSolanaTokenImpl(option, paymentData);
      log(
        "[PAY SOLANA] Result",
        result,
        getChainExplorerTxUrl(rozoSolana.chainId, result.txHash)
      );
      setTxURL(getChainExplorerTxUrl(rozoSolana.chainId, result.txHash));

      if (result.success) {
        setPayState(PayState.RequestSuccessful);
        setTxHash(result.txHash);
        setTimeout(() => {
          setPaymentRozoCompleted(true);
          setPaymentCompleted(result.txHash, rozoPaymentId);
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

  // @NOTE: This is Daimo Pay In Solana (by default)
  // const handleTransfer = async (option: WalletPaymentOption) => {
  //   setPayState(PayState.RequestingPayment);
  //   try {
  //     const result = await payWithSolanaToken(option);
  //     setTxURL(getChainExplorerTxUrl(solana.chainId, result.txHash));
  //     if (result.success) {
  //       setPayState(PayState.RequestSuccessful);
  //       setTimeout(() => {
  //         setRoute(ROUTES.CONFIRMATION, { event: "wait-pay-with-solana" });
  //       }, 200);
  //     } else {
  //       setPayState(PayState.RequestFailed);
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     if (
  //       error instanceof WalletSignTransactionError ||
  //       error instanceof WalletSendTransactionError
  //     ) {
  //       setPayState(PayState.RequestCancelled);
  //     } else {
  //       setPayState(PayState.RequestFailed);
  //     }
  //   }
  // };

  useEffect(() => {
    if (!selectedSolanaTokenOption) return;

    // Give user time to see the UI before opening
    const transferTimeout = setTimeout(
      () => handleTransfer(selectedSolanaTokenOption),
      100
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
        <TokenLogoSpinner
          token={selectedSolanaTokenOption.required.token}
          loading={isLoading}
        />
      )}
      <ModalContent style={{ paddingBottom: 0 }}>
        {txURL ? (
          <ModalH1>
            <Link href={txURL} target="_blank" rel="noopener noreferrer">
              {payState}
            </Link>
          </ModalH1>
        ) : (
          <ModalH1>{payState}</ModalH1>
        )}
        <PaymentBreakdown paymentOption={selectedSolanaTokenOption} />
        {payState === PayState.RequestCancelled && (
          <Button onClick={() => handleTransfer(selectedSolanaTokenOption)}>
            Retry Payment
          </Button>
        )}
        {payState === PayState.RequestFailed && (
          <Button
            onClick={() => {
              window.open(
                getSupportUrl(
                  order?.id?.toString() ?? "",
                  `Pay with Solana token${txURL ? ` ${txURL}` : ""}`
                ),
                "_blank"
              );
            }}
          >
            Contact Support
          </Button>
        )}
      </ModalContent>
    </PageContent>
  );
};

export default PayWithSolanaToken;
