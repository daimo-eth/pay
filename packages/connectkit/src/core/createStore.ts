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
): {
  getState: () => S;
  dispatch: (e: E) => void;
  subscribe: (
    l: ({ prev, next, event }: { prev: S; next: S; event: E }) => void,
  ) => () => void;
} {
  let state = init;
  const listeners = new Set<
    ({ prev, next, event }: { prev: S; next: S; event: E }) => void
  >();

  return {
    getState: () => state,
    dispatch: (e) => {
      const prev = state;
      state = reducer(state, e);
      listeners.forEach((l) => l({ prev, next: state, event: e }));
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
