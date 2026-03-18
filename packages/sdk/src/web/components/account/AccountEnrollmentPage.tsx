import SumsubWebSdk from "@sumsub/websdk-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AccountRegion, EnrollmentResponse } from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { ConfirmationSpinner } from "../ConfirmationSpinner.js";
import { ErrorPage } from "../ErrorPage.js";
import { t } from "../../hooks/locale.js";
import { useAccountFlow } from "../../hooks/useAccountFlow.js";
import {
  CenteredContent,
  PageHeader,
} from "../shared.js";

type AccountEnrollmentPageProps = {
  region: AccountRegion;
  onBack: () => void;
  onReady: () => void;
};

/**
 * Handles all enrollment sub-states:
 * - kyc_required → launches SumSub widget
 * - pending → polls until status changes
 * - active → advances to payment
 * - error → shows error
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
  // After KYC submit, suppress transient errors while waiting for webhook
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
      // While awaiting webhook, swallow errors — backend may be mid-processing
      if (awaitingWebhook.current) return;
      result = { action: "error", message: t.errorGeneric };
    }

    if (isInitial) setIsLoading(false);
    if (!result) return;

    // While awaiting webhook, only accept forward progress (pending/active)
    if (awaitingWebhook.current) {
      if (result.action === "active" || result.action === "pending") {
        awaitingWebhook.current = false;
      } else {
        return; // ignore transient kyc_required/error during webhook processing
      }
    }

    if (result.action === "active") {
      responseRef.current = result;
      setResponse(result);
      onReady();
    } else if (!responseRef.current || responseRef.current.action !== result.action) {
      responseRef.current = result;
      setResponse(result);
    }
  }, [account, client, region, onReady]);

  /** Called when SumSub reports applicant submitted. */
  const handleKycSubmitted = useCallback(() => {
    // Optimistically show pending spinner while we wait for the webhook
    awaitingWebhook.current = true;
    responseRef.current = { action: "pending" };
    setResponse({ action: "pending" });
  }, []);

  // Initial enrollment check
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetchEnrollment();
  }, [fetchEnrollment]);

  // Poll while waiting for backend approval (both kyc_required and pending)
  useEffect(() => {
    if (response?.action !== "pending" && response?.action !== "kyc_required") return;
    const interval = setInterval(fetchEnrollment, 2000);
    return () => clearInterval(interval);
  }, [response?.action, fetchEnrollment]);

  if (isLoading) {
    return (
      <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
        <PageHeader title={t.accountEnrollment} onBack={onBack} />
        <CenteredContent>
          <ConfirmationSpinner done={false} />
        </CenteredContent>
      </div>
    );
  }

  if (response?.action === "kyc_required") {
    return (
      <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
        <PageHeader title={t.accountEnrollment} onBack={onBack} />
        <SumSubWidget
          kycToken={response.kycToken}
          onComplete={handleKycSubmitted}
        />
      </div>
    );
  }

  if (response?.action === "pending") {
    return (
      <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
        <PageHeader title={t.accountEnrollment} onBack={onBack} />
        <CenteredContent>
          <ConfirmationSpinner done={false} />
        </CenteredContent>
      </div>
    );
  }

  if (response?.action === "error") {
    return (
      <ErrorPage
        message={t.errorGeneric}
        retryText={t.tryAgain}
        onRetry={fetchEnrollment}
        hideSupport
      />
    );
  }

  return null;
}

// --- SumSub Widget ---

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
      // User finished submitting — start polling backend for approval
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
