import React, { useEffect, useMemo, useState } from "react";
import { usePayContext } from "../../../hooks/usePayContext";

import {
  Link,
  ModalBody,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../Common/Modal/styles";

import {
  assert,
  bscUSDT,
  getAddressContraction,
  getChainExplorerTxUrl,
  getOrderDestChainId,
  getRozoPayment,
  rozoSolana,
  rozoStellar,
} from "@rozoai/intent-common";
import { motion } from "framer-motion";
import {
  ExternalLinkIcon,
  LoadingCircleIcon,
  TickIcon,
} from "../../../assets/icons";
import defaultTheme from "../../../constants/defaultTheme";
import {
  DEFAULT_ROZO_APP_ID,
  ROZO_INVOICE_URL,
} from "../../../constants/rozoConfig";
import { useRozoPay } from "../../../hooks/useDaimoPay";
import { useSupportedChains } from "../../../hooks/useSupportedChains";
import styled from "../../../styles/styled";
import Button from "../../Common/Button";
import PoweredByFooter from "../../Common/PoweredByFooter";

const poolDelay = 4000;

const Confirmation: React.FC = () => {
  const {
    confirmationMessage,
    onSuccess,
    debugMode,
    paymentState: paymentStateContext,
    triggerResize,
    ...context
  } = usePayContext();
  const {
    order,
    paymentState,
    setPaymentCompleted,
    setPaymentRozoCompleted,
    setPaymentPayoutCompleted,
    setPayoutRozoCompleted,
  } = useRozoPay();

  const [isConfirming, setIsConfirming] = useState<boolean>(true);

  const [payoutLoading, setPayoutLoading] = useState<boolean>(false);
  const [payoutTxHashUrl, setPayoutTxHashUrl] = useState<string | undefined>(
    undefined
  );
  const [payoutTxHash, setPayoutTxHash] = useState<string | undefined>(
    undefined
  );

  // Track if completion events have been sent to prevent duplicate calls
  const paymentCompletedSent = React.useRef<string | null>(null);
  const payoutCompletedSent = React.useRef<string | null>(null);

  const isMugglePay = useMemo(() => {
    return (
      paymentStateContext?.payParams?.appId.includes("MP") &&
      paymentStateContext.selectedTokenOption?.required.token.token ===
        bscUSDT.token
    );
  }, [paymentStateContext]);

  const showProcessingPayout = useMemo(() => {
    const { payParams, tokenMode } = paymentStateContext;

    if (
      payParams &&
      (tokenMode === "stellar" || tokenMode === "solana" || tokenMode === "evm")
    ) {
      return (
        payParams.showProcessingPayout &&
        // Hide Processing Payout if appId contains "MP" (MugglePay)
        !isMugglePay
      );
    }

    return false;
  }, [paymentStateContext, isMugglePay]);

  const rozoPaymentId = useMemo(() => {
    return order?.externalId || paymentStateContext.rozoPaymentId;
  }, [order, paymentStateContext]);

  const { tokens: supportedTokens } = useSupportedChains(
    paymentStateContext.payParams?.appId ?? DEFAULT_ROZO_APP_ID,
    paymentStateContext.payParams?.preferredChains
  );

  const { done, txURL, rawPayInHash } = useMemo(() => {
    const { tokenMode, txHash } = paymentStateContext;

    const isRozoPayment =
      tokenMode === "stellar" ||
      tokenMode === "solana" ||
      (["evm", "all"].includes(tokenMode) &&
        order &&
        supportedTokens.some(
          (token) => token.token === order.destFinalCallTokenAmount?.token.token
        ));

    if (isRozoPayment && txHash) {
      // Add delay before setting payment completed to show confirming state
      if (isConfirming) {
        // setTimeout(() => {
        setPaymentCompleted(txHash, rozoPaymentId);
        setIsConfirming(false);
        // }, 300);
        return { done: false, txURL: undefined };
      }

      // Determine chain ID based on token mode
      let chainId: number;
      if (tokenMode === "stellar") {
        chainId = rozoStellar.chainId;
      } else if (tokenMode === "solana") {
        chainId = rozoSolana.chainId;
      } else {
        chainId = Number(
          paymentStateContext.selectedTokenOption?.required.token.chainId
        );
      }

      const txURL = getChainExplorerTxUrl(chainId, txHash);
      return { done: true, txURL, rawPayInHash: txHash };
    } else {
      if (
        paymentState === "payment_completed" ||
        paymentState === "payment_bounced"
      ) {
        const txHash = order.destFastFinishTxHash ?? order.destClaimTxHash;
        const destChainId = getOrderDestChainId(order);
        assert(
          txHash != null,
          `[CONFIRMATION] paymentState: ${paymentState}, but missing txHash`
        );
        const txURL = getChainExplorerTxUrl(destChainId, txHash);

        return { done: true, txURL, rawPayInHash: txHash };
      }
    }

    return { done: false, txURL: undefined, rawPayInHash: undefined };
  }, [paymentState, order, paymentStateContext, isConfirming, rozoPaymentId]);

  const receiptUrl = useMemo(() => {
    if (
      order &&
      "metadata" in order &&
      "receiptUrl" in order.metadata &&
      typeof order.metadata.receiptUrl === "string"
    ) {
      const url = new URL(order.metadata.receiptUrl as string);
      return url.toString();
    }
    return undefined;
  }, [order]);

  const generateReceiptUrl = useMemo(() => {
    // If the receiptUrl is set, use it
    if (receiptUrl) {
      return receiptUrl;
    }

    if (rozoPaymentId) {
      const url = new URL(`${ROZO_INVOICE_URL}/receipt`);
      url.searchParams.set("id", rozoPaymentId);
      return url.toString();
    }
    return undefined;
  }, [rozoPaymentId, receiptUrl]);

  useEffect(() => {
    if (order && done && rozoPaymentId && showProcessingPayout) {
      triggerResize();
      context.log(
        "[CONFIRMATION] Starting payout polling for order:",
        order.externalId
      );
      setPayoutLoading(true);

      let isActive = true;
      let timeoutId: NodeJS.Timeout;

      const pollPayout = async () => {
        if (!isActive || !rozoPaymentId) return;

        try {
          context.log(
            "[CONFIRMATION] Polling for payout transaction:",
            rozoPaymentId
          );
          const response = await getRozoPayment(rozoPaymentId);
          context.log("[CONFIRMATION] Payout polling response:", response.data);

          if (
            isActive &&
            response.data &&
            response.data.payoutTransactionHash &&
            typeof response.data.payoutTransactionHash === "string"
          ) {
            const url = getChainExplorerTxUrl(
              Number(response.data.destination.chainId),
              response.data.payoutTransactionHash
            );
            context.log(
              "[CONFIRMATION] Found payout transaction:",
              response.data.payoutTransactionHash,
              "URL:",
              url
            );
            setPayoutTxHash(response.data.payoutTransactionHash);
            setPayoutTxHashUrl(url);
            setPayoutLoading(false);
            triggerResize();
            return;
          }

          // Schedule next poll
          if (isActive) {
            timeoutId = setTimeout(pollPayout, poolDelay);
          }
        } catch (error) {
          console.error("[CONFIRMATION] Payout polling error:", error);
          if (isActive) {
            timeoutId = setTimeout(pollPayout, poolDelay);
          }
        }
      };

      // Start polling
      timeoutId = setTimeout(pollPayout, 0);

      return () => {
        isActive = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }
  }, [txURL, order, done, rozoPaymentId, showProcessingPayout]);

  useEffect(() => {
    if (done && rawPayInHash && rozoPaymentId) {
      // Only call once per unique payment hash to prevent duplicate state updates
      const paymentKey = `${rawPayInHash}-${rozoPaymentId}`;
      if (paymentCompletedSent.current === paymentKey) {
        return;
      }

      context.log("[CONFIRMATION] Setting payment completed:", {
        rawPayInHash,
        rozoPaymentId,
      });

      paymentCompletedSent.current = paymentKey;
      setPaymentCompleted(rawPayInHash, rozoPaymentId);
      setPaymentRozoCompleted(true);
      onSuccess();
    }
  }, [done, onSuccess, paymentStateContext, rawPayInHash, rozoPaymentId]);

  useEffect(() => {
    if (done && payoutTxHash && rozoPaymentId) {
      // Only call once per unique payout hash to prevent duplicate state updates
      const payoutKey = `${payoutTxHash}-${rozoPaymentId}`;
      if (payoutCompletedSent.current === payoutKey) {
        return;
      }

      context.log("[CONFIRMATION] Setting payout completed:", {
        payoutTxHash,
        rozoPaymentId,
      });

      payoutCompletedSent.current = payoutKey;
      setPaymentPayoutCompleted(payoutTxHash, rozoPaymentId);
      setPayoutRozoCompleted(true);
    }
  }, [done, payoutTxHash, rozoPaymentId]);

  useEffect(() => {
    if (debugMode) {
      context.log(`[ORDER] Order: `, order);
    }
  }, [order, debugMode]);

  return (
    <PageContent
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ModalContent
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 0,
        }}
      >
        <AnimationContainer>
          <InsetContainer>
            <Spinner $status={done} />
            <SuccessIcon $status={done} />
          </InsetContainer>
        </AnimationContainer>

        {!done ? (
          <ModalH1>Confirming...</ModalH1>
        ) : (
          <>
            <ModalH1
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                flexDirection: "column",
              }}
            >
              Payment Completed
            </ModalH1>

            {txURL && (
              <ListContainer>
                <ListItem>
                  <ModalBody>Transfer Hash</ModalBody>
                  <ModalBody>
                    <Link
                      href={txURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 14, fontWeight: 400 }}
                    >
                      {getAddressContraction(rawPayInHash)}
                      <ExternalIcon />
                    </Link>
                  </ModalBody>
                </ListItem>

                {showProcessingPayout && (
                  <ListItem>
                    <ModalBody>Receiver Hash</ModalBody>
                    <ModalBody>
                      {payoutLoading ? (
                        <LoadingText>Processing payout...</LoadingText>
                      ) : payoutTxHashUrl && payoutTxHash ? (
                        <Link
                          href={payoutTxHashUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 14, fontWeight: 400 }}
                        >
                          {getAddressContraction(payoutTxHash)}
                          <ExternalIcon />
                        </Link>
                      ) : (
                        <PlaceholderText>Pending...</PlaceholderText>
                      )}
                    </ModalBody>
                  </ListItem>
                )}
              </ListContainer>
            )}

            {confirmationMessage && (
              <ModalBody>{confirmationMessage}</ModalBody>
            )}
          </>
        )}

        {done && generateReceiptUrl && (
          <Button
            iconPosition="right"
            href={generateReceiptUrl}
            style={{ width: "100%" }}
          >
            See Receipt
          </Button>
        )}
        <PoweredByFooter
          showSupport={!done}
          preFilledMessage={`Transaction: ${txURL}`}
        />
      </ModalContent>
    </PageContent>
  );
};

