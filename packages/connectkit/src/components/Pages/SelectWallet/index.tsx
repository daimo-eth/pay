import React, { useState } from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import { ModalContent, PageContent } from "../../Common/Modal/styles";

import { writeDaimoPayOrderID } from "@daimo/pay-common";
import { ExternalLinkIcon } from "../../../assets/icons";
import styled from "../../../styles/styled";
import { USD_DECIMALS } from "../../../utils/format";
import { isValidNumber, sanitizeNumber } from "../../../utils/validateInput";
import AmountInputField from "../../Common/AmountInput/AmountInputField";
import Button from "../../Common/Button";
import WalletPaymentSpinner from "../../Spinners/WalletPaymentSpinner";

const SelectWallet: React.FC = () => {
  const { paymentState, setRoute } = usePayContext();
  const { selectedWallet } = paymentState;

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

  const handleContinue = () => {
    const amountUsd = Number(sanitizeNumber(usdInput));
    paymentState.setChosenUsd(amountUsd);
    const order = paymentState.daimoPayOrder;
    const payId = order && writeDaimoPayOrderID(order.id);
    if (payId) {
      const deeplink = selectedWallet.getDaimoPayDeeplink?.(payId);
      if (deeplink) {
        window.open(deeplink, "_blank");
        paymentState.setSelectedWalletDeepLink(deeplink);
        setRoute(ROUTES.WAITING_WALLET, {
          amountUsd,
          payId,
          wallet_name: selectedWallet.name,
        });
      }
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
        <Button
          icon={<ExternalLinkIcon />}
          onClick={handleContinue}
          disabled={continueDisabled}
        >
          Pay in {selectedWallet.name}
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

export default SelectWallet;
