import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CommandPalette } from '../CommandPalette';
import { CommandPaletteProvider, useCommandPaletteContext } from '../CommandPaletteContext';
import { useCommandPalette } from '../useCommandPalette';

// Mock scrollIntoView since jsdom does not implement it
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

/**
 * Test harness that wires up CommandPaletteProvider + useCommandPalette hook + CommandPalette,
 * simulating the real app wiring where the hook listens for global keydown events.
 */
function TestHarness() {
  useCommandPalette();
  const { isOpen } = useCommandPaletteContext();
  return (
    <>
      <span data-testid="is-open">{String(isOpen)}</span>
      <CommandPalette />
    </>
  );
}

function renderWithShortcutHook() {
  return render(
    <CommandPaletteProvider>
      <TestHarness />
    </CommandPaletteProvider>
  );
}

describe('CommandPalette keyboard shortcut and dismissal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Ctrl+K / Cmd+K opens and closes palette (Requirements 1.1, 1.2)', () => {
    it('Ctrl+K opens the palette when closed', () => {
      renderWithShortcutHook();

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      act(() => {
        fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('Ctrl+K closes the palette when open (toggle)', () => {
      renderWithShortcutHook();

      // Open
      act(() => {
        fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
      });
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Close (toggle)
      act(() => {
        fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('Cmd+K (metaKey) opens the palette when closed', () => {
      renderWithShortcutHook();

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      act(() => {
        fireEvent.keyDown(document, { key: 'k', metaKey: true });
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('Cmd+K (metaKey) closes the palette when open (toggle)', () => {
      renderWithShortcutHook();

      // Open
      act(() => {
        fireEvent.keyDown(document, { key: 'k', metaKey: true });
      });
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Close
      act(() => {
        fireEvent.keyDown(document, { key: 'k', metaKey: true });
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('Ctrl+K prevents default browser behavior', () => {
      renderWithShortcutHook();

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      act(() => {
        document.dispatchEvent(event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Ctrl+K works from input/textarea elements (Requirement 1.3)', () => {
    function TestHarnessWithInput() {
      useCommandPalette();
      const { isOpen } = useCommandPaletteContext();
      return (
        <>
          <input data-testid="text-input" type="text" />
          <textarea data-testid="text-area" />
          <select data-testid="select-el">
            <option>Option</option>
          </select>
          <span data-testid="is-open">{String(isOpen)}</span>
          <CommandPalette />
        </>
      );
    }

    function renderWithInputElements() {
      return render(
        <CommandPaletteProvider>
          <TestHarnessWithInput />
        </CommandPaletteProvider>
      );
    }

    it('Ctrl+K opens palette while input element has focus', () => {
      renderWithInputElements();

      const input = screen.getByTestId('text-input');
      input.focus();
      expect(document.activeElement).toBe(input);

      act(() => {
        fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('Ctrl+K opens palette while textarea has focus', () => {
      renderWithInputElements();

      const textarea = screen.getByTestId('text-area');
      textarea.focus();
      expect(document.activeElement).toBe(textarea);

      act(() => {
        fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('Ctrl+K opens palette while select element has focus', () => {
      renderWithInputElements();

      const select = screen.getByTestId('select-el');
      select.focus();
      expect(document.activeElement).toBe(select);

      act(() => {
        fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Escape closes palette and restores focus (Requirement 3.1)', () => {
    function TestHarnessWithFocusable() {
      useCommandPalette();
      const { isOpen } = useCommandPaletteContext();
      return (
        <>
          <button data-testid="some-button">Focus me</button>
          <span data-testid="is-open">{String(isOpen)}</span>
          <CommandPalette />
        </>
      );
    }

    function renderWithFocusable() {
      return render(
        <CommandPaletteProvider>
          <TestHarnessWithFocusable />
        </CommandPaletteProvider>
      );
    }

    it('Escape key closes the palette from results view', () => {
      renderWithFocusable();

      // Open with Ctrl+K
      act(() => {
        fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
      });
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Press Escape
      act(() => {
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('Escape restores focus to previously focused element', async () => {
      renderWithFocusable();

      const button = screen.getByTestId('some-button');
      button.focus();
      expect(document.activeElement).toBe(button);

      // Open palette with Ctrl+K
      act(() => {
        fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
      });

      // Wait for auto-focus to move to input
      await act(async () => {
        vi.advanceTimersByTime(16);
      });
      expect(document.activeElement).toBe(screen.getByTestId('command-palette-input'));

      // Close with Escape
      act(() => {
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      });

      // Wait for focus restore (requestAnimationFrame)
      await act(async () => {
        vi.advanceTimersByTime(16);
      });

      expect(document.activeElement).toBe(button);
    });
  });

  describe('Backdrop click closes palette (Requirement 3.2)', () => {
    it('clicking the backdrop (outside modal) closes the palette', () => {
      renderWithShortcutHook();

      // Open with Ctrl+K
      act(() => {
        fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
      });
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Click backdrop
      act(() => {
        fireEvent.click(screen.getByTestId('command-palette-backdrop'));
      });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('clicking inside the modal does not close the palette', () => {
      renderWithShortcutHook();

      // Open
      act(() => {
        fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
      });
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Click inside the modal (on the dialog itself)
      act(() => {
        fireEvent.click(screen.getByRole('dialog'));
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Focus auto-moves to input on open (Requirement 4.1)', () => {
    it('search input receives focus automatically when palette opens via Ctrl+K', async () => {
      renderWithShortcutHook();

      act(() => {
        fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
      });

      // Wait for requestAnimationFrame focus
      await act(async () => {
        vi.advanceTimersByTime(16);
      });

      const input = screen.getByTestId('command-palette-input');
      expect(document.activeElement).toBe(input);
    });

    it('search input receives focus when palette opens via Cmd+K', async () => {
      renderWithShortcutHook();

      act(() => {
        fireEvent.keyDown(document, { key: 'k', metaKey: true });
      });

      // Wait for requestAnimationFrame focus
      await act(async () => {
        vi.advanceTimersByTime(16);
      });

      const input = screen.getByTestId('command-palette-input');
      expect(document.activeElement).toBe(input);
    });
  });
});
