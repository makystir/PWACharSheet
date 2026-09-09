import { NAV_ITEMS } from '../components/layout/Navigation';

/**
 * Single source of truth for the app's keyboard shortcuts.
 *
 * Each entry mirrors an ACTUAL handler wired elsewhere in the app:
 * - Page-switch number keys (1–7) come from `NAV_ITEMS` in
 *   `components/layout/Navigation.tsx` — the same array the keydown listener
 *   there matches `event.key` against. Deriving them here guarantees the
 *   ShortcutsHelp overlay stays in sync with the real bindings.
 * - Undo (Ctrl/Cmd+Z) is handled by the global keydown listener in `App.tsx`.
 * - Search / command palette (Ctrl/Cmd+K) is handled by `useCommandPalette`.
 *
 * If a handler's binding changes, update it here (or in `NAV_ITEMS`) so the
 * help overlay reflects reality.
 */

export interface KeyboardShortcut {
  /** Human-readable key combination, e.g. "1", "Ctrl / ⌘ + Z". */
  keys: string;
  /** What the shortcut does. */
  description: string;
}

export interface ShortcutGroup {
  /** Section heading in the help overlay. */
  title: string;
  shortcuts: KeyboardShortcut[];
}

/** Page-switch shortcuts, derived from the navigation items themselves. */
const PAGE_SHORTCUTS: KeyboardShortcut[] = NAV_ITEMS.map((item) => ({
  keys: item.shortcut,
  description: `Go to ${item.label}`,
}));

/** Global action shortcuts handled outside the navigation. */
const GLOBAL_SHORTCUTS: KeyboardShortcut[] = [
  // Ctrl/Cmd+K → toggles the command palette (see useCommandPalette.ts).
  { keys: 'Ctrl / ⌘ + K', description: 'Open search / command palette' },
  // Ctrl/Cmd+Z (without Shift) → undo the last field change (see App.tsx).
  { keys: 'Ctrl / ⌘ + Z', description: 'Undo the last change' },
];

/** Grouped shortcut definitions consumed by the ShortcutsHelp overlay. */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  { title: 'Navigation', shortcuts: PAGE_SHORTCUTS },
  { title: 'Actions', shortcuts: GLOBAL_SHORTCUTS },
];
