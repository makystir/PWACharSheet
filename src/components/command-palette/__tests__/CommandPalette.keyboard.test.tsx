import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { CommandPalette } from '../CommandPalette';
import { CommandPaletteProvider, useCommandPaletteContext } from '../CommandPaletteContext';

// Mock scrollIntoView since jsdom does not implement it
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

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
  return render(
    <CommandPaletteProvider>
      <TestHarness />
    </CommandPaletteProvider>
  );
}

function openPalette() {
  act(() => {
    screen.getByTestId('open-btn').click();
  });
}

async function typeQuery(query: string) {
  const input = screen.getByTestId('command-palette-input');
  act(() => {
    fireEvent.change(input, { target: { value: query } });
  });
  // Wait for results to appear
  await waitFor(() => {
    expect(screen.getByTestId('command-palette-results')).toBeInTheDocument();
  });
}

function pressKey(key: string) {
  const dialog = screen.getByRole('dialog');
  act(() => {
    fireEvent.keyDown(dialog, { key });
  });
}

describe('CommandPalette keyboard navigation', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ArrowDown/ArrowUp navigation (Requirements 9.1, 9.2)', () => {
    it('ArrowDown moves selectedIndex forward', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      // Initially first result is selected
      const firstOption = document.getElementById('palette-option-0');
      expect(firstOption).toHaveAttribute('aria-selected', 'true');

      // ArrowDown should select the next item
      pressKey('ArrowDown');

      const secondOption = document.getElementById('palette-option-1');
      expect(secondOption).toHaveAttribute('aria-selected', 'true');
      expect(firstOption).toHaveAttribute('aria-selected', 'false');
    });

    it('ArrowUp moves selectedIndex backward', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      // Move down first, then back up
      pressKey('ArrowDown');
      pressKey('ArrowDown');

      const thirdOption = document.getElementById('palette-option-2');
      expect(thirdOption).toHaveAttribute('aria-selected', 'true');

      pressKey('ArrowUp');

      const secondOption = document.getElementById('palette-option-1');
      expect(secondOption).toHaveAttribute('aria-selected', 'true');
      expect(thirdOption).toHaveAttribute('aria-selected', 'false');
    });

    it('ArrowUp does not go below 0', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      // Already at 0, pressing up should stay at 0
      pressKey('ArrowUp');

      const firstOption = document.getElementById('palette-option-0');
      expect(firstOption).toHaveAttribute('aria-selected', 'true');
    });

    it('ArrowDown does not exceed max results', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      // Get total number of results
      const results = screen.getByTestId('command-palette-results');
      const options = results.querySelectorAll('[role="option"]');
      const maxIndex = options.length - 1;

      // Press ArrowDown more times than there are results
      for (let i = 0; i <= maxIndex + 5; i++) {
        pressKey('ArrowDown');
      }

      // The last item should be selected, not anything beyond
      const lastOption = document.getElementById(`palette-option-${maxIndex}`);
      expect(lastOption).toHaveAttribute('aria-selected', 'true');
    });

    it('scrollIntoView is called on selected element', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      const scrollIntoViewMock = vi.fn();
      const firstOption = document.getElementById('palette-option-1');
      if (firstOption) {
        firstOption.scrollIntoView = scrollIntoViewMock;
      }

      pressKey('ArrowDown');

      expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: 'nearest' });
    });
  });

  describe('Enter opens detail view (Requirement 9.3)', () => {
    it('Enter on focused ResultCard opens DetailView', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      // Ensure results are displayed
      expect(screen.getByTestId('command-palette-results')).toBeInTheDocument();

      // Press Enter to open detail view for the first (selected) result
      pressKey('Enter');

      // Detail view should be shown
      await waitFor(() => {
        expect(screen.getByTestId('command-palette-detail')).toBeInTheDocument();
      });

      // Results list should no longer be visible
      expect(screen.queryByTestId('command-palette-results')).not.toBeInTheDocument();
    });

    it('Enter selects the correct item after navigating down', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      // Navigate to second result
      pressKey('ArrowDown');
      pressKey('Enter');

      // Detail view should be shown
      await waitFor(() => {
        expect(screen.getByTestId('command-palette-detail')).toBeInTheDocument();
      });
    });

    it('Enter does nothing when there are no results', async () => {
      renderPalette();
      openPalette();

      // Type a query that returns no results
      const input = screen.getByTestId('command-palette-input');
      act(() => {
        fireEvent.change(input, { target: { value: 'xyznonexistent99999' } });
      });

      // Wait a tick
      await act(async () => {
        vi.advanceTimersByTime(16);
      });

      // Press Enter — nothing should happen
      pressKey('Enter');

      // No detail view
      expect(screen.queryByTestId('command-palette-detail')).not.toBeInTheDocument();
    });
  });

  describe('Escape closes palette from results view (Requirement 9.4)', () => {
    it('Escape in results view closes the palette', async () => {
      renderPalette();
      openPalette();

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      pressKey('Escape');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Escape/Backspace returns to results from detail view (Requirement 9.4)', () => {
    it('Escape in detail view returns to results list', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      // Enter detail view
      pressKey('Enter');
      await waitFor(() => {
        expect(screen.getByTestId('command-palette-detail')).toBeInTheDocument();
      });

      // Press Escape to go back
      pressKey('Escape');

      // Should be back in results view
      await waitFor(() => {
        expect(screen.getByTestId('command-palette-results')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('command-palette-detail')).not.toBeInTheDocument();

      // Palette should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('Backspace in detail view returns to results list', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      // Enter detail view
      pressKey('Enter');
      await waitFor(() => {
        expect(screen.getByTestId('command-palette-detail')).toBeInTheDocument();
      });

      // Press Backspace to go back
      pressKey('Backspace');

      // Should be back in results view
      await waitFor(() => {
        expect(screen.getByTestId('command-palette-results')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('command-palette-detail')).not.toBeInTheDocument();
    });

    it('search query is preserved when returning from detail view', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      // Enter detail view
      pressKey('Enter');
      await waitFor(() => {
        expect(screen.getByTestId('command-palette-detail')).toBeInTheDocument();
      });

      // Go back
      pressKey('Escape');

      // Query should still be "fire"
      const input = screen.getByTestId('command-palette-input') as HTMLInputElement;
      expect(input.value).toBe('fire');

      // Results should still be showing
      await waitFor(() => {
        expect(screen.getByTestId('command-palette-results')).toBeInTheDocument();
      });
    });
  });

  describe('aria-activedescendant updates (Requirement 11.5)', () => {
    it('search input aria-activedescendant updates with selected index', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      const input = screen.getByTestId('command-palette-input');
      expect(input).toHaveAttribute('aria-activedescendant', 'palette-option-0');

      pressKey('ArrowDown');
      expect(input).toHaveAttribute('aria-activedescendant', 'palette-option-1');

      pressKey('ArrowDown');
      expect(input).toHaveAttribute('aria-activedescendant', 'palette-option-2');

      pressKey('ArrowUp');
      expect(input).toHaveAttribute('aria-activedescendant', 'palette-option-1');
    });
  });
});
