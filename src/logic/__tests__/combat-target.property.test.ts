import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Character } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';
import {
  getCombatTarget,
  setCombatTargetName,
  setCombatTargetTB,
  setCombatTargetAP,
  clearCombatTarget,
} from '../combat-target';

// Feature: ux-audit-improvements, Property 1: Combat-target helpers are
// immutable, clamped, and isolated.
//
// Validates: Requirements 1.2, 1.3, 1.6, 1.7
//
// getCombatTarget defaults to { name:'', tb:0, ap:0 } (Req 1.6); setters clamp
// TB/AP to >= 0, never mutate their input Character, and change no combatState
// field other than `target` (Req 1.2, 1.3); clearCombatTarget resets to the
// default (Req 1.7).

// ─── Generators ─────────────────────────────────────────────────────────────

/** A pre-existing combat target (or none) to seed the base character with. */
const arbSeedTarget: fc.Arbitrary<{ name: string; tb: number; ap: number } | undefined> =
  fc.option(
    fc.record({
      name: fc.string({ maxLength: 30 }),
      tb: fc.integer({ min: 0, max: 20 }),
      ap: fc.integer({ min: 0, max: 20 }),
    }),
    { nil: undefined }
  );

/** Arbitrary combatState field values so we can assert they are left untouched. */
const arbCombatStateExtras = fc.record({
  inCombat: fc.boolean(),
  initiative: fc.integer({ min: -50, max: 200 }),
  currentRound: fc.integer({ min: 0, max: 100 }),
  engaged: fc.boolean(),
  surprised: fc.boolean(),
});

/** Build a base Character with randomized combatState (incl. an optional target). */
function makeCharacter(
  extras: fc.Arbitrary<{
    inCombat: boolean;
    initiative: number;
    currentRound: number;
    engaged: boolean;
    surprised: boolean;
  }>,
  target: fc.Arbitrary<{ name: string; tb: number; ap: number } | undefined>
): fc.Arbitrary<Character> {
  return fc.tuple(extras, target).map(([e, t]) => ({
    ...BLANK_CHARACTER,
    combatState: {
      inCombat: e.inCombat,
      initiative: e.initiative,
      currentRound: e.currentRound,
      engaged: e.engaged,
      surprised: e.surprised,
      target: t ? { ...t } : undefined,
    },
  }));
}

const arbCharacter = makeCharacter(arbCombatStateExtras, arbSeedTarget);

/** TB/AP values including negatives and non-finite to exercise clamping. */
const arbNumericInput = fc.oneof(
  fc.integer({ min: -100, max: 100 }),
  fc.double({ min: -100, max: 100, noNaN: true }),
  fc.constant(Number.NaN),
  fc.constant(Number.POSITIVE_INFINITY),
  fc.constant(Number.NEGATIVE_INFINITY)
);

const arbName = fc.string({ maxLength: 50 });

// Snapshot the non-target combatState fields for an unchanged-assertion.
function otherCombatFields(c: Character) {
  const { inCombat, initiative, currentRound, engaged, surprised } = c.combatState;
  return { inCombat, initiative, currentRound, engaged, surprised };
}

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-audit-improvements, Property 1: Combat-target helpers', () => {
  it('getCombatTarget defaults to { name:"", tb:0, ap:0 } when unset (Req 1.6)', () => {
    fc.assert(
      fc.property(makeCharacter(arbCombatStateExtras, fc.constant(undefined)), (c) => {
        expect(getCombatTarget(c)).toEqual({ name: '', tb: 0, ap: 0 });
      }),
      { numRuns: 100 }
    );
  });

  it('setters clamp TB/AP to >= 0 (Req 1.3)', () => {
    fc.assert(
      fc.property(arbCharacter, arbNumericInput, (c, value) => {
        const afterTB = getCombatTarget(setCombatTargetTB(c, value));
        const afterAP = getCombatTarget(setCombatTargetAP(c, value));
        expect(afterTB.tb).toBeGreaterThanOrEqual(0);
        expect(afterAP.ap).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(afterTB.tb)).toBe(true);
        expect(Number.isFinite(afterAP.ap)).toBe(true);
        // Finite non-negative inputs pass through unchanged.
        if (Number.isFinite(value) && value >= 0) {
          expect(afterTB.tb).toBe(value);
          expect(afterAP.ap).toBe(value);
        } else {
          // Negative or non-finite clamps to 0.
          expect(afterTB.tb).toBe(0);
          expect(afterAP.ap).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('setters do not mutate the input Character (Req 1.2)', () => {
    fc.assert(
      fc.property(arbCharacter, arbName, arbNumericInput, (c, name, value) => {
        const before = structuredClone(c);
        setCombatTargetName(c, name);
        setCombatTargetTB(c, value);
        setCombatTargetAP(c, value);
        clearCombatTarget(c);
        // Input remains byte-for-byte identical after every helper call.
        expect(c).toEqual(before);
      }),
      { numRuns: 100 }
    );
  });

  it('setters leave other combatState fields unchanged (Req 1.2)', () => {
    fc.assert(
      fc.property(arbCharacter, arbName, arbNumericInput, (c, name, value) => {
        const original = otherCombatFields(c);
        for (const next of [
          setCombatTargetName(c, name),
          setCombatTargetTB(c, value),
          setCombatTargetAP(c, value),
          clearCombatTarget(c),
        ]) {
          expect(otherCombatFields(next)).toEqual(original);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('setCombatTargetName preserves existing TB/AP and only changes name (Req 1.3)', () => {
    fc.assert(
      fc.property(arbCharacter, arbName, (c, name) => {
        const prior = getCombatTarget(c);
        const after = getCombatTarget(setCombatTargetName(c, name));
        expect(after).toEqual({ name, tb: prior.tb, ap: prior.ap });
      }),
      { numRuns: 100 }
    );
  });

  it('clearCombatTarget resets to the default target (Req 1.7)', () => {
    fc.assert(
      fc.property(arbCharacter, (c) => {
        const cleared = clearCombatTarget(c);
        expect(cleared.combatState.target).toBeUndefined();
        expect(getCombatTarget(cleared)).toEqual({ name: '', tb: 0, ap: 0 });
      }),
      { numRuns: 100 }
    );
  });
});
