import { describe, it, expect } from 'vitest';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';
import type { SuggestionContext } from '../types';
import { downtimeSuggestions } from '../rules/downtime';
import { endeavourSuggestions } from '../rules/endeavours';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...structuredClone(BLANK_CHARACTER), ...overrides };
}

const CTX_PEACE: SuggestionContext = { inCombat: false };
const CTX_COMBAT: SuggestionContext = { inCombat: true };

function period(overrides: Partial<Character['endeavours'][number]> = {}): Character['endeavours'][number] {
  return {
    id: 'p1',
    label: 'Downtime',
    slots: 1,
    entries: [],
    statusWarning: false,
    ...overrides,
  };
}

function assertNoFunctions(value: unknown): void {
  if (typeof value === 'function') throw new Error('Found a function value');
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) assertNoFunctions(v);
  }
}

describe('downtime rule (Core p.194-195)', () => {
  it('returns [] in combat', () => {
    expect(downtimeSuggestions(makeCharacter({ endeavours: [] }), CTX_COMBAT)).toEqual([]);
  });

  it('returns [] when an endeavour is active (never double-fires with endeavour:active)', () => {
    const active = makeCharacter({
      endeavours: [
        period({ entries: [{ id: 'e1', type: 'Income', notes: '', status: 'pending' }] }),
      ],
    });
    expect(downtimeSuggestions(active, CTX_PEACE)).toEqual([]);
  });

  it('no periods → case (b) "Start a downtime Endeavour"', () => {
    const out = downtimeSuggestions(makeCharacter({ endeavours: [] }), CTX_PEACE);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('endeavour:available');
    expect(out[0].title).toBe('Start a downtime Endeavour');
    expect(out[0].action).toEqual({ kind: 'navigate', page: 'endeavours' });
  });

  it('a period with a free slot and no active entries → case (a) "open Endeavour slots"', () => {
    const out = downtimeSuggestions(
      makeCharacter({ endeavours: [period({ slots: 2, entries: [] })] }),
      CTX_PEACE,
    );
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('You have open Endeavour slots');
  });

  it('completed entries free their slots → still fires case (a)', () => {
    // Completed entries do not occupy a slot, so a slots:1 period with 1
    // completed entry still has a free slot. (A slot occupied by a non-completed
    // entry is pending/in_progress, which hasActiveEndeavours catches first — so
    // the "no free slots while idle" state is unreachable by construction.)
    const idleWithCompleted = makeCharacter({
      endeavours: [
        period({ slots: 1, entries: [{ id: 'e1', type: 'Income', notes: '', status: 'completed' }] }),
      ],
    });
    const out = downtimeSuggestions(idleWithCompleted, CTX_PEACE);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('You have open Endeavour slots');
  });

  it('a period with no free slots and no active entries does not fire (guarded case)', () => {
    // slots:0 period with no entries: no free slots, and >0 periods → []
    const noCapacity = makeCharacter({ endeavours: [period({ slots: 0, entries: [] })] });
    expect(downtimeSuggestions(noCapacity, CTX_PEACE)).toEqual([]);
  });

  it('endeavourSuggestions and downtimeSuggestions are never both non-empty (mutual exclusion)', () => {
    const cases = [
      makeCharacter({ endeavours: [] }),
      makeCharacter({ endeavours: [period({ slots: 2, entries: [] })] }),
      makeCharacter({
        endeavours: [period({ entries: [{ id: 'e1', type: 'Income', notes: '', status: 'pending' }] })],
      }),
      makeCharacter({
        endeavours: [period({ entries: [{ id: 'e1', type: 'Income', notes: '', status: 'completed' }] })],
      }),
    ];
    for (const c of cases) {
      const a = endeavourSuggestions(c).length > 0;
      const b = downtimeSuggestions(c, CTX_PEACE).length > 0;
      expect(a && b).toBe(false);
    }
  });

  it('is deterministic on a frozen clone and emits serializable output', () => {
    const character = makeCharacter({ endeavours: [] });
    const frozen = Object.freeze(structuredClone(character));
    const out = downtimeSuggestions(frozen, CTX_PEACE);
    expect(downtimeSuggestions(structuredClone(frozen), CTX_PEACE)).toEqual(out);
    for (const s of out) {
      assertNoFunctions(s);
      expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    }
  });
});
