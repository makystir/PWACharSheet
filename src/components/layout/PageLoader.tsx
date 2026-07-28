import { Component, Suspense } from 'react';
import type { ReactNode } from 'react';
import styles from './PageLoader.module.css';

/**
 * Accessible loading indicator displayed while lazy-loaded pages are fetched.
 */
export function LoadingIndicator() {
  return (
    <div role="status" aria-label="Loading page content" className={styles.loadingContainer}>
      <span className={styles.spinner} />
      <span>Loading…</span>
    </div>
  );
}

/**
 * Determines whether an error is a chunk-load failure.
 * Webpack uses "ChunkLoadError", Vite/Rollup uses "TypeError" with dynamic import messages.
 */
function isChunkLoadError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Loading CSS chunk')
  );
}

interface LazyErrorBoundaryProps {
  children: ReactNode;
}

interface LazyErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Specialized error boundary that catches chunk-load failures and renders
 * a retry button. On retry, triggers a full page reload to re-attempt
 * fetching the failed chunk.
 */
export class LazyErrorBoundary extends Component<LazyErrorBoundaryProps, LazyErrorBoundaryState> {
  constructor(props: LazyErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): LazyErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => {
    if (this.state.error && isChunkLoadError(this.state.error)) {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error && isChunkLoadError(this.state.error);
      return (
        <div className={styles.errorContainer} role="alert">
          <h2 className={styles.errorHeading}>Page could not be loaded</h2>
          <p className={styles.errorMessage}>
            {isChunkError
              ? 'A network error prevented this page from loading. Please check your connection and try again.'
              : (this.state.error?.message || 'An unexpected error occurred.')}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface PageLoaderProps {
  children: ReactNode;
  skeleton?: ReactNode;  // page-specific skeleton fallback
}

/**
 * Wrapper component combining React.Suspense with LazyErrorBoundary.
 * Use this to wrap lazily-loaded page components.
 * When a skeleton prop is provided, it is used as the Suspense fallback
 * instead of the generic LoadingIndicator.
 */
export function PageLoader({ children, skeleton }: PageLoaderProps) {
  return (
    <Suspense fallback={skeleton ?? <LoadingIndicator />}>
      <LazyErrorBoundary>
        {children}
      </LazyErrorBoundary>
    </Suspense>
  );
}
