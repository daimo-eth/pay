import React, { useEffect, useState } from "react";
import { usePayContext } from "../../../../hooks/usePayContext";

import {
  Link,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../../Common/Modal/styles";

import {
  base,
  getChainExplorerTxUrl,
  RozoPayTokenAmount,
  rozoSolana,
  rozoSolanaUSDC,
  rozoStellar,
  rozoStellarUSDC,
  WalletPaymentOption,
} from "@rozoai/intent-common";
import {
  WalletSendTransactionError,
  WalletSignTransactionError,
} from "@solana/wallet-adapter-base";
import { ROUTES } from "../../../../constants/routes";
import {
  ROZO_DAIMO_APP_ID,
  ROZO_SOLANA_USDC_MINT_ADDRESS,
  SOLANA_USDC_ASSET_CODE,
  STELLAR_USDC_ISSUER_PK,
} from "../../../../constants/rozoConfig";
import { useRozoPay } from "../../../../hooks/useDaimoPay";
import { useSolanaDestination } from "../../../../hooks/useSolanaDestination";
import { useStellarDestination } from "../../../../hooks/useStellarDestination";
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
  RequestCancelled = "Payment Cancelled",
  RequestFailed = "Payment Failed",
  RequestSuccessful = "Payment Successful",
}

const PayWithSolanaToken: React.FC = () => {
  const { triggerResize, paymentState, setRoute, log, trpc } = usePayContext();
  const {
    selectedSolanaTokenOption,
    payWithSolanaTokenRozo: payWithSolanaTokenImpl,
    payParams,
    rozoPaymentId,
    setRozoPaymentId,
    setTxHash,
  } = paymentState;
  const { order, setPaymentRozoCompleted, setPaymentCompleted } = useRozoPay();
  const [payState, setPayStateInner] = useState<PayState>(
    PayState.RequestingPayment
  );
  const [txURL, setTxURL] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [activeRozoPayment, setActiveRozoPayment] = useState<
    PaymentResponseData | undefined
  >();

  // Get the destination address and payment direction using our custom hook
  const { destinationAddress, hasToSolanaAddress } =
    useSolanaDestination(payParams);

  const { hasToStellarAddress, destinationAddress: stellarDestinationAddress } =
    useStellarDestination(payParams);

  const setPayState = (state: PayState) => {
    if (state === payState) return;
    setPayStateInner(state);
    log(`[PayWithSolanaToken] payState: ${state}`);
    // (trpc as TrpcClient).nav.mutate({
    //   action: "pay-with-solana-token-state",
    //   data: { state },
    // });
  };

  // ROZO API CALL
  const handleCreatePayment = async (
    payToken: RozoPayTokenAmount,
    destinationAddress?: string
  ) => {
    setPayState(PayState.CreatingPayment);

    let amount: any = roundTokenAmount(payToken.amount, payToken.token);

    const paymentData = createRozoPaymentRequest({
      appId: payParams?.appId ?? ROZO_DAIMO_APP_ID,
      display: {
        intent: order?.metadata?.intent ?? "",
        paymentValue: String(payToken.usd),
        currency: "USD",
      },
      preferredChain: String(rozoSolanaUSDC.chainId),
      preferredToken: "USDC",
      destination: {
        destinationAddress: hasToSolanaAddress
          ? destinationAddress
          : hasToStellarAddress
          ? stellarDestinationAddress
          : payParams?.toAddress,
        chainId: hasToSolanaAddress
          ? String(rozoSolana.chainId)
          : hasToStellarAddress
          ? String(rozoStellar.chainId)
          : String(base.chainId),
        amountUnits: amount,
        tokenSymbol: hasToSolanaAddress
          ? rozoSolanaUSDC.symbol
          : hasToStellarAddress
          ? rozoStellarUSDC.symbol
          : SOLANA_USDC_ASSET_CODE,
        tokenAddress: hasToSolanaAddress
          ? rozoSolanaUSDC.token
          : hasToStellarAddress
          ? `USDC:${STELLAR_USDC_ISSUER_PK}`
          : ROZO_SOLANA_USDC_MINT_ADDRESS,
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

  // @NOTE: This is Pay In Solana by Rozo
  // FOR TRANSFER ACTION
  const handleTransfer = async (option: WalletPaymentOption) => {
    setIsLoading(true);
    try {
      if (!destinationAddress) {
        throw new Error("Solana destination address is required");
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
        tokenAddress:
          (payment.metadata.payintokenaddress as string) ??
          SOLANA_USDC_ASSET_CODE,
        destAddress:
          (payment.metadata.receivingAddress as string) || destinationAddress,
        usdcAmount: payment.destination.amountUnits,
        solanaAmount: roundTokenAmount(
          option.required.amount,
          option.required.token
        ),
      };

      if (payment.metadata?.memo) {
        Object.assign(paymentData, { memo: payment.metadata.memo as string });
      }

      const result = await payWithSolanaTokenImpl(option, paymentData);
      console.log(
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
