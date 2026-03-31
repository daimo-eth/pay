import { useCallback, useEffect, useRef, useState } from "react";

import { t } from "../../hooks/locale.js";
import { useAccountFlow } from "../../hooks/useAccountFlow.js";
import { PrimaryButton } from "../buttons.js";
import {
  CenteredContent,
  ErrorMessage,
  PageHeader,
  TextInput,
} from "../shared.js";

type AccountEmailPageProps = {
  onBack: (() => void) | null;
  onOtpSent: () => void;
};

export function AccountEmailPage({ onBack, onOtpSent }: AccountEmailPageProps) {
  const account = useAccountFlow();
  const [localEmail, setLocalEmail] = useState(account?.email ?? "");
  const logoutDone = useRef(false);

  // Clear stale Privy sessions on mount so we get a clean login flow
  useEffect(() => {
    if (logoutDone.current) return;
    logoutDone.current = true;
    account?.logout();
  }, [account]);

  const handleSubmit = useCallback(async () => {
    if (!account || !localEmail) return;
    account.setEmail(localEmail);
    const sent = await account.sendOtp(localEmail);
    if (sent) onOtpSent();
  }, [account, localEmail, onOtpSent]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && localEmail) handleSubmit();
    },
    [localEmail, handleSubmit],
  );

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(localEmail);

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={t.accountEmail} onBack={onBack} />

      <CenteredContent>
        <p className="daimo-text-sm daimo-text-[var(--daimo-text-secondary)] daimo-text-center">
          {t.accountEmailDesc}
        </p>

        <TextInput
          type="email"
          value={localEmail}
          onChange={(e) => setLocalEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.accountEmailPlaceholder}
          autoFocus
          className="daimo-max-w-xs daimo-px-4 daimo-py-3 daimo-text-base"
        />
        {account?.authError && <ErrorMessage message={account.authError} />}
      </CenteredContent>

      <div className="daimo-px-6 daimo-pb-6 daimo-flex daimo-flex-col daimo-items-center">
        <PrimaryButton
          onClick={handleSubmit}
          disabled={!isValidEmail || account?.isLoggingIn}
        >
          {account?.isLoggingIn ? t.loading : t.continue}
        </PrimaryButton>
      </div>
    </div>
  );
}
