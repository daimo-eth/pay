import { getChainExplorerTxUrl, WalletPaymentOption } from "@daimo/pay-common";
import React, { useEffect, useState } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { ROUTES } from "../../../constants/routes";
import { useDaimoPay } from "../../../hooks/useDaimoPay";
import useLocales from "../../../hooks/useLocales";
import { usePayContext } from "../../../hooks/usePayContext";
import { getSupportUrl } from "../../../utils/supportUrl";
import { TrpcClient } from "../../../utils/trpc";
import Button from "../../Common/Button";
import {
  Link,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../Common/Modal/styles";
import PaymentBreakdown from "../../Common/PaymentBreakdown";
import TokenLogoSpinner from "../../Spinners/TokenLogoSpinner";

enum PayState {
  RequestingPayment = "Waiting For Payment",
  SwitchingChain = "Switching Chain",
  RequestCancelled = "Payment Cancelled",
  RequestSuccessful = "Payment Successful",
  RequestFailed = "Payment Failed",
}

const PayWithToken: React.FC = () => {
  const { triggerResize, paymentState, setRoute, log, trpc } = usePayContext();
  const { payWithToken, selectedTokenOption } = paymentState;
  const { order } = useDaimoPay();
  const [payState, setPayStateInner] = useState<PayState>(
    PayState.RequestingPayment,
  );
  const setPayState = (state: PayState) => {
    setPayStateInner(state);
    log(`[PAY TOKEN] payState: ${state}`);
    (trpc as TrpcClient).nav.mutate({
      action: "pay-with-token-state",
      data: { state },
    });
  };
  const [txURL, setTxURL] = useState<string | undefined>();
  const locales = useLocales();
  const walletChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const trySwitchingChain = async (
    option: WalletPaymentOption,
    forceSwitch: boolean = false,
  ): Promise<boolean> => {
    if (walletChainId !== option.required.token.chainId || forceSwitch) {
      const resultChain = await (async () => {
        try {
          return await switchChainAsync({
            chainId: option.required.token.chainId,
          });
        } catch (e) {
          console.error("Failed to switch chain", e);
          return null;
        }
      })();

      if (resultChain?.id !== option.required.token.chainId) {
        return false;
      }
    }

    return true;
  };

  const handleTransfer = async (option: WalletPaymentOption) => {
    // Switch chain if necessary
    setPayState(PayState.SwitchingChain);
    const switchChain = await trySwitchingChain(option);

    if (!switchChain) {
      console.error("Switching chain failed");
      setPayState(PayState.RequestCancelled);
      return;
    }

    setPayState(PayState.RequestingPayment);
    try {
      const result = await payWithToken(option);
      if (!result.txHash) {
        // Transaction not submitted yet. Do nothing, just keep polling.
        return;
      }
      setTxURL(
        getChainExplorerTxUrl(option.required.token.chainId, result.txHash),
      );
      if (result.success) {
        setPayState(PayState.RequestSuccessful);
        setTimeout(() => {
          setRoute(ROUTES.CONFIRMATION, { event: "wait-pay-with-token" });
        }, 200);
      } else {
        setPayState(PayState.RequestFailed);
      }
    } catch (e: any) {
      if (e?.name === "ConnectorChainMismatchError") {
        // Workaround for Rainbow wallet bug -- user is able to switch chain
        // without the wallet updating the chain ID for wagmi.
        log("Chain mismatch detected, attempting to switch and retry");
        const switchSuccessful = await trySwitchingChain(option, true);
        if (switchSuccessful) {
          setPayState(PayState.RequestingPayment);
          try {
            const retryResult = await payWithToken(option);
            if (!retryResult.txHash) {
              // Transaction not submitted yet. Do nothing, just keep polling.
              return;
            }
            setTxURL(
              getChainExplorerTxUrl(
                option.required.token.chainId,
                retryResult.txHash,
              ),
            );
            if (retryResult.success) {
              setPayState(PayState.RequestSuccessful);
              setTimeout(() => {
                setRoute(ROUTES.CONFIRMATION, { event: "wait-pay-with-token" });
              }, 200);
            } else {
              setPayState(PayState.RequestFailed);
            }
            return; // Payment handled after switching chain
          } catch (retryError) {
            console.error(
              "Failed to pay with token after switching chain",
              retryError,
            );
            throw retryError;
          }
        }
      }
      setPayState(PayState.RequestCancelled);
      console.error("Failed to pay with token", e);
    }
  };

  useEffect(() => {
    if (!selectedTokenOption) return;

    const transferTimeout = setTimeout(() => {
      handleTransfer(selectedTokenOption);
    }, 100);
    return () => {
      clearTimeout(transferTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTokenOption]);

  useEffect(() => {
    triggerResize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payState]);

  if (selectedTokenOption == null) {
    return <PageContent></PageContent>;
  }

  return (
    <PageContent>
      <TokenLogoSpinner token={selectedTokenOption.required.token} />
      <ModalContent style={{ paddingBottom: 0 }} $preserveDisplay={true}>
        {txURL ? (
          <ModalH1>
            <Link href={txURL} target="_blank" rel="noopener noreferrer">
              {payState}
            </Link>
          </ModalH1>
        ) : (
          <ModalH1>{payState}</ModalH1>
        )}
        <PaymentBreakdown paymentOption={selectedTokenOption} />
        {payState === PayState.RequestCancelled && (
          <Button onClick={() => handleTransfer(selectedTokenOption)}>
            {locales.retryPayment}
          </Button>
        )}
        {payState === PayState.RequestFailed && (
          <Button
            onClick={() => {
              window.open(
                getSupportUrl(
                  order?.id?.toString() ?? "",
                  `Pay with token${txURL ? ` ${txURL}` : ""}`,
                ),
                "_blank",
              );
            }}
          >
            {locales.contactSupport}
          </Button>
        )}
      </ModalContent>
    </PageContent>
  );
};

export default PayWithToken;
