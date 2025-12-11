export type PollHandle = () => void;

/**
 * Will poll the given function at the specified interval. Stops when the
 * returned handle is invoked. If debugMode is false, polling is disabled.
 */
export function startPolling<T>({
  key,
  intervalMs,
  pollFn,
  onResult,
  onError,
  log = console.log,
  debugMode = false,
}: {
  key: string;
  intervalMs: number;
  pollFn: () => Promise<T>;
  onResult: (value: T) => void;
  onError: (err: unknown) => void;
  log?: (msg: string) => void;
  debugMode?: boolean;
}): PollHandle {
  let active = true;
  let timer: NodeJS.Timeout;

  const stop = () => {
    active = false;
    clearTimeout(timer);
    if (debugMode) {
      log(`[POLL] ${key} stopped`);
    }
  };

  const tick = async () => {
    if (debugMode) {
      log(`[POLL] polling ${key}`);
    }
    try {
      const res = await pollFn();
      if (!active) return;
      if (debugMode) {
        log(`[POLL] ${key} success`);
      }
      onResult(res);
    } catch (e) {
      if (!active) return;
      if (debugMode) {
        log(`[POLL] ${key} error: ${e}`);
      }
      onError(e);
    }
    timer = setTimeout(tick, intervalMs);
  };

  tick();

  return stop;
}
