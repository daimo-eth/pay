import SumsubWebSdk from "@sumsub/websdk-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AccountRegion, EnrollmentResponse } from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { ConfirmationSpinner } from "../ConfirmationSpinner.js";
import { t } from "../../hooks/locale.js";
import { useAccountFlow } from "../../hooks/useAccountFlow.js";
import { PrimaryButton } from "../buttons.js";
import {
  CenteredContent,
  ErrorMessage,
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

  const fetchEnrollment = useCallback(async () => {
    if (!account) return;
    const isInitial = !response;
    if (isInitial) setIsLoading(true);
    const result = await account.startEnrollment(client, region);
    if (isInitial) setIsLoading(false);

    if (result?.action === "active") {
      setResponse(result);
      onReady();
    } else if (!response || response.action !== result?.action) {
      // Only update state when action changes — avoids re-mounting SumSub widget
      setResponse(result);
    }
  }, [account, client, region, onReady, response]);

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
          onComplete={fetchEnrollment}
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
      <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
        <PageHeader title={t.accountEnrollmentError} onBack={onBack} />
        <CenteredContent>
          <ErrorMessage message={response.message} />
        </CenteredContent>
        <div className="daimo-px-6 daimo-pb-6 daimo-flex daimo-flex-col daimo-items-center">
          <PrimaryButton onClick={fetchEnrollment}>
            {t.tryAgain}
          </PrimaryButton>
        </div>
      </div>
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
