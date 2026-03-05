import type { DaimoPayToken, WalletPaymentOption } from "../api/walletTypes.js";
import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";

import { PrimaryButton } from "./buttons.js";
import { t } from "../hooks/locale.js";
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
};

/** Amount entry page for wallet payment flow */
export function WalletAmountPage({
  token,
  onBack,
  onContinue,
}: WalletAmountPageProps) {
  const balanceToken = token.balance.token;
  const minimumUsd = token.minimumRequired.usd;
  const maximumUsd = token.balance.usd;

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
    const maxTokenAmountUnits = Number(
      formatUnits(BigInt(token.balance.amount), balanceToken.decimals),
    );
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
      : `${Math.min(currentValue.length - (currentValue.match(/\./g) || []).length * 0.45, 10)}ch`;

  // Balance/warning message
  const maxTokenAmountUnits = Number(
    formatUnits(BigInt(token.balance.amount), balanceToken.decimals),
  );

  const getBalanceMessage = () => {
    if (isEditingUsd) {
      return isUsdStablecoin
        ? `${t.balance} $${roundUsd(maximumUsd)}`
        : `${t.balance} $${roundUsd(maximumUsd)} ${balanceToken.symbol}`;
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

  const messageClass =
    showMinWarning || showMaxWarning
      ? "text-sm text-[var(--daimo-text)]"
      : "text-sm text-[var(--daimo-text-secondary)]";

  // Secondary amount for switch button
  const secondaryAmount = isEditingUsd
    ? `${tokenStr || "0"} ${balanceToken.symbol}`
    : `$${usdStr || roundUsd(0)}`;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader title={t.enterAmount} onBack={onBack} />
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* Token logo with chain badge */}
        <TokenIconWithChainBadge token={balanceToken} size="lg" />

        {/* Amount input with Max button */}
        <div className="flex items-center justify-center gap-2">
          {/* Invisible spacer for balance */}
          <button className="invisible px-3 py-1 text-sm min-h-[44px]">{t.max}</button>

          <div className="flex items-center justify-center gap-1">
            {isEditingUsd && (
              <span
                className={`text-3xl font-semibold tabular-nums ${usdStr ? "text-[var(--daimo-text)]" : "text-[var(--daimo-placeholder)]"}`}
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
              className="bg-transparent text-5xl font-semibold text-[var(--daimo-text)] placeholder-[var(--daimo-placeholder)] outline-none border-none shadow-none caret-[var(--daimo-text-muted)] tabular-nums ring-0 focus:outline-none focus:ring-0 focus:border-none focus:shadow-none"
              style={{
                width: inputWidth,
                minWidth: "1ch",
                maxWidth: "10ch",
                fontSize: "clamp(16px, 3rem, 3rem)", // Ensure 16px minimum for iOS
              }}
              autoFocus={shouldAutoFocus}
            />
            {!isEditingUsd && (
              <span className="text-xl font-semibold text-[var(--daimo-text-muted)]">
                {balanceToken.symbol}
              </span>
            )}
          </div>

          {/* Max button: 44px min tap target, touch-friendly */}
          <button
            onClick={handleMax}
            className="px-3 py-1 min-h-[44px] min-w-[44px] text-sm font-normal rounded-full bg-[var(--daimo-surface-secondary)] text-[var(--daimo-text-secondary)] hover:[@media(hover:hover)]:bg-[var(--daimo-surface-hover)] touch-action-manipulation transition-[background-color] duration-100 ease"
          >
            {t.max}
          </button>
        </div>

        {/* Currency switch for non-USD tokens - simple text button like connectkit */}
        {!isUsdStablecoin && (
          <button
            onClick={handleSwitchCurrency}
            className="flex items-center gap-1 min-h-[44px] px-4 hover:[@media(hover:hover)]:opacity-70 active:opacity-50 touch-action-manipulation transition-opacity duration-150 ease"
          >
            <SwitchIcon />
            <span className="text-base text-[var(--daimo-text-secondary)] tabular-nums">
              {secondaryAmount}
            </span>
          </button>
        )}

        {/* Balance / warning message - tabular-nums for stable number widths */}
        <p className={`${messageClass} tabular-nums`}>{getMessage()}</p>

        <PrimaryButton
          onClick={() => isValid && onContinue(amountUsd)}
          disabled={!isValid}
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

function SwitchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className="text-[var(--daimo-text-muted)]"
    >
      <path
        d="M7 10L12 5L17 10M17 14L12 19L7 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
