import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  conditionReminderText,
  deriveConditionReminders,
  derivePsychologyReminders,
} from '../reminders';
import { processEndOfTurn } from '../end-of-turn';
import { PSYCHOLOGY_REMINDERS } from '../psychology';
import type { PsychologyTrait, PsychologyType } from '../../types/character';

// ─── Shared vocabularies ──────────────────────────────────────────────────────

/** Conditions that produce a reminder, with whether that reminder is roll-backed. */
const REMINDER_CONDITIONS: { name: string; rollBacked: boolean }[] = [
  { name: 'Stunned', rollBacked: true },
  { name: 'Poisoned', rollBacked: true },
  { name: 'Broken', rollBacked: true },
  { name: 'Ablaze', rollBacked: true },
  { name: 'Blinded', rollBacked: false },
  { name: 'Deafened', rollBacked: false },
];
const REMINDER_CONDITION_NAMES = REMINDER_CONDITIONS.map((c) => c.name);

/** Conditions that never produce a reminder. */
const NON_REMINDER_CONDITIONS = ['Bleeding', 'Entangled', 'Fatigued', 'Prone', 'Surprised', 'Unconscious'];

/** Expected display order from deriveConditionReminders. */
const EXPECTED_ORDER = ['Stunned', 'Poisoned', 'Broken', 'Blinded', 'Deafened', 'Ablaze'];

const ALL_CONDITION_NAMES = [...REMINDER_CONDITION_NAMES, ...NON_REMINDER_CONDITIONS];

const ALL_PSYCH_TYPES: PsychologyType[] = [
  'Animosity', 'Hatred', 'Fear', 'Terror', 'Frenzy', 'Prejudice', 'Phobia', 'Trauma',
];
const ROLL_BACKED_PSYCH = new Set<PsychologyType>(
  ['Animosity', 'Hatred', 'Fear', 'Terror', 'Frenzy', 'Prejudice', 'Phobia'],
);

// ─── Property 1: exact-set derivation ─────────────────────────────────────────

describe('reminders Property 1: exact-set derivation over arbitrary condition sets', () => {
  it('derives exactly one reminder per reminder-bearing condition, with correct test presence', () => {
    const conditionArb = fc.subarray(ALL_CONDITION_NAMES, { minLength: 0, maxLength: ALL_CONDITION_NAMES.length });
    fc.assert(
      fc.property(conditionArb, (names) => {
        const conditions = names.map((name) => ({ name, level: 1 }));
        const reminders = deriveConditionReminders(conditions);
        const present = new Set(names);

        const expected = REMINDER_CONDITIONS.filter((c) => present.has(c.name));
        expect(reminders).toHaveLength(expected.length);

        for (const { name, rollBacked } of expected) {
          const r = reminders.find((x) => x.label === name)!;
          expect(r).toBeDefined();
          expect(r.id).toBe(`condition:${name}`);
          expect(Boolean(r.test)).toBe(rollBacked);
          if (rollBacked) {
            expect(r.test!.difficulty).toBe('Challenging');
          }
        }
        // No spurious reminders.
        for (const r of reminders) {
          expect(REMINDER_CONDITION_NAMES).toContain(r.label);
        }
      }),
      { numRuns: 300 },
    );
  });
});

// ─── Property 2: order stability under input shuffling ───────────────────────

describe('reminders Property 2: output order is input-order-independent', () => {
  it('shuffling the input condition array does not change output order', () => {
    const shuffledAllArb = fc.shuffledSubarray(REMINDER_CONDITION_NAMES, {
      minLength: REMINDER_CONDITION_NAMES.length,
      maxLength: REMINDER_CONDITION_NAMES.length,
    });
    fc.assert(
      fc.property(shuffledAllArb, (names) => {
        const reminders = deriveConditionReminders(names.map((name) => ({ name, level: 1 })));
        expect(reminders.map((r) => r.label)).toEqual(EXPECTED_ORDER);
      }),
      { numRuns: 200 },
    );
  });
});

// ─── Property 3: end-of-turn parity (anti-drift guarantee) ───────────────────

describe('reminders Property 3: end-of-turn reminder strings come from reminders.ts', () => {
  it('every processEndOfTurn reminder effect description equals conditionReminderText(condition)', () => {
    const conditionArb = fc.subarray(ALL_CONDITION_NAMES, { minLength: 0, maxLength: ALL_CONDITION_NAMES.length });
    fc.assert(
      fc.property(
        conditionArb,
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 10 }),
        (names, wounds, round) => {
          const conditions = names.map((name) => ({ name, level: 1 }));
          const result = processEndOfTurn({
            currentWounds: wounds,
            conditions,
            currentRound: round,
            tb: 0,
            lowestAP: 0,
            injectedD10: 5,
          });
          const reminderEffects = result.effects.filter((e) => e.type === 'reminder');
          for (const effect of reminderEffects) {
            expect(effect.description).toBe(conditionReminderText(effect.condition));
          }
        },
      ),
      { numRuns: 300 },
    );
  });
});

// ─── Property 4: reverse-direction / single-source assertions ────────────────

describe('reminders Property 4: single-source invariants', () => {
  it('every ordered reminder name resolves to a defined, non-empty string', () => {
    for (const name of ['Stunned', 'Poisoned', 'Broken', 'Blinded', 'Deafened']) {
      const text = conditionReminderText(name);
      expect(text).toBeDefined();
      expect(text!.length).toBeGreaterThan(0);
    }
  });

  it('none of the five byte-identical reminder literals appear inline in end-of-turn.ts', () => {
    const src = readFileSync(resolve(__dirname, '../end-of-turn.ts'), 'utf-8');
    const literals = [
      'Endurance Test (Challenging +0) required to remove',
      'Endurance Test to remove (each SL removes extra)',
      'Cool Test to remove',
      '1 level removed every other round',
    ];
    for (const literal of literals) {
      expect(src).not.toContain(literal);
    }
  });
});

// ─── Property 5: psychology derivation over arbitrary trait sets ─────────────

describe('reminders Property 5: psychology derivation', () => {
  const traitArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 6 }),
    type: fc.constantFrom(...ALL_PSYCH_TYPES),
    target: fc.string(),
    rating: fc.option(fc.integer({ min: 1, max: 9 }), { nil: undefined }),
  });

  it('maps each trait to the verbatim PSYCHOLOGY_REMINDERS string with correct test presence', () => {
    fc.assert(
      fc.property(fc.array(traitArb, { maxLength: 8 }), (traits) => {
        const reminders = derivePsychologyReminders(traits as PsychologyTrait[], true);
        expect(reminders).toHaveLength(traits.length);
        traits.forEach((trait, i) => {
          const r = reminders[i];
          expect(r.id).toBe(`psych:${trait.id}`);
          expect(r.description).toBe(PSYCHOLOGY_REMINDERS[trait.type]);
          expect(Boolean(r.test)).toBe(ROLL_BACKED_PSYCH.has(trait.type));
        });
      }),
      { numRuns: 200 },
    );
  });

  it('returns [] for any trait set when disabled', () => {
    fc.assert(
      fc.property(fc.array(traitArb, { maxLength: 8 }), (traits) => {
        expect(derivePsychologyReminders(traits as PsychologyTrait[], false)).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });
});
