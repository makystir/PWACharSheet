import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCharacter } from '../useCharacter';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, LedgerEntry } from '../../types/character';
import { transferFunds, type CurrencyDelta } from '../../logic/currency';
import { mirrorLedger } from '../../logic/event-log-mirrors';
import {
  createCharacter,
  loadCharacter,
} from '../../storage/character-manager';

/**
 * Bug-condition exploration test for the "Deposit to Treasury loses coin" bug.
 *
 * Reproduces the REAL production path as closely as a unit test can:
 *  - drives a deposit through the REAL useCharacter hook (its structuredClone
 *    updateCharacter + all sync effects + debounced auto-save), then
 *  - performs a real save -> load round-trip via the real character-manager
 *    storage functions (NOT mocked, backed by jsdom localStorage).
 *
 * The deposit MUST end with the purse decreased AND the treasury increased,
 * both in live state and after a reload.
 *
 * STATUS (investigation): all three cases PASS on current code — the reported
 * "treasury not increased / coins lost across refresh" bug does NOT reproduce
 * through the real useCharacter hook + real character-manager save/load path,
 * nor for a legacy estate that lacks a `treasury` field. These serve as
 * regression guards for the deposit persistence path; the true trigger of the
 * reported symptom lies outside the layers covered here (see subagent report).
 */

const TEST_ID = 'deposit-repro-id';

/** A character seeded with coin in both the purse and the treasury. */
function seededCharacter(): Character {
  const base = structuredClone(BLANK_CHARACTER);
  base.name = 'Deposit Repro';
  base.wGC = 10;
  base.wSS = 20;
  base.wD = 30;
  base.estate.treasury = { gc: 5, ss: 5, d: 5 };
  base.estate.ledger = [];
  base.eventLog = [];
  return base;
}

/** Replicates CharacterPage.applyTransfer('deposit', amount) exactly. */
function depositMutator(amount: CurrencyDelta) {
  return (c: Character): Character => {
    const wealth: CurrencyDelta = { gc: c.wGC || 0, ss: c.wSS || 0, d: c.wD || 0 };
    const treasury: CurrencyDelta = {
      gc: c.estate.treasury?.gc || 0,
      ss: c.estate.treasury?.ss || 0,
      d: c.estate.treasury?.d || 0,
    };
    const result = transferFunds(wealth, treasury, amount);
    if (!result.ok) return c;
    const newWealth = result.source;
    const newTreasury = result.destination;
    const entry: LedgerEntry = {
      timestamp: Date.now(),
      type: 'income',
      description: 'Transfer: Personal Wealth → Treasury',
      amount,
    };
    const withPoolsAndLedger: Character = {
      ...c,
      wGC: newWealth.gc,
      wSS: newWealth.ss,
      wD: newWealth.d,
      estate: {
        ...c.estate,
        treasury: newTreasury,
        ledger: [...(c.estate.ledger ?? []), entry],
      },
    };
    return mirrorLedger(withPoolsAndLedger, entry);
  };
}

describe('Deposit-to-Treasury bug — real hook + save/load round-trip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('deposit through the real hook decreases purse AND increases treasury in live state', () => {
    const initial = seededCharacter();
    const { result } = renderHook(() => useCharacter(TEST_ID, initial));

    const amount: CurrencyDelta = { gc: 2, ss: 5, d: 10 };

    act(() => {
      result.current.updateCharacter(depositMutator(amount));
    });

    // let any sync effects settle
    act(() => {
      vi.advanceTimersByTime(0);
    });

    const c = result.current.character;
    // purse decreased
    expect({ gc: c.wGC, ss: c.wSS, d: c.wD }).toEqual({ gc: 8, ss: 15, d: 20 });
    // treasury increased
    expect(c.estate.treasury).toEqual({ gc: 7, ss: 10, d: 15 });
  });

  it('deposit persists to storage: after save+reload the treasury is still increased', () => {
    // Create a real stored character so saveCharacter can update the index.
    const id = createCharacter('Deposit Repro');
    const seeded = seededCharacter();

    const { result } = renderHook(() => useCharacter(id, seeded));

    const amount: CurrencyDelta = { gc: 2, ss: 5, d: 10 };
    act(() => {
      result.current.updateCharacter(depositMutator(amount));
    });

    // Fire the debounced auto-save (500ms) — this is what persists to storage.
    act(() => {
      vi.advanceTimersByTime(600);
    });

    const reloaded = loadCharacter(id);
    expect(reloaded).not.toBeNull();
    expect({ gc: reloaded!.wGC, ss: reloaded!.wSS, d: reloaded!.wD }).toEqual({
      gc: 8,
      ss: 15,
      d: 20,
    });
    expect(reloaded!.estate.treasury).toEqual({ gc: 7, ss: 10, d: 15 });
  });

  it('legacy character (estate WITHOUT treasury) persisted in storage: load -> deposit -> save -> reload keeps treasury', () => {
    // Simulate an older save whose estate object lacks a `treasury` field.
    const id = createCharacter('Legacy Estate');
    const legacyStored = structuredClone(BLANK_CHARACTER) as unknown as Record<string, unknown>;
    legacyStored.name = 'Legacy Estate';
    legacyStored.wGC = 10;
    legacyStored.wSS = 20;
    legacyStored.wD = 30;
    // estate shape from before treasury existed
    legacyStored.estate = { name: '', location: '', description: '', ledger: [], notes: [], holdings: [] };
    localStorage.setItem(`wfrp4e-char-${id}`, JSON.stringify(legacyStored));

    const loaded = loadCharacter(id)!;
    expect(loaded).not.toBeNull();

    const { result } = renderHook(() => useCharacter(id, loaded));

    const amount: CurrencyDelta = { gc: 2, ss: 5, d: 10 };
    act(() => {
      result.current.updateCharacter(depositMutator(amount));
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });

    const reloaded = loadCharacter(id)!;
    expect({ gc: reloaded.wGC, ss: reloaded.wSS, d: reloaded.wD }).toEqual({ gc: 8, ss: 15, d: 20 });
    expect(reloaded.estate.treasury).toEqual({ gc: 2, ss: 5, d: 10 });
  });
});
