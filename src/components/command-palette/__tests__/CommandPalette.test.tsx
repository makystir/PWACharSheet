import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { CommandPalette } from '../CommandPalette';
import { CommandPaletteProvider, useCommandPaletteContext } from '../CommandPaletteContext';

// Helper: renders CommandPalette in an open state
function OpenPaletteWrapper({ children }: { children?: React.ReactNode }) {
  return <CommandPaletteProvider>{children}</CommandPaletteProvider>;
}

function TestHarness() {
  const { open, isOpen } = useCommandPaletteContext();
  return (
    <>
      <button data-testid="open-btn" onClick={open}>Open</button>
      <span data-testid="is-open">{String(isOpen)}</span>
      <CommandPalette />
    </>
  );
}

function renderPalette() {
  const result = render(
    <OpenPaletteWrapper>
      <TestHarness />
    </OpenPaletteWrapper>
  );
  return result;
}

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render when closed', () => {
    renderPalette();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a dialog with correct ARIA attributes when open', async () => {
    renderPalette();
    act(() => {
      screen.getByTestId('open-btn').click();
    });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Search game reference');
  });

  it('renders via portal to document.body', () => {
    renderPalette();
    act(() => {
      screen.getByTestId('open-btn').click();
    });

    const dialog = screen.getByRole('dialog');
    // The dialog should be a child of document.body (via portal)
    expect(dialog.closest('body')).toBe(document.body);
  });

  it('auto-focuses the search input on open', async () => {
    renderPalette();
    act(() => {
      screen.getByTestId('open-btn').click();
    });

    // Wait for requestAnimationFrame
    await act(async () => {
      vi.advanceTimersByTime(16);
    });

    const input = screen.getByTestId('command-palette-input');
    expect(document.activeElement).toBe(input);
  });

  it('closes when backdrop is clicked', () => {
    renderPalette();
    act(() => {
      screen.getByTestId('open-btn').click();
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    act(() => {
      screen.getByTestId('command-palette-backdrop').click();
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when close button (X) is clicked', () => {
    renderPalette();
    act(() => {
      screen.getByTestId('open-btn').click();
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    act(() => {
      screen.getByLabelText('Close').click();
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape key in results view', () => {
    renderPalette();
    act(() => {
      screen.getByTestId('open-btn').click();
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clears search input on close', async () => {
    renderPalette();
    act(() => {
      screen.getByTestId('open-btn').click();
    });

    const input = screen.getByTestId('command-palette-input') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'fireball' } });
    });

    expect(input.value).toBe('fireball');

    // Close
    act(() => {
      screen.getByLabelText('Close').click();
    });

    // Re-open
    act(() => {
      screen.getByTestId('open-btn').click();
    });

    const newInput = screen.getByTestId('command-palette-input') as HTMLInputElement;
    expect(newInput.value).toBe('');
  });

  it('displays empty state text when query is empty', () => {
    renderPalette();
    act(() => {
      screen.getByTestId('open-btn').click();
    });

    expect(screen.getByText('Type to search game reference data')).toBeInTheDocument();
  });

  it('shows results when typing a query', async () => {
    renderPalette();
    act(() => {
      screen.getByTestId('open-btn').click();
    });

    const input = screen.getByTestId('command-palette-input');
    act(() => {
      fireEvent.change(input, { target: { value: 'fire' } });
    });

    // Should show some results (from the real search index)
    await waitFor(() => {
      const results = screen.queryByTestId('command-palette-results');
      expect(results).toBeInTheDocument();
    });
  });

  it('has a visible close button (Requirement 3.3)', () => {
    renderPalette();
    act(() => {
      screen.getByTestId('open-btn').click();
    });

    const closeBtn = screen.getByLabelText('Close');
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn.tagName).toBe('BUTTON');
  });

  it('traps focus within the modal (Tab key)', async () => {
    renderPalette();
    act(() => {
      screen.getByTestId('open-btn').click();
    });

    await act(async () => {
      vi.advanceTimersByTime(16);
    });

    const dialog = screen.getByRole('dialog');
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    expect(focusableElements.length).toBeGreaterThan(0);

    // Focus is on input (first focusable), Tab from last should go to first
    const lastEl = focusableElements[focusableElements.length - 1];
    lastEl.focus();

    act(() => {
      fireEvent.keyDown(dialog, { key: 'Tab' });
    });

    // Focus should wrap to first element
    expect(document.activeElement).toBe(focusableElements[0]);
  });

  it('restores focus to previously focused element on close', async () => {
    renderPalette();

    const openBtn = screen.getByTestId('open-btn');
    openBtn.focus();
    expect(document.activeElement).toBe(openBtn);

    act(() => {
      openBtn.click();
    });

    await act(async () => {
      vi.advanceTimersByTime(16);
    });

    // Focus should be on the input now
    expect(document.activeElement).toBe(screen.getByTestId('command-palette-input'));

    // Close
    act(() => {
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    });

    // Wait for requestAnimationFrame to restore focus
    await act(async () => {
      vi.advanceTimersByTime(16);
    });

    expect(document.activeElement).toBe(openBtn);
  });
});
