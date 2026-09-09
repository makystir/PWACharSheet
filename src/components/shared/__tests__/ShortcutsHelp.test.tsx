import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ShortcutsHelp } from '../ShortcutsHelp';
import { Navigation } from '../../layout/Navigation';
import { CommandPalette } from '../../command-palette/CommandPalette';
import {
  CommandPaletteProvider,
  useCommandPaletteContext,
} from '../../command-palette/CommandPaletteContext';
import { SHORTCUT_GROUPS } from '../../../config/shortcuts';
import { NAV_ITEMS } from '../../layout/Navigation';

/**
 * Feature: ux-audit-improvements, Task 19.2 — Keyboard-shortcut discoverability tests.
 *
 * Test 1 (Req 14.1 / 14.3): the ShortcutsHelp overlay lists the shortcuts that
 *   are actually handled — the page-switch keys derived from NAV_ITEMS plus the
 *   Ctrl/⌘+K search and Ctrl/⌘+Z undo entries — reflecting the single source of
 *   truth in `config/shortcuts.ts`.
 * Test 2 (Req 14.2): the list is reachable via a visible affordance (a
 *   Navigation "Keyboard shortcuts" button and a "Keyboard Shortcuts" entry in
 *   the command palette) rather than a hidden key combination.
 */

function renderWithProviders(ui: React.ReactElement) {
  return render(<CommandPaletteProvider>{ui}</CommandPaletteProvider>);
}

describe('ShortcutsHelp overlay (Req 14.1, 14.3)', () => {
  it('lists every page-switch shortcut derived from NAV_ITEMS', () => {
    const onClose = vi.fn();
    render(<ShortcutsHelp onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: /keyboard shortcuts/i });

    // Every NAV_ITEMS entry contributes a "Go to <label>" row with its number key.
    for (const item of NAV_ITEMS) {
      expect(within(dialog).getByText(`Go to ${item.label}`)).toBeInTheDocument();
      // The number-key <kbd> for that shortcut is rendered.
      const keys = within(dialog).getAllByText(item.shortcut, { selector: 'kbd' });
      expect(keys.length).toBeGreaterThan(0);
    }
  });

  it('lists the global undo (Ctrl/⌘+Z) and search (Ctrl/⌘+K) shortcuts', () => {
    const onClose = vi.fn();
    render(<ShortcutsHelp onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: /keyboard shortcuts/i });

    expect(within(dialog).getByText('Undo the last change')).toBeInTheDocument();
    expect(within(dialog).getByText('Open search / command palette')).toBeInTheDocument();
    expect(within(dialog).getByText('Ctrl / ⌘ + Z', { selector: 'kbd' })).toBeInTheDocument();
    expect(within(dialog).getByText('Ctrl / ⌘ + K', { selector: 'kbd' })).toBeInTheDocument();
  });

  it('renders exactly the shortcuts defined by the single source of truth (SHORTCUT_GROUPS)', () => {
    const onClose = vi.fn();
    render(<ShortcutsHelp onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: /keyboard shortcuts/i });

    // Every group title and every shortcut description/keys in SHORTCUT_GROUPS
    // must be present — and nothing is invented outside that source of truth.
    for (const group of SHORTCUT_GROUPS) {
      expect(within(dialog).getByText(group.title)).toBeInTheDocument();
      for (const shortcut of group.shortcuts) {
        expect(within(dialog).getByText(shortcut.description)).toBeInTheDocument();
      }
    }

    // Sanity: the number of rendered description cells equals the total number
    // of shortcuts in the source of truth (no extras, no omissions).
    const expectedCount = SHORTCUT_GROUPS.reduce(
      (sum, g) => sum + g.shortcuts.length,
      0,
    );
    const renderedDescriptions = within(dialog)
      .getAllByRole('definition');
    expect(renderedDescriptions).toHaveLength(expectedCount);
  });

  it('invokes onClose when the close button is activated', () => {
    const onClose = vi.fn();
    render(<ShortcutsHelp onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Shortcut list discoverability (Req 14.2)', () => {
  it('Navigation exposes a visible "Keyboard shortcuts" button that opens the overlay', () => {
    // Probe the context so we can assert openShortcuts flips shortcutsOpen.
    let ctx: ReturnType<typeof useCommandPaletteContext> | undefined;
    function Probe() {
      ctx = useCommandPaletteContext();
      return null;
    }

    renderWithProviders(
      <>
        <Navigation activePage="character" onPageChange={vi.fn()} />
        <Probe />
      </>,
    );

    expect(ctx?.shortcutsOpen).toBe(false);

    // A visible affordance (not a hidden key combo) reaches the shortcut list.
    const buttons = screen.getAllByRole('button', { name: /keyboard shortcuts/i });
    expect(buttons.length).toBeGreaterThan(0);

    fireEvent.click(buttons[0]);
    expect(ctx?.shortcutsOpen).toBe(true);
  });

  it('the command palette exposes a "Keyboard Shortcuts" affordance that opens the overlay', () => {
    let ctx: ReturnType<typeof useCommandPaletteContext> | undefined;
    function Probe() {
      ctx = useCommandPaletteContext();
      // Open the palette so its footer affordance is rendered.
      return (
        <button type="button" onClick={ctx.open}>
          open-palette
        </button>
      );
    }

    renderWithProviders(
      <>
        <Probe />
        <CommandPalette />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'open-palette' }));

    const shortcutsEntry = screen.getByRole('button', { name: 'Keyboard Shortcuts' });
    expect(shortcutsEntry).toBeInTheDocument();

    fireEvent.click(shortcutsEntry);
    expect(ctx?.shortcutsOpen).toBe(true);
  });

  it('reaching the shortcut list requires no hidden key combination (visible affordance renders the overlay content)', () => {
    // Wire the affordance to the actual overlay to prove the path end-to-end.
    function Harness() {
      const { shortcutsOpen, openShortcuts, closeShortcuts } = useCommandPaletteContext();
      return (
        <>
          <Navigation activePage="character" onPageChange={vi.fn()} />
          {shortcutsOpen && <ShortcutsHelp onClose={closeShortcuts} />}
          {/* extra explicit trigger not needed; Navigation button drives it */}
          <span data-testid="state">{String(shortcutsOpen)}</span>
          <button type="button" onClick={openShortcuts}>
            noop
          </button>
        </>
      );
    }

    renderWithProviders(<Harness />);

    // Overlay not present until the user activates the visible affordance.
    expect(screen.queryByRole('dialog', { name: /keyboard shortcuts/i })).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: /keyboard shortcuts/i })[0]);

    const dialog = screen.getByRole('dialog', { name: /keyboard shortcuts/i });
    // The opened overlay shows the actually-handled shortcuts.
    expect(within(dialog).getByText('Undo the last change')).toBeInTheDocument();
    expect(within(dialog).getByText(`Go to ${NAV_ITEMS[0].label}`)).toBeInTheDocument();
  });
});
