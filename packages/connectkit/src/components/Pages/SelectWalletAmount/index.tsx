import React, { useState } from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import { ModalContent, PageContent } from "../../Common/Modal/styles";

import { useDaimoPay } from "../../../hooks/useDaimoPay";
import styled from "../../../styles/styled";
import { USD_DECIMALS } from "../../../utils/format";
import { isValidNumber, sanitizeNumber } from "../../../utils/validateInput";
import AmountInputField from "../../Common/AmountInput/AmountInputField";
import Button from "../../Common/Button";
import WalletPaymentSpinner from "../../Spinners/WalletPaymentSpinner";

const SelectWalletAmount: React.FC = () => {
  const { paymentState, setPendingConnectorId, setRoute } = usePayContext();
  const { selectedWallet, openInWalletBrowser } = paymentState;
  const { setChosenUsd, hydrateOrder } = useDaimoPay();

  const maxUsdLimit = paymentState.getOrderUsdLimit();

  const [usdInput, setUsdInput] = useState<string>("");
  const [continueDisabled, setContinueDisabled] = useState(true);

  if (selectedWallet == null) {
    return <PageContent></PageContent>;
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value !== "" && !isValidNumber(value, USD_DECIMALS)) return;
    setUsdInput(value);

    const usd = Number(sanitizeNumber(value));
    setContinueDisabled(usd <= 0 || usd > maxUsdLimit);
  };

  const handleContinue = async () => {
    const amountUsd = Number(sanitizeNumber(usdInput));
    setChosenUsd(amountUsd);
    await hydrateOrder();

    if (selectedWallet.name === "Mobile Wallets") {
      setPendingConnectorId("Mobile Wallets");
      setRoute(ROUTES.CONNECT);
    } else {
      openInWalletBrowser(selectedWallet, amountUsd);
    }
  };

  return (
    <PageContent>
      <WalletPaymentSpinner
        logo={selectedWallet.icon}
        logoShape={
          selectedWallet.iconShape === "square"
            ? "squircle"
            : selectedWallet.iconShape || "squircle"
        }
      />
      <ModalContent $preserveDisplay={true}>
        <AmountInputContainer>
          <AmountInputField value={usdInput} onChange={handleAmountChange} />
        </AmountInputContainer>
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

export default SelectWalletAmount;
