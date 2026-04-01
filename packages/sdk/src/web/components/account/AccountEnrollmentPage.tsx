import SumsubWebSdk from "@sumsub/websdk-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AccountRegion, EnrollmentResponse } from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { t } from "../../hooks/locale.js";
import { useAccountFlow } from "../../hooks/useAccountFlow.js";
import { PrimaryButton } from "../buttons.js";
import { ErrorPage } from "../ErrorPage.js";
import { ErrorIcon } from "../icons.js";
import { ProgressPulse } from "../ProgressPulse.js";
import { CenteredContent, ContactSupportButton, PageHeader } from "../shared.js";

type AccountEnrollmentPageProps = {
  region: AccountRegion;
  sessionId: string;
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
  "kyc_retry",
  "kyc_rejected_final",
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
  sessionId,
  onBack,
  onReady,
}: AccountEnrollmentPageProps) {
  const account = useAccountFlow();
  const client = useDaimoClient();
  const [response, setResponse] = useState<EnrollmentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [kycAccepted, setKycAccepted] = useState(false);
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
      if (!kycAccepted) {
        return (
          <KycIntro
            onContinue={() => setKycAccepted(true)}
            onBack={onBack}
          />
        );
      }
      return (
        <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0 daimo-pt-14">
          <SumSubWidget
            kycToken={response.kycToken}
            onComplete={handleKycSubmitted}
          />
        </div>
      );

    case "kyc_retry":
      return (
        <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0 daimo-pt-14">
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
          sessionId={sessionId}
        />
      );

    case "suspended":
      return (
        <EnrollmentTerminal
          title={t.accountSuspended}
          message={response.reason}
          sessionId={sessionId}
        />
      );

    case "error":
      return (
        <ErrorPage
          message={response.message}
          sessionId={sessionId}
          retryText={t.tryAgain}
          onRetry={response.retryable ? fetchEnrollment : undefined}
          hideRetry={!response.retryable}
        />
      );

    case "active":
      return null;
  }
}

// --- Sub-components ---

/** Pre-KYC intro — explains why verification is needed. */
function KycIntro({
  onContinue,
  onBack,
}: {
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={t.accountKycIntroTitle} onBack={onBack} />

      <div className="daimo-flex-1 daimo-flex daimo-flex-col daimo-items-center daimo-justify-center daimo-px-10">
        {/* Shield icon */}
        <div
          className="daimo-w-12 daimo-h-12 daimo-rounded-full daimo-flex daimo-items-center daimo-justify-center"
          style={{
            backgroundColor: "var(--daimo-surface-secondary)",
            animation: "daimo-scale-in 400ms cubic-bezier(0.175, 0.885, 0.32, 1.1) both",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--daimo-text-secondary)" }}>
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        <p
          className="daimo-text-xs daimo-text-[var(--daimo-text-muted)] daimo-text-center daimo-leading-relaxed daimo-mt-4 daimo-max-w-[240px]"
          style={{ animation: "daimo-fade-up 300ms cubic-bezier(0.19, 1, 0.22, 1) 100ms both" }}
        >
          {t.accountKycIntroDesc}
        </p>

        {/* Trust signals */}
        <div
          className="daimo-flex daimo-items-center daimo-gap-6 daimo-mt-5 daimo-mb-4"
          style={{ animation: "daimo-fade-up 300ms cubic-bezier(0.19, 1, 0.22, 1) 200ms both" }}
        >
          <TrustSignal icon="lock" label="Encrypted" />
          <TrustSignal icon="eye-off" label="Private" />
          <TrustSignal icon="clock" label="2 min" />
        </div>
      </div>

      <div
        className="daimo-px-6 daimo-pb-8 daimo-flex daimo-flex-col daimo-items-center"
        style={{ animation: "daimo-fade-up 300ms cubic-bezier(0.19, 1, 0.22, 1) 300ms both" }}
      >
        <PrimaryButton onClick={onContinue}>
          {t.accountKycIntroCta}
        </PrimaryButton>
      </div>
    </div>
  );
}

/** Small trust signal with icon + label. */
function TrustSignal({ icon, label }: { icon: "lock" | "eye-off" | "clock"; label: string }) {
  return (
    <div className="daimo-flex daimo-flex-col daimo-items-center daimo-gap-1.5">
      <div
        className="daimo-w-8 daimo-h-8 daimo-rounded-full daimo-flex daimo-items-center daimo-justify-center"
        style={{ backgroundColor: "var(--daimo-surface-secondary)" }}
      >
        {icon === "lock" && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--daimo-text-muted)" }}>
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        )}
        {icon === "eye-off" && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--daimo-text-muted)" }}>
            <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
            <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
            <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
            <path d="m2 2 20 20" />
          </svg>
        )}
        {icon === "clock" && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--daimo-text-muted)" }}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        )}
      </div>
      <span className="daimo-text-[10px] daimo-text-[var(--daimo-text-muted)]">{label}</span>
    </div>
  );
}

/** Terminal error — specific title, error icon, message, and support link. */
function EnrollmentTerminal({
  title,
  message,
  sessionId,
}: {
  title: string;
  message: string;
  sessionId: string;
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
          info={{ sessionId, error: message }}
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
