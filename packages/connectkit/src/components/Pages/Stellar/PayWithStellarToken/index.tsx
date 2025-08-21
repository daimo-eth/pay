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
  base,
  baseUSDC,
  RozoPayTokenAmount,
  rozoStellar,
  stellar,
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
  ROZO_STELLAR_ADDRESS,
  STELLAR_USDC_ASSET_CODE,
  STELLAR_USDC_ISSUER_PK,
} from "../../../../constants/rozoConfig";
import { useRozoPay } from "../../../../hooks/useDaimoPay";
import { useStellarDestination } from "../../../../hooks/useStellarDestination";
import { useStellar } from "../../../../provider/StellarContextProvider";
import {
  createRozoPayment,
  createRozoPaymentRequest,
  PaymentResponseData,
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
  } = paymentState;
  const { order, setPaymentRozoCompleted, hydrateOrder } = useRozoPay();

  const [payState, setPayState] = useState<PayState>(PayState.CreatingPayment);
  const [txURL, setTxURL] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [activeRozoPayment, setActiveRozoPayment] = useState<
    PaymentResponseData | undefined
  >();
  const [signedTx, setSignedTx] = useState<string | undefined>();
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Get the destination address and payment direction using our custom hook
  const { destinationAddress, isPayInStellarOutBase } =
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
      preferredChain: String(rozoStellar.chainId),
      preferredToken: "USDC",
      destination: {
        destinationAddress: isPayInStellarOutBase
          ? payParams?.toAddress
          : destinationAddress,
        chainId: isPayInStellarOutBase
          ? String(base.chainId)
          : String(stellar.chainId),
        amountUnits: amount,
        tokenSymbol: isPayInStellarOutBase
          ? baseUSDC.symbol
          : STELLAR_USDC_ASSET_CODE,
        tokenAddress: isPayInStellarOutBase
          ? baseUSDC.token
          : STELLAR_USDC_ISSUER_PK,
      },
      externalId: order?.externalId ?? "",
      metadata: {
        daimoOrderId: order?.id ?? "",
        ...(order?.metadata ?? {}),
      },
    });

    // API Call
    const response = await createRozoPayment(paymentData);
    if (!response?.data?.id) {
      throw new Error(response?.error?.message ?? "Payment creation failed");
    }

    setActiveRozoPayment(response.data);
    return response.data;
  };

  // FOR TRANSFER ACTION
  const handleTransfer = async (option: WalletPaymentOption) => {
    setIsLoading(true);
    try {
      if (!destinationAddress) {
        throw new Error("Stellar destination address is required");
      }

      // await hydrateOrder(undefined, option);

      let payment: PaymentResponseData | undefined = activeRozoPayment;
      if (!payment) {
        // Use destinationAddress directly as it's now the middleware address
        payment = await handleCreatePayment(
          option.required,
          destinationAddress
        );
      }

      setRozoPaymentId(payment.id as string);
      setPayState(PayState.RequestingPayment);

      const paymentData = {
        destAddress: isPayInStellarOutBase
          ? (payment.metadata.receivingAddress as string) ??
            ROZO_STELLAR_ADDRESS
          : destinationAddress,
        usdcAmount: payment.destination.amountUnits,
        stellarAmount: roundTokenAmount(
          option.required.amount,
          option.required.token
        ),
      };

      if (payment.metadata?.memo) {
        Object.assign(paymentData, { memo: payment.metadata.memo as string });
      }

      console.log("[PAY STELLAR] Payment data", paymentData);
      const result = await payWithStellarTokenImpl(option, paymentData);
      setSignedTx(result.signedTx);
      setPayState(PayState.WaitingForConfirmation);
    } catch (error) {
      console.error(error);
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
    console.log("[PAY STELLAR] Submitting transaction", signedTx);
    if (signedTx && stellarServer && stellarKit) {
      // Sign and submit transaction
      const signedTransaction = await stellarKit.signTransaction(signedTx, {
        address: stellarPublicKey,
        networkPassphrase: Networks.PUBLIC,
      });
      const tx = TransactionBuilder.fromXDR(signedTransaction.signedTxXdr, Networks.PUBLIC);
      const response = await stellarServer.submitTransaction(
        tx as Transaction | FeeBumpTransaction
      );

      console.log("[PAY STELLAR] Transaction submitted", response);
      if (response.successful) {
        setPayState(PayState.RequestSuccessful);
        setTxHash(response.hash);
        setSignedTx(undefined);
        setTimeout(() => {
          setActiveRozoPayment(undefined);
          setPaymentRozoCompleted(true);
          setRoute(ROUTES.CONFIRMATION, { event: "wait-pay-with-stellar" });
        }, 200);
      } else {
        setPayState(PayState.RequestFailed);
      }
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
