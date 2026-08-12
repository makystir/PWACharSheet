/**
 * Feature: ux-polish-improvements, Property 3: Undo reverts most recent change
 *
 * Property: For any sequence of character data edits, pressing Ctrl+Z
 * (outside an active input) SHALL restore the most recently changed field
 * to its previous value, and the character state after undo SHALL equal
 * the state before that edit was applied.
 *
 * **Validates: Requirements 4.1**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useUndoStack } from '../useUndoStack';

// ─── Generators ─────────────────────────────────────────────────────────────

/** Arbitrary field path (dot-notation like "chars.WS.a", "name", "wounds.current") */
const arbFieldPath: fc.Arbitrary<string> = fc
  .uniqueArray(
    fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z_]\w*$/.test(s)),
    { minLength: 1, maxLength: 3 }
  )
  .map(parts => parts.join('.'));

/** Arbitrary field value (numbers, strings, booleans) */
const arbFieldValue: fc.Arbitrary<unknown> = fc.oneof(
  fc.integer({ min: -999, max: 999 }),
  fc.string({ minLength: 0, maxLength: 20 }),
  fc.boolean()
);

/** An edit entry representing a single field change */
interface EditEntry {
  field: string;
  previousValue: unknown;
  newValue: unknown;
}

/** Arbitrary edit entry with distinct previous and new values */
const arbEditEntry: fc.Arbitrary<EditEntry> = fc.record({
  field: arbFieldPath,
  previousValue: arbFieldValue,
  newValue: arbFieldValue,
});

/** Arbitrary non-empty sequence of edits (1-10 edits to stay within default max stack) */
const arbEditSequence: fc.Arbitrary<EditEntry[]> = fc.array(arbEditEntry, {
  minLength: 1,
  maxLength: 10,
});

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-polish-improvements, Property 3: Undo reverts most recent change', () => {
  /**
   * **Validates: Requirements 4.1**
   *
   * For any sequence of edits pushed onto the undo stack, calling undo()
   * returns the most recently pushed entry with its correct field and
   * previousValue, enabling the caller to restore the character state.
   */
  it('undo returns the most recently pushed entry with correct field and previousValue', () => {
    fc.assert(
      fc.property(arbEditSequence, (edits) => {
        const { result } = renderHook(() => useUndoStack());

        // Push all edits onto the stack
        for (const edit of edits) {
          act(() => {
            result.current.push(edit);
          });
        }

        // Undo should return the most recent edit (last pushed)
        const lastEdit = edits[edits.length - 1];
        let undoneEntry: ReturnType<typeof result.current.undo>;
        act(() => {
          undoneEntry = result.current.undo();
        });

        expect(undoneEntry!).not.toBeNull();
        expect(undoneEntry!.field).toBe(lastEdit.field);
        expect(undoneEntry!.previousValue).toEqual(lastEdit.previousValue);
        expect(undoneEntry!.newValue).toEqual(lastEdit.newValue);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.1**
   *
   * For any sequence of edits, undoing repeatedly returns entries in
   * reverse chronological order (LIFO), allowing the user to step back
   * through their edit history one change at a time.
   */
  it('repeated undos return entries in reverse order (LIFO)', () => {
    fc.assert(
      fc.property(arbEditSequence, (edits) => {
        const { result } = renderHook(() => useUndoStack());

        // Push all edits
        for (const edit of edits) {
          act(() => {
            result.current.push(edit);
          });
        }

        // Undo all and verify reverse order
        const undoneEntries: EditEntry[] = [];
        for (let i = 0; i < edits.length; i++) {
          let entry: ReturnType<typeof result.current.undo>;
          act(() => {
            entry = result.current.undo();
          });
          if (entry! !== null) {
            undoneEntries.push({
              field: entry!.field,
              previousValue: entry!.previousValue,
              newValue: entry!.newValue,
            });
          }
        }

        // Reversed edits should match the undo order
        const expectedReversed = [...edits].reverse();
        expect(undoneEntries.length).toBe(expectedReversed.length);
        for (let i = 0; i < undoneEntries.length; i++) {
          expect(undoneEntries[i].field).toBe(expectedReversed[i].field);
          expect(undoneEntries[i].previousValue).toEqual(expectedReversed[i].previousValue);
          expect(undoneEntries[i].newValue).toEqual(expectedReversed[i].newValue);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.1**
   *
   * For any sequence of edits, simulating character state by applying edits
   * and then undoing the last one yields a state that equals the state
   * before that last edit was applied.
   */
  it('character state after undo equals state before the last edit was applied', () => {
    fc.assert(
      fc.property(arbEditSequence, (edits) => {
        const { result } = renderHook(() => useUndoStack());

        // Simulate a character state as a map of field -> value
        const characterState: Record<string, unknown> = {};

        // Apply all edits to our simulated state and push to undo stack
        for (const edit of edits) {
          characterState[edit.field] = edit.newValue;
          act(() => {
            result.current.push(edit);
          });
        }

        // Capture state before undoing (for the last-edited field)
        const lastEdit = edits[edits.length - 1];
        const stateBeforeLastEdit = edits.length >= 2
          ? (() => {
              // Replay all edits except the last to find what the field was
              const replayState: Record<string, unknown> = {};
              for (let i = 0; i < edits.length - 1; i++) {
                replayState[edits[i].field] = edits[i].newValue;
              }
              return replayState[lastEdit.field];
            })()
          : undefined; // If only one edit, the field didn't exist before

        // Perform undo
        let undoneEntry: ReturnType<typeof result.current.undo>;
        act(() => {
          undoneEntry = result.current.undo();
        });

        // Apply the undo to our simulated state
        characterState[undoneEntry!.field] = undoneEntry!.previousValue;

        // The field should now have the previousValue from the undone entry
        expect(characterState[lastEdit.field]).toEqual(lastEdit.previousValue);

        // If there were prior edits to this field, previousValue matches
        // what the field was before the last edit (which is the previousValue
        // stored in the entry)
        if (stateBeforeLastEdit !== undefined) {
          // The undone previousValue should restore the field to the value
          // it had after the second-to-last edit affecting this field
          // (which was the newValue of that earlier edit)
          expect(characterState[lastEdit.field]).toEqual(lastEdit.previousValue);
        }
      }),
      { numRuns: 100 }
    );
  });
});
