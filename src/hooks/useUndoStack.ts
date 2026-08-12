import { useState, useCallback, useRef } from 'react';

export interface UndoEntry {
  field: string;           // dot-notation path (e.g., "chars.WS.a")
  previousValue: unknown;
  newValue: unknown;
  timestamp: number;
}

export interface UseUndoStackResult {
  push: (entry: Omit<UndoEntry, 'timestamp'>) => void;
  undo: () => UndoEntry | null;
  canUndo: boolean;
  clear: () => void;
}

const DEFAULT_MAX_SIZE = 10;

export function useUndoStack(maxSize: number = DEFAULT_MAX_SIZE): UseUndoStackResult {
  const [stack, setStack] = useState<UndoEntry[]>([]);
  const stackRef = useRef<UndoEntry[]>(stack);
  stackRef.current = stack;

  const push = useCallback((entry: Omit<UndoEntry, 'timestamp'>) => {
    const fullEntry: UndoEntry = {
      ...entry,
      timestamp: Date.now(),
    };
    setStack((prev) => {
      const next = [fullEntry, ...prev];
      // Evict oldest entries when exceeding maxSize
      if (next.length > maxSize) {
        return next.slice(0, maxSize);
      }
      return next;
    });
  }, [maxSize]);

  const undo = useCallback((): UndoEntry | null => {
    const current = stackRef.current;
    if (current.length === 0) return null;
    const [entry, ...rest] = current;
    setStack(rest);
    return entry;
  }, []);

  const clear = useCallback(() => {
    setStack([]);
  }, []);

  const canUndo = stack.length > 0;

  return { push, undo, canUndo, clear };
}
