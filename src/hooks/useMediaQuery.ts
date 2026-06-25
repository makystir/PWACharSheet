import { useState, useEffect, useRef } from 'react';

/**
 * Reactive viewport detection hook using `window.matchMedia`.
 * Returns a boolean that updates when the media query match state changes.
 * Debounces rapid changes by ≤100ms to avoid layout thrashing.
 *
 * Usage: const isMobile = useMediaQuery('(max-width: 767px)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(query);

    // Sync initial value in case query changed between renders
    setMatches(mql.matches);

    const handler = (event: MediaQueryListEvent) => {
      // Debounce rapid changes by ≤100ms
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setMatches(event.matches);
        timeoutRef.current = null;
      }, 100);
    };

    mql.addEventListener('change', handler);

    return () => {
      mql.removeEventListener('change', handler);
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [query]);

  return matches;
}
