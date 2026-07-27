import { useEffect } from 'react';
import { useCommandPaletteContext } from './CommandPaletteContext';

/**
 * Registers a global keyboard shortcut (Ctrl+K on Windows/Linux, Cmd+K on macOS)
 * that toggles the command palette open/closed.
 *
 * This hook should be called once at the app level inside the CommandPaletteProvider.
 * It overrides default browser behavior (e.g., Ctrl+K opening the address bar)
 * and works regardless of which element currently has focus.
 */
export function useCommandPalette(): void {
  const { toggle } = useCommandPaletteContext();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const isCtrlK = event.ctrlKey && event.key === 'k';
      const isCmdK = event.metaKey && event.key === 'k';

      if (isCtrlK || isCmdK) {
        event.preventDefault();
        toggle();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggle]);
}