const AnimationContainer = styled(motion.div)`
  position: relative;
  width: 100px;
  height: 100px;
  transition: transform 0.5s ease-in-out;
  margin-bottom: 16px;
`;

const InsetContainer = styled(motion.div)`
  position: absolute;
  overflow: hidden;
  inset: 6px;
  border-radius: 50px;
  background: var(--ck-body-background);
  display: flex;
  align-items: center;
  justify-content: center;
  svg {
    position: absolute;
    width: 100%;
    height: 100%;
  }
`;

const SuccessIcon = styled(TickIcon)<{ $status: boolean }>`
  color: var(--ck-body-color-valid);
  transition: all 0.2s ease-in-out;
  position: absolute;
  opacity: ${(props) => (props.$status ? 1 : 0)};
  transform: ${(props) => (props.$status ? "scale(1)" : "scale(0.5)")};
`;

const Spinner = styled(LoadingCircleIcon)<{ $status: boolean }>`
  position: absolute;
  transition: all 0.2s ease-in-out;
  animation: rotateSpinner 400ms linear infinite;
  opacity: ${(props) => (props.$status ? 0 : 1)};
  color: var(--ck-body-action-color);

  @keyframes rotateSpinner {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 4px;
  margin-top: 16px;

  @media only screen and (max-width: ${defaultTheme.mobileWidth}px) {
    & ${ModalBody} {
      margin: 0 !important;
      max-width: 100% !important;
      text-align: left !important;
    }
  }
`;

const ListItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 320px;
  gap: 5rem;
  padding: 8px 0;

  @media only screen and (max-width: ${defaultTheme.mobileWidth}px) {
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 100%;
    max-width: 100%;
  }
`;

const ExternalIcon = styled(ExternalLinkIcon)`
  width: 14px;
  height: 14px;
  transition: opacity 0.2s ease;
  color: var(--ck-body-action-color);

  &:hover {
    opacity: 1;
    cursor: pointer;
  }
`;

const PlaceholderText = styled.span`
  font-size: 14px;
  font-weight: 400;
  color: var(--ck-body-color-muted);
  opacity: 0.6;
  font-style: italic;

  @media only screen and (max-width: ${defaultTheme.mobileWidth}px) {
    font-size: 13px;
  }
`;

const LoadingText = styled.span`
  font-size: 14px;
  font-weight: 400;
  font-style: italic;
  color: transparent;
  background: linear-gradient(90deg, #333, #999, #fff, #999, #333);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  animation: shine 10s ease-in-out infinite;

  @keyframes shine {
    0% {
      background-position: -300% 0;
    }
    50% {
      background-position: 300% 0;
    }
    100% {
      background-position: -300% 0;
    }
  }
`;

export default Confirmation;
