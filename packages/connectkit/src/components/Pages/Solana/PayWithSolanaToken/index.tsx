import React, { useCallback, useEffect, useState } from "react";
import { usePayContext } from "../../../../hooks/usePayContext";

import {
  Link,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../../Common/Modal/styles";

import {
  formatResponseToHydratedOrder,
  getChainExplorerTxUrl,
  RozoPayHydratedOrderWithOrg,
  rozoSolana,
  rozoSolanaUSDC,
  WalletPaymentOption,
} from "@rozoai/intent-common";
import { ROUTES } from "../../../../constants/routes";
import { useRozoPay } from "../../../../hooks/useDaimoPay";
import { useSolanaDestination } from "../../../../hooks/useSolanaDestination";
import { getSupportUrl } from "../../../../utils/supportUrl";
import Button from "../../../Common/Button";
import PaymentBreakdown from "../../../Common/PaymentBreakdown";
import TokenLogoSpinner from "../../../Spinners/TokenLogoSpinner";

enum PayState {
  PreparingTransaction = "Preparing Transaction",
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
    setPayId,
    createPayment,
  } = paymentState;
  const {
    order,
    paymentState: state,
    setPaymentStarted,
    setPaymentUnpaid,
    setPaymentRozoCompleted,
    setPaymentCompleted,
    hydrateOrderRozo,
  } = useRozoPay();

  // Get the destination address and payment direction using our custom hook
  const { destinationAddress } = useSolanaDestination(payParams);

  const [payState, setPayStateInner] = useState<PayState>(
    PayState.RequestingPayment
  );
  const [txURL, setTxURL] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

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
  const handleTransfer = useCallback(
    async (option: WalletPaymentOption) => {
      setIsLoading(true);
      try {
        if (!destinationAddress) {
          throw new Error("Solana destination address is required");
        }

        if (!order) {
          throw new Error("Order not initialized");
        }

        const { required } = option;

        const needRozoPayment =
          "payinchainid" in order.metadata &&
          Number(order.metadata.payinchainid) !== required.token.chainId;

        let hydratedOrder: RozoPayHydratedOrderWithOrg;
        let paymentId: string | undefined;

        if (state === "payment_unpaid" && !needRozoPayment) {
          hydratedOrder = order;
        } else if (needRozoPayment) {
          const res = await createPayment(option);
          paymentId = res.id;
          hydratedOrder = formatResponseToHydratedOrder(res);
        } else {
          // Hydrate existing order
          const res = await hydrateOrderRozo(undefined, option);
          hydratedOrder = res.order;
        }

        if (!hydratedOrder) {
          throw new Error("Payment not found");
        }

        const newId = paymentId ?? hydratedOrder.externalId;
        if (newId) {
          setRozoPaymentId(newId);
          setPaymentStarted(String(newId), hydratedOrder);
        }

        setPayState(PayState.RequestingPayment);

        const paymentData = {
          tokenAddress:
            (required.token.token as string) ?? rozoSolanaUSDC.token,
          destAddress:
            (hydratedOrder.destFinalCall.to as string) || destinationAddress,
          usdcAmount: String(hydratedOrder.destFinalCallTokenAmount.usd),
          solanaAmount: String(hydratedOrder.destFinalCallTokenAmount.usd),
        };

        if (hydratedOrder.metadata?.memo) {
          Object.assign(paymentData, {
            memo: hydratedOrder.metadata.memo as string,
          });
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
          setPayState(PayState.RequestCancelled);
        }
      } catch (error) {
        if (rozoPaymentId) {
          setPaymentUnpaid(rozoPaymentId);
        }
        if ((error as any).message.includes("rejected")) {
          setPayState(PayState.RequestCancelled);
        } else {
          setPayState(PayState.RequestFailed);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      destinationAddress,
      order,
      state,
      createPayment,
      setPayId,
      hydrateOrderRozo,
      log,
      setRozoPaymentId,
      setPaymentStarted,
      setPayState,
      payWithSolanaTokenImpl,
      setTxURL,
      setTxHash,
      setPaymentRozoCompleted,
      setPaymentCompleted,
      setRoute,
      setPaymentUnpaid,
      rozoPaymentId,
    ]
  );

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
        {payState === PayState.RequestCancelled && !isLoading && (
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
