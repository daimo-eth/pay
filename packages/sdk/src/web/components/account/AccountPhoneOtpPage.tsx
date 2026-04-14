import { useCallback, useRef, useState } from "react";

import type { AccountRail } from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { t } from "../../hooks/locale.js";
import { useAccountFlow } from "../../hooks/useAccountFlow.js";
import { PrimaryButton } from "../buttons.js";
import {
  CenteredContent,
  ErrorMessage,
  PageHeader,
} from "../shared.js";
import { formatUsPhoneDisplay } from "./phone.js";

type AccountPhoneOtpPageProps = {
  rail: AccountRail;
  onBack: () => void;
  onVerified: () => void;
};

const OTP_LENGTH = 6;

/**
 * OTP entry step for phone-gated enrollments. User enters the SMS code,
 * Privy links the phone, then the SDK re-runs generic enrollment advancement.
 * Providers that care about phone verification ingest it server-side there.
 */
export function AccountPhoneOtpPage({
  rail,
  onBack,
  onVerified,
}: AccountPhoneOtpPageProps) {
  const account = useAccountFlow();
  const client = useDaimoClient();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      if (value && index < OTP_LENGTH - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    },
    [digits, account],
  );

  const handleVerify = useCallback(async () => {
    if (!account || !isComplete) return;
    setIsSubmitting(true);
    try {
      const verified = await account.verifyPhoneOtp(code);
      if (!verified) return;
      // startEnrollment runs the adapter's prepareAdvance hook, which
      // copies the just-verified Privy phone into the enrollment metadata.
      const result = await account.startEnrollment(client, { rail });
      if (!result) {
        account.setAuthError("failed to submit phone verification");
        return;
      }
      switch (result.action) {
        case "active":
          onVerified();
          return;
        case "phone_required":
          // Server still doesn't see a phone — unexpected
          account.setAuthError(
            result.reason ?? "phone verification not recognized",
          );
          return;
        case "error":
          account.setAuthError(result.message);
          return;
        case "suspended":
          account.setAuthError(result.reason);
          return;
        case "not_eligible":
          account.setAuthError(result.reason);
          return;
        default:
          // Route unexpected states back through the enrollment page so the
          // generic server-driven state machine can handle them.
          onVerified();
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [account, client, code, isComplete, onVerified, rail]);

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
    await account.sendPhoneOtp();
    inputsRef.current[0]?.focus();
  }, [account]);

  const busy = isSubmitting || account?.isLoggingIn;
  const formattedPhone = account?.phoneNumber
    ? formatUsPhoneDisplay(account.phoneNumber)
    : "";

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={t.accountOtp} onBack={onBack} />

      <CenteredContent>
        <p className="daimo-text-sm daimo-text-[var(--daimo-text-secondary)] daimo-text-center">
          {t.accountOtpSent} <strong>{formattedPhone}</strong>
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
          disabled={busy}
          className="daimo-text-sm daimo-text-[var(--daimo-text-secondary)] hover:daimo-text-[var(--daimo-text)] daimo-underline daimo-transition-colors"
        >
          {t.accountResendCode}
        </button>
      </CenteredContent>

      <div className="daimo-px-6 daimo-pb-6 daimo-flex daimo-flex-col daimo-items-center">
        <PrimaryButton
          onClick={handleVerify}
          disabled={!isComplete || busy}
        >
          {busy ? t.loading : t.accountVerify}
        </PrimaryButton>
      </div>
    </div>
  );
}
