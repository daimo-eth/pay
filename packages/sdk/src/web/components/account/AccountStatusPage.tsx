import { useState } from "react";

import type { AccountRegion, AccountDepositStatus } from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { t } from "../../hooks/locale.js";
import { useDepositPoller } from "../../hooks/useDepositPoller.js";
import { ErrorPage } from "../ErrorPage.js";
import { ProgressPulse } from "../ProgressPulse.js";
import { CenteredContent, PageHeader, ShowReceiptButton } from "../shared.js";

type AccountStatusPageProps = {
  region: AccountRegion;
  sessionId: string;
  clientSecret: string;
  baseUrl: string;
  onBack: () => void;
};

const TERMINAL_STATUSES: AccountDepositStatus[] = [
  "completed",
  "failed",
  "expired",
];

function getDepositTitle(status: AccountDepositStatus): string {
  switch (status) {
    case "completed":
      return t.depositFinalizing;
    case "token_delivered":
      return t.depositProcessing;
    default:
      return t.depositDetected;
  }
}

/**
 * Deposit status page — pulsing dots with progressive status text:
 *   payment_received → "Deposit Detected"
 *   token_delivered  → "Deposit Processing"
 *   completed        → "Deposit Finalizing"
 *
 * ConfirmationPage (spinner → checkmark) takes over when the session
 * reaches "processing"/"succeeded".
 */
export function AccountStatusPage({
  sessionId,
  clientSecret,
  baseUrl,
  onBack,
}: AccountStatusPageProps) {
  const client = useDaimoClient();
  const [status, setStatus] = useState<AccountDepositStatus>("payment_received");

  useDepositPoller({
    client,
    sessionId,
    clientSecret,
    onUpdate: (deposit) => setStatus(deposit.status),
    shouldStop: (deposit) => TERMINAL_STATUSES.includes(deposit.status),
  });

  const isFailed = status === "failed" || status === "expired";

  if (isFailed) {
    return (
      <ErrorPage
        message={t.errorDepositFailed}
        hideRetry
      />
    );
  }

  const title = getDepositTitle(status);
  const showBack = status === "payment_received";

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={title} onBack={showBack ? onBack : undefined} />
      <CenteredContent>
        <ProgressPulse />
      </CenteredContent>
      <div className="daimo-px-6 daimo-pb-6 daimo-flex daimo-justify-center">
        <ShowReceiptButton sessionId={sessionId} baseUrl={baseUrl} />
      </div>
    </div>
  );
}
