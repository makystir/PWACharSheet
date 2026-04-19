import { useState, useCallback, useRef } from 'react';
import type { RollResult } from '../logic/dice-roller';

export interface RollHistoryEntry {
  id: number;
  result: RollResult;
}

export interface UseRollHistoryResult {
  history: RollHistoryEntry[];
  addRoll: (result: RollResult) => void;
  clearHistory: () => void;
}

export function useRollHistory(): UseRollHistoryResult {
  const [history, setHistory] = useState<RollHistoryEntry[]>([]);
  const nextId = useRef(1);

  const addRoll = useCallback((result: RollResult) => {
    const entry: RollHistoryEntry = {
      id: nextId.current++,
      result,
    };
    setHistory((prev) => [entry, ...prev]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, addRoll, clearHistory };
}
