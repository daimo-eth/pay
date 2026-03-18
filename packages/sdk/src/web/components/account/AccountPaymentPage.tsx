import { useCallback, useEffect, useRef, useState } from "react";

import type { AccountRegion, DepositConstraints } from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { useAccountFlow } from "../../hooks/useAccountFlow.js";
import { t } from "../../hooks/locale.js";
import { PrimaryButton } from "../buttons.js";
import { CenteredContent, PageHeader } from "../shared.js";

const CANADA_PAYMENT_DEFAULTS = {
  currencyCode: "CAD",
  currencyPrefix: "CA$",
  minimumAmount: 5,
  maximumAmount: 3000,
} as const;

const US_PAYMENT_DEFAULTS = {
  currencyCode: "USD",
  currencyPrefix: "US$",
  minimumAmount: null,
  maximumAmount: null,
} as const;

type AccountPaymentPageProps = {
  region: AccountRegion;
  sessionId: string;
  clientSecret: string;
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
  const constraintsRequestKey = useRef<string | null>(null);
  const defaults =
    region === "canada" ? CANADA_PAYMENT_DEFAULTS : US_PAYMENT_DEFAULTS;
  const amountInfo = paymentInfo ?? constraints;
  const currencyCode = amountInfo?.currency.code ?? defaults.currencyCode;
  const currencyPrefix =
    amountInfo?.currency.code === "CAD"
      ? "CA$"
      : amountInfo?.currency.code === "USD"
        ? "US$"
        : amountInfo?.currency.symbol ?? defaults.currencyPrefix;
  const minimumAmount =
    parseAmountBound(amountInfo?.minAmount) ?? defaults.minimumAmount;
  const maximumAmount =
    parseAmountBound(amountInfo?.maxAmount) ?? defaults.maximumAmount;

  const [inputValue, setInputValue] = useState(
    accountFlow?.depositState?.depositAmount ?? "",
  );

  useEffect(() => {
    constraintsRequestKey.current = null;
    setConstraints(null);
  }, [region, sessionId]);

  useEffect(() => {
    if (paymentInfo || constraints || !accountFlow?.isAuthenticated) {
      return;
    }
    const requestKey = `${sessionId}:${region}`;
    if (constraintsRequestKey.current === requestKey) return;
    constraintsRequestKey.current = requestKey;

    void (async () => {
      try {
        const token = await accountFlow.getAccessToken();
        if (!token) {
          constraintsRequestKey.current = null;
          return;
        }

        const result = await client.account.getDepositConstraints(
          { sessionId, region },
          { bearerToken: token },
        );
        setConstraints(result);
      } catch (error) {
        constraintsRequestKey.current = null;
        console.error("failed to load deposit constraints:", error);
      }
    })();
  }, [accountFlow, client, constraints, paymentInfo, region, sessionId]);

  const amountNum = parseFloat(inputValue) || 0;
  const isValid =
    amountNum > 0 &&
    (minimumAmount == null || amountNum >= minimumAmount) &&
    (maximumAmount == null || amountNum <= maximumAmount);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setInputValue(value);
    }
  };

  const handleSubmit = useCallback(() => {
    if (!accountFlow || !isValid) return;

    // Store amount for the bank picker to use when creating the deposit
    accountFlow.setDepositState({
      depositAmount: amountNum.toFixed(2),
      depositId: "",
      payment: null,
    });
    onAdvance();
  }, [accountFlow, isValid, amountNum, onAdvance]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isValid) handleSubmit();
  };

  const showMinWarning =
    inputValue !== "" &&
    amountNum > 0 &&
    minimumAmount != null &&
    amountNum < minimumAmount;
  const showMaxWarning =
    inputValue !== "" &&
    maximumAmount != null &&
    amountNum > maximumAmount;

  const label = showMinWarning
    ? `${t.minimum} ${currencyPrefix}${formatAmount(minimumAmount!)}`
    : showMaxWarning
      ? `${t.maximum} ${currencyPrefix}${formatAmount(maximumAmount!)}`
      : minimumAmount != null
        ? `${t.minimum} ${currencyPrefix}${formatAmount(minimumAmount)}`
        : `${t.accountPayment} ${currencyCode}`;

  const labelClass =
    showMinWarning || showMaxWarning
      ? "daimo-text-base daimo-text-[var(--daimo-text)]"
      : "daimo-text-base daimo-text-[var(--daimo-text-secondary)]";

  const inputWidth =
    inputValue.length === 0
      ? "3.55ch"
      : `${Math.min(inputValue.length - (inputValue.match(/\./g) || []).length * 0.55, 10)}ch`;

  const dollarColor = inputValue
    ? "daimo-text-[var(--daimo-text)]"
    : "daimo-text-[var(--daimo-placeholder)]";

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={t.accountPayment} onBack={onBack} />
      <CenteredContent>
        <div className="daimo-flex daimo-flex-col daimo-items-center daimo-gap-3">
          <div className="daimo-flex daimo-items-center daimo-justify-center daimo-gap-1">
            <span className={`daimo-text-[30px] daimo-font-semibold ${dollarColor}`}>
              {currencyPrefix}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="0.00"
              className="daimo-bg-transparent daimo-font-semibold daimo-text-[var(--daimo-text)] daimo-placeholder-[var(--daimo-placeholder)] daimo-outline-none daimo-border-none daimo-shadow-none daimo-caret-[var(--daimo-text-muted)] daimo-ring-0 focus:daimo-outline-none focus:daimo-ring-0 focus:daimo-border-none focus:daimo-shadow-none"
              style={{
                width: inputWidth,
                minWidth: "1ch",
                maxWidth: "10ch",
                fontSize: "clamp(16px, 30px, 30px)",
              }}
              autoFocus
            />
          </div>
          <p className={labelClass}>{label}</p>
        </div>
      </CenteredContent>

      <div className="daimo-px-6 daimo-pb-6 daimo-flex daimo-flex-col daimo-items-center">
        <PrimaryButton onClick={handleSubmit} disabled={!isValid}>
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function parseAmountBound(value: string | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
