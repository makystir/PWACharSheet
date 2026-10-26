import { createContext, useContext } from 'react';

/**
 * Open/close state for the Character Assistant panel. Mirrors
 * `CommandPaletteContextValue` (isOpen/open/close/toggle) so the assistant uses
 * the exact same provider+hook+portal paradigm as the command palette
 * (character-assistant design §"The provider, hook, and app-shell wiring").
 */
export interface AssistantContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * The React context backing the assistant. Kept in a non-component module (with
 * the hook) so `AssistantContext.tsx` can export ONLY the `AssistantProvider`
 * component and Vite Fast Refresh stays enabled for it (no mixed
 * component/non-component exports).
 */
export const AssistantContext = createContext<AssistantContextValue | null>(null);

export function useAssistantContext(): AssistantContextValue {
  const context = useContext(AssistantContext);
  if (context === null) {
    throw new Error('useAssistantContext must be used within an AssistantProvider');
  }
  return context;
}
