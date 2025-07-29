import React from "react";
import { ROUTES } from "../../../../constants/routes";
import { usePayContext } from "../../../../hooks/usePayContext";

import MultiCurrencySelectAmount from "../../../Common/AmountInput";
import { PageContent } from "../../../Common/Modal/styles";

const SelectStellarAmount: React.FC = () => {
  const { paymentState } = usePayContext();
  const { selectedStellarTokenOption, setSelectedStellarTokenOption } =
    paymentState;

  if (selectedStellarTokenOption == null) {
    return <PageContent></PageContent>;
  }

  return (
    <MultiCurrencySelectAmount
      selectedTokenOption={selectedStellarTokenOption}
      setSelectedTokenOption={setSelectedStellarTokenOption}
      nextPage={ROUTES.STELLAR_PAY_WITH_TOKEN}
    />
  );
};

export default SelectStellarAmount;
