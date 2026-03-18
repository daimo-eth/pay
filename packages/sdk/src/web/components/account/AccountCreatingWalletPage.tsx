import { useCallback, useEffect, useRef, useState } from "react";

import { t } from "../../hooks/locale.js";
import { useAccountFlow } from "../../hooks/useAccountFlow.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { ConfirmationSpinner } from "../ConfirmationSpinner.js";
import { ErrorPage } from "../ErrorPage.js";
import { CenteredContent, PageHeader } from "../shared.js";

type AccountCreatingWalletPageProps = {
  sessionId: string;
  clientSecret: string;
  onDone: () => void;
};

/**
 * Auto-creates an embedded wallet via Privy, then creates an account.
 * Advances automatically — back button should skip this screen.
 */
export function AccountCreatingWalletPage({
  sessionId,
  clientSecret,
  onDone,
}: AccountCreatingWalletPageProps) {
  const account = useAccountFlow();
  const client = useDaimoClient();
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);

  const run = useCallback(async () => {
    if (!account || runningRef.current) return;
    runningRef.current = true;
    setError(null);
    try {
      const addr = account.walletAddress ?? (await account.createWallet());
      if (!addr) throw new Error("failed to create wallet");
      await account.createAccount(client, { sessionId, clientSecret }, addr);
      onDone();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "failed to set up account",
      );
    } finally {
      runningRef.current = false;
    }
  }, [account, client, sessionId, clientSecret, onDone]);

  useEffect(() => { run(); }, [run]);

  if (error) {
    return (
      <ErrorPage
        message={t.errorAccountSetup}
        retryText={t.tryAgain}
        onRetry={run}
        hideSupport
      />
    );
  }

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={t.accountCreatingWallet} />
      <CenteredContent>
        <ConfirmationSpinner done={false} />
      </CenteredContent>
    </div>
  );
}
