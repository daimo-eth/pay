import { useCallback, useMemo, useRef, useState } from "react";

import { t } from "../../hooks/locale.js";
import { useAccountFlow } from "../../hooks/useAccountFlow.js";
import { PrimaryButton } from "../buttons.js";
import {
  CenteredContent,
  ErrorMessage,
  PageHeader,
} from "../shared.js";
import {
  formatUsPhoneLocal,
  normalizeUsPhoneDigits,
  toUsPhoneE164,
} from "./phone.js";

type AccountPhonePageProps = {
  onBack: () => void;
  onOtpSent: () => void;
};

/**
 * Phone entry step for Coinbase Headless enrollment. Keeps the field to a
 * single line like email entry, but formats the US number as the user types.
 */
export function AccountPhonePage({ onBack, onOtpSent }: AccountPhonePageProps) {
  const account = useAccountFlow();
  const [phoneDigits, setPhoneDigits] = useState(() =>
    normalizeUsPhoneDigits(account?.phoneNumber ?? ""),
  );
  const inputRef = useRef<HTMLInputElement | null>(null);

  const e164 = useMemo(() => toUsPhoneE164(phoneDigits), [phoneDigits]);
  const isValidPhone = e164.length === 12;
  const formattedPhone = useMemo(
    () => formatUsPhoneLocal(phoneDigits),
    [phoneDigits],
  );

  const restoreCaret = useCallback((digitIndex: number, nextDigits: string) => {
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      const nextFormatted = formatUsPhoneLocal(nextDigits);
      const nextCaret = getCaretForDigitIndex(nextFormatted, digitIndex);
      input.setSelectionRange(nextCaret, nextCaret);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!account || !isValidPhone) return;
    account.setPhoneNumber(e164);
    const sent = await account.sendPhoneOtp(e164);
    if (sent) onOtpSent();
  }, [account, e164, isValidPhone, onOtpSent]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (account?.authError) account.setAuthError(null);
      const rawValue = e.target.value;
      const nextDigits = normalizeUsPhoneDigits(rawValue);
      const selectionStart = e.target.selectionStart ?? rawValue.length;
      const digitIndex = Math.min(
        countDigits(rawValue.slice(0, selectionStart)),
        nextDigits.length,
      );
      setPhoneDigits(nextDigits);
      restoreCaret(digitIndex, nextDigits);
    },
    [account, restoreCaret],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && isValidPhone) {
        e.preventDefault();
        handleSubmit();
        return;
      }
      if (e.key !== "Backspace" && e.key !== "Delete") return;

      const input = e.currentTarget;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? start;
      if (start !== end) return;

      const digitIndex = countDigits(formattedPhone.slice(0, start));
      const removeIndex = e.key === "Backspace" ? digitIndex - 1 : digitIndex;
      if (removeIndex < 0 || removeIndex >= phoneDigits.length) return;

      e.preventDefault();
      if (account?.authError) account.setAuthError(null);
      const nextDigits =
        phoneDigits.slice(0, removeIndex) + phoneDigits.slice(removeIndex + 1);
      setPhoneDigits(nextDigits);
      restoreCaret(removeIndex, nextDigits);
    },
    [account, formattedPhone, handleSubmit, isValidPhone, phoneDigits, restoreCaret],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (account?.authError) account.setAuthError(null);
      const nextDigits = normalizeUsPhoneDigits(
        e.clipboardData.getData("text"),
      );
      setPhoneDigits(nextDigits);
      restoreCaret(nextDigits.length, nextDigits);
    },
    [account, restoreCaret],
  );

  const handleFocus = useCallback(() => {
    restoreCaret(phoneDigits.length, phoneDigits);
  }, [phoneDigits, restoreCaret]);

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={t.accountPhone} onBack={onBack} />

      <CenteredContent>
        <p className="daimo-text-sm daimo-text-[var(--daimo-text-secondary)] daimo-text-center">
          {t.accountPhoneDesc}
        </p>

        <div className="daimo-w-full daimo-max-w-xs daimo-flex daimo-items-center daimo-gap-3 daimo-px-4 daimo-py-3 daimo-bg-[var(--daimo-surface-secondary)] daimo-rounded-[var(--daimo-radius-md)] focus-within:daimo-ring-2 focus-within:daimo-ring-[var(--daimo-accent)] daimo-transition-shadow">
          <span className="daimo-text-base daimo-font-medium daimo-text-[var(--daimo-text-secondary)] daimo-select-none">
            +1
          </span>
          <input
            ref={inputRef}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={formattedPhone}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={handleFocus}
            placeholder="555 123 4567"
            aria-label={t.accountPhone}
            autoFocus
            className="daimo-flex-1 daimo-min-w-0 daimo-bg-transparent daimo-border-none daimo-outline-none daimo-shadow-none daimo-ring-0 daimo-text-base daimo-text-[var(--daimo-text)] daimo-placeholder-[var(--daimo-placeholder)] daimo-caret-[var(--daimo-accent)] focus:daimo-outline-none focus:daimo-ring-0 focus:daimo-border-none focus:daimo-shadow-none"
          />
        </div>

        {account?.authError && <ErrorMessage message={account.authError} />}
      </CenteredContent>

      <div className="daimo-px-6 daimo-pb-6 daimo-flex daimo-flex-col daimo-items-center">
        <PrimaryButton
          onClick={handleSubmit}
          disabled={!isValidPhone || account?.isLoggingIn}
        >
          {account?.isLoggingIn ? t.loading : t.continue}
        </PrimaryButton>
      </div>
    </div>
  );
}

function countDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

function getCaretForDigitIndex(formatted: string, digitIndex: number): number {
  if (digitIndex <= 0) return 0;
  let seenDigits = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (!/\d/.test(formatted[i])) continue;
    seenDigits += 1;
    if (seenDigits === digitIndex) return i + 1;
  }
  return formatted.length;
}
