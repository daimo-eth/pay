import { getChainName } from "../../common/chain.js";
import type { SessionStatus } from "../../common/session.js";
import { useEffect, useState } from "react";

import { ConfirmationSpinner } from "./ConfirmationSpinner.js";
import { t } from "../hooks/locale.js";
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
  | "refunding"; // Payment bounced

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
  /** Back handler - only shown during "confirming" state */
  onBack?: () => void;
};

/**
 * Confirmation page showing payment progress.
 * - confirming: Wallet popup open, show source token icon
 * - waiting: Tx submitted, show source token icon
 * - processing: Fulfillment STARTED, show spinner
 * - done: Fulfillment COMPLETED, show green checkmark
 * - refunding: Payment bounced, show spinner (future use)
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
  onBack,
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

  // Show back button only during confirming (before tx submitted)
  const showBack = status === "confirming" && onBack != null;

  // Get display title based on status
  const displayTitle = getDisplayTitle(status, processingMessage);

  // Chain name for display
  const chainName = sourceChainId ? getChainName(sourceChainId) : "";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader onBack={showBack ? onBack : undefined} title={displayTitle} />
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        {/* Token icon with chain badge (only if logo available) */}
        {showSourceIcon && (
          <TokenIconWithChainBadge
            chainId={sourceChainId}
            symbol={sourceTokenSymbol}
            logoURI={sourceTokenLogoURI}
            size="lg"
          />
        )}

        {/* Spinner (processing/refunding) or checkmark (done) */}
        {status !== "confirming" && status !== "waiting" && (
          <ConfirmationSpinner done={status === "done"} />
        )}

        {/* Amount and chain info */}
        {showSourceInfo && (
          <div className="text-center">
            {/* Use tabular-nums for stable number widths */}
            <p className="text-3xl font-semibold text-[var(--daimo-text)] tabular-nums">
              {sourceAmountUsd != null
                ? `$${sourceAmountUsd.toFixed(2)} ${sourceTokenSymbol}`
                : sourceTokenSymbol}
            </p>
            <p className="text-lg text-[var(--daimo-text-secondary)]">
              {t.onChain} {chainName}
            </p>
          </div>
        )}

        {/* Return button or secondary message for done state */}
        {status === "done" && returnUrl && (
          <a
            href={returnUrl}
            className="w-full max-w-xs min-h-[44px] py-4 px-6 rounded-[var(--daimo-radius-lg)] font-semibold bg-[var(--daimo-surface-secondary)] text-[var(--daimo-text)] hover:[@media(hover:hover)]:bg-[var(--daimo-surface-hover)] active:scale-[0.97] touch-action-manipulation transition-[background-color,transform] duration-150 ease-out text-center flex items-center justify-center"
          >
            {t.returnToApp}
          </a>
        )}
        {/* Secondary text message (session page only, when no returnUrl) */}
        {status === "done" && !returnUrl && returnLabel && (
          <p className="text-center text-[var(--daimo-text-secondary)] px-8 whitespace-pre-line">
            {returnLabel}
          </p>
        )}

        {/* Show receipt button for waiting/processing/done states */}
        {(status === "waiting" ||
          status === "processing" ||
          status === "done") && <ShowReceiptButton sessionId={sessionId} />}
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
  if (sessionState === "bounced") return "refunding";
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
    case "refunding":
      return t.refundingYourPayment;
  }
}
