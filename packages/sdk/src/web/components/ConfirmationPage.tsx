import { useEffect, useState } from "react";
import { getChainName } from "../../common/chain.js";
import type { SessionStatus } from "../../common/session.js";

import { t } from "../hooks/locale.js";
import { PrimaryButton } from "./buttons.js";
import { ConfirmationSpinner } from "./ConfirmationSpinner.js";
import {
  PageHeader,
  ShowReceiptButton,
  TokenIconWithChainBadge,
} from "./shared.js";

type ConfirmationStatus =
  | "confirming" // Wallet popup open, waiting for user to confirm
  | "waiting" // Tx submitted, waiting for onchain detection
  | "processing" // Funds received, processing
  | "done" // Payment completed
  | "refunded"; // Payment bounced/refunded

type ConfirmationPageProps = {
  sessionId: string;
  /** Session state - drives confirmation status */
  sessionState?: SessionStatus;
  /** Source token chain ID (what user is paying with) */
  sourceChainId?: number;
  /** Source token symbol (what user is paying with) */
  sourceTokenSymbol?: string;
  /** Source token logo URI */
  sourceTokenLogoURI?: string;
  /** Amount in USD being sent */
  sourceAmountUsd?: number;
  /** Pending tx hash - set after wallet confirms but before onchain detection */
  pendingTxHash?: string;
  returnUrl?: string;
  /** Secondary message to show when done (only for session page, not modal) */
  returnLabel?: string;
  /** User rejected the wallet transaction */
  rejected?: boolean;
  /** Retry handler for rejected transactions */
  onRetry?: () => void;
  /** Back handler - only shown during "confirming" state */
  onBack?: () => void;
  baseUrl: string;
};

/**
 * Confirmation page showing payment progress.
 * - confirming: Wallet popup open, show source token icon
 * - waiting: Tx submitted, show source token icon
 * - processing: Fulfillment STARTED, show spinner
 * - done: Fulfillment COMPLETED, show green checkmark
 * - refunded: Payment bounced, show yellow exclamation + receipt link
 */
export function ConfirmationPage({
  sessionId,
  sessionState,
  sourceChainId,
  sourceTokenSymbol,
  sourceTokenLogoURI,
  sourceAmountUsd,
  pendingTxHash,
  returnUrl,
  returnLabel,
  rejected,
  onRetry,
  onBack,
  baseUrl,
}: ConfirmationPageProps) {
  const status = getConfirmationStatus(pendingTxHash, sessionState);

  // For processing status: show "Payment received" then change after 2s
  const [processingMessage, setProcessingMessage] = useState(t.paymentReceived);
  useEffect(() => {
    if (status === "processing") {
      const timer = setTimeout(() => {
        setProcessingMessage(t.processingYourPayment);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Show source token info (amount, chain) when we have basic data
  const showSourceInfo =
    (status === "confirming" || status === "waiting") &&
    sourceChainId != null &&
    sourceTokenSymbol != null;

  // Show token icon only when we also have a logo URI
  const showSourceIcon = showSourceInfo && sourceTokenLogoURI != null;

  // Show back button during confirming or rejected (before tx submitted)
  const showBack = (status === "confirming" || rejected) && onBack != null;

  // Get display title based on status
  const displayTitle = rejected
    ? t.paymentCancelled
    : getDisplayTitle(status, processingMessage);

  // Chain name for display
  const chainName = sourceChainId ? getChainName(sourceChainId) : "";

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader onBack={showBack ? onBack : undefined} title={displayTitle} />
      <div className="daimo-flex-1 daimo-flex daimo-flex-col daimo-items-center daimo-justify-center daimo-p-6 daimo-gap-4">
        {/* Token icon with chain badge (only if logo available) */}
        {showSourceIcon && (
          <TokenIconWithChainBadge
            chainId={sourceChainId}
            symbol={sourceTokenSymbol}
            logoURI={sourceTokenLogoURI}
            size="lg"
            baseUrl={baseUrl}
          />
        )}

        {/* Spinner (processing) or checkmark (done/refunded) */}
        {status !== "confirming" && status !== "waiting" && (
          <ConfirmationSpinner
            done={status === "done" || status === "refunded"}
            bounced={status === "refunded"}
          />
        )}

        {/* Amount and chain info */}
        {showSourceInfo && (
          <div className="daimo-text-center">
            {/* Use tabular-nums for stable number widths */}
            <p className="daimo-text-3xl daimo-font-semibold daimo-text-[var(--daimo-text)] daimo-tabular-nums">
              {sourceAmountUsd != null
                ? `$${sourceAmountUsd.toFixed(2)} ${sourceTokenSymbol}`
                : sourceTokenSymbol}
            </p>
            <p className="daimo-text-base daimo-text-[var(--daimo-text-secondary)]">
              {t.onChain} {chainName}
            </p>
          </div>
        )}

        {/* Retry button when user rejected wallet transaction */}
        {rejected && onRetry && (
          <PrimaryButton onClick={onRetry}>{t.retryPayment}</PrimaryButton>
        )}

        {/* Return button or secondary message for done state */}
        {status === "done" && returnUrl && (
          <a
            href={returnUrl}
            className="daimo-w-full daimo-max-w-xs daimo-min-h-[44px] daimo-py-4 daimo-px-6 daimo-rounded-[var(--daimo-radius-lg)] daimo-font-medium daimo-bg-[var(--daimo-surface-secondary)] daimo-text-[var(--daimo-text)] hover:[@media(hover:hover)]:daimo-bg-[var(--daimo-surface-hover)] daimo-touch-action-manipulation daimo-transition-[background-color] daimo-duration-100 daimo-ease daimo-text-center daimo-flex daimo-items-center daimo-justify-center"
          >
            {t.returnToApp}
          </a>
        )}
        {/* Secondary text message (session page only, when no returnUrl) */}
        {status === "done" && !returnUrl && returnLabel && (
          <p className="daimo-text-center daimo-text-[var(--daimo-text-secondary)] daimo-px-8 daimo-whitespace-pre-line">
            {returnLabel}
          </p>
        )}

        {/* Show receipt button for waiting/processing/done/refunded states */}
        {(status === "waiting" ||
          status === "processing" ||
          status === "done" ||
          status === "refunded") && <ShowReceiptButton sessionId={sessionId} baseUrl={baseUrl} />}
      </div>
    </div>
  );
}

/** Derive UI status from session state and pending tx hash */
function getConfirmationStatus(
  pendingTxHash: string | undefined,
  sessionState: SessionStatus | undefined,
): ConfirmationStatus {
  if (sessionState === "processing") return "processing";
  if (sessionState === "succeeded") return "done";
  if (sessionState === "bounced") return "refunded";
  if (pendingTxHash) return "waiting";
  return "confirming";
}

/** Get display title for status */
function getDisplayTitle(
  status: ConfirmationStatus,
  processingMessage: string,
): string {
  switch (status) {
    case "confirming":
      return t.confirmYourPayment;
    case "waiting":
      return t.waitingForYourPayment;
    case "processing":
      return processingMessage;
    case "done":
      return t.paymentCompleted;
    case "refunded":
      return t.paymentRefunded;
  }
}
