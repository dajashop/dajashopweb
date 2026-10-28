import { useCallback, useEffect, useRef } from 'react';

// A reply from a previous link must not change the current page or stored contact.
export function useEmailLinkRequest(token) {
  const scope = useRef({ token, generation: 0, busy: false });
  scope.current.token = token;
  useEffect(() => {
    scope.current.generation += 1;
    scope.current.busy = false;
    return () => {
      scope.current.generation += 1;
      scope.current.busy = false;
    };
  }, [token]);
  return useCallback(() => {
    if (scope.current.busy) return null;
    const generation = scope.current.generation;
    scope.current.busy = true;
    const isCurrent = () => scope.current.generation === generation && scope.current.token === token;
    return { isCurrent, finish: () => { if (isCurrent()) scope.current.busy = false; } };
  }, [token]);
}
