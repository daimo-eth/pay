import React, { useEffect, useState } from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import {
  ModalBody,
  ModalContent,
  PageContent,
} from "../../Common/Modal/styles";

import styled from "../../../styles/styled";
import { formatUsd, USD_DECIMALS } from "../../../utils/format";
import { isValidNumber, sanitizeNumber } from "../../../utils/validateInput";
import AmountInputField from "../../Common/AmountInput/AmountInputField";
import Button from "../../Common/Button";
import ExternalPaymentSpinner from "../../Spinners/ExternalPaymentSpinner";

const SelectExternalAmount: React.FC = () => {
  const { paymentState, setRoute, triggerResize } = usePayContext();
  const { selectedExternalOption } = paymentState;

  const maxUsdLimit = paymentState.getOrderUsdLimit();
  const minimumMessage =
    (selectedExternalOption?.minimumUsd ?? 0) > 0
      ? `Minimum ${formatUsd(selectedExternalOption?.minimumUsd ?? 0, "up")}`
      : null;

  const logoURI = selectedExternalOption?.logos?.[0]?.uri ?? "";
  const logoShape = selectedExternalOption?.logos?.[0]?.shape ?? "circle";

  const [usdInput, setUsdInput] = useState<string>("");
  const [message, setMessage] = useState<string | null>(minimumMessage);
  const [continueDisabled, setContinueDisabled] = useState(true);

  useEffect(() => {
    triggerResize();
  }, [message]);

  if (selectedExternalOption == null) {
    return <PageContent></PageContent>;
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value !== "" && !isValidNumber(value, USD_DECIMALS)) return;

    setUsdInput(value);

    if (Number(value) > maxUsdLimit) {
      setMessage(`Maximum ${formatUsd(maxUsdLimit)}`);
    } else {
      setMessage(minimumMessage);
    }

    const usd = Number(sanitizeNumber(value));
    setContinueDisabled(
      usd <= 0 ||
        usd < (selectedExternalOption.minimumUsd ?? 0) ||
        usd > maxUsdLimit,
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !continueDisabled) {
      handleContinue();
    }
  };

  const handleContinue = () => {
    const amountUsd = Number(sanitizeNumber(usdInput));
    paymentState.setChosenUsd(amountUsd);
    setRoute(ROUTES.WAITING_EXTERNAL, { amountUsd });
  };

  return (
    <PageContent>
      <ExternalPaymentSpinner
        logoURI={logoURI}
        logoShape={logoShape}
        showSpinner={false}
      />
      <ModalContent $preserveDisplay={true}>
        <AmountInputContainer>
          <AmountInputField
            value={usdInput}
            onChange={handleAmountChange}
            onKeyDown={handleKeyDown}
          />
        </AmountInputContainer>
        {message && <ModalBody>{message}</ModalBody>}
        <Button onClick={handleContinue} disabled={continueDisabled}>
          Continue
        </Button>
      </ModalContent>
    </PageContent>
  );
};

const AmountInputContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

export default SelectExternalAmount;
