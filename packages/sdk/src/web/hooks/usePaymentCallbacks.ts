import { isSessionStarted } from "../../common/session.js";
import { useEffect } from "react";

import type { SessionWithNav } from "../api/navTree.js";

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
  session: SessionWithNav,
  isOpen: boolean,
  callbacks: PaymentCallbacks,
) {
  const isStarted = isSessionStarted(session.status);
  const isCompleted = session.status === "succeeded";

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
