import { useState } from "react";

import type { AccountRegion, AccountDepositStatus } from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { t } from "../../hooks/locale.js";
import { useAccountFlow } from "../../hooks/useAccountFlow.js";
import { useDepositPoller } from "../../hooks/useDepositPoller.js";
import { ConfirmationSpinner } from "../ConfirmationSpinner.js";
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
  const accountFlow = useAccountFlow();
  const [status, setStatus] = useState<AccountDepositStatus>("payment_received");

  const depositState = accountFlow?.depositState;

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

  const title = isComplete
    ? t.paymentCompleted
    : isFailed
      ? t.paymentFailed
      : t.processingYourPayment;

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={title} onBack={onBack} />
      <CenteredContent>
        {(isProcessing || isComplete) && (
          <ConfirmationSpinner done={isComplete} />
        )}

        {isProcessing && depositState?.payment?.instructions && (
          <p className="daimo-text-sm daimo-text-[var(--daimo-text-secondary)] daimo-text-center daimo-max-w-xs">
            {depositState.payment.instructions}
          </p>
        )}

        {isFailed && (
          <p className="daimo-text-sm daimo-text-[var(--daimo-error)] daimo-text-center">
            {t.somethingWentWrong}
          </p>
        )}
      </CenteredContent>

      {(isComplete || isProcessing) && (
        <div className="daimo-px-6 daimo-pb-6 daimo-flex daimo-justify-center">
          <ShowReceiptButton sessionId={sessionId} baseUrl={baseUrl} />
        </div>
      )}
    </div>
  );
}
