import { useState, useCallback, useRef, useEffect } from 'react';
import type { RollResult } from '../logic/dice-roller';

const STORAGE_KEY = 'wfrp-roll-history';
const MAX_ENTRIES = 50;

export interface RollHistoryEntry {
  id: number;
  result: RollResult;
}

export interface UseRollHistoryResult {
  history: RollHistoryEntry[];
  addRoll: (result: RollResult) => void;
  clearHistory: () => void;
}

function loadFromStorage(): RollHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function saveToStorage(entries: RollHistoryEntry[]): void {
  try {
    const trimmed = entries.slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage quota exceeded or unavailable — fall back to in-memory only
  }
}

export function useRollHistory(): UseRollHistoryResult {
  const [history, setHistory] = useState<RollHistoryEntry[]>(() => loadFromStorage());
  const nextId = useRef(
    (() => {
      const loaded = loadFromStorage();
      if (loaded.length === 0) return 1;
      return Math.max(...loaded.map((e) => e.id)) + 1;
    })()
  );

  // Persist whenever history changes
  useEffect(() => {
    saveToStorage(history);
  }, [history]);

  const addRoll = useCallback((result: RollResult) => {
    const entry: RollHistoryEntry = {
      id: nextId.current++,
      result,
    };
    setHistory((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore errors — in-memory is already cleared
    }
  }, []);

  return { history, addRoll, clearHistory };
}
