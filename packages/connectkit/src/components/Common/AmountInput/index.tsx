import React, { useEffect, useState } from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import {
  ModalBody,
  ModalContent,
  PageContent,
} from "../../Common/Modal/styles";

import { WalletPaymentOption } from "@daimo/pay-common";
import { parseUnits } from "viem";
import styled from "../../../styles/styled";
import {
  formatUsd,
  roundTokenAmount,
  roundTokenAmountUnits,
  roundUsd,
  tokenAmountToRoundedUsd,
  USD_DECIMALS,
  usdToRoundedTokenAmount,
} from "../../../utils/format";
import { isValidNumber, sanitizeNumber } from "../../../utils/validateInput";
import Button from "../../Common/Button";
import SwitchButton from "../../Common/SwitchButton";
import TokenLogoSpinner from "../../Spinners/TokenLogoSpinner";
import AmountInputField from "./AmountInputField";

const MultiCurrencySelectAmount: React.FC<{
  selectedTokenOption: WalletPaymentOption;
  setSelectedTokenOption: (option: WalletPaymentOption) => void;
  nextPage: ROUTES;
}> = ({ selectedTokenOption, setSelectedTokenOption, nextPage }) => {
  const { paymentState, setRoute, triggerResize } = usePayContext();
  const maxUsdLimit = paymentState.getOrderUsdLimit();

  const balanceToken = selectedTokenOption.balance.token;
  const isUsdStablecoin = balanceToken.fiatSymbol === "$";

  const minimumMessage =
    selectedTokenOption.minimumRequired.usd > 0
      ? `Minimum 
  ${formatUsd(selectedTokenOption.minimumRequired.usd, "up")}`
      : null;

  const [usdValue, setUsdValue] = useState("");
  const [tokenValue, setTokenValue] = useState(
    usdToRoundedTokenAmount(0, balanceToken),
  );
  const [isEditingUsd, setIsEditingUsd] = useState(true);
  const [message, setMessage] = useState<string | null>(minimumMessage);
  const [continueDisabled, setContinueDisabled] = useState(true);

  useEffect(() => {
    triggerResize();
  }, [message]);

  /**
   * Update the editable value and secondary value, taking into account whether
   * the user is currently editing the USD value or the token value.
   */
  const updateValues = (
    newUsdValue: string,
    newTokenValue: string,
    newIsEditingUsd: boolean,
  ) => {
    const sanitizedUsdValue = sanitizeNumber(newUsdValue);
    const sanitizedTokenValue = sanitizeNumber(newTokenValue);

    // Update the state. Don't sanitize the value if the user is editing it.
    setUsdValue(
      newIsEditingUsd ? newUsdValue : roundUsd(Number(sanitizedUsdValue)),
    );
    setTokenValue(
      newIsEditingUsd
        ? roundTokenAmountUnits(Number(sanitizedTokenValue), balanceToken)
        : newTokenValue,
    );
    setIsEditingUsd(newIsEditingUsd);

    setContinueDisabled(
      Number(sanitizedUsdValue) <= 0 ||
        Number(sanitizedUsdValue) < selectedTokenOption.minimumRequired.usd ||
        Number(sanitizedUsdValue) > selectedTokenOption.balance.usd ||
        Number(sanitizedUsdValue) > maxUsdLimit,
    );

    if (Number(sanitizedUsdValue) > selectedTokenOption.balance.usd) {
      setMessage(
        `Amount exceeds your balance: 
  ${formatUsd(selectedTokenOption.balance.usd)}`,
      );
    } else if (Number(usdValue) > maxUsdLimit) {
      setMessage(`Maximum ${formatUsd(maxUsdLimit)}`);
    } else {
      setMessage(minimumMessage);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const maxDecimals = isEditingUsd
      ? USD_DECIMALS
      : balanceToken.displayDecimals;
    if (value !== "" && !isValidNumber(value, maxDecimals)) return;

    const sanitizedValue = sanitizeNumber(value);

    const newUsdValue = isEditingUsd
      ? value
      : tokenAmountToRoundedUsd(
          parseUnits(sanitizedValue, balanceToken.decimals),
          balanceToken,
        );
    const newTokenValue = isEditingUsd
      ? usdToRoundedTokenAmount(Number(sanitizedValue), balanceToken)
      : value;
    updateValues(newUsdValue, newTokenValue, isEditingUsd);
  };

  const handleMax = () => {
    const usdValue = roundUsd(Number(selectedTokenOption.balance.usd));
    const tokenValue = roundTokenAmount(
      selectedTokenOption.balance.amount,
      balanceToken,
    );
    updateValues(usdValue, tokenValue, isEditingUsd);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !continueDisabled) {
      handleContinue();
    }
  };

  const handleSwitchCurrency = () => {
    updateValues(usdValue, tokenValue, !isEditingUsd);
  };

  const handleContinue = () => {
    const usd = Number(sanitizeNumber(usdValue));
    const amountUnits = usd / balanceToken.usd;
    const amount = parseUnits(amountUnits.toString(), balanceToken.decimals);
    setSelectedTokenOption({
      ...selectedTokenOption,
      required: {
        token: balanceToken,
        amount: amount.toString() as `${bigint}`,
        usd,
      },
    });
    paymentState.setChosenUsd(usd);
    setRoute(nextPage, {
      amountUsd: usd,
      amountUnits,
      tokenSymbol: balanceToken.symbol,
    });
  };

  return (
    <PageContent>
      <TokenLogoSpinner token={balanceToken} showSpinner={false} />
      <ModalContent $preserveDisplay={true}>
        <AmountInputContainer>
          {/* Invisible div to balance spacing */}
          <MaxButton style={{ visibility: "hidden" }}>Max</MaxButton>
          <AmountInputField
            value={isEditingUsd ? usdValue : tokenValue}
            onChange={handleAmountChange}
            currency={isEditingUsd ? "$" : balanceToken.symbol}
            onKeyDown={handleKeyDown}
          />
          <MaxButton onClick={handleMax}>Max</MaxButton>
        </AmountInputContainer>

        {!isUsdStablecoin && (
          <SwitchContainer>
            <SwitchButton onClick={handleSwitchCurrency}>
              <SecondaryAmount>
                {isEditingUsd
                  ? `${tokenValue} ${balanceToken.symbol}`
                  : `$${usdValue}`}
              </SecondaryAmount>
            </SwitchButton>
          </SwitchContainer>
        )}

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
  gap: 6px;
`;
const SecondaryAmount = styled.div`
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  color: var(--ck-body-color-muted);
  strong {
    font-weight: 500;
    color: var(--ck-body-color);
  }
`;
const MaxButton = styled.button`
  display: inline-block;
  padding: 3px 8px;
  border-radius: var(--ck-primary-button-border-radius);
  font-size: 14px;
  font-weight: 400;
  background: var(
    --ck-secondary-button-background,
    var(--ck-body-background-secondary)
  );
  color: var(--ck-body-color-muted);
  cursor: pointer;
`;
const SwitchContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

export default MultiCurrencySelectAmount;
