import { useEffect, useRef, useState } from 'react';
import styles from './Toast.module.css';

export interface ToastProps {
  message: string | null;
  duration?: number;
}

export function Toast({ message, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
      setVisible(true);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setVisible(false);
        timerRef.current = null;
      }, duration);
    } else {
      setVisible(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [message, duration]);

  return (
    <div className={styles.container} aria-live="polite">
      {visible && displayMessage && (
        <div className={styles.toast}>{displayMessage}</div>
      )}
    </div>
  );
}
