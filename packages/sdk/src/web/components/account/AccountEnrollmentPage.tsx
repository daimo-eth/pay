import SumsubWebSdk from "@sumsub/websdk-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AccountRegion, EnrollmentResponse } from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { t } from "../../hooks/locale.js";
import { useAccountFlow } from "../../hooks/useAccountFlow.js";
import { ErrorPage } from "../ErrorPage.js";
import { ErrorIcon } from "../icons.js";
import { ProgressPulse } from "../ProgressPulse.js";
import { CenteredContent, ContactSupportButton, PageHeader } from "../shared.js";

type AccountEnrollmentPageProps = {
  region: AccountRegion;
  onBack: () => void;
  onReady: () => void;
};

/** Actions that should trigger polling — the state is still advancing. */
const POLLING_ACTIONS = new Set([
  "kyc_required",
  "kyc_retry",
  "kyc_pending_review",
  "provider_pending",
]);

/** After KYC submission, only these actions represent forward progress.
 *  Anything else (e.g. stale kyc_required) is suppressed until the
 *  webhook arrives and the server catches up. */
const FORWARD_FROM_KYC = new Set([
  "kyc_pending_review",
  "provider_pending",
  "active",
]);

/**
 * Enrollment page — renders the right view for the current enrollment state.
 * The modal is dumb: it polls `startEnrollment`, reads the response, and
 * renders. All state transitions are driven by the server.
 *
 * States:
 *   kyc_required       → SumSub widget (first-time docs)
 *   kyc_retry          → retry banner + SumSub widget
 *   kyc_pending_review → pulsing dots, "reviewing your documents"
 *   kyc_rejected_final → terminal error
 *   provider_pending   → pulsing dots, "setting up your account"
 *   active             → auto-advance to payment
 *   suspended          → terminal error
 *   error              → error with optional retry
 */
export function AccountEnrollmentPage({
  region,
  onBack,
  onReady,
}: AccountEnrollmentPageProps) {
  const account = useAccountFlow();
  const client = useDaimoClient();
  const [response, setResponse] = useState<EnrollmentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const started = useRef(false);
  const responseRef = useRef<EnrollmentResponse | null>(null);
  // After KYC submit, suppress stale responses until webhook arrives
  const awaitingWebhook = useRef(false);

  const fetchEnrollment = useCallback(async () => {
    if (!account) return;
    const isInitial = responseRef.current == null;
    if (isInitial) setIsLoading(true);

    let result: EnrollmentResponse | null;
    try {
      result = await account.startEnrollment(client, region);
    } catch (err) {
      console.error("[enrollment] fetch failed:", err);
      if (awaitingWebhook.current) return;
      result = { action: "error", message: t.errorGeneric, retryable: true };
    }

    if (isInitial) setIsLoading(false);
    if (!result) return;

    // While awaiting webhook, only accept forward progress
    if (awaitingWebhook.current) {
      if (FORWARD_FROM_KYC.has(result.action)) {
        awaitingWebhook.current = false;
      } else {
        return;
      }
    }

    if (result.action === "active") {
      responseRef.current = result;
      setResponse(result);
      onReady();
    } else if (
      !responseRef.current ||
      responseRef.current.action !== result.action
    ) {
      responseRef.current = result;
      setResponse(result);
    }
  }, [account, client, region, onReady]);

  /** Called when SumSub reports docs submitted. Optimistically show review. */
  const handleKycSubmitted = useCallback(() => {
    awaitingWebhook.current = true;
    responseRef.current = { action: "kyc_pending_review" };
    setResponse({ action: "kyc_pending_review" });
  }, []);

  // Initial fetch
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetchEnrollment();
  }, [fetchEnrollment]);

  // Poll while the state is still advancing
  useEffect(() => {
    if (!response || !POLLING_ACTIONS.has(response.action)) return;
    const interval = setInterval(fetchEnrollment, 2000);
    return () => clearInterval(interval);
  }, [response?.action, fetchEnrollment]);

  // --- Render ---

  if (isLoading) {
    return (
      <EnrollmentWaiting
        title={t.accountEnrollment}
        label={t.loading}
        onBack={onBack}
      />
    );
  }

  if (!response) return null;

  switch (response.action) {
    case "kyc_required":
      return (
        <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
          <PageHeader title={t.accountEnrollment} onBack={onBack} />
          <SumSubWidget
            kycToken={response.kycToken}
            onComplete={handleKycSubmitted}
          />
        </div>
      );

    case "kyc_retry":
      return (
        <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
          <PageHeader title={t.accountEnrollmentRetry} onBack={onBack} />
          <p className="daimo-text-xs daimo-text-center daimo-text-[var(--daimo-text-secondary)] daimo-px-6 daimo-pb-3 daimo-leading-relaxed">
            {response.reason}
          </p>
          <SumSubWidget
            kycToken={response.kycToken}
            onComplete={handleKycSubmitted}
          />
        </div>
      );

    case "kyc_pending_review":
      return (
        <EnrollmentWaiting
          title={t.accountEnrollmentPending}
          label={t.accountEnrollmentPendingDesc}
          onBack={onBack}
        />
      );

    case "provider_pending":
      return (
        <EnrollmentWaiting
          title={t.accountProviderPending}
          label={t.accountProviderPendingDesc}
        />
      );

    case "kyc_rejected_final":
      return (
        <EnrollmentTerminal
          title={t.accountEnrollmentRejected}
          message={response.reason}
        />
      );

    case "suspended":
      return (
        <EnrollmentTerminal
          title={t.accountSuspended}
          message={response.reason}
        />
      );

    case "error":
      return (
        <ErrorPage
          message={response.message}
          retryText={t.tryAgain}
          onRetry={response.retryable ? fetchEnrollment : undefined}
          hideRetry={!response.retryable}
          hideSupport={response.retryable}
        />
      );

    case "active":
      return null;
  }
}

