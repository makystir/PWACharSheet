import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, CharacteristicKey } from '../../../types/character';
import { getSuggestions, deterministicSuggestionSource } from '../engine';
import type { Suggestion, SuggestionAction, SuggestionContext } from '../types';
import { orderSuggestions } from '../ordering';
import { visibleSuggestions } from '../visible';
import { advancementSuggestions } from '../rules/advancement';
import { endeavourSuggestions } from '../rules/endeavours';
import { encumbranceSuggestions } from '../rules/encumbrance';
import { corruptionSuggestions } from '../rules/corruption';
import { reminderSuggestions } from '../rules/reminders';
import { isReadyToAdvance } from '../../advancement';
import { hasActiveEndeavours } from '../../endeavours';
import { calculateCarriedEncumbrance } from '../../encumbrance';
import { calculateMaxEncumbrance } from '../../calculators';
import { getCorruptionThreshold, getPureSoulLevel } from '../../corruption';
import { deriveAllReminders } from '../../reminders';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Test Hero',
    species: 'Human / Reiklander',
    ...overrides,
  };
}

const ALL_CHARS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

function charsFrom(partial: Partial<Record<CharacteristicKey, number>>): Character['chars'] {
  const chars = structuredClone(BLANK_CHARACTER.chars);
  for (const k of ALL_CHARS) {
    chars[k] = { i: partial[k] ?? 0, a: 0, b: 0 };
  }
  return chars;
}

const CTX_COMBAT: SuggestionContext = { inCombat: true };
const CTX_PEACE: SuggestionContext = { inCombat: false };

/** Recursively assert a value contains no function members (serializability). */
function assertNoFunctions(value: unknown): void {
  if (typeof value === 'function') throw new Error('Found a function value');
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      assertNoFunctions(v);
    }
  }
}

// ─── Purity & basic contract ─────────────────────────────────────────────────

describe('getSuggestions — contract', () => {
  it('returns [] for an undefined character without throwing', () => {
    expect(getSuggestions(undefined, CTX_PEACE)).toEqual([]);
    expect(getSuggestions(undefined, CTX_COMBAT)).toEqual([]);
  });

  it('deterministicSuggestionSource delegates to getSuggestions (sync)', () => {
    const character = makeCharacter({ xpCur: 50 });
    const viaSource = deterministicSuggestionSource.getSuggestions(character, CTX_PEACE);
    expect(Array.isArray(viaSource)).toBe(true);
    expect(viaSource).toEqual(getSuggestions(character, CTX_PEACE));
  });

  it('is pure: never mutates the character, writes storage, navigates, or opens a dialog', () => {
    const character = makeCharacter({
      xpCur: 100,
      corr: 50,
      chars: charsFrom({ T: 30, WP: 30 }),
      conditions: [{ name: 'Stunned', level: 1 }],
    });
    const frozen = Object.freeze(structuredClone(character));

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

    // Deep-freeze nested structures so any mutation attempt throws.
    Object.freeze(frozen.chars);
    for (const k of ALL_CHARS) Object.freeze(frozen.chars[k]);
    Object.freeze(frozen.talents);
    Object.freeze(frozen.conditions);
    Object.freeze(frozen.endeavours);

    expect(() => getSuggestions(frozen, CTX_COMBAT)).not.toThrow();

    // No storage writes/reads from the pure engine.
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(getItemSpy).not.toHaveBeenCalled();

    setItemSpy.mockRestore();
    getItemSpy.mockRestore();
  });
});

// ─── Determinism property ──────────────────────────────────────────────────

