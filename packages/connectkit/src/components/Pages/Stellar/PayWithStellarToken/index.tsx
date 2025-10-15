import React, { useEffect, useRef, useState } from "react";
import { ROUTES } from "../../../../constants/routes";
import { usePayContext } from "../../../../hooks/usePayContext";

import {
  Link,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../../Common/Modal/styles";

import {
  RozoPayHydratedOrderWithOrg,
  RozoPayTokenAmount,
  rozoSolana,
  rozoSolanaUSDC,
  rozoStellarUSDC,
  WalletPaymentOption,
} from "@rozoai/intent-common";
import {
  FeeBumpTransaction,
  Networks,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  ROZO_DAIMO_APP_ID,
  STELLAR_USDC_ISSUER_PK,
} from "../../../../constants/rozoConfig";
import { useRozoPay } from "../../../../hooks/useDaimoPay";
import { useStellarDestination } from "../../../../hooks/useStellarDestination";
import { useStellar } from "../../../../provider/StellarContextProvider";
import {
  createRozoPayment,
  createRozoPaymentRequest,
} from "../../../../utils/api";
import { roundTokenAmount } from "../../../../utils/format";
import { getSupportUrl } from "../../../../utils/supportUrl";
import Button from "../../../Common/Button";
import PaymentBreakdown from "../../../Common/PaymentBreakdown";
import TokenLogoSpinner from "../../../Spinners/TokenLogoSpinner";

enum PayState {
  CreatingPayment = "Creating Payment Record...",
  RequestingPayment = "Waiting for Payment",
  WaitingForConfirmation = "Waiting for Confirmation",
  ProcessingPayment = "Processing Payment",
  RequestCancelled = "Payment Cancelled",
  RequestFailed = "Payment Failed",
  RequestSuccessful = "Payment Successful",
}

const PayWithStellarToken: React.FC = () => {
  const { triggerResize, paymentState, setRoute } = usePayContext();
  const {
    selectedStellarTokenOption,
    payWithStellarToken: payWithStellarTokenImpl,
    setTxHash,
    payParams,
    setRozoPaymentId,
    rozoPaymentId,
  } = paymentState;
  const {
    order,
    setPaymentRozoCompleted,
    setPaymentCompleted,
    hydrateOrderRozo,
  } = useRozoPay();

  const [payState, setPayState] = useState<PayState>(PayState.CreatingPayment);
  const [txURL, setTxURL] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [signedTx, setSignedTx] = useState<string | undefined>();
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Get the destination address and payment direction using our custom hook
  const { destinationAddress, hasToStellarAddress } =
    useStellarDestination(payParams);

  const {
    convertXlmToUsdc,
    server: stellarServer,
    publicKey: stellarPublicKey,
    kit: stellarKit,
  } = useStellar();

  // ROZO API CALL
  const handleCreatePayment = async (
    payToken: RozoPayTokenAmount,
    destinationAddress?: string
  ) => {
    setPayState(PayState.CreatingPayment);

    let amount: any = roundTokenAmount(payToken.amount, payToken.token);
    // Convert XLM to USDC for Pay In Stellar, Pay Out Stellar scenarios
    if (payToken.token.symbol === "XLM") {
      amount = await convertXlmToUsdc(amount);
    }

    const paymentData = createRozoPaymentRequest({
      appId: payParams?.appId ?? ROZO_DAIMO_APP_ID,
      display: {
        intent: order?.metadata?.intent ?? "",
        paymentValue: String(payToken.usd),
        currency: "USD",
      },
      preferredChain: String(rozoStellarUSDC.chainId),
      preferredToken: "USDC",
      destination: {
        destinationAddress: destinationAddress,
        chainId: hasToStellarAddress
          ? String(rozoStellarUSDC.chainId)
          : payParams?.toSolanaAddress
          ? String(rozoSolana.chainId)
          : String(payParams?.toChain),
        amountUnits: amount,
        tokenSymbol: "USDC",
        tokenAddress: hasToStellarAddress
          ? `USDC:${STELLAR_USDC_ISSUER_PK}`
          : payParams?.toSolanaAddress
          ? rozoSolanaUSDC.token
          : payParams?.toToken,
      },
      externalId: order?.externalId ?? "",
      metadata: {
        daimoOrderId: order?.id ?? "",
        ...(order?.metadata ?? {}),
      },
    });

    // API Call
    try {
      const response = await createRozoPayment(paymentData);

      if (!response?.data?.id) {
        throw new Error(response?.error?.message ?? "Payment creation failed");
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // FOR TRANSFER ACTION
  const handleTransfer = async (option: WalletPaymentOption) => {
    setIsLoading(true);
    try {
      if (!destinationAddress) {
        throw new Error("Stellar destination address is required");
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

      if (!payment) {
        throw new Error("Payment not found");
      }

      setRozoPaymentId(payment.externalId as string);
      setPayState(PayState.RequestingPayment);

      const paymentData = {
        destAddress: (payment.destFinalCall.to as string) || destinationAddress,
        usdcAmount: String(payment.destFinalCallTokenAmount.usd),
        stellarAmount: roundTokenAmount(
          payment.destFinalCallTokenAmount.amount,
          payment.destFinalCallTokenAmount.token
        ),
      };

      if (payment.metadata?.memo) {
        Object.assign(paymentData, { memo: payment.metadata.memo as string });
      }

      const result = await payWithStellarTokenImpl(option, paymentData);

      setSignedTx(result.signedTx);
      setPayState(PayState.WaitingForConfirmation);
    } catch (error) {
      if (error instanceof Error && error.message.includes("declined")) {
        setPayState(PayState.RequestCancelled);
      } else {
        setPayState(PayState.RequestFailed);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitTx = async () => {
    if (signedTx && stellarServer && stellarKit) {
      try {
        // Sign and submit transaction
        const signedTransaction = await stellarKit.signTransaction(signedTx, {
          address: stellarPublicKey,
          networkPassphrase: Networks.PUBLIC,
        });

        setIsLoading(true);
        setPayState(PayState.ProcessingPayment);

        const tx = TransactionBuilder.fromXDR(
          signedTransaction.signedTxXdr,
          Networks.PUBLIC
        );

        const response = await stellarServer.submitTransaction(
          tx as Transaction | FeeBumpTransaction
        );

        if (response.successful) {
          setPayState(PayState.RequestSuccessful);
          setTxHash(response.hash);
          setSignedTx(undefined);
          setTimeout(() => {
            setPaymentRozoCompleted(true);
            setPaymentCompleted(response.hash, rozoPaymentId);
            setRoute(ROUTES.CONFIRMATION, { event: "wait-pay-with-stellar" });
          }, 200);
        } else {
          setPayState(PayState.RequestFailed);
        }
      } catch (error) {
        setPayState(PayState.RequestFailed);
      } finally {
        setIsLoading(false);
      }
    } else {
      console.error(
        "[PAY STELLAR] Cannot submit transaction - missing requirements"
      );
    }
  };

  useEffect(() => {
    if (signedTx) {
      submitButtonRef.current?.click();
    }
  }, [signedTx]);

  useEffect(() => {
    if (!selectedStellarTokenOption) return;

    // Give user time to see the UI before opening
    const transferTimeout = setTimeout(
      () => handleTransfer(selectedStellarTokenOption),
      100
    );
    return () => clearTimeout(transferTimeout);
  }, [selectedStellarTokenOption]);

  useEffect(() => {
    triggerResize();
  }, [payState]);

  if (selectedStellarTokenOption == null) {
    return <PageContent></PageContent>;
  }

  return (
    <PageContent>
      <button
        ref={submitButtonRef}
        style={{ display: "none" }}
        onClick={handleSubmitTx}
      />
      {selectedStellarTokenOption && (
        <TokenLogoSpinner
          token={selectedStellarTokenOption.required.token}
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
        <PaymentBreakdown paymentOption={selectedStellarTokenOption} />
        {payState === PayState.WaitingForConfirmation && signedTx && (
          <Button
            variant="primary"
            onClick={() => {
              handleSubmitTx();
            }}
          >
            Confirm Payment
          </Button>
        )}
        {payState === PayState.RequestCancelled && (
          <Button onClick={() => handleTransfer(selectedStellarTokenOption)}>
            Retry Payment
          </Button>
        )}
        {payState === PayState.RequestFailed && (
          <Button
            onClick={() => {
              window.open(
                getSupportUrl(
                  order?.id?.toString() ?? "",
                  `Pay with Stellar token${txURL ? ` ${txURL}` : ""}`
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

export default PayWithStellarToken;
