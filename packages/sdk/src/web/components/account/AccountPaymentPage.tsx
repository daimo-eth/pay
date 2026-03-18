import { useCallback, useEffect, useRef, useState } from "react";

import type { AccountRegion, DepositConstraints } from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { useAccountFlow } from "../../hooks/useAccountFlow.js";
import { t } from "../../hooks/locale.js";
import { PrimaryButton } from "../buttons.js";
import { AmountInput, CenteredContent, PageHeader, useAmountInput } from "../shared.js";

const REGION_DEFAULTS: Record<AccountRegion, {
  currencyCode: string;
  currencySymbol: string;
  minimumAmount: number;
  maximumAmount: number;
}> = {
  canada: { currencyCode: "CAD", currencySymbol: "CA$", minimumAmount: 10, maximumAmount: 3000 },
  us: { currencyCode: "USD", currencySymbol: "$", minimumAmount: 1, maximumAmount: 10000 },
};

type AccountPaymentPageProps = {
  region: AccountRegion;
  sessionId: string;
  onBack: () => void;
  onAdvance: () => void;
};

/** Amount entry. Stores depositAmount and advances to bank picker. */
export function AccountPaymentPage({
  region,
  sessionId,
  onBack,
  onAdvance,
}: AccountPaymentPageProps) {
  const client = useDaimoClient();
  const accountFlow = useAccountFlow();
  const paymentInfo = accountFlow?.depositState?.payment;
  const [constraints, setConstraints] = useState<DepositConstraints | null>(null);
  const constraintsFetched = useRef(false);

  const defaults = REGION_DEFAULTS[region];
  const amountInfo = paymentInfo ?? constraints;
  const currencySymbol = amountInfo?.currency.symbol ?? defaults.currencySymbol;
  const minimum = parseAmountBound(amountInfo?.minAmount) ?? defaults.minimumAmount;
  const maximum = parseAmountBound(amountInfo?.maxAmount) ?? defaults.maximumAmount;

  const { amount, isValid, handleChange } = useAmountInput(minimum, maximum);

  // Fetch constraints from server (one-shot)
  useEffect(() => {
    if (constraintsFetched.current || paymentInfo || !accountFlow?.isAuthenticated) return;
    constraintsFetched.current = true;

    void (async () => {
      try {
        const token = await accountFlow.getAccessToken();
        if (!token) { constraintsFetched.current = false; return; }
        const result = await client.account.getDepositConstraints(
          { sessionId, region },
          { bearerToken: token },
        );
        setConstraints(result);
      } catch (error) {
        constraintsFetched.current = false;
        console.error("failed to load deposit constraints:", error);
      }
    })();
  }, [accountFlow, client, paymentInfo, region, sessionId]);

  const handleSubmit = useCallback(
    (amt: number) => {
      if (!accountFlow) return;
      accountFlow.setDepositState({
        depositAmount: amt.toFixed(2),
        depositId: "",
        payment: null,
      });
      onAdvance();
    },
    [accountFlow, onAdvance],
  );

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={t.accountPayment} onBack={onBack} />
      <CenteredContent>
        <AmountInput
          minimum={minimum}
          maximum={maximum}
          currencySymbol={currencySymbol}
          initialValue={accountFlow?.depositState?.depositAmount}
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
