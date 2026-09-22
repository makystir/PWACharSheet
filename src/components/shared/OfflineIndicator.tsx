import { useState, useEffect, useRef } from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import styles from './OfflineIndicator.module.css';

/**
 * Small chip that displays "Offline" with an icon when the app
 * has no network connectivity. Hides with a 1-second CSS fade
 * when connectivity is restored.
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [visible, setVisible] = useState(!isOnline);
  const [hiding, setHiding] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Intentional setState-in-effect: shows/hides the indicator in response to
  // the external online/offline status, with a timed hide animation.
  useEffect(() => {
    if (!isOnline) {
      // Going offline: show immediately
      /* eslint-disable react-hooks/set-state-in-effect */
      setVisible(true);
      setHiding(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    } else if (visible) {
      // Coming back online: fade out over 1 second, then unmount
      setHiding(true);
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
        setHiding(false);
        hideTimerRef.current = null;
      }, 1000);
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <span
      className={styles.chip}
      data-hiding={hiding ? 'true' : undefined}
      role="status"
      aria-live="polite"
      aria-label="Network status: offline"
    >
      <WifiOff className={styles.icon} aria-hidden="true" />
      Offline
    </span>
  );
}