// --- Sub-components ---

/** Terminal error — specific title, error icon, message, and support link. */
function EnrollmentTerminal({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={title} />
      <div className="daimo-flex-1 daimo-flex daimo-flex-col daimo-items-center daimo-justify-center daimo-p-6 daimo-gap-6">
        <div
          className="daimo-w-16 daimo-h-16 daimo-rounded-full daimo-flex daimo-items-center daimo-justify-center"
          style={{ backgroundColor: "var(--daimo-error-light)" }}
        >
          <ErrorIcon size={32} />
        </div>
        <p className="daimo-text-sm daimo-text-[var(--daimo-text-secondary)] daimo-text-center daimo-leading-relaxed daimo-px-4">
          {message}
        </p>
        <ContactSupportButton
          subject={title}
          info={{ error: message }}
        />
      </div>
    </div>
  );
}

/** Waiting view — pulsing dots with title and optional description. */
function EnrollmentWaiting({
  title,
  label,
  onBack,
}: {
  title: string;
  label?: string;
  onBack?: () => void;
}) {
  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={title} onBack={onBack} />
      <CenteredContent>
        <ProgressPulse label={label} />
      </CenteredContent>
    </div>
  );
}

/** SumSub identity verification widget. */
function SumSubWidget({
  kycToken,
  onComplete,
}: {
  kycToken: string;
  onComplete: () => void;
}) {
  const handleMessage = useCallback(
    (type: string) => {
      console.log("[sumsub] event:", type);
      if (type === "idCheck.onApplicantSubmitted") {
        onComplete();
      }
    },
    [onComplete],
  );

  return (
    <div className="daimo-flex-1 daimo-min-h-0 daimo-overflow-y-auto">
      <SumsubWebSdk
        accessToken={kycToken}
        expirationHandler={async () => kycToken}
        onMessage={handleMessage}
      />
    </div>
  );
}
