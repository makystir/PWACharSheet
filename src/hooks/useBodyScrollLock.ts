import { useEffect, useRef } from 'react';

/**
 * Hook that locks body scroll by setting `document.body.style.overflow = 'hidden'`
 * when `isLocked` is true, and restores the previous overflow value on cleanup/unmount.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  const previousOverflowRef = useRef<string>('');

  useEffect(() => {
    if (isLocked) {
      previousOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = previousOverflowRef.current;
      };
    }
  }, [isLocked]);
}
