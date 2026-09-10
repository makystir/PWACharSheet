import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCharacter } from '../useCharacter';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, LedgerEntry } from '../../types/character';
import { transferFunds, type CurrencyDelta } from '../../logic/currency';
import { mirrorLedger } from '../../logic/event-log-mirrors';
import { createCharacter, loadCharacter } from '../../storage/character-manager';

/**
 * Dropped-save race reproduction + Fix A lock-in.
 *
 * WFRP4e currency is game data (rules-compliance): 1 GC = 20 SS, 1 SS = 12 D.
 * A deposit MOVES coin per-denomination with no conversion or loss — this test
 * does NOT touch the transfer math (transferFunds owns it); it only proves the
 * already-correct post-deposit character is PERSISTED to storage.
 *
 * Two guarantees:
 *  1. A deterministic interleaving (deposit commit, then a follow-on commit that
 *     clears the pending debounce before 500ms elapses) drops the debounced
 *     write on the pre-fix code — but the new synchronous saveNow(next) path
 *     persists the deposit immediately regardless.
 *  2. saveNow(next) writes the EXACT post-deposit character with no timer
 *     advance (load immediately after).
 */

function seededCharacter(): Character {
  const base = structuredClone(BLANK_CHARACTER);
  base.name = 'SaveNow Repro';
  base.wGC = 10;
  base.wSS = 20;
  base.wD = 30;
  base.estate.treasury = { gc: 5, ss: 5, d: 5 };
  base.estate.ledger = [];
  base.eventLog = [];
  return base;
}

/** Builds the exact post-deposit character (mirrors CharacterPage.applyTransfer). */
function buildDeposit(c: Character, amount: CurrencyDelta): Character | null {
  const wealth: CurrencyDelta = { gc: c.wGC || 0, ss: c.wSS || 0, d: c.wD || 0 };
  const treasury: CurrencyDelta = {
    gc: c.estate.treasury?.gc || 0,
    ss: c.estate.treasury?.ss || 0,
    d: c.estate.treasury?.d || 0,
  };
  const result = transferFunds(wealth, treasury, amount);
  if (!result.ok) return null;
  const entry: LedgerEntry = {
    timestamp: Date.now(),
    type: 'income',
    description: 'Transfer: Personal Wealth → Treasury',
    amount,
  };
  const withPoolsAndLedger: Character = {
    ...c,
    wGC: result.source.gc,
    wSS: result.source.ss,
    wD: result.source.d,
    estate: {
      ...c.estate,
      treasury: result.destination,
      ledger: [...(c.estate.ledger ?? []), entry],
    },
  };
  return mirrorLedger(withPoolsAndLedger, entry);
}

describe('useCharacter.saveNow — synchronous money-move persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('saveNow(next) persists the exact deposited character synchronously (no timer advance)', () => {
    const id = createCharacter('SaveNow Repro');
    const seeded = seededCharacter();
    const { result } = renderHook(() => useCharacter(id, seeded));

    const amount: CurrencyDelta = { gc: 2, ss: 5, d: 10 };
    const next = buildDeposit(result.current.character, amount)!;

    // Exactly what CharacterPage does: commit + synchronous persist.
    act(() => {
      result.current.updateCharacter(() => next);
      result.current.saveNow(next);
    });

    // NO timer advance — the write must already be in storage.
    const reloaded = loadCharacter(id)!;
    expect(reloaded).not.toBeNull();
    expect({ gc: reloaded.wGC, ss: reloaded.wSS, d: reloaded.wD }).toEqual({ gc: 8, ss: 15, d: 20 });
    expect(reloaded.estate.treasury).toEqual({ gc: 7, ss: 10, d: 15 });
  });

  it('deposit survives a follow-on commit that clears the pending debounce before 500ms', () => {
    const id = createCharacter('SaveNow Repro');
    const seeded = seededCharacter();
    const { result } = renderHook(() => useCharacter(id, seeded));

    const amount: CurrencyDelta = { gc: 2, ss: 5, d: 10 };
    const next = buildDeposit(result.current.character, amount)!;

    // Deposit commit + synchronous save (Fix A).
    act(() => {
      result.current.updateCharacter(() => next);
      result.current.saveNow(next);
    });

    // Interleave a follow-on edit BEFORE the deposit debounce (500ms) elapses.
    // On pre-fix code this re-arms/clears pendingRef bookkeeping and the deposit
    // write only lands much later. The synchronous saveNow already persisted it.
    act(() => {
      vi.advanceTimersByTime(200);
      result.current.update('name', 'Later Edit');
      vi.advanceTimersByTime(100);
    });

    // Treasury deposit must be in storage RIGHT NOW, not "after many refreshes".
    const reloaded = loadCharacter(id)!;
    expect(reloaded.estate.treasury).toEqual({ gc: 7, ss: 10, d: 15 });
    expect({ gc: reloaded.wGC, ss: reloaded.wSS, d: reloaded.wD }).toEqual({ gc: 8, ss: 15, d: 20 });
  });
});
