export type PollHandle = () => void;

/**
 * Will poll the given function at the specified interval. Stops when the
 * returned handle is invoked.
 */
export function startPolling<T>({
  key,
  intervalMs,
  pollFn,
  onResult,
  onError,
  maxErrors = 5,
  log = console.log,
}: {
  key: string;
  intervalMs: number;
  pollFn: () => Promise<T>;
  onResult: (value: T) => void;
  onError: (err: unknown) => void;
  maxErrors?: number;
  log?: (msg: string) => void;
}): PollHandle {
  let active = true;
  let timer: NodeJS.Timeout;
  let errorCount = 0;

  const stop = () => {
    active = false;
    clearTimeout(timer);
    log(`[POLL] ${key} stopped`);
  };

  const tick = async () => {
    log(`[POLL] polling ${key}`);
    try {
      const res = await pollFn();
      if (!active) return;
      errorCount = 0;
      log(`[POLL] ${key} success`);
      onResult(res);
    } catch (e) {
      if (!active) return;
      log(`[POLL] ${key} error: ${e}`);
      onError(e);
      errorCount++;
      if (errorCount >= maxErrors) {
        log(`[POLL] ${key} reached max errors (${maxErrors}), giving up`);
        return stop();
      }
    }
    timer = setTimeout(tick, intervalMs);
  };

  tick();

  return stop;
}
