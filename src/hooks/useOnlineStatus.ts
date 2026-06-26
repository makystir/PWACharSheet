import { useState, useEffect } from 'react';

/**
 * Hook that tracks online/offline status via navigator.onLine and
 * online/offline window events. Returns boolean isOnline.
 *
 * - Initialises from navigator.onLine on first render (Requirement 17.4)
 * - Listens for 'online'/'offline' events to stay reactive (Requirements 17.1, 17.2)
 * - Cleans up event listeners on unmount
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
