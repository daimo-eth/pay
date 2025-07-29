import React, { useEffect, useState } from "react";
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
  getChainExplorerTxUrl,
  RozoPayTokenAmount,
  stellar,
  WalletPaymentOption,
} from "@rozoai/intent-common";
import { useRozoPay } from "../../../../hooks/useDaimoPay";
import { useStellarDestination } from "../../../../hooks/useStellarDestination";
import { getSupportUrl } from "../../../../utils/supportUrl";
import Button from "../../../Common/Button";
import PaymentBreakdown from "../../../Common/PaymentBreakdown";
import TokenLogoSpinner from "../../../Spinners/TokenLogoSpinner";
import { roundTokenAmount } from "../../../../utils/format";
import {
  createRozoPayment,
  createRozoPaymentRequest,
  PaymentResponseData,
} from "../../../../utils/api";
import {
  ROZO_DAIMO_APP_ID,
  ROZO_STELLAR_ADDRESS,
  STELLAR_USDC_ASSET_CODE,
  STELLAR_USDC_ISSUER_PK,
} from "../../../../constants/rozoConfig";
import { useStellar } from "../../../../provider/StellarContextProvider";
enum PayState {
  CreatingPayment = "Creating Payment Record...",
  RequestingPayment = "Waiting for Payment",
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

  // Get the destination address and payment direction using our custom hook
  const { destinationAddress, isPayInStellarOutBase } =
    useStellarDestination(payParams);

  const { convertXlmToUsdc } = useStellar();

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
      preferredChain: String(stellar.chainId),
      preferredToken: "USDC_XLM",
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
          : `${STELLAR_USDC_ASSET_CODE}_XLM`,
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

      await hydrateOrder();

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

      const result = await payWithStellarTokenImpl(option.required, {
        destAddress: isPayInStellarOutBase
          ? payment.destination.destinationAddress ?? ROZO_STELLAR_ADDRESS
          : destinationAddress,
        usdcAmount: payment.destination.amountUnits,
        stellarAmount: roundTokenAmount(
          option.required.amount,
          option.required.token
        ),
      });

      setTxURL(getChainExplorerTxUrl(stellar.chainId, result.txHash));

      if (result.success) {
        setPayState(PayState.RequestSuccessful);
        setTxHash(result.txHash);
        setTimeout(() => {
          setActiveRozoPayment(undefined);
          setPaymentRozoCompleted(true);
          setRoute(ROUTES.CONFIRMATION, { event: "wait-pay-with-stellar" });
        }, 200);
      } else {
        setPayState(PayState.RequestFailed);
      }
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

  useEffect(() => {
    if (!selectedStellarTokenOption) return;

    // Give user time to see the UI before opening
    const transferTimeout = setTimeout(
      () => handleTransfer(selectedStellarTokenOption),
      100
    );
    return () => clearTimeout(transferTimeout);
  }, [selectedStellarTokenOption]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    triggerResize();
  }, [payState]); // eslint-disable-line react-hooks/exhaustive-deps

  if (selectedStellarTokenOption == null) {
    return <PageContent></PageContent>;
  }

  return (
    <PageContent>
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
