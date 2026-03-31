import { useCallback, useRef, useState } from "react";

import { t } from "../../hooks/locale.js";
import { useAccountFlow } from "../../hooks/useAccountFlow.js";
import { PrimaryButton } from "../buttons.js";
import {
  CenteredContent,
  ErrorMessage,
  PageHeader,
} from "../shared.js";

type AccountOtpPageProps = {
  onBack: () => void;
  onVerified: () => void;
};

const OTP_LENGTH = 6;

export function AccountOtpPage({ onBack, onVerified }: AccountOtpPageProps) {
  const account = useAccountFlow();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");
  const isComplete = code.length === OTP_LENGTH;

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;
      if (account?.authError) account.setAuthError(null);
      const next = [...digits];
      next[index] = value.slice(-1);
      setDigits(next);
      // Auto-advance
      if (value && index < OTP_LENGTH - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    },
    [digits, account],
  );

  const handleVerify = useCallback(async () => {
    if (!account || !isComplete) return;
    const success = await account.verifyOtp(code);
    if (success) onVerified();
  }, [account, code, isComplete, onVerified]);

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      } else if (e.key === "Enter" && isComplete) {
        e.preventDefault();
        handleVerify();
      }
    },
    [digits, isComplete, handleVerify],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
      const next = [...digits];
      for (let i = 0; i < OTP_LENGTH && i < pasted.length; i++) {
        next[i] = pasted[i];
      }
      setDigits(next);
      const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
      inputsRef.current[focusIdx]?.focus();
    },
    [digits],
  );

  const handleResend = useCallback(async () => {
    if (!account) return;
    setDigits(Array(OTP_LENGTH).fill(""));
    await account.sendOtp();
    inputsRef.current[0]?.focus();
  }, [account]);

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={t.accountOtp} onBack={onBack} />

      <CenteredContent>
        <p className="daimo-text-sm daimo-text-[var(--daimo-text-secondary)] daimo-text-center">
          {t.accountOtpSent} <strong>{account?.email}</strong>
        </p>

        <div className="daimo-flex daimo-gap-2 daimo-justify-center">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputsRef.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              autoFocus={i === 0}
              className="daimo-w-10 daimo-h-12 daimo-text-center daimo-text-xl daimo-font-semibold daimo-bg-[var(--daimo-surface-secondary)] daimo-text-[var(--daimo-text)] daimo-rounded-[var(--daimo-radius-sm)] daimo-border-none daimo-outline-none focus:daimo-ring-2 focus:daimo-ring-[var(--daimo-accent)] daimo-transition-shadow daimo-caret-[var(--daimo-accent)]"
            />
          ))}
        </div>

        {account?.authError && <ErrorMessage message={account.authError} />}

        <button
          onClick={handleResend}
          disabled={account?.isLoggingIn}
          className="daimo-text-sm daimo-text-[var(--daimo-text-secondary)] hover:daimo-text-[var(--daimo-text)] daimo-underline daimo-transition-colors"
        >
          {t.accountResendCode}
        </button>
      </CenteredContent>

      <div className="daimo-px-6 daimo-pb-6 daimo-flex daimo-flex-col daimo-items-center">
        <PrimaryButton
          onClick={handleVerify}
          disabled={!isComplete || account?.isLoggingIn}
        >
          {account?.isLoggingIn ? t.loading : t.accountVerify}
        </PrimaryButton>
      </div>
    </div>
  );
}
