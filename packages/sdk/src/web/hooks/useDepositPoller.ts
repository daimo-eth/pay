import { useEffect, useRef } from "react";

import type { AccountDeposit } from "../../common/account.js";
import type { DaimoClient } from "../../client/createDaimoClient.js";

const DEFAULT_POLL_INTERVAL_MS = 5_000;

/**
 * Polls deposit status on an interval.
 * Calls `onUpdate` with the latest deposit on each poll.
 * Stops polling when `shouldStop` returns true.
 */
export function useDepositPoller(opts: {
  client: DaimoClient;
  sessionId: string;
  clientSecret: string;
  onUpdate: (deposit: AccountDeposit) => void;
  shouldStop?: (deposit: AccountDeposit) => boolean;
  intervalMs?: number;
}) {
  const { client, sessionId, clientSecret, onUpdate, shouldStop, intervalMs } =
    opts;
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;

    const poll = async () => {
      try {
        const { deposit } = await client.account.getDeposit({
          sessionId,
          clientSecret,
        });
        if (!deposit || stoppedRef.current) return;
        onUpdate(deposit);
        if (shouldStop?.(deposit)) stoppedRef.current = true;
      } catch (err) {
        console.error("[deposit-poller] poll failed:", err);
      }
    };

    poll();
    const timer = setInterval(() => {
      if (!stoppedRef.current) poll();
    }, intervalMs ?? DEFAULT_POLL_INTERVAL_MS);

    return () => {
      stoppedRef.current = true;
      clearInterval(timer);
    };
  }, [client, sessionId, clientSecret]); // stable deps only
}
