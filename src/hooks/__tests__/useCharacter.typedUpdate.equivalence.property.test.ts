import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useCharacter, setNestedValue, backfillCharacter } from '../useCharacter';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, FieldPath, FieldValue } from '../../types/character';

/**
 * Feature: state-safety-core, Property 1: Typed-update equivalence
 *
 * **Validates: Requirements 2.1, 2.4**
 *
 * For any valid `(path, value)`, the Character state produced by the typed
 * `update(path, value)` on `useCharacter` equals the state the legacy string-path
 * update `setNestedValue(prev, path, value)` produced for that same field and
 * value. Task 2 narrowed only the compile-time signature of `update`; its runtime
 * still routes through `setNestedValue`, so the two must stay behaviourally
 * identical.
 *
 * The typed `update` drives a live hook, so React effects (the talent-bonus,
 * wound-field, armour-points, and Fatigued-threshold Sync_Passes) also run under
 * `act`. To measure the `update` operation itself:
 *   - `INERT_CASES` address fields that no Sync_Pass re-derives on a blank
 *     character, so the WHOLE resulting Character must equal `setNestedValue`.
 *   - The edited-leaf assertion (for every case) confirms the exact addressed
 *     field ends up with the value `setNestedValue` would have written.
 */

vi.mock('../../storage/character-manager', () => ({
  saveCharacter: vi.fn(),
}));

const TEST_ID = 'equivalence-test-char';

/** Read a value out of a Character by dot-notation path (test-side oracle). */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * A single equivalence case: a typed FieldPath plus an arbitrary that yields a
 * value assignable to that path's leaf.
 *
 * - `inert`: no Sync_Pass touches ANY part of the Character for this edit on a
 *   blank character, so the WHOLE resulting Character must equal `setNestedValue`.
 * - `leafSurvives`: the addressed leaf itself is not overwritten by a Sync_Pass,
 *   so the edited-leaf value must equal the legacy write (a superset of `inert`;
 *   e.g. `chars.S.a` survives even though it triggers the wound Sync_Pass, but
 *   `ap.head` is recomputed and therefore does NOT survive).
 */
interface Case<P extends FieldPath<Character>> {
  path: P;
  arb: fc.Arbitrary<FieldValue<Character, P>>;
  inert: boolean;
  leafSurvives: boolean;
}

function makeCase<P extends FieldPath<Character>>(
  path: P,
  arb: fc.Arbitrary<FieldValue<Character, P>>,
  inert: boolean,
  leafSurvives: boolean = inert,
): Case<P> {
  return { path, arb, inert, leafSurvives };
}

const arbShortString = fc.string({ minLength: 0, maxLength: 12 });
const arbSmallInt = fc.integer({ min: 0, max: 50 });

/**
 * Representative editable paths drawn from real `update()` call sites
 * (`name`, `species`, `move.*`, `chars.*.*`, `bSkills.*.a`, `ap.*`, `wGC/wSS/wD`),
 * each paired with a generator matching the leaf's type.
 *
 * `inert: false` where a Sync_Pass would overwrite the leaf on a blank
 * character: wound-driving chars (S/T/WP advances feed `syncWoundFields`) and
 * `ap.*` (recomputed to 0 by the armour Sync_Pass when the armour list is empty).
 */
