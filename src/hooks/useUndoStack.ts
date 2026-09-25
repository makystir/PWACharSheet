import { useState, useCallback, useRef, useEffect } from 'react';
import type { Character, FieldPath, FieldValue } from '../types/character';

/**
 * A single recorded edit in the undo stack.
 *
 * Generic over `P extends FieldPath<Character>` so the changed `field` is a
 * compile-time-checked path into `Character` and the recorded `previousValue`/
 * `newValue` are typed to that field's leaf value (spec: state-safety-core,
 * Req 3.1). The default type parameter widens to the full `FieldPath` union so
 * an `UndoEntry` can be stored heterogeneously in the stack while individual
 * pushes stay precisely typed.
 */
export interface UndoEntry<P extends FieldPath<Character> = FieldPath<Character>> {
  field: P;                       // dot-notation path (e.g., "chars.WS.a")
  previousValue: FieldValue<Character, P>;
  newValue: FieldValue<Character, P>;
  timestamp: number;
}

export interface UseUndoStackResult {
  push: <P extends FieldPath<Character>>(entry: Omit<UndoEntry<P>, 'timestamp'>) => void;
  undo: () => UndoEntry | null;
  canUndo: boolean;
  clear: () => void;
}

const DEFAULT_MAX_SIZE = 10;

export function useUndoStack(maxSize: number = DEFAULT_MAX_SIZE): UseUndoStackResult {
  const [stack, setStack] = useState<UndoEntry[]>([]);
  // Mirror the latest stack into a ref so the memoised push/undo callbacks can
  // read it without needing `stack` in their dependency arrays. Written in an
  // effect (after commit) rather than during render to keep render pure.
  const stackRef = useRef<UndoEntry[]>(stack);
  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  const push = useCallback(<P extends FieldPath<Character>>(entry: Omit<UndoEntry<P>, 'timestamp'>) => {
    const fullEntry = {
      ...entry,
      timestamp: Date.now(),
    } as UndoEntry;
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
