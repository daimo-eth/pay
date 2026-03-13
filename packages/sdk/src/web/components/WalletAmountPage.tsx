import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import type { DaimoPayToken, WalletPaymentOption } from "../api/walletTypes.js";

import { t } from "../hooks/locale.js";
import { PrimaryButton } from "./buttons.js";
import { PageHeader, TokenIconWithChainBadge } from "./shared.js";

/** Check if device supports touch (to avoid autofocus on mobile) */
function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

type WalletAmountPageProps = {
  token: WalletPaymentOption;
  onBack: () => void;
  onContinue: (amountUsd: number) => void;
  baseUrl: string;
};

/** Amount entry page for wallet payment flow */
export function WalletAmountPage({
  token,
  onBack,
  onContinue,
  baseUrl,
}: WalletAmountPageProps) {
  const balanceToken = token.balance.token;
  const minimumUsd = token.minimumRequired.usd;
  const maximumUsd = Math.min(token.balance.usd, balanceToken.maxAcceptUsd);

  // Check if this is a USD stablecoin (fiatISO is set on base Token type)
  const isUsdStablecoin = balanceToken.fiatISO === "USD";

  // Input state
  const [usdStr, setUsdStr] = useState("");
  const [tokenStr, setTokenStr] = useState("");
  const [isEditingUsd, setIsEditingUsd] = useState(true);

  // Derived values - use rounded max for comparison to avoid floating point issues
  const amountUsd = parseFloat(usdStr) || 0;
  const roundedMaxUsd = parseFloat(roundUsd(maximumUsd));
  const isValid = amountUsd >= minimumUsd && amountUsd <= roundedMaxUsd;
  const showMinWarning = usdStr !== "" && amountUsd < minimumUsd;
  const showMaxWarning = usdStr !== "" && amountUsd > roundedMaxUsd;

  // Convert between USD and token amounts using token.usd (price of 1 token in USD)
  const usdToTokenStr = useCallback(
    (usd: number): string => {
      if (usd === 0) return "";
      // usd / token.usd = how many tokens for that USD amount
      const tokenAmount = usd / balanceToken.usd;
      return roundTokenAmountUnits(tokenAmount, balanceToken);
    },
    [balanceToken],
  );

  const tokenToUsdStr = useCallback(
    (tokenAmountUnits: number): string => {
      if (tokenAmountUnits === 0) return "";
      // tokenAmount * token.usd = USD value
      const usd = tokenAmountUnits * balanceToken.usd;
      return roundUsd(usd);
    },
    [balanceToken],
  );

  // Update values when input changes
  const updateValues = useCallback(
    (newUsdStr: string, newTokenStr: string, editingUsd: boolean) => {
      // When switching modes, format the non-edited value nicely
      if (editingUsd) {
        const tokenNum = parseFloat(newTokenStr) || 0;
        const formattedToken =
          tokenNum > 0
            ? stripTrailingZeros(roundTokenAmountUnits(tokenNum, balanceToken))
            : "";
        setUsdStr(newUsdStr);
        setTokenStr(formattedToken);
      } else {
        const usdNum = parseFloat(newUsdStr) || 0;
        const formattedUsd = usdNum > 0 ? roundUsd(usdNum) : "";
        setUsdStr(formattedUsd);
        setTokenStr(newTokenStr);
      }
      setIsEditingUsd(editingUsd);
    },
    [balanceToken],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty, or digits with up to appropriate decimal places
    const maxDecimals = isEditingUsd ? 2 : balanceToken.displayDecimals;
    const regex = new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}$`);
    if (value !== "" && !regex.test(value)) return;

    if (isEditingUsd) {
      const newUsd = parseFloat(value) || 0;
      setUsdStr(value);
      setTokenStr(usdToTokenStr(newUsd));
    } else {
      const newToken = parseFloat(value) || 0;
      setTokenStr(value);
      setUsdStr(tokenToUsdStr(newToken));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isValid) {
      onContinue(amountUsd);
    }
  };

  const handleMax = () => {
    const balanceTokenUnits = Number(
      formatUnits(BigInt(token.balance.amount), balanceToken.decimals),
    );
    const cappedByLiquidity = balanceToken.maxAcceptUsd < token.balance.usd;
    const maxTokenAmountUnits = cappedByLiquidity
      ? maximumUsd / balanceToken.usd
      : balanceTokenUnits;
    const maxUsdStr = roundUsd(maximumUsd);
    const maxTokenStr = roundTokenAmountUnits(
      maxTokenAmountUnits,
      balanceToken,
    );
    setUsdStr(maxUsdStr);
    setTokenStr(maxTokenStr);
  };

  const handleSwitchCurrency = () => {
    updateValues(usdStr, tokenStr, !isEditingUsd);
  };

  // Autofocus only on non-touch devices to avoid keyboard popup
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
  useEffect(() => {
    setShouldAutoFocus(!isTouchDevice());
  }, []);

  // Dynamic input width
  const currentValue = isEditingUsd ? usdStr : tokenStr;
  const inputWidth =
    currentValue.length === 0
      ? "3.55ch"
      : `${Math.min(currentValue.length - (currentValue.match(/\./g) || []).length * 0.55, 10)}ch`;

  // Balance/warning message
  const maxTokenAmountUnits = Number(
    formatUnits(BigInt(token.balance.amount), balanceToken.decimals),
  );

  const balanceUsd = token.balance.usd;

  const getBalanceMessage = () => {
    if (isEditingUsd) {
      return isUsdStablecoin
        ? `${t.balance} $${roundUsd(balanceUsd)}`
        : `${t.balance} $${roundUsd(balanceUsd)} ${balanceToken.symbol}`;
    }
    return `${t.balance} ${roundTokenAmountUnits(maxTokenAmountUnits, balanceToken)} ${balanceToken.symbol}`;
  };

  const getMessage = () => {
    const formatAmount = (usd: number) =>
      isEditingUsd
        ? `$${roundUsd(usd)}`
        : `${usdToTokenStr(usd)} ${balanceToken.symbol}`;

    if (showMaxWarning) return `${t.maximum} ${formatAmount(maximumUsd)}`;
    if (showMinWarning) return `${t.minimum} ${formatAmount(minimumUsd)}`;
    return getBalanceMessage();
  };

  const messageColor =
    showMinWarning || showMaxWarning
      ? "daimo-text-[var(--daimo-text)]"
      : "daimo-text-[var(--daimo-text-secondary)]";

  // Secondary amount for switch button
  const secondaryAmount = isEditingUsd
    ? `${tokenStr || "0"} ${balanceToken.symbol}`
    : `$${usdStr || roundUsd(0)}`;

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={t.enterAmount} onBack={onBack} />
      <div className="daimo-flex-1 daimo-flex daimo-flex-col daimo-items-center daimo-justify-center daimo-p-6">
        {/* Token logo with chain badge */}
        <div className="daimo-mb-3">
          <TokenIconWithChainBadge token={balanceToken} size="lg" baseUrl={baseUrl} />
        </div>

        {/* Amount input with Max button */}
        <div className="daimo-flex daimo-items-center daimo-justify-center daimo-gap-2">
          {/* Invisible spacer for balance */}
          <span className="daimo-invisible daimo-py-[3px] daimo-px-2 daimo-text-sm">{t.max}</span>

          <div className="daimo-flex daimo-items-center daimo-justify-center daimo-gap-1">
            {isEditingUsd && (
              <span
                className={`daimo-text-[24px] daimo-font-semibold daimo-tabular-nums ${usdStr ? "daimo-text-[var(--daimo-text)]" : "daimo-text-[var(--daimo-placeholder)]"}`}
              >
                $
              </span>
            )}
            {/* Input: 16px min font to prevent iOS zoom, tabular-nums for stable width */}
            <input
              type="text"
              inputMode="decimal"
              value={currentValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="0.00"
              className="daimo-bg-transparent daimo-font-semibold daimo-text-[var(--daimo-text)] daimo-placeholder-[var(--daimo-placeholder)] daimo-outline-none daimo-border-none daimo-shadow-none daimo-caret-[var(--daimo-text-muted)] daimo-tabular-nums daimo-ring-0 focus:daimo-outline-none focus:daimo-ring-0 focus:daimo-border-none focus:daimo-shadow-none"
              style={{
                width: inputWidth,
                minWidth: "1ch",
                maxWidth: "10ch",
                fontSize: "clamp(16px, 30px, 30px)", // 30px with 16px min to prevent iOS zoom
              }}
              autoFocus={shouldAutoFocus}
            />
            {!isEditingUsd && (
              <span className="daimo-text-base daimo-font-normal daimo-text-[var(--daimo-text-muted)]">
                {balanceToken.symbol}
              </span>
            )}
          </div>

          {/* Max button: compact pill */}
          <button
            onClick={handleMax}
            className="daimo-py-[3px] daimo-px-2 daimo-text-sm daimo-font-normal daimo-rounded-full daimo-bg-[var(--daimo-surface-secondary)] daimo-text-[var(--daimo-text-secondary)] hover:[@media(hover:hover)]:daimo-bg-[var(--daimo-surface-hover)] daimo-touch-action-manipulation daimo-transition-[background-color] daimo-duration-100 daimo-ease"
          >
            {t.max}
          </button>
        </div>

        {/* Currency switch for non-USD tokens */}
        {!isUsdStablecoin && (
          <div>
            <SwitchButton
              onClick={handleSwitchCurrency}
              secondaryAmount={secondaryAmount}
              isEditingUsd={isEditingUsd}
            />
          </div>
        )}

        {/* Balance / warning message - tabular-nums for stable number widths */}
        <p
          className={`${messageColor} daimo-text-base daimo-font-normal daimo-leading-[21px] daimo-tabular-nums daimo-mb-6`}
        >
          {getMessage()}
        </p>

        <PrimaryButton
          onClick={() => isValid && onContinue(amountUsd)}
          disabled={!isValid}
          className="daimo-max-w-none"
        >
          {t.continue}
        </PrimaryButton>
      </div>
    </div>
  );
}

// --- Helpers ---

const USD_DECIMALS = 2;

function roundUsd(usd: number): string {
  return usd.toFixed(USD_DECIMALS);
}

function roundTokenAmountUnits(
  amountUnits: number,
  token: DaimoPayToken,
): string {
  if (amountUnits === 0) return "0";
  const decimals = token.displayDecimals;
  return amountUnits.toFixed(decimals);
}

function stripTrailingZeros(val: string): string {
  return val.includes(".") ? val.replace(/\.?0+$/, "") : val;
}

function SwitchButton({
  onClick,
  secondaryAmount,
  isEditingUsd,
}: {
  onClick: () => void;
  secondaryAmount: string;
  isEditingUsd: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="daimo-flex daimo-items-center daimo-gap-1 daimo-py-3 daimo-px-4 hover:[@media(hover:hover)]:daimo-opacity-70 active:daimo-opacity-50 daimo-touch-action-manipulation daimo-transition-opacity daimo-duration-150 daimo-ease"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        className="daimo-text-[var(--daimo-text-muted)]"
        style={{
          transform: isEditingUsd ? "scaleY(1)" : "scaleY(-1)",
          transition: "transform 0.2s ease-in-out",
        }}
      >
        <path
          d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="daimo-text-base daimo-font-normal daimo-leading-[21px] daimo-text-[var(--daimo-text-secondary)] daimo-tabular-nums">
        {secondaryAmount}
      </span>
    </button>
  );
}