const CASES: Case<FieldPath<Character>>[] = [
  makeCase('name', arbShortString, true),
  makeCase('species', arbShortString, true),
  makeCase('career', arbShortString, true),
  makeCase('careerLevel', arbShortString, true),
  makeCase('status', arbShortString, true),
  makeCase('motivation', arbShortString, true),
  makeCase('move.m', arbSmallInt, true),
  makeCase('move.w', arbSmallInt, true),
  makeCase('move.r', arbSmallInt, true),
  // WS/BS advances are not wound inputs, so the wound Sync_Pass leaves them be.
  makeCase('chars.WS.a', arbSmallInt, true),
  makeCase('chars.BS.a', arbSmallInt, true),
  makeCase('chars.WS.i', arbSmallInt, true),
  makeCase('bSkills.0.a', arbSmallInt, true),
  makeCase('bSkills.3.a', arbSmallInt, true),
  makeCase('bSkills.0.n', arbShortString, true),
  makeCase('wGC', arbSmallInt, true),
  makeCase('wSS', arbSmallInt, true),
  makeCase('wD', arbSmallInt, true),
  makeCase('fate', arbSmallInt, true),
  makeCase('fortune', arbSmallInt, true),
  makeCase('corr', arbSmallInt, true),
  makeCase('woundsUseSB', fc.boolean(), true),
  // Not inert (a Sync_Pass fires) but the addressed leaf still survives: the
  // wound Sync_Pass recomputes wSB/wTB2/... from these advances but never
  // rewrites the advance field itself, so the edited leaf equals the legacy write.
  makeCase('chars.S.a', arbSmallInt, false, true), // feeds syncWoundFields
  makeCase('chars.T.a', arbSmallInt, false, true), // feeds syncWoundFields
  makeCase('chars.WP.a', arbSmallInt, false, true), // feeds syncWoundFields
  // Neither inert nor leaf-surviving: the armour Sync_Pass recomputes `ap.*` to 0
  // (empty armour list, WFRP4e Core p.293 worn-only AP), overwriting the leaf.
  makeCase('ap.head', arbSmallInt, false, false),
  makeCase('ap.body', arbSmallInt, false, false),
];

/** Advance timers past the 500ms debounce and let all Sync_Pass effects settle. */
function settle() {
  act(() => {
    vi.advanceTimersByTime(600);
  });
}

describe('Feature: state-safety-core, Property 1: Typed-update equivalence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('typed update(path, v) writes the same leaf value as legacy setNestedValue(prev, path, v)', () => {
    for (const testCase of CASES.filter((c) => c.leafSurvives)) {
      fc.assert(
        fc.property(testCase.arb, (value) => {
          const initial = structuredClone(BLANK_CHARACTER);
          const { result, unmount } = renderHook(() => useCharacter(TEST_ID, initial));

          // Let the initial mount / Sync_Passes settle to a stable baseline.
          settle();
          const prev = structuredClone(result.current.character);

          act(() => {
            result.current.update(testCase.path, value);
          });
          settle();

          const legacy = setNestedValue(prev, testCase.path, value);

          // Edited leaf: the addressed field matches the legacy write exactly.
          expect(getNestedValue(result.current.character, testCase.path)).toEqual(
            getNestedValue(legacy, testCase.path),
          );

          unmount();
        }),
        { numRuns: 20 },
      );
    }
  });

  it('for inert paths, the whole resulting Character equals legacy setNestedValue(prev, path, v)', () => {
    for (const testCase of CASES.filter((c) => c.inert)) {
      fc.assert(
        fc.property(testCase.arb, (value) => {
          const initial = structuredClone(BLANK_CHARACTER);
          const { result, unmount } = renderHook(() => useCharacter(TEST_ID, initial));

          settle();
          const prev = structuredClone(result.current.character);

          act(() => {
            result.current.update(testCase.path, value);
          });
          settle();

          const legacy = setNestedValue(prev, testCase.path, value);

          // No Sync_Pass touches these paths on a blank character, so the
          // entire committed Character must equal the legacy result.
          expect(result.current.character).toEqual(legacy);

          unmount();
        }),
        { numRuns: 25 },
      );
    }
  });

  it('setNestedValue does not mutate the input Character (structuredClone semantics)', () => {
    fc.assert(
      fc.property(arbShortString, (value) => {
        const prev = backfillCharacter(structuredClone(BLANK_CHARACTER));
        const snapshot = structuredClone(prev);
        const next = setNestedValue(prev, 'name', value);
        // Input is untouched; output carries the new value.
        expect(prev).toEqual(snapshot);
        expect(next.name).toBe(value);
      }),
      { numRuns: 50 },
    );
  });
});
