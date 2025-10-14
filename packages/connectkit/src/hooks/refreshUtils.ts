/**
 * Utility functions for managing refreshable options
 */

export interface RefreshState {
  lastExecutedParams: React.MutableRefObject<string | null>;
  isApiCallInProgress: React.MutableRefObject<boolean>;
}

/**
 * Creates a refresh function that resets the state and calls the provided fetch function
 */
export function createRefreshFunction<T>(
  fetchFunction: () => Promise<T>,
  refreshState: RefreshState
) {
  return async () => {
    // Reset the last executed params to force a refresh
    refreshState.lastExecutedParams.current = null;

    // Reset API call in progress flag
    refreshState.isApiCallInProgress.current = false;

    // Call the fetch function
    await fetchFunction();
  };
}

/**
 * Checks if a refresh should be skipped based on current state
 */
export function shouldSkipRefresh(
  paramsKey: string,
  refreshState: RefreshState
): boolean {
  // Skip if we've already executed with these exact parameters
  if (refreshState.lastExecutedParams.current === paramsKey) {
    return true;
  }

  // Skip if we're already making an API call to prevent concurrent requests
  if (refreshState.isApiCallInProgress.current) {
    return true;
  }

  return false;
}

/**
 * Sets up the refresh state for a new API call
 */
export function setupRefreshState(
  paramsKey: string,
  refreshState: RefreshState
): void {
  refreshState.lastExecutedParams.current = paramsKey;
  refreshState.isApiCallInProgress.current = true;
}
