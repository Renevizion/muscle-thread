import { useCallback, useRef, useState } from 'react';

export type SyncStatus = 'synced' | 'saving' | 'error';

/**
 * AAA Response Fidelity primitive.
 *
 * Updates local state immediately (UI feels <100ms), runs the async
 * save in the background, and rolls back to the previous value if it
 * fails. Use for forms, toggles, sliders, drag-and-drop — anywhere a
 * spinner-before-paint would otherwise feel laggy.
 */
export function useOptimisticState<T>(
  initial: T,
  save: (val: T) => Promise<void>,
) {
  const [state, setState] = useState<T>(initial);
  const [status, setStatus] = useState<SyncStatus>('synced');
  const lastCommitted = useRef<T>(initial);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setState((prev) => {
        const resolved =
          typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        setStatus('saving');
        save(resolved)
          .then(() => {
            lastCommitted.current = resolved;
            setStatus('synced');
          })
          .catch(() => {
            setStatus('error');
            setState(lastCommitted.current);
          });
        return resolved;
      });
    },
    [save],
  );

  return { state, update, status, setState } as const;
}
