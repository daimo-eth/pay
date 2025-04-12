import { WalletPaymentOption } from "@daimo/pay-common";
import React, { useEffect, useState } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { ExternalLinkIcon } from "../../../assets/icons";
import { ROUTES } from "../../../constants/routes";
import useIsMobile from "../../../hooks/useIsMobile";
import { usePayContext } from "../../../hooks/usePayContext";
import Button from "../../Common/Button";
import { ModalContent, ModalH1, PageContent } from "../../Common/Modal/styles";
import PaymentBreakdown from "../../Common/PaymentBreakdown";
import TokenLogoSpinner from "../../Spinners/TokenLogoSpinner";
enum PayState {
  RequestingPayment = "Waiting For Payment",
  SwitchingChain = "Switching Chain",
  RequestCancelled = "Payment Cancelled",
  RequestSuccessful = "Payment Successful",
}

const PayWithToken: React.FC = () => {
  const { isMobile, isIOS } = useIsMobile();
  const { triggerResize, paymentState, setRoute, log, wcWallet } =
    usePayContext();
  const { payWithToken, selectedTokenOption } = paymentState;
  const [payState, setPayState] = useState<PayState>(
    PayState.RequestingPayment,
  );

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
      await payWithToken(option);
      setPayState(PayState.RequestSuccessful);
      setTimeout(() => {
        setRoute(ROUTES.CONFIRMATION, { event: "wait-pay-with-token" });
      }, 200);
    } catch (e: any) {
      if (e?.name === "ConnectorChainMismatchError") {
        // Workaround for Rainbow wallet bug -- user is able to switch chain without
        // the wallet updating the chain ID for wagmi.
        log("Chain mismatch detected, attempting to switch and retry");
        const switchSuccessful = await trySwitchingChain(option, true);
        if (switchSuccessful) {
          try {
            await payWithToken(option);
            return; // Payment successful after switching chain
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

  let transferTimeout: any; // Prevent double-triggering in React dev strict mode.

  useEffect(() => {
    if (!selectedTokenOption) return;

    // Give user time to see the UI before opening on mobile
    if (wcWallet && isMobile) {
      if (!isIOS) {
        transferTimeout = setTimeout(() => {
          window.open(wcWallet?.getWalletConnectDeeplink?.(""));
          handleTransfer(selectedTokenOption);
        }, 800);
      } else {
        // On iOS, we open the wallet connect modal immediately
        handleTransfer(selectedTokenOption);
      }
    }

    // On desktop, open the wallet connect modal immediately
    else {
      transferTimeout = setTimeout(() => {
        handleTransfer(selectedTokenOption);
      }, 100);
    }
    return () => {
      clearTimeout(transferTimeout);
    };
  }, [selectedTokenOption]);

  useEffect(() => {
    triggerResize();
  }, [payState]);

  if (selectedTokenOption == null) {
    return <PageContent></PageContent>;
  }

  return (
    <PageContent>
      <TokenLogoSpinner token={selectedTokenOption.required.token} />
      <ModalContent style={{ paddingBottom: 0 }} $preserveDisplay={true}>
        <ModalH1>{payState}</ModalH1>
        <PaymentBreakdown paymentOption={selectedTokenOption} />
        {payState === PayState.RequestingPayment && wcWallet && isMobile && (
          <Button
            icon={<ExternalLinkIcon />}
            onClick={
              wcWallet.isWcMobileConnector
                ? () => handleTransfer(selectedTokenOption)
                : undefined
            }
            href={
              wcWallet.isWcMobileConnector
                ? undefined
                : wcWallet.walletDeepLink ||
                  wcWallet.getWalletConnectDeeplink?.("")
            }
          >
            Pay with {wcWallet.name}
          </Button>
        )}
        {payState === PayState.RequestCancelled && (
          <Button onClick={() => handleTransfer(selectedTokenOption)}>
            Retry Payment
          </Button>
        )}
      </ModalContent>
    </PageContent>
  );
};

export default PayWithToken;
