import { useState } from "react";

import type { AccountRail, AccountDepositStatus } from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { t } from "../../hooks/locale.js";
import { useDepositPoller } from "../../hooks/useDepositPoller.js";
import { ConfirmationSpinner } from "../ConfirmationSpinner.js";
import { ErrorPage } from "../ErrorPage.js";
import { CenteredContent, PageHeader } from "../shared.js";

type AccountStatusPageProps = {
  rail: AccountRail;
  sessionId: string;
  clientSecret: string;
  baseUrl: string;
};

const TERMINAL_STATUSES: AccountDepositStatus[] = [
  "completed",
  "failed",
  "expired",
];

const RAIL_ETA: Record<AccountRail, string> = {
  interac: "5–30 min",
  ach: "1–3 days",
  apple_pay: "5–30 min",
};

/** Map status to a 0-2 step index for the progress indicator. */
function getStep(status: AccountDepositStatus): number {
  switch (status) {
    case "payment_received": return 0;
    case "token_delivered": return 1;
    case "completed": return 2;
    default: return 0;
  }
}

const STEP_LABELS = ["Received", "Processing", "Complete"];

/**
 * Async deposit status — ConfirmationSpinner + progress steps + action rows.
 */
export function AccountStatusPage({
  rail,
  sessionId,
  clientSecret,
  baseUrl,
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

  if (status === "failed" || status === "expired") {
    return <ErrorPage message={t.errorDepositFailed} sessionId={sessionId} hideRetry />;
  }

  const step = getStep(status);
  const title = isComplete ? t.accountDepositComplete : t.accountDepositReceived;
  const receiptUrl = `${baseUrl}/receipt?id=${sessionId}`;
  const accountUrl = `${baseUrl}/account?session=${sessionId}`;

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={title} />

      <CenteredContent>
        <div className="daimo-flex daimo-flex-col daimo-items-center daimo-gap-3">
          <DepositProgress step={step} />
          {!isComplete && (
            <span
              className="daimo-text-[10px] daimo-px-2.5 daimo-py-1 daimo-rounded-full"
              style={{
                backgroundColor: "var(--daimo-surface-secondary)",
                color: "var(--daimo-text-muted)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ETA {RAIL_ETA[rail]}
            </span>
          )}
        </div>
      </CenteredContent>

      <div className="daimo-px-8 daimo-pb-4 daimo-flex daimo-flex-col daimo-gap-1">
        <LinkPill href={accountUrl} icon="user" label={t.accountViewAccount} />
        <LinkPill href={receiptUrl} icon="receipt" label={t.showReceipt} />
      </div>
    </div>
  );
}

/** Three-dot progress indicator with current step label. */
function DepositProgress({ step }: { step: number }) {
  return (
    <div className="daimo-flex daimo-flex-col daimo-items-center daimo-gap-2">
      <div className="daimo-flex daimo-items-center daimo-w-[120px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="daimo-contents">
            {i > 0 && (
              <div
                className="daimo-flex-1 daimo-h-[2px] daimo-rounded-full"
                style={{
                  backgroundColor: i <= step
                    ? "var(--daimo-success)"
                    : "var(--daimo-surface-secondary)",
                  transition: "background-color 300ms ease-out",
                }}
              />
            )}
            <div
              className="daimo-w-2 daimo-h-2 daimo-rounded-full daimo-shrink-0"
              style={{
                backgroundColor: i <= step
                  ? "var(--daimo-success)"
                  : "var(--daimo-surface-secondary)",
                transition: "background-color 300ms ease-out",
                boxShadow: i === step ? "0 0 0 3px var(--daimo-success-light)" : "none",
              }}
            />
          </div>
        ))}
      </div>
      <span
        className="daimo-text-[10px]"
        style={{ color: "var(--daimo-text-muted)", transition: "color 200ms ease-out" }}
      >
        {STEP_LABELS[step]}
      </span>
    </div>
  );
}

/** Compact pill link — icon + label, 44px min tap target. */
function LinkPill({ href, icon, label }: { href: string; icon: "user" | "receipt"; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="daimo-flex daimo-items-center daimo-gap-2 daimo-rounded-[var(--daimo-radius-md)] daimo-px-3 daimo-py-2.5 daimo-text-xs daimo-font-medium daimo-transition-[background-color] daimo-duration-150 hover:[@media(hover:hover)]:daimo-bg-[var(--daimo-surface-secondary)]"
      style={{ color: "var(--daimo-text-muted)" }}
    >
      {icon === "user" && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="5" />
          <path d="M20 21a8 8 0 0 0-16 0" />
        </svg>
      )}
      {icon === "receipt" && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
          <path d="M12 17.5v-11" />
        </svg>
      )}
      <span className="daimo-flex-1">{label}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
        <path d="M7 7h10v10" />
        <path d="M7 17 17 7" />
      </svg>
    </a>
  );
}
