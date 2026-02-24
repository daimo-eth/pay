// TODO: rename to useSessionCallbacks with onSessionStarted/onSessionCompleted
import { useEffect } from "react";

import type { SessionState } from "./types.js";

type PaymentCallbacks = {
  onOpen?: () => void;
  onPaymentStarted?: () => void;
  onPaymentCompleted?: () => void;
};

/**
 * Manages payment lifecycle callbacks:
 * - onOpen: when modal opens
 * - onPaymentStarted: when first fulfillment is detected
 * - onPaymentCompleted: when session completes
 */
export function usePaymentCallbacks(
  session: SessionState,
  isOpen: boolean,
  callbacks: PaymentCallbacks,
) {
  const isStarted =
    session.state === "processing" ||
    session.state === "completed" ||
    session.state === "bounced";
  const isCompleted = session.state === "completed";

  const { onOpen, onPaymentStarted, onPaymentCompleted } = callbacks;

  useEffect(() => {
    if (isOpen) onOpen?.();
  }, [session.sessionId, isOpen, onOpen]);
  useEffect(() => {
    if (isStarted) onPaymentStarted?.();
  }, [session.sessionId, isStarted, onPaymentStarted]);
  useEffect(() => {
    if (isCompleted) onPaymentCompleted?.();
  }, [session.sessionId, isCompleted, onPaymentCompleted]);
}
