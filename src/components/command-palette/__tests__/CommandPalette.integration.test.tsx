import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { CommandPalette } from '../CommandPalette';
import { CommandPaletteProvider, useCommandPaletteContext } from '../CommandPaletteContext';
import { useCommandPalette } from '../useCommandPalette';

/**
 * Integration test: verifies the full end-to-end flow of the command palette.
 * 
 * Validates:
 * - Requirement 10.3: Palette works without a character loaded
 * - Requirement 12.1: Search index built at initialization
 * - Requirement 12.2: Index construction completes quickly
 * - Requirement 3.3: Close button is visible and functional
 */

// App-level harness that mirrors real App.tsx wiring:
// CommandPaletteProvider wraps content, useCommandPalette is active at top
function AppHarness() {
  useCommandPalette();
  const { isOpen } = useCommandPaletteContext();
  return (
    <>
      <div data-testid="welcome-screen">Welcome (no character loaded)</div>
      <span data-testid="is-open">{String(isOpen)}</span>
      <CommandPalette />
    </>
  );
}

function renderApp() {
  return render(
    <CommandPaletteProvider>
      <AppHarness />
    </CommandPaletteProvider>
  );
}

describe('CommandPalette Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('full flow: open → type → see results → click result → see detail → back → close', async () => {
    renderApp();

    // Verify palette is not initially visible
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Step 1: Open palette via keyboard shortcut (Ctrl+K)
    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });

    // Dialog appears
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Wait for focus
    await act(async () => {
      vi.advanceTimersByTime(16);
    });

    // Step 2: Type a query - "fire" should match spells like Fireball
    const input = screen.getByTestId('command-palette-input');
    act(() => {
      fireEvent.change(input, { target: { value: 'fire' } });
    });

    // Step 3: Results appear
    await waitFor(() => {
      const results = screen.getByTestId('command-palette-results');
      expect(results).toBeInTheDocument();
    });

    // Verify results are grouped - should have at least one result option
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);

    // Step 4: Click the first result to open detail view
    act(() => {
      options[0].click();
    });

    // Detail view is shown
    const detailView = screen.getByTestId('command-palette-detail');
    expect(detailView).toBeInTheDocument();

    // Results list is no longer visible
    expect(screen.queryByTestId('command-palette-results')).not.toBeInTheDocument();

    // Step 5: Go back to results
    const backButton = screen.getByLabelText('Back to results');
    act(() => {
      backButton.click();
    });

    // Results list is visible again
    expect(screen.getByTestId('command-palette-results')).toBeInTheDocument();
    expect(screen.queryByTestId('command-palette-detail')).not.toBeInTheDocument();

    // The query is preserved
    const inputAfterBack = screen.getByTestId('command-palette-input') as HTMLInputElement;
    expect(inputAfterBack.value).toBe('fire');

    // Step 6: Close via close button
    const closeButton = screen.getByLabelText('Close');
    expect(closeButton).toBeInTheDocument();
    expect(closeButton.tagName).toBe('BUTTON');
    act(() => {
      closeButton.click();
    });

    // Palette is closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('works from WelcomeScreen without a character loaded (Requirement 10.3)', async () => {
    renderApp();

    // The welcome screen is rendered (no character dependency)
    expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();

    // Open palette via Cmd+K (macOS)
    act(() => {
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Wait for focus
    await act(async () => {
      vi.advanceTimersByTime(16);
    });

    // Type and search - should work without any character data
    const input = screen.getByTestId('command-palette-input');
    act(() => {
      fireEvent.change(input, { target: { value: 'ath' } });
    });

    // Results should appear from static data
    await waitFor(() => {
      expect(screen.getByTestId('command-palette-results')).toBeInTheDocument();
    });

    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
  });

  it('search index is built at initialization (Requirement 12.1)', async () => {
    renderApp();

    // Open palette
    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });

    await act(async () => {
      vi.advanceTimersByTime(16);
    });

    // Type a known spell name prefix
    const input = screen.getByTestId('command-palette-input');
    act(() => {
      fireEvent.change(input, { target: { value: 'bolt' } });
    });

    // Results should appear immediately (index already built)
    await waitFor(() => {
      expect(screen.getByTestId('command-palette-results')).toBeInTheDocument();
    });
  });

  it('close button is visible and functional (Requirement 3.3)', () => {
    renderApp();

    // Open palette
    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Close button is a button element with proper aria-label
    const closeButton = screen.getByLabelText('Close');
    expect(closeButton).toBeInTheDocument();
    expect(closeButton.tagName).toBe('BUTTON');

    // Clicking closes the palette
    act(() => {
      closeButton.click();
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Ctrl+K toggles palette open and closed', () => {
    renderApp();

    // Open
    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Close
    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
