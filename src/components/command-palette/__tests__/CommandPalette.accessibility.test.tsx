import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { CommandPalette } from '../CommandPalette';
import { CommandPaletteProvider, useCommandPaletteContext } from '../CommandPaletteContext';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function TestHarness() {
  const { open } = useCommandPaletteContext();
  return (
    <>
      <button data-testid="open-btn" onClick={open}>Open</button>
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
  await waitFor(() => {
    expect(screen.getByTestId('command-palette-results')).toBeInTheDocument();
  });
}

describe('CommandPalette accessibility (Requirements 11.1–11.5)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Dialog role and ARIA (Requirement 11.1)', () => {
    it('modal has role="dialog"', () => {
      renderPalette();
      openPalette();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('modal has aria-modal="true"', () => {
      renderPalette();
      openPalette();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('modal has aria-label="Search game reference"', () => {
      renderPalette();
      openPalette();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Search game reference');
    });
  });

  describe('Listbox role (Requirement 11.3)', () => {
    it('results container has role="listbox"', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('listbox has id="palette-results"', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('id', 'palette-results');
    });
  });

  describe('Option role (Requirement 11.3)', () => {
    it('each result card has role="option"', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
    });

    it('option elements are inside the listbox', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      const listbox = screen.getByRole('listbox');
      const options = screen.getAllByRole('option');
      for (const option of options) {
        expect(listbox.contains(option)).toBe(true);
      }
    });
  });

  describe('aria-selected on highlighted card (Requirement 11.4)', () => {
    it('first result has aria-selected="true" by default', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('non-highlighted results have aria-selected="false"', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      const options = screen.getAllByRole('option');
      for (let i = 1; i < options.length; i++) {
        expect(options[i]).toHaveAttribute('aria-selected', 'false');
      }
    });

    it('aria-selected updates when navigating with ArrowDown', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      const dialog = screen.getByRole('dialog');

      act(() => {
        fireEvent.keyDown(dialog, { key: 'ArrowDown' });
      });

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'false');
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('aria-controls on search input (Requirement 11.5)', () => {
    it('search input has aria-controls="palette-results"', () => {
      renderPalette();
      openPalette();

      const input = screen.getByTestId('command-palette-input');
      expect(input).toHaveAttribute('aria-controls', 'palette-results');
    });
  });

  describe('aria-activedescendant on search input (Requirement 11.5)', () => {
    it('search input has aria-activedescendant pointing to highlighted option', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      const input = screen.getByTestId('command-palette-input');
      expect(input).toHaveAttribute('aria-activedescendant', 'palette-option-0');
    });

    it('aria-activedescendant updates on ArrowDown', async () => {
      renderPalette();
      openPalette();
      await typeQuery('fire');

      const dialog = screen.getByRole('dialog');
      const input = screen.getByTestId('command-palette-input');

      act(() => {
        fireEvent.keyDown(dialog, { key: 'ArrowDown' });
      });

      expect(input).toHaveAttribute('aria-activedescendant', 'palette-option-1');
    });

    it('aria-activedescendant is absent when no results', () => {
      renderPalette();
      openPalette();

      const input = screen.getByTestId('command-palette-input');
      // When no query is typed, there are no results, so no activedescendant
      expect(input).not.toHaveAttribute('aria-activedescendant');
    });
  });

  describe('Focus trapping within modal (Requirement 11.2)', () => {
    it('Tab from last focusable element wraps to first', async () => {
      renderPalette();
      openPalette();

      await act(async () => {
        vi.advanceTimersByTime(16);
      });

      const dialog = screen.getByRole('dialog');
      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      expect(focusableElements.length).toBeGreaterThan(1);

      const lastEl = focusableElements[focusableElements.length - 1];
      lastEl.focus();
      expect(document.activeElement).toBe(lastEl);

      act(() => {
        fireEvent.keyDown(dialog, { key: 'Tab' });
      });

      expect(document.activeElement).toBe(focusableElements[0]);
    });

    it('Shift+Tab from first focusable element wraps to last', async () => {
      renderPalette();
      openPalette();

      await act(async () => {
        vi.advanceTimersByTime(16);
      });

      const dialog = screen.getByRole('dialog');
      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      expect(focusableElements.length).toBeGreaterThan(1);

      const firstEl = focusableElements[0];
      firstEl.focus();
      expect(document.activeElement).toBe(firstEl);

      act(() => {
        fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
      });

      expect(document.activeElement).toBe(focusableElements[focusableElements.length - 1]);
    });
  });
});
