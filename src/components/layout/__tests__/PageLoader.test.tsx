import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { LoadingIndicator, LazyErrorBoundary } from '../PageLoader';

/**
 * Unit tests for LoadingIndicator and LazyErrorBoundary components.
 * **Validates: Requirements 5.2, 5.3**
 */

describe('LoadingIndicator', () => {
  it('renders with role="status" attribute', () => {
    render(<LoadingIndicator />);

    const statusElement = screen.getByRole('status');
    expect(statusElement).toBeInTheDocument();
  });

  it('has accessible label "Loading page content"', () => {
    render(<LoadingIndicator />);

    const statusElement = screen.getByRole('status');
    expect(statusElement).toHaveAttribute('aria-label', 'Loading page content');
  });
});

describe('LazyErrorBoundary', () => {
  // Suppress console.error from React error boundary internals during tests
  const originalConsoleError = console.error;
  afterEach(() => {
    console.error = originalConsoleError;
  });

  function ThrowingChild({ error }: { error: Error }) {
    throw error;
  }

  it('renders children when no error is thrown', () => {
    render(
      <LazyErrorBoundary>
        <div>Page content</div>
      </LazyErrorBoundary>
    );

    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('renders error message when a child throws a chunk-load error', () => {
    console.error = vi.fn();

    const chunkError = new Error('Failed to fetch dynamically imported module /src/pages/CombatPage.tsx');

    render(
      <LazyErrorBoundary>
        <ThrowingChild error={chunkError} />
      </LazyErrorBoundary>
    );

    expect(screen.getByText('Page could not be loaded')).toBeInTheDocument();
    expect(
      screen.getByText('A network error prevented this page from loading. Please check your connection and try again.')
    ).toBeInTheDocument();
  });

  it('renders a "Retry" button on error', () => {
    console.error = vi.fn();

    const chunkError = new Error('Failed to fetch dynamically imported module /src/pages/CombatPage.tsx');

    render(
      <LazyErrorBoundary>
        <ThrowingChild error={chunkError} />
      </LazyErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('clicking retry triggers window.location.reload for chunk errors', async () => {
    console.error = vi.fn();
    const user = userEvent.setup();

    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    const chunkError = new Error('Failed to fetch dynamically imported module /src/pages/CombatPage.tsx');

    render(
      <LazyErrorBoundary>
        <ThrowingChild error={chunkError} />
      </LazyErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
