import { useState } from "react";

import type { AccountRegion, AccountDepositStatus } from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { t } from "../../hooks/locale.js";
import { useDepositPoller } from "../../hooks/useDepositPoller.js";
import { ErrorPage } from "../ErrorPage.js";
import { PageHeader } from "../shared.js";

type AccountStatusPageProps = {
  region: AccountRegion;
  sessionId: string;
  clientSecret: string;
  baseUrl: string;
};

const TERMINAL_STATUSES: AccountDepositStatus[] = [
  "completed",
  "failed",
  "expired",
];

const REGION_ETA: Record<AccountRegion, string> = {
  CA: "5–30 min",
  US: "1–3 days",
};

/**
 * Async deposit status — calm confirmation with ETA.
 */
export function AccountStatusPage({
  region,
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

  if (status === "failed" || status === "expired") {
    return <ErrorPage message={t.errorDepositFailed} sessionId={sessionId} hideRetry />;
  }

  const isComplete = status === "completed";
  const title = isComplete ? t.accountDepositComplete : t.accountDepositReceived;
  const receiptUrl = `${baseUrl}/receipt?id=${sessionId}`;
  const accountUrl = `${baseUrl}/account`;

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={title} />

      {/* Hero — icon + ETA badge */}
      <div className="daimo-flex-1 daimo-flex daimo-flex-col daimo-items-center daimo-justify-center daimo-gap-4">
        <div
          className="daimo-w-11 daimo-h-11 daimo-rounded-full daimo-flex daimo-items-center daimo-justify-center"
          style={{
            backgroundColor: "var(--daimo-success-light)",
            animation: "daimo-scale-in 350ms cubic-bezier(0.175, 0.885, 0.32, 1.1) both",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M5 12l5 5L19 7"
              stroke="var(--daimo-success)"
              strokeWidth="2.5"
              strokeDasharray="24"
              strokeDashoffset="24"
              style={{ animation: "daimo-check-draw 400ms cubic-bezier(0.65, 0, 0.35, 1) 300ms forwards" }}
            />
          </svg>
        </div>
        {!isComplete && (
          <span
            className="daimo-text-xs daimo-px-3 daimo-py-1 daimo-rounded-full"
            style={{
              backgroundColor: "var(--daimo-surface-secondary)",
              color: "var(--daimo-text-muted)",
              animation: "daimo-fade-up 300ms cubic-bezier(0.19, 1, 0.22, 1) 100ms both",
            }}
          >
            {t.accountDepositArrival(REGION_ETA[region])}
          </span>
        )}
      </div>

      {/* Actions */}
      <div
        className="daimo-px-6 daimo-pb-2 daimo-flex daimo-flex-col"
        style={{ animation: "daimo-fade-up 300ms cubic-bezier(0.19, 1, 0.22, 1) 200ms both" }}
      >
        <ActionRow href={accountUrl} icon="user" label={t.accountViewAccount} />
        <div className="daimo-h-px daimo-mx-1" style={{ backgroundColor: "var(--daimo-surface-secondary)" }} />
        <ActionRow href={receiptUrl} icon="receipt" label={t.showReceipt} />
        {!isComplete && (
          <>
            <div className="daimo-h-px daimo-mx-1" style={{ backgroundColor: "var(--daimo-surface-secondary)" }} />
            <div className="daimo-flex daimo-items-center daimo-gap-3 daimo-py-3">
              <div
                className="daimo-w-8 daimo-h-8 daimo-rounded-[var(--daimo-radius-md)] daimo-flex daimo-items-center daimo-justify-center daimo-shrink-0"
                style={{ backgroundColor: "var(--daimo-surface-secondary)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--daimo-text-muted)" }}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <span className="daimo-text-xs daimo-text-[var(--daimo-text-muted)]">
                {t.accountWaitingCanClose}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Full-width action row with icon, label, and chevron. */
function ActionRow({ href, icon, label }: { href: string; icon: "user" | "receipt"; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="daimo-flex daimo-items-center daimo-gap-3 daimo-py-3 daimo-transition-colors"
      style={{ color: "var(--daimo-text-secondary)" }}
    >
      <div
        className="daimo-w-8 daimo-h-8 daimo-rounded-[var(--daimo-radius-md)] daimo-flex daimo-items-center daimo-justify-center daimo-shrink-0"
        style={{ backgroundColor: "var(--daimo-surface-secondary)" }}
      >
        {icon === "user" && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--daimo-text-muted)" }}>
            <circle cx="12" cy="8" r="5" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
        )}
        {icon === "receipt" && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--daimo-text-muted)" }}>
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
            <path d="M12 17.5v-11" />
          </svg>
        )}
      </div>
      <span className="daimo-text-sm daimo-flex-1">{label}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--daimo-text-muted)" }}>
        <path d="m9 18 6-6-6-6" />
      </svg>
    </a>
  );
}
