import { isSessionActive } from "../common/session.js";
import { useEffect, useState } from "react";

import { useDaimoClient } from "./DaimoClientContext.js";
import { createNavLogger } from "./navEvent.js";
import type { SessionState } from "./types.js";

const POLL_INTERVAL_MS = 3000;

/**
 * Polls session state from the server while modal is open until terminal state.
 * Terminal = expired or completed.
 */
export function useSessionPolling(
  initialSession: SessionState,
  isOpen: boolean,
) {
  const client = useDaimoClient();
  const logNavEvent = createNavLogger(client);

  const [session, setSession] = useState(initialSession);

  useEffect(() => {
    if (session.state === "expired") {
      logNavEvent(session.sessionId, {
        nodeId: null,
        nodeType: null,
        action: "session_expired",
      });
    } else if (session.state === "completed") {
      logNavEvent(session.sessionId, {
        nodeId: null,
        nodeType: null,
        action: "session_completed",
      });
    } else if (session.state === "bounced") {
      logNavEvent(session.sessionId, {
        nodeId: null,
        nodeType: null,
        action: "session_bounced",
      });
    }
  }, [session.state, session.sessionId]);

  useEffect(() => {
    const daAddr =
      session.depositAddress ??
      (session as { da?: { daAddr?: string } }).da?.daAddr;
    if (!isOpen || !isSessionActive(session.state) || !daAddr) return;

    const poll = async () => {
      try {
        const updated = await client.pollSession({
          sessionId: session.sessionId,
          daAddr,
        });
        setSession((prev) => ({
          ...prev,
          state: updated.state,
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
