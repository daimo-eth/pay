import React, { useState } from "react";
import styled from "styled-components";
import Button from "../../Common/Button";
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

const StepContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 16px;
`;

const StyledModalBody = styled(ModalBody)<{ $height: number }>`
  min-height: ${(props) => props.$height}px;
  display: flex;
  flex-direction: column;
  transition: min-height 0.2s ease;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 8px;
`;

export interface Step {
  content: React.ReactNode;
  height: number;
  nextLabel?: string;
  onNext?: () => void;
  hideNext?: boolean;
}

interface StepModalProps {
  steps: Step[];
  onComplete?: () => void;
  onBack?: () => void;
}

export const StepModal: React.FC<StepModalProps> = ({
  steps,
  onComplete,
  onBack,
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  const handleNext = () => {
    const step = steps[currentStep - 1];
    if (step.onNext) {
      step.onNext();
    }
    if (currentStep === steps.length) {
      onComplete?.();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      onBack?.();
    } else {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const currentStepData = steps[currentStep - 1];

  return (
    <PageContent>
      <ModalContent>
        <StyledModalBody $height={currentStepData.height}>
          <StepContainer>
            <StepIndicator>
              Step {currentStep} of {steps.length}
            </StepIndicator>
            {currentStepData.content}
            <ButtonContainer>
              {currentStep > 1 && (
                <Button variant="secondary" onClick={handleBack}>
                  Back
                </Button>
              )}
              {!currentStepData.hideNext && (
                <Button
                  variant="primary"
                  arrow={currentStep !== steps.length}
                  onClick={handleNext}
                  style={{ flex: 1 }}
                >
                  {currentStepData.nextLabel ||
                    (currentStep === steps.length ? "Complete" : "Next")}
                </Button>
              )}
            </ButtonContainer>
          </StepContainer>
        </StyledModalBody>
      </ModalContent>
    </PageContent>
  );
};
