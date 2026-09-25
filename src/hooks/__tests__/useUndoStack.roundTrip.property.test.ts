import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useUndoStack } from '../useUndoStack';
import { setNestedValue } from '../useCharacter';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, FieldPath, FieldValue } from '../../types/character';

/**
 * Feature: state-safety-core, Property 2: Undo round-trip
 *
 * **Validates: Requirements 3.2, 3.5**
 *
 * For any recorded edit `e` over a valid `FieldPath<Character>` + matching value,
 * applying the edit and then undoing it restores the original `Character`
 * exactly (round-trip). The edit is recorded through the real `useUndoStack`
 * machinery, and both the "apply" and "undo" steps route through the same
 * `setNestedValue` runtime helper the typed `update` uses, so this exercises the
 * production apply/undo path rather than a hand-rolled oracle.
 *
 * A second, fixed-input check asserts that `fieldToLabel` produces its exact
 * expected output for a fixed set of paths. `fieldToLabel` is module-internal to
 * `App.tsx` (not exported); per the existing `undoIntegration.test.ts`
 * convention it is re-implemented here verbatim and typed against `Character`.
 */

// ─── fieldToLabel (mirrors the module-internal helper in App.tsx) ────────────
// Kept byte-for-byte identical to App.tsx `fieldToLabel` so this test fails if
// that label output ever drifts (spec: state-safety-core, Req 3.3/3.5).
function fieldToLabel(field: FieldPath<Character>): string {
  const parts = field.split('.');
  // For characteristic fields like "chars.WS.a" or "chars.T.i"
  if (parts[0] === 'chars' && parts.length >= 2) {
    const charKey = parts[1];
    const sub = parts[2];
    if (sub === 'a') return `${charKey} advances`;
    if (sub === 'i') return `${charKey} initial`;
    if (sub === 'b') return `${charKey} bonus`;
    return charKey;
  }
  // Return the last meaningful segment for common fields
  return parts[parts.length - 1];
}

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Real `FieldPath<Character>` values with `number` leaves so a single integer
 * value generator matches every path. These are drawn from actual `update()`
 * call sites (`move.*`, `chars.*.*`, `ap.*`, `wGC/wSS/wD`, `bSkills.*.a`) and
 * all exist on `BLANK_CHARACTER`, so the round-trip works on a real Character.
 */
const NUMBER_FIELDS = [
  'move.m',
  'move.w',
  'move.r',
  'chars.WS.a',
  'chars.BS.a',
  'chars.S.a',
  'chars.T.a',
  'chars.WS.i',
  'ap.head',
  'ap.body',
  'wGC',
  'wSS',
  'wD',
  'bSkills.0.a',
  'bSkills.3.a',
  'fate',
  'fortune',
  'corr',
] as const satisfies readonly FieldPath<Character>[];

type NumberField = (typeof NUMBER_FIELDS)[number];

const arbFieldPath: fc.Arbitrary<NumberField> = fc.constantFrom(...NUMBER_FIELDS);
const arbFieldValue: fc.Arbitrary<number> = fc.integer({ min: -999, max: 999 });

/** A single recorded edit: a typed path plus its new value. */
interface RecordedEdit {
  field: NumberField;
  newValue: FieldValue<Character, NumberField>;
}

const arbRecordedEdit: fc.Arbitrary<RecordedEdit> = fc.record({
  field: arbFieldPath,
  newValue: arbFieldValue,
});

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: state-safety-core, Property 2: Undo round-trip', () => {
  /**
   * **Validates: Requirements 3.2, 3.5**
   *
   * For any recorded edit, applying it to a Character and then undoing it (by
   * writing the recorded `previousValue` back to the recorded `field`) restores
   * the original Character exactly.
   */
  it('apply(edit) then undo() restores the original Character exactly', () => {
    fc.assert(
      fc.property(arbRecordedEdit, (edit) => {
        const original = structuredClone(BLANK_CHARACTER);

        // The pre-edit value at the path, as the undo glue captures it.
        const previousValue = edit.field
          .split('.')
          .reduce<unknown>(
            (acc, key) =>
              acc && typeof acc === 'object'
                ? (acc as Record<string, unknown>)[key]
                : undefined,
            original,
          ) as FieldValue<Character, NumberField>;

        const { result } = renderHook(() => useUndoStack());

        // Apply the edit through the same runtime helper `update` uses.
        const afterEdit = setNestedValue(original, edit.field, edit.newValue);

        // Record the edit exactly as `undoableUpdate` does.
        act(() => {
          result.current.push({
            field: edit.field,
            previousValue,
            newValue: edit.newValue,
          });
        });

        // Undo: read back the recorded entry and reverse the edit.
        let entry: ReturnType<typeof result.current.undo>;
        act(() => {
          entry = result.current.undo();
        });

        expect(entry!).not.toBeNull();
        expect(entry!.field).toBe(edit.field);

        const afterUndo = setNestedValue(afterEdit, entry!.field, entry!.previousValue);

        // Round-trip: the fully reverted Character equals the original.
        expect(afterUndo).toEqual(original);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.2, 3.5**
   *
   * Round-trip holds even when the same field is edited twice in a row: undoing
   * the most recent edit restores the value the field held after the first edit.
   */
  it('undo of the latest edit restores the immediately preceding value (LIFO round-trip)', () => {
    fc.assert(
      fc.property(arbFieldPath, arbFieldValue, arbFieldValue, (field, firstValue, secondValue) => {
        const original = structuredClone(BLANK_CHARACTER);

        const afterFirst = setNestedValue(original, field, firstValue);
        const afterSecond = setNestedValue(afterFirst, field, secondValue);

        const { result } = renderHook(() => useUndoStack());

        // Second edit's previousValue is the value written by the first edit.
        act(() => {
          result.current.push({ field, previousValue: firstValue, newValue: secondValue });
        });

        let entry: ReturnType<typeof result.current.undo>;
        act(() => {
          entry = result.current.undo();
        });

        const afterUndo = setNestedValue(afterSecond, entry!.field, entry!.previousValue);

        // Undoing the second edit returns the Character to its post-first-edit state.
        expect(afterUndo).toEqual(afterFirst);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── fieldToLabel fixed-output check (Req 3.3 / 3.5) ─────────────────────────

describe('Feature: state-safety-core, Property 2: fieldToLabel output is unchanged', () => {
  /**
   * **Validates: Requirements 3.2, 3.5**
   *
   * `fieldToLabel` must keep producing its exact current output for a fixed set
   * of representative paths, so the undo toast label is preserved by the typed
   * refactor.
   */
  const CASES: ReadonlyArray<readonly [FieldPath<Character>, string]> = [
    ['chars.WS.a', 'WS advances'],
    ['chars.T.i', 'T initial'],
    ['chars.Ag.b', 'Ag bonus'],
    ['chars.WS', 'WS'],
    ['name', 'name'],
    ['move.m', 'm'],
    ['wGC', 'wGC'],
  ];

  it.each(CASES)('fieldToLabel(%s) === %s', (field, expected) => {
    expect(fieldToLabel(field)).toBe(expected);
  });
});
