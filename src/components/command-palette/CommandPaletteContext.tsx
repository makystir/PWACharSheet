import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface CommandPaletteContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Whether the keyboard-shortcuts help overlay is open. */
  shortcutsOpen: boolean;
  /** Open the keyboard-shortcuts help overlay (also closes the palette). */
  openShortcuts: () => void;
  /** Close the keyboard-shortcuts help overlay. */
  closeShortcuts: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Opening the shortcuts overlay closes the palette so they never overlap.
  const openShortcuts = useCallback(() => {
    setIsOpen(false);
    setShortcutsOpen(true);
  }, []);
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), []);

  return (
    <CommandPaletteContext.Provider
      value={{ isOpen, open, close, toggle, shortcutsOpen, openShortcuts, closeShortcuts }}
    >
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPaletteContext(): CommandPaletteContextValue {
  const context = useContext(CommandPaletteContext);
  if (context === null) {
    throw new Error('useCommandPaletteContext must be used within a CommandPaletteProvider');
  }
  return context;
}
