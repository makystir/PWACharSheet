import { useState, useCallback, useEffect, useRef } from 'react';
import {
  loadTabOrder,
  saveTabOrder,
  removeTabOrder,
  reconcileTabOrder,
} from '../logic/tab-order-store';

export interface UseTabOrderOptions {
  pageKey: string;
  defaultTabs: { id: string; label: string }[];
}

export interface UseTabOrderResult {
  /** Tabs in current display order */
  orderedTabs: { id: string; label: string }[];
  /** Whether edit mode is active */
  isEditMode: boolean;
  /** Enter/exit edit mode */
  toggleEditMode: () => void;
  /** Move tab at index one position left */
  moveLeft: (index: number) => void;
  /** Move tab at index one position right */
  moveRight: (index: number) => void;
  /** Reset to default order */
  resetOrder: () => void;
  /** Whether current order matches defaults */
  isDefaultOrder: boolean;
  /** Whether last save failed (for showing transient warning) */
  saveError: boolean;
}

/**
 * Manages tab ordering state with localStorage persistence.
 * Loads stored order on mount, reconciles with defaults, and persists changes.
 */
export function useTabOrder(options: UseTabOrderOptions): UseTabOrderResult {
  const { pageKey, defaultTabs } = options;

  const defaultIds = defaultTabs.map(t => t.id);

  // Build a lookup map from id -> tab object for quick access
  const tabMap = new Map(defaultTabs.map(t => [t.id, t]));

  const [orderIds, setOrderIds] = useState<string[]>(() => {
    const stored = loadTabOrder(pageKey);
    if (stored) {
      const reconciled = reconcileTabOrder(stored, defaultIds);
      // If reconciliation changed anything, persist immediately
      if (JSON.stringify(reconciled) !== JSON.stringify(stored)) {
        saveTabOrder(pageKey, reconciled);
      }
      return reconciled;
    }
    return defaultIds;
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Keep refs for cleanup effect
  const isEditModeRef = useRef(isEditMode);
  const orderIdsRef = useRef(orderIds);
  const pageKeyRef = useRef(pageKey);

  useEffect(() => {
    isEditModeRef.current = isEditMode;
  }, [isEditMode]);

  useEffect(() => {
    orderIdsRef.current = orderIds;
  }, [orderIds]);

  useEffect(() => {
    pageKeyRef.current = pageKey;
  }, [pageKey]);

  // Cleanup: if unmounting while in edit mode, persist current order
  useEffect(() => {
    return () => {
      if (isEditModeRef.current) {
        saveTabOrder(pageKeyRef.current, orderIdsRef.current);
      }
    };
  }, []);

  const persistOrder = useCallback((ids: string[]) => {
    const success = saveTabOrder(pageKeyRef.current, ids);
    if (!success) {
      setSaveError(true);
    } else {
      setSaveError(false);
    }
  }, []);

  const toggleEditMode = useCallback(() => {
    setIsEditMode(prev => {
      if (prev) {
        // Exiting edit mode — persist current order
        persistOrder(orderIdsRef.current);
      }
      return !prev;
    });
  }, [persistOrder]);

  const moveLeft = useCallback((index: number) => {
    if (index <= 0) return;
    setOrderIds(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveRight = useCallback((index: number) => {
    setOrderIds(prev => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const resetOrder = useCallback(() => {
    removeTabOrder(pageKeyRef.current);
    setOrderIds(defaultIds);
    setSaveError(false);
  }, [defaultIds]);

  // Map ordered IDs to full tab objects
  const orderedTabs = orderIds
    .map(id => tabMap.get(id))
    .filter((t): t is { id: string; label: string } => t !== undefined);

  const isDefaultOrder =
    orderIds.length === defaultIds.length &&
    orderIds.every((id, i) => id === defaultIds[i]);

  return {
    orderedTabs,
    isEditMode,
    toggleEditMode,
    moveLeft,
    moveRight,
    resetOrder,
    isDefaultOrder,
    saveError,
  };
}
