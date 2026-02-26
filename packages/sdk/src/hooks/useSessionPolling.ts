import { isSessionActive } from "../common/legacy/session.js";
import { useEffect, useState } from "react";

import { useDaimoClient } from "./DaimoClientContext.js";
import { createNavLogger } from "./navEvent.js";
import type { ModalSession } from "./types.js";

const POLL_INTERVAL_MS = 3000;

/**
 * Polls session status from the server while modal is open until terminal.
 * Terminal = expired or completed.
 */
export function useSessionPolling(
  initialSession: ModalSession,
  isOpen: boolean,
) {
  const client = useDaimoClient();
  const logNavEvent = createNavLogger(client);

  const [session, setSession] = useState(initialSession);

  useEffect(() => {
    if (session.status === "expired") {
      logNavEvent(session.sessionId, {
        nodeId: null,
        nodeType: null,
        action: "session_expired",
      });
    } else if (session.status === "completed") {
      logNavEvent(session.sessionId, {
        nodeId: null,
        nodeType: null,
        action: "session_completed",
      });
    } else if (session.status === "bounced") {
      logNavEvent(session.sessionId, {
        nodeId: null,
        nodeType: null,
        action: "session_bounced",
      });
    }
  }, [session.status, session.sessionId]);

  useEffect(() => {
    const daAddr = session.receivers.evm.address;
    if (!isOpen || !isSessionActive(session.status) || !daAddr) return;

    const poll = async () => {
      try {
        const updated = await client.pollSession({
          sessionId: session.sessionId,
          daAddr,
        });
        setSession((prev) => ({
          ...prev,
          status: updated.status,
        }));
      } catch (error) {
        console.error("failed to poll session:", error);
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isOpen, session]);

  return { session, setSession };
}
