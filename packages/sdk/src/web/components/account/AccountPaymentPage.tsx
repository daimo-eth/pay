import { useCallback, useEffect, useRef, useState } from "react";

import type {
  AccountRail,
  DepositConstraints,
} from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import {
  useAccountFlow,
  useSessionDepositState,
} from "../../hooks/useAccountFlow.js";
import { t } from "../../hooks/locale.js";
import { PrimaryButton } from "../buttons.js";
import { AmountInput, CenteredContent, PageHeader, useAmountInput } from "../shared.js";

/** Per-rail fallback constraints used until the server response arrives. */
function railDefaults(rail: AccountRail) {
  switch (rail) {
    case "interac":
      return { currencySymbol: "CA$", minimumAmount: 10, maximumAmount: 3000 };
    case "ach":
      return { currencySymbol: "$", minimumAmount: 1, maximumAmount: 10000 };
    case "apple_pay":
      // apple_pay never routes here (see accountNav). Fall through to USD.
      return { currencySymbol: "$", minimumAmount: 5, maximumAmount: 500 };
  }
}

type AccountPaymentPageProps = {
  rail: AccountRail;
  sessionId: string;
  onBack: () => void;
  onAdvance: () => void;
};

/** Amount entry for bank-transfer rails. Stores depositAmount and advances. */
export function AccountPaymentPage({
  rail,
  sessionId,
  onBack,
  onAdvance,
}: AccountPaymentPageProps) {
  const client = useDaimoClient();
  const accountFlow = useAccountFlow();
  const { depositState, setDepositState } = useSessionDepositState(sessionId);
  const [constraints, setConstraints] = useState<DepositConstraints | null>(null);
  const constraintsFetched = useRef(false);

  const defaults = railDefaults(rail);
  const currencySymbol = constraints?.currency.symbol ?? defaults.currencySymbol;
  const minimum = parseAmountBound(constraints?.minAmount) ?? defaults.minimumAmount;
  const maximum = parseAmountBound(constraints?.maxAmount) ?? defaults.maximumAmount;

  const { amount, isValid, handleChange } = useAmountInput(minimum, maximum);

  // Fetch constraints from server (one-shot)
  useEffect(() => {
    if (constraintsFetched.current || !accountFlow?.isAuthenticated) return;
    constraintsFetched.current = true;

    void (async () => {
      try {
        const token = await accountFlow.getAccessToken();
        if (!token) { constraintsFetched.current = false; return; }
        const result = await client.account.getDepositConstraints(
          { sessionId, rail },
          { bearerToken: token },
        );
        setConstraints(result);
      } catch (error) {
        constraintsFetched.current = false;
        console.error("failed to load deposit constraints:", error);
      }
    })();
  }, [accountFlow, client, rail, sessionId]);

  const handleSubmit = useCallback(
    (amt: number) => {
      if (!accountFlow) return;
      setDepositState({ depositAmount: amt.toFixed(2), kind: "idle" });
      onAdvance();
    },
    [accountFlow, onAdvance, setDepositState],
  );

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={t.accountPayment} onBack={onBack} />
      <CenteredContent>
        <AmountInput
          minimum={minimum}
          maximum={maximum}
          currencySymbol={currencySymbol}
          initialValue={depositState?.depositAmount}
          onSubmit={handleSubmit}
          onChange={handleChange}
        />
      </CenteredContent>

      <div className="daimo-px-6 daimo-pb-6 daimo-flex daimo-flex-col daimo-items-center">
        <PrimaryButton onClick={() => isValid && handleSubmit(amount)} disabled={!isValid}>
          {t.continue}
        </PrimaryButton>
      </div>
    </div>
  );
}

function parseAmountBound(value: string | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
