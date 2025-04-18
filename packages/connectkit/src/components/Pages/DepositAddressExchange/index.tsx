import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import binanceTutorialVideo from "../../../assets/videos/binance-tutorial.mp4";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import { ExternalLinkIcon } from "../../../assets/icons";
import { isMobile } from "../../../utils";
import type { TrpcClient } from "../../../utils/trpc";
import Button from "../../Common/Button";
import CopyToClipboard from "../../Common/CopyToClipboard";
import {
  ModalBody,
  ModalContent,
  PageContent,
} from "../../Common/Modal/styles";
const StepIndicator = styled.div`
  color: var(--ck-body-muted);
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
  text-align: center;
`;

const ContentBox = styled.div`
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  color: var(--ck-body-primary);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.15);
  transition: all 200ms ease;
`;

const StepContent = styled.div`
  text-align: left;
  font-size: 17px;
  line-height: 24px;
  color: var(--ck-body-color);
`;

const FinalStepContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;

  .copy-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .instruction {
    font-size: 17px;
    line-height: 24px;
  }
`;

const GoldenButtonWrapper = styled.div`
  button {
    background-color: #eeb80f !important;
    &:hover {
      background-color: #d6a50e !important;
    }
    &:active {
      background-color: #bf920d !important;
    }

    /* Style the icon to be white and fully opaque */
    svg {
      color: white !important;
      path {
        fill-opacity: 1 !important;
      } 
       
       }
    }
  }
`;

const StyledModalBody = styled(ModalBody)<{ $isLastStep: boolean }>`
  min-height: 350px;
  display: flex;
  flex-direction: column;
`;

const StepContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 16px;
`;

const NonFinalStepContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const VideoContainer = styled.div`
  position: fixed;
  opacity: 0;
  pointer-events: none;
  width: 1px;
  height: 1px;
  overflow: hidden;
`;

const Video = styled.video`
  width: 360px;
  aspect-ratio: 9/16;
`;

const PayWithBinance: React.FC = () => {
  const mobile = isMobile();
  const [currentStep, setCurrentStep] = useState(1);
  const [addressCopied, setAddressCopied] = useState(false);
  const [amountCopied, setAmountCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const context = usePayContext();
  const { triggerResize, paymentState, setRoute } = context;
  const trpc = context.trpc as TrpcClient;

  const { daimoPayOrder } = paymentState;

  // Use intentAddr for address if order is hydrated
  const address =
    daimoPayOrder?.mode === "hydrated"
      ? daimoPayOrder?.intentAddr
      : "0x4E04D236A5aEd4EB7d95E0514c4c8394c690BB58";

  // Use destFinalCallTokenAmount for amount, add 0.30 for fees
  const amount = daimoPayOrder?.destFinalCallTokenAmount?.usd
    ? (
        parseFloat(daimoPayOrder.destFinalCallTokenAmount.usd.toString()) + 0.3
      ).toFixed(2)
    : "10.30"; // Default amount (10.00 + 0.30)

  useEffect(() => {
    const checkForSourcePayment = async () => {
      if (!daimoPayOrder) return;

      const found = await trpc.findSourcePayment.query({
        orderId: daimoPayOrder.id.toString(),
      });

      if (found) {
        setRoute(ROUTES.CONFIRMATION);
      }
    };

    // Check every 10 seconds for payment
    const interval = setInterval(checkForSourcePayment, 10000);
    return () => clearInterval(interval);
  }, [daimoPayOrder?.id]);

  // useEffect(() => {
  //   // Start playing the video silently in the background
  //   if (videoRef.current) {
  //     videoRef.current.play().catch(console.error);
  //   }
  // }, []);

  const handleAddressButtonClick = () => {
    setAddressCopied(true);
  };

  const handleAmountButtonClick = () => {
    setAmountCopied(true);
  };

  const handleOpenBinance = async () => {
    if (mobile) {
      try {
        if (videoRef.current) {
          videoRef.current.play().catch(console.error);
          await videoRef.current.requestPictureInPicture();
          // Short delay to ensure PiP is active
          setTimeout(() => {
            window.location.href = "bnc://";
          }, 100);
        }
      } catch (error) {
        console.error("PiP failed:", error);
        window.location.href = "bnc://";
      }
    } else {
      window.open(
        "https://www.binance.com/en/my/wallet/account/main/withdrawal/crypto/USDC",
        "_blank",
      );
    }
  };

  const steps = {
    1: {
      content: (
        <NonFinalStepContainer>
          <ContentBox>
            <StepContent>
              Open the Binance app and go to the 'Withdraw' section. Select USDC
              as the currency you want to withdraw.
            </StepContent>
          </ContentBox>
          <Button variant="primary" arrow onClick={() => setCurrentStep(2)}>
            Next
          </Button>
        </NonFinalStepContainer>
      ),
    },
    2: {
      content: (
        <NonFinalStepContainer>
          <ContentBox>
            <StepContent>
              Choose Arbitrum as the network for your withdrawal. This ensures
              fast and low-cost transactions.
            </StepContent>
          </ContentBox>
          <Button variant="primary" arrow onClick={() => setCurrentStep(3)}>
            Next
          </Button>
        </NonFinalStepContainer>
      ),
    },
    3: {
      content: (
        <FinalStepContainer>
          <ContentBox>
            <StepContent className="instruction">
              Copy the address and amount below, then click 'Open Binance' to
              complete your withdrawal:
            </StepContent>
          </ContentBox>
          <div className="copy-buttons">
            <div onClick={handleAddressButtonClick}>
              <CopyToClipboard
                variant="button"
                string={
                  daimoPayOrder?.mode === "hydrated"
                    ? daimoPayOrder?.intentAddr
                    : address
                }
              >
                Copy Address
              </CopyToClipboard>
            </div>
            {/* <div onClick={handleAmountButtonClick}>
              <CopyToClipboard
                variant="button"
                string={
                  daimoPayOrder?.destFinalCallTokenAmount?.usd?.toString() ||
                  amount
                }
              >
                Copy Amount ($
                {daimoPayOrder?.destFinalCallTokenAmount?.usd?.toString() ||
                  amount}
                )
              </CopyToClipboard>
            </div> */}
          </div>
          <GoldenButtonWrapper>
            <Button
              icon={<ExternalLinkIcon />}
              variant="primary"
              disabled={!addressCopied && !amountCopied}
              onClick={handleOpenBinance}
            >
              Open Binance
            </Button>
          </GoldenButtonWrapper>
        </FinalStepContainer>
      ),
    },
  };

  return (
    <PageContent>
      <VideoContainer>
        <Video
          ref={videoRef}
          src={binanceTutorialVideo}
          playsInline
          muted
          loop
          autoPlay
        />
      </VideoContainer>
      <ModalContent>
        <StyledModalBody $isLastStep={currentStep === 3}>
          <StepContainer>
            <StepIndicator>Step {currentStep} of 3</StepIndicator>
            {steps[currentStep].content}
          </StepContainer>
        </StyledModalBody>
      </ModalContent>
    </PageContent>
  );
};

export default PayWithBinance;
