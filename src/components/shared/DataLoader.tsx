import type { ReactNode } from 'react';
import { LoadingIndicator } from '../layout/PageLoader';
import styles from '../layout/PageLoader.module.css';

interface DataLoaderProps {
  /** Whether data is currently loading */
  loading: boolean;
  /** Error from a failed dynamic import, or null */
  error: Error | null;
  /** Retry callback to re-attempt the import */
  retry: () => void;
  /** Content to render once data is loaded */
  children: ReactNode;
}

/**
 * Renders a loading indicator while data modules are being fetched,
 * an error message with retry on failure, or the children once loaded.
 */
export function DataLoader({ loading, error, retry, children }: DataLoaderProps) {
  if (loading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return (
      <div className={styles.errorContainer} role="alert">
        <h2 className={styles.errorHeading}>Data could not be loaded</h2>
        <p className={styles.errorMessage}>
          A network error prevented the data from loading. Please check your connection and try again.
        </p>
        <button
          type="button"
          onClick={retry}
          className={styles.retryButton}
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
