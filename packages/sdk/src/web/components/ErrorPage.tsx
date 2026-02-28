import { useEffect, useMemo } from "react";

import { SecondaryButton } from "./buttons.js";
import { ErrorIcon } from "./icons.js";
import { useDaimoClient } from "../hooks/DaimoClientContext.js";
import { t } from "../hooks/locale.js";
import { createNavLogger, type NavNodeType } from "../hooks/navEvent.js";
import { ContactSupportButton, ErrorMessage, PageHeader } from "./shared.js";

/** Extract a displayable string from any error value. */
function extractMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "message" in value) {
    return String((value as { message: unknown }).message);
  }
  return t.unknownError;
}

type ErrorPageProps = {
  message: unknown;
  /** Button text, defaults to "Reload" */
  retryText?: string;
  /** Retry callback, defaults to window.location.reload() */
  onRetry?: () => void;
  /** Email subject for support button */
  supportSubject?: string;
  /** Additional info to include in support email */
  supportInfo?: Record<string, string>;
  /** Session ID for event logging (optional) */
  sessionId?: string;
  clientSecret?: string;
  /** Current node context for event logging (optional) */
  nodeId?: string | null;
  nodeType?: NavNodeType | null;
  /** Hide retry button */
  hideRetry?: boolean;
  /** Hide support button */
  hideSupport?: boolean;
};

/**
 * Standard error page with icon, message, retry button, and support link.
 * Use for network errors, session creation failures, etc.
 */
export function ErrorPage({
  message,
  retryText = t.reload,
  onRetry,
  supportSubject = t.error,
  supportInfo = {},
  sessionId,
  clientSecret = "",
  nodeId = null,
  nodeType = null,
  hideRetry = false,
  hideSupport = false,
}: ErrorPageProps) {
  const displayMessage = extractMessage(message);
  const client = useDaimoClient();
  const logNavEvent = useMemo(() => createNavLogger(client), [client]);

  useEffect(() => {
    console.error("[ErrorPage]", message);
    if (sessionId == null) return;
    logNavEvent(sessionId, clientSecret, {
      nodeId,
      nodeType,
      action: "error_shown",
      error: displayMessage,
    });
  }, [message, sessionId, nodeId, nodeType, displayMessage, logNavEvent]);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader title={t.error} />
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* Error icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--daimo-error-light)" }}
        >
          <ErrorIcon />
        </div>

        {/* Message */}
        <ErrorMessage message={displayMessage} />

        {/* Retry button */}
        {!hideRetry && (
          <SecondaryButton onClick={handleRetry}>{retryText}</SecondaryButton>
        )}

        {/* Support link */}
        {!hideSupport && (
          <ContactSupportButton
            subject={supportSubject}
            info={{ error: displayMessage, ...supportInfo }}
          />
        )}
      </div>
    </div>
  );
}
