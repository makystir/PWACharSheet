import { describe, it, expect } from 'vitest';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';
import type { ActiveDisease } from '../../diseases';
import { diseaseSuggestions } from '../rules/diseases';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...structuredClone(BLANK_CHARACTER), ...overrides };
}

function disease(partial: Partial<ActiveDisease> & { diseaseName: string }): ActiveDisease {
  return {
    id: 1,
    contracted: 0,
    notes: '',
    ...partial,
  };
}

function assertNoFunctions(value: unknown): void {
  if (typeof value === 'function') throw new Error('Found a function value');
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) assertNoFunctions(v);
  }
}

describe('disease rule (Core p.186-188)', () => {
  it('emits nothing when there are no diseases (incl. undefined)', () => {
    expect(diseaseSuggestions(makeCharacter({ diseases: [] }))).toEqual([]);
    expect(diseaseSuggestions(makeCharacter({ diseases: undefined }))).toEqual([]);
  });

  it('a roll-backed Endurance disease seeds an Endurance Test (primary) + View Diseases (secondary)', () => {
    // Blood Rot's first symptom is "Blight" (no severity) → Endurance, 'Daily (or die)' (lethal).
    const out = diseaseSuggestions(makeCharacter({ diseases: [disease({ diseaseName: 'Blood Rot' })] }));
    expect(out).toHaveLength(1);
    const s = out[0];
    expect(s.id).toBe('health:disease:blood-rot');
    expect(s.category).toBe('health');
    // Lethal cadence escalates to critical even before duration is reached.
    expect(s.urgency).toBe('critical');
    expect(s.action).toEqual({
      kind: 'roll',
      test: {
        def: { kind: 'skill', skillName: 'Endurance', fallbackChar: 'T' },
        difficulty: 'Very Easy',
        rollName: 'Endurance (Blood Rot)',
      },
    });
    expect(s.secondaryAction).toEqual({ kind: 'navigate', page: 'character', subTab: 'notes' });
  });

  it('a Cool/Pox disease uses the WP fallback path', () => {
    // Itching Pox: "Coughs and Sneezes" (null) then "Pox" (Cool).
    const out = diseaseSuggestions(makeCharacter({ diseases: [disease({ diseaseName: 'Itching Pox' })] }));
    expect(out).toHaveLength(1);
    const s = out[0];
    expect(s.action).toEqual({
      kind: 'roll',
      test: {
        def: { kind: 'skill', skillName: 'Cool', fallbackChar: 'WP' },
        difficulty: 'Average',
        rollName: 'Cool (Itching Pox)',
      },
    });
    // Pox cadence is not lethal and no duration rolled → recommended.
    expect(s.urgency).toBe('recommended');
  });

  it('durationReached escalates a non-lethal roll-backed disease to critical', () => {
    const reached = disease({
      diseaseName: 'Itching Pox',
      elapsedDays: 10,
      rolledDuration: { total: 8, unit: 'days', breakdown: '1d10+7 → 8 days' },
    });
    const out = diseaseSuggestions(makeCharacter({ diseases: [reached] }));
    expect(out[0].urgency).toBe('critical');
    expect(out[0].citation).toBe('Core p.186: Using Diseases');
  });

  it('a non-roll disease emits a navigate-only suggestion with no secondary', () => {
    // "The Yellow Skull" is not a real registry disease → getDiseaseSymptoms undefined → non-roll.
    const out = diseaseSuggestions(makeCharacter({ diseases: [disease({ diseaseName: 'The Yellow Skull' })] }));
    expect(out).toHaveLength(1);
    const s = out[0];
    expect(s.action).toEqual({ kind: 'navigate', page: 'character', subTab: 'notes' });
    expect(s.secondaryAction).toBeUndefined();
    expect(s.urgency).toBe('info');
    expect(s.title).toBe('The Yellow Skull: review disease progress');
  });

  it('collapses two same-name records into exactly one suggestion with a single id', () => {
    const out = diseaseSuggestions(
      makeCharacter({
        diseases: [
          disease({ id: 1, diseaseName: 'Blood Rot', elapsedDays: 0 }),
          disease({ id: 2, diseaseName: 'Blood Rot', elapsedDays: 5 }),
        ],
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('health:disease:blood-rot');
  });

  it('is deterministic on a frozen clone and emits serializable suggestions', () => {
    const character = makeCharacter({
      diseases: [disease({ diseaseName: 'Blood Rot' }), disease({ id: 2, diseaseName: 'Itching Pox' })],
    });
    const frozen = Object.freeze(structuredClone(character));
    const out = diseaseSuggestions(frozen);
    expect(diseaseSuggestions(structuredClone(frozen))).toEqual(out);
    for (const s of out) {
      assertNoFunctions(s);
      expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    }
  });
});
