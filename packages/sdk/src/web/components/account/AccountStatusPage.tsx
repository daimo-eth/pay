import { useState } from "react";

import type { AccountRegion, AccountDepositStatus } from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { t } from "../../hooks/locale.js";
import { useDepositPoller } from "../../hooks/useDepositPoller.js";
import { ConfirmationSpinner } from "../ConfirmationSpinner.js";
import { ErrorPage } from "../ErrorPage.js";
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

/** Deposit status — spinner while processing, checkmark when done. */
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

  const isComplete = status === "completed";
  const isProcessing = status === "payment_received" || status === "token_delivered";
  const isFailed = status === "failed" || status === "expired";

  if (isFailed) {
    return (
      <ErrorPage
        message={t.errorDepositFailed}
        hideRetry
        hideSupport
      />
    );
  }

  const title = isComplete ? t.paymentCompleted : t.processingYourPayment;

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={title} onBack={onBack} />
      <CenteredContent>
        <ConfirmationSpinner done={isComplete} />
      </CenteredContent>

      {(isComplete || isProcessing) && (
        <div className="daimo-px-6 daimo-pb-6 daimo-flex daimo-justify-center">
          <ShowReceiptButton sessionId={sessionId} baseUrl={baseUrl} />
        </div>
      )}
    </div>
  );
}