describe('getSuggestions — determinism (property)', () => {
  const arbChar = fc.record({
    xpCur: fc.integer({ min: 0, max: 2000 }),
    corr: fc.integer({ min: 0, max: 40 }),
    T: fc.integer({ min: 0, max: 60 }),
    WP: fc.integer({ min: 0, max: 60 }),
    inCombat: fc.boolean(),
    stunned: fc.boolean(),
  });

  it('identical inputs always yield identical ordered output', () => {
    fc.assert(
      fc.property(arbChar, (a) => {
        const character = makeCharacter({
          xpCur: a.xpCur,
          corr: a.corr,
          chars: charsFrom({ T: a.T, WP: a.WP }),
          conditions: a.stunned ? [{ name: 'Stunned', level: 1 }] : [],
        });
        const ctx: SuggestionContext = { inCombat: a.inCombat };
        const first = getSuggestions(character, ctx);
        const second = getSuggestions(structuredClone(character), ctx);
        expect(second).toEqual(first);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Serializability property ─────────────────────────────────────────────

describe('getSuggestions — serializability (property)', () => {
  const arbChar = fc.record({
    xpCur: fc.integer({ min: 0, max: 2000 }),
    corr: fc.integer({ min: 0, max: 40 }),
    T: fc.integer({ min: 0, max: 60 }),
    WP: fc.integer({ min: 0, max: 60 }),
    inCombat: fc.boolean(),
    stunned: fc.boolean(),
    poisoned: fc.boolean(),
  });

  it('every emitted suggestion (incl. action/secondaryAction/citation/totals) is JSON round-trippable and function-free', () => {
    fc.assert(
      fc.property(arbChar, (a) => {
        const character = makeCharacter({
          xpCur: a.xpCur,
          corr: a.corr,
          chars: charsFrom({ T: a.T, WP: a.WP }),
          conditions: [
            ...(a.stunned ? [{ name: 'Stunned', level: 1 }] : []),
            ...(a.poisoned ? [{ name: 'Poisoned', level: 1 }] : []),
          ],
        });
        const list = getSuggestions(character, { inCombat: a.inCombat });
        for (const s of list) {
          assertNoFunctions(s);
          const roundTripped = JSON.parse(JSON.stringify(s)) as Suggestion;
          expect(roundTripped).toEqual(s);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Per-rule triggers vs the REAL extracted predicates ──────────────────────

describe('advancement rule', () => {
  it('emits nothing at xpCur === 0', () => {
    const character = makeCharacter({ xpCur: 0 });
    expect(advancementSuggestions(character)).toEqual([]);
  });

  it('matches isReadyToAdvance: recommended when ready, info when not, both navigate to advancement', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 2000 }), (xpCur) => {
        const character = makeCharacter({ xpCur });
        const out = advancementSuggestions(character);
        expect(out).toHaveLength(1);
        const s = out[0];
        expect(s.action).toEqual({ kind: 'navigate', page: 'advancement' });
        expect(s.urgency).toBe(isReadyToAdvance(character) ? 'recommended' : 'info');
      }),
      { numRuns: 50 },
    );
  });
});

describe('endeavour rule', () => {
  it('emits iff hasActiveEndeavours, navigating to endeavours', () => {
    const active = makeCharacter({
      endeavours: [
        {
          id: 'p1',
          label: 'Downtime',
          slots: 1,
          entries: [{ id: 'e1', type: 'Income', notes: '', status: 'pending' }],
          statusWarning: false,
        },
      ],
    });
    const idle = makeCharacter({
      endeavours: [
        {
          id: 'p1',
          label: 'Downtime',
          slots: 1,
          entries: [{ id: 'e1', type: 'Income', notes: '', status: 'completed' }],
          statusWarning: false,
        },
      ],
    });

    expect(hasActiveEndeavours(active)).toBe(true);
    const out = endeavourSuggestions(active);
    expect(out).toHaveLength(1);
    expect(out[0].action).toEqual({ kind: 'navigate', page: 'endeavours' });

    expect(hasActiveEndeavours(idle)).toBe(false);
    expect(endeavourSuggestions(idle)).toEqual([]);
  });
});

describe('encumbrance rule (Core p.293)', () => {
  it('emits iff current > max, critical, navigate to character/gear, p.293 citation', () => {
    // 10 weapons each Enc 2 = 20 carried; S/T 0 => max 0 => overburdened.
    const over = makeCharacter({
      chars: charsFrom({ S: 0, T: 0 }),
      weapons: Array.from({ length: 10 }, (_, i) => ({
        name: `W${i}`,
        group: 'Basic',
        enc: '2',
      })) as Character['weapons'],
    });
    const current = calculateCarriedEncumbrance(over);
    const max = calculateMaxEncumbrance(over.chars, 0, 0);
    expect(current).toBeGreaterThan(max);

    const out = encumbranceSuggestions(over);
    expect(out).toHaveLength(1);
    const s = out[0];
    expect(s.urgency).toBe('critical');
    expect(s.action).toEqual({ kind: 'navigate', page: 'character', subTab: 'gear' });
    expect(s.citation).toBe('Core p.293: Overburdened');
    expect(s.totals?.[0].display).toBe(`${current} / ${max}`);
  });

  it('emits nothing when current <= max', () => {
    const light = makeCharacter({ chars: charsFrom({ S: 40, T: 40 }) });
    expect(calculateCarriedEncumbrance(light)).toBeLessThanOrEqual(
      calculateMaxEncumbrance(light.chars, 0, 0),
    );
    expect(encumbranceSuggestions(light)).toEqual([]);
  });
});

describe('corruption rule (Core p.183 + Pure Soul p.182)', () => {
  it('fires iff corr >= getCorruptionThreshold(chars, pureSoul) — >= matches the danger band, Pure Soul included', () => {
    const chars = charsFrom({ T: 35, WP: 35 }); // TB 3 + WPB 3 = 6
    const base = makeCharacter({ chars });
    const threshold = getCorruptionThreshold(chars, getPureSoulLevel(base.talents));
    expect(threshold).toBe(6);

    // Below threshold: not due.
    expect(corruptionSuggestions(makeCharacter({ chars, corr: threshold - 1 }))).toEqual([]);
    // At threshold: due (>= matches getCorruptionStatus's danger band).
    expect(corruptionSuggestions(makeCharacter({ chars, corr: threshold }))).toHaveLength(1);
    // Over threshold: due.
    const due = corruptionSuggestions(makeCharacter({ chars, corr: threshold + 1 }));
    expect(due).toHaveLength(1);
  });

  it('Pure Soul raises the threshold', () => {
    const chars = charsFrom({ T: 35, WP: 35 }); // TB+WPB = 6
    const pureSoulChar = makeCharacter({
      chars,
      corr: 7,
      talents: [{ n: 'Pure Soul', lvl: 2, desc: '' }],
    });
    // Threshold 6 + 2 = 8, so corr 7 is below threshold — not due.
    expect(getCorruptionThreshold(chars, getPureSoulLevel(pureSoulChar.talents))).toBe(8);
    expect(corruptionSuggestions(pureSoulChar)).toEqual([]);
  });

  it('primary is a seeded Endurance roll; secondary navigates to character/notes', () => {
    const chars = charsFrom({ T: 35, WP: 35 });
    const out = corruptionSuggestions(makeCharacter({ chars, corr: 99 }));
    expect(out).toHaveLength(1);
    const s = out[0];
    expect(s.urgency).toBe('critical');
    expect(s.action).toEqual<SuggestionAction>({
      kind: 'roll',
      test: {
        def: { kind: 'skill', skillName: 'Endurance', fallbackChar: 'T' },
        difficulty: 'Challenging',
        rollName: 'Endurance (resist Corruption)',
      },
    });
    expect(s.secondaryAction).toEqual<SuggestionAction>({
      kind: 'navigate',
      page: 'character',
      subTab: 'notes',
    });
    expect(s.citation).toBe('Core p.183: Corrupting (+ Pure Soul talent, p.182)');
  });
});

describe('reminders rule (consume deriveAllReminders, citation verbatim)', () => {
  it('equals deriveAllReminders(...) mapped, with id namespaced and citation verbatim', () => {
    const character = makeCharacter({
      conditions: [
        { name: 'Stunned', level: 1 },
        { name: 'Blinded', level: 1 },
      ],
    });
    const reminders = deriveAllReminders({
      conditions: character.conditions,
      psychologyTraits: character.psychologyTraits ?? [],
      psychologyEnabled: character.houseRules?.usePsychologyTracker ?? false,
    });
    const out = reminderSuggestions(character, CTX_COMBAT);

    expect(out).toHaveLength(reminders.length);
    reminders.forEach((r, i) => {
      const s = out[i];
      expect(s.id).toBe(`reminder:${r.id}`);
      expect(s.rationale).toBe(r.description);
      expect(s.citation).toBe(r.citation); // verbatim
      expect(s.category).toBe('combat');
      expect(s.urgency).toBe('critical');
      if (r.test) {
        expect(s.action).toEqual({ kind: 'roll', test: r.test });
      } else {
        expect(s.action).toEqual({ kind: 'navigate', page: 'combat' });
      }
    });
  });
});

// ─── Ordering ────────────────────────────────────────────────────────────────

describe('orderSuggestions', () => {
  function cat(id: string, category: Suggestion['category'], urgency: Suggestion['urgency']): Suggestion {
    return { id, title: id, rationale: '', category, urgency, action: { kind: 'navigate', page: 'combat' } };
  }

  it('combat-first in combat, progression-first out of combat', () => {
    const raw: Suggestion[] = [
      cat('a', 'advancement', 'recommended'),
      cat('b', 'combat', 'critical'),
      cat('c', 'corruption', 'critical'),
      cat('d', 'endeavour', 'info'),
      cat('e', 'encumbrance', 'critical'),
    ];
    const inCombat = orderSuggestions(raw, CTX_COMBAT).map(s => s.category);
    expect(inCombat).toEqual(['combat', 'encumbrance', 'corruption', 'advancement', 'endeavour']);

    const outCombat = orderSuggestions(raw, CTX_PEACE).map(s => s.category);
    expect(outCombat).toEqual(['advancement', 'endeavour', 'corruption', 'encumbrance', 'combat']);
  });

  it('within a group sorts by urgency then id lexically', () => {
    const raw: Suggestion[] = [
      cat('z', 'combat', 'info'),
      cat('a', 'combat', 'info'),
      cat('m', 'combat', 'critical'),
      cat('b', 'combat', 'recommended'),
    ];
    const ordered = orderSuggestions(raw, CTX_COMBAT).map(s => s.id);
    expect(ordered).toEqual(['m', 'b', 'a', 'z']);
  });

  it('ranks all seven categories in both contexts (incl. health and resource)', () => {
    const raw: Suggestion[] = [
      cat('a', 'advancement', 'recommended'),
      cat('b', 'combat', 'critical'),
      cat('c', 'corruption', 'critical'),
      cat('d', 'endeavour', 'info'),
      cat('e', 'encumbrance', 'critical'),
      cat('f', 'health', 'recommended'),
      cat('g', 'resource', 'info'),
    ];
    const inCombat = orderSuggestions(raw, CTX_COMBAT).map(s => s.category);
    expect(inCombat).toEqual([
      'combat',
      'health',
      'encumbrance',
      'corruption',
      'resource',
      'advancement',
      'endeavour',
    ]);

    const outCombat = orderSuggestions(raw, CTX_PEACE).map(s => s.category);
    expect(outCombat).toEqual([
      'advancement',
      'endeavour',
      'corruption',
      'health',
      'encumbrance',
      'resource',
      'combat',
    ]);
  });
});

// ─── Visible filter ──────────────────────────────────────────────────────────

describe('visibleSuggestions', () => {
  function s(id: string): Suggestion {
    return { id, title: id, rationale: '', category: 'combat', urgency: 'info', action: { kind: 'navigate', page: 'combat' } };
  }

  it('drops dismissed ids and unexpired-snoozed ids, keeps the rest; performs no writes', () => {
    const raw = [s('keep'), s('dismissed'), s('snoozed'), s('expired')];
    const now = 1_000_000;
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const out = visibleSuggestions(raw, {
      dismissed: ['dismissed'],
      snoozedUntil: { snoozed: now + 100, expired: now - 100 },
    }, now);

    expect(out.map(x => x.id)).toEqual(['keep', 'expired']);
    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });
});

// ─── localStorage spy isolation ──────────────────────────────────────────────

let _origLocalStorage: Storage | undefined;
beforeEach(() => {
  _origLocalStorage = globalThis.localStorage;
});
afterEach(() => {
  if (_origLocalStorage) {
    Object.defineProperty(globalThis, 'localStorage', { value: _origLocalStorage, configurable: true });
  }
});
