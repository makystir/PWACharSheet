import { useEffect, useRef, useState } from 'react';
import styles from './Toast.module.css';

export interface ToastProps {
  message: string | null;
  duration?: number;
  action?: { label: string; onAction: () => void };
}

export function Toast({ message, duration = 3000, action }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);
  const [displayAction, setDisplayAction] = useState<ToastProps['action']>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
      setDisplayAction(action);
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
  }, [message, duration, action]);

  const handleAction = () => {
    if (displayAction) {
      displayAction.onAction();
    }
    // Dismiss toast and cancel timer
    setVisible(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div className={styles.container} aria-live={displayAction ? 'assertive' : 'polite'}>
      {visible && displayMessage && (
        <div className={styles.toast}>
          <span className={styles.message}>{displayMessage}</span>
          {displayAction && (
            <button
              className={styles.actionButton}
              onClick={handleAction}
              type="button"
            >
              {displayAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
