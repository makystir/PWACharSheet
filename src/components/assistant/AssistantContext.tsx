import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { AssistantContext } from './assistantContextValue';

// The context object, the `useAssistantContext` hook, and the value type live
// in the non-component sibling module (assistantContextValue.ts) so THIS file
// exports only the `AssistantProvider` component, keeping Vite Fast Refresh
// enabled (no mixed component/non-component exports — no react-refresh warning).
// Import the hook/type from `./assistantContextValue`. A type-only re-export is
// safe here (it does not trigger react-refresh/only-export-components).
export type { AssistantContextValue } from './assistantContextValue';

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <AssistantContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </AssistantContext.Provider>
  );
}
