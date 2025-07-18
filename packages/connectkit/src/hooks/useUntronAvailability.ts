import { useEffect, useState } from "react";
import { TrpcClient } from "../utils/trpc";

/**
 * Polls the backend for Untron receiver availability.
 * - Prefetches immediately on mount so downstream components can use the value ASAP.
 * - Continues polling at `pollIntervalMs` to keep the value fresh.
 *
 * Returns `null` while loading for the first time.
 */
export function useUntronAvailability({
  trpc,
  pollIntervalMs = 5_000,
}: {
  trpc: TrpcClient;
  pollIntervalMs?: number;
}): { available: boolean | null } {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval>;

    const fetchAvailability = async () => {
      try {
        const result = await trpc.untronHasAvailableReceivers.query();
        if (!cancelled) {
          setAvailable(result);
        }
      } catch (e) {
        console.error("Failed to fetch Untron availability", e);
      }
    };

    // Initial fetch
    fetchAvailability();
    // Subsequent polling
    intervalId = setInterval(fetchAvailability, pollIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { available };
}
