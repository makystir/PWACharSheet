import { useRef, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import styles from './PageTransition.module.css';

interface PageTransitionProps {
  pageKey: string;
  children: ReactNode;
}

/**
 * PageTransition applies a crossfade animation when `pageKey` changes.
 * The outgoing content fades to opacity: 0, then the incoming content
 * fades in to opacity: 1. Transition duration is 200ms ease.
 *
 * Respects prefers-reduced-motion: reduce (transition-duration: 0ms).
 * Cancels in-progress transitions on rapid navigation.
 * No layout shift or scroll position jumps during transition.
 */
export function PageTransition({ pageKey, children }: PageTransitionProps) {
  const prevKeyRef = useRef<string>(pageKey);
  const rafRef = useRef<number | null>(null);
  const [transitionState, setTransitionState] = useState<'idle' | 'fade-out' | 'fade-in'>('idle');
  const contentRef = useRef<HTMLDivElement>(null);

  const cancelTransition = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (pageKey === prevKeyRef.current) return;

    // Cancel any in-progress transition on rapid navigation
    cancelTransition();

    // Check if reduced motion is preferred — if so, swap immediately
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      // Immediate swap, no animation
      prevKeyRef.current = pageKey;
      setTransitionState('idle');
      return;
    }

    // Start fade-out of outgoing content
    setTransitionState('fade-out');

    // After the fade-out completes, switch to fade-in for incoming content
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        prevKeyRef.current = pageKey;
        setTransitionState('fade-in');

        // After transition completes, go back to idle
        const el = contentRef.current;
        if (el) {
          const handleTransitionEnd = () => {
            setTransitionState('idle');
            el.removeEventListener('transitionend', handleTransitionEnd);
          };
          el.addEventListener('transitionend', handleTransitionEnd);
        }
      });
    });

    return () => {
      cancelTransition();
    };
  }, [pageKey, cancelTransition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelTransition();
    };
  }, [cancelTransition]);

  const dataTransition = transitionState === 'idle' ? undefined : transitionState;

  return (
    <div className={styles.wrapper}>
      <div
        ref={contentRef}
        className={styles.content}
        data-transition={dataTransition}
      >
        {children}
      </div>
    </div>
  );
}
