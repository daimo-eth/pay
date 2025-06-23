/**
 * A store that manages state and dispatches events to a list of subscribers.
 * - getState: Returns the current state of the store.
 * - dispatch: Transition to a new state by applying the reducer function to
 * the current state and the event.
 * - subscribe: Takes a function as an argument and adds it to the list of
 * subscribers. When the state changes, all subscribers will be called. The
 * function returns a function that can be used to unsubscribe from the store.
 *
 * @template S The type of the state.
 * @template E The type of the events.
 */
export interface Store<S, E> {
  getState: () => S;
  dispatch: (e: E) => void;
  subscribe: (l: listener<S, E>) => () => void;
}

type listener<S, E> = ({
  prev,
  next,
  event,
}: {
  prev: S;
  next: S;
  event: E;
}) => void;

/**
 * Creates a store that manages state and dispatches events to a list of
 * subscribers.
 *
 * @param reducer The reducer function that takes the current state and an event
 * and deterministically returns a new state.
 * @param init The initial state of the store.
 * @returns An object with three methods:
 *  - getState: Returns the current state of the store.
 *  - dispatch: Transition to a new state by applying the reducer function to
 *  the current state and the event.
 *  - subscribe: Takes a function as an argument and adds it to the list of
 *  subscribers. When the state changes, all subscribers will be called. The
 *  function returns a function that can be used to unsubscribe from the store.
 */
export function createStore<S, E>(
  reducer: (s: S, e: E) => S,
  init: S,
): Store<S, E> {
  let state = init;
  const listeners = new Set<listener<S, E>>();

  return {
    getState: () => state,
    dispatch: (e) => {
      const prev = state;
      state = reducer(state, e);
      listeners.forEach((l) => l({ prev, next: state, event: e }));
    },
    subscribe: (l) => {
      listeners.add(l);
      // Return an unsubscribe function.
      return () => listeners.delete(l);
    },
  };
}

/**
 * Wait until the store enters any state that satisfies the given predicate(s),
 * or reject on error.
 * 
 * @returns
 *   `Promise<T>` resolving with the first state where `predicate` is true,
 *   or rejecting if `isError` ever returns true.
 *
 * @example After hydrating an order, wait for the payment FSM to transition to
 * the new state before returning the updated order.
 * 
 * // 1. Kick off the preview transition
 * store.dispatch({ type: "hydrate_order" });
 *
 * // 2. Pause until the order is successfully hydrated or errors
 * const newState = await waitForState(
 *  store,
 *  (s): s is NewState => s.type === "payment_unpaid",
 *  s => s.type === "error",
 *  s => (s as ErrorState).message
 * );
 *
 * // 3. Now newState.order is updated with the hydrated order
 * return newState.order;
 * ```
 */
export function waitForState<S, E, T extends S>(
  store: Store<S, E>,
  predicates: ((s: S) => s is T) | ReadonlyArray<(s: S) => s is T>,
  isError?: (s: S) => boolean,
  getErrorMessage?: (s: S) => string,
): Promise<T> {
  // Normalise to an array and build a helper that succeeds if *any* guard passes
  const guards = typeof predicates === "function" ? [predicates] : predicates;

  const matches = (s: S): s is T => guards.some((g) => g(s));

  return new Promise((resolve, reject) => {
    // Fast path – we might already be in a valid state
    const first = store.getState();
    if (matches(first)) return resolve(first);

    const unsubscribe = store.subscribe(({ next }) => {
      if (matches(next)) {
        unsubscribe();
        resolve(next);
      } else if (isError?.(next)) {
        unsubscribe();
        reject(new Error(getErrorMessage?.(next) ?? "error"));
      }
    });
  });
}
