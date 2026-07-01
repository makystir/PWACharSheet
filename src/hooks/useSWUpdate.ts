import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import type { SWUpdateState } from '../sw/types';
import { registerServiceWorker } from '../sw-register';

/**
 * Values exposed by the SWUpdate context to consuming components.
 */
export interface SWUpdateContextValue {
  updateAvailable: boolean;
  applying: boolean;
  error: string | null;
  applyUpdate: () => void;
  dismiss: () => void;
}

const defaultValue: SWUpdateContextValue = {
  updateAvailable: false,
  applying: false,
  error: null,
  applyUpdate: () => {},
  dismiss: () => {},
};

const SWUpdateContext = createContext<SWUpdateContextValue>(defaultValue);

/**
 * Provider that registers the service worker (production only) and surfaces
 * update state to the component tree via context.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.5
 */
export function SWUpdateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SWUpdateState>({
    updateAvailable: false,
    applying: false,
    error: null,
  });

  // Keep stable references to the registration API methods
  const apiRef = useRef<{
    applyUpdate: () => Promise<void>;
    dismiss: () => void;
  } | null>(null);

  useEffect(() => {
    // Only register service worker in production
    if (!import.meta.env.PROD) return;

    const api = registerServiceWorker(import.meta.env.BASE_URL);
    apiRef.current = api;

    const unsubscribe = api.subscribe((newState: SWUpdateState) => {
      setState(newState);
    });

    return () => {
      unsubscribe();
      apiRef.current = null;
    };
  }, []);

  const applyUpdate = useCallback(() => {
    apiRef.current?.applyUpdate();
  }, []);

  const dismiss = useCallback(() => {
    apiRef.current?.dismiss();
  }, []);

  const value: SWUpdateContextValue = {
    updateAvailable: state.updateAvailable,
    applying: state.applying,
    error: state.error,
    applyUpdate,
    dismiss,
  };

  return createElement(SWUpdateContext.Provider, { value }, children);
}

/**
 * Hook that reads the current service worker update state from context.
 * Must be used within a <SWUpdateProvider>.
 */
export function useSWUpdate(): SWUpdateContextValue {
  return useContext(SWUpdateContext);
}
