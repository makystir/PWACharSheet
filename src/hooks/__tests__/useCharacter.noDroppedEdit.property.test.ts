import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useCharacter } from '../useCharacter';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';

/**
 * Feature: state-safety-core
 *   Property 3: No dropped edit   — **Validates: Requirements 4.1, 4.2, 4.5**
 *   Property 4: Same-tick freshness — **Validates: Requirements 5.1, 5.3**
 *
 * These property/regression tests exercise the reworked persistence model
 * (tasks 7–9): `commit(next)` sets `latestCharRef.current` synchronously before
 * `setCharacter`, both `update` and `updateCharacter` route through it, the four
 * Sync_Passes route through `commit`, and money-move handlers no longer pass an
 * explicit Character to `saveNow`. Persistence is asserted via the mocked
 * `saveCharacter`: the LAST persisted Character must equal the final /
 * post-mutation state — never a stale predecessor.
 *
 * Conventions mirror the existing hook tests
 * (useCharacter.save-flush.test.ts, useCharacter.depositTreasury.repro.test.ts):
 * mock `../../storage/character-manager` `saveCharacter`, `renderHook`/`act`,
 * `vi.useFakeTimers()`, `BLANK_CHARACTER`, and 500/600ms debounce advances.
 *
 * NOTE: the `initialCharacter` passed to `renderHook` MUST be a stable reference
 * across renders (created once per property run, not inline in the render
 * callback). A fresh object each render re-triggers the `[characterId,
 * initialCharacter]` reset effect on every render — an infinite reset loop.
 */

vi.mock('../../storage/character-manager', () => ({
  saveCharacter: vi.fn(),
}));

// Imported after the mock is registered.
import { saveCharacter } from '../../storage/character-manager';

const mockedSaveCharacter = vi.mocked(saveCharacter);

const TEST_ID = 'no-dropped-edit-char';

function makeCharacter(): Character {
  return structuredClone(BLANK_CHARACTER);
}

/** The Character passed to the most recent saveCharacter call, or null. */
function lastPersisted(): Character | null {
  const calls = mockedSaveCharacter.mock.calls;
  if (calls.length === 0) return null;
  return calls[calls.length - 1][1] as Character;
}

/** Advance past the 500ms debounce and let Sync_Pass effects settle. */
function settle() {
  act(() => {
    vi.advanceTimersByTime(600);
  });
}

describe('Feature: state-safety-core — no dropped edit & same-tick freshness', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedSaveCharacter.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Scenario (a) — No dropped edit under rapid successive updates.
   * **Validates: Requirements 4.1, 4.2, 4.5**
   *
   * A random sequence of N (2–8) `update` calls over a set of inert-ish leaves
   * (no Sync_Pass rewrites them on a blank character) is applied within a single
   * `act` (rapid succession), then the debounce fires. The debounce coalesces the
   * intermediate commits, but the FINAL committed state — the last write for each
   * touched field — must be what gets persisted, not a stale intermediate one.
   */
  describe('Scenario (a): rapid successive updates persist the final state', () => {
    // Inert leaves: name/move.m/wGC/chars.WS.a are not re-derived by any
    // Sync_Pass on a blank character, so the last write to each simply wins.
    const editArb = fc.oneof(
      fc.record({ kind: fc.constant('name' as const), value: fc.string({ maxLength: 12 }) }),
      fc.record({ kind: fc.constant('move.m' as const), value: fc.integer({ min: 0, max: 20 }) }),
      fc.record({ kind: fc.constant('wGC' as const), value: fc.integer({ min: 0, max: 999 }) }),
      // WS advance is not a wound input, so the wound Sync_Pass leaves it alone.
      fc.record({ kind: fc.constant('chars.WS.a' as const), value: fc.integer({ min: 0, max: 40 }) }),
    );

    it('the last of N rapid updates is the state that gets persisted', () => {
      fc.assert(
        fc.property(fc.array(editArb, { minLength: 2, maxLength: 8 }), (edits) => {
          mockedSaveCharacter.mockClear();
          const initial = makeCharacter();
          const { result, unmount } = renderHook(() => useCharacter(TEST_ID, initial));
          settle();

          // Apply every edit rapidly inside one act (coalesced by the debounce).
          act(() => {
            for (const e of edits) {
              switch (e.kind) {
                case 'name':
                  result.current.update('name', e.value as string);
                  break;
                case 'move.m':
                  result.current.update('move.m', e.value as number);
                  break;
                case 'wGC':
                  result.current.update('wGC', e.value as number);
                  break;
                case 'chars.WS.a':
                  result.current.update('chars.WS.a', e.value as number);
                  break;
              }
            }
          });

          // Fire the debounce; the final committed state is persisted.
          settle();

          const finalState = result.current.character;
          const persisted = lastPersisted();
          expect(persisted).not.toBeNull();
          // The persisted Character equals the final committed state — the last
          // write wins, intermediate ones coalesced, nothing stale saved (Req 4.2).
          expect(persisted).toEqual(finalState);

          unmount();
        }),
        { numRuns: 30 },
      );
    });
  });

  /**
   * Scenario (b) — Money-move then lifecycle persists the post-move state.
   * **Validates: Requirements 4.5, 5.3**
   *
   * A money-move via `updateCharacter(() => next)` mutates currency, then a
   * lifecycle event (beforeunload / visibility-hidden) fires IMMEDIATELY in the
   * same tick before the debounce. The synchronous flush reads the always-current
   * ref and persists the exact post-move Character — no `explicit` arg required.
   */
  describe('Scenario (b): money-move then lifecycle flush persists post-move state', () => {
    const amountArb = fc.record({
      gc: fc.integer({ min: 0, max: 500 }),
      ss: fc.integer({ min: 0, max: 500 }),
      d: fc.integer({ min: 0, max: 500 }),
    });

    /** Move all carried coin into the estate treasury (a money-move shape). */
    function moveToTreasury(next: { gc: number; ss: number; d: number }) {
      return (c: Character): Character => ({
        ...c,
        wGC: next.gc,
        wSS: next.ss,
        wD: next.d,
        estate: {
          ...c.estate,
          treasury: { gc: next.gc, ss: next.ss, d: next.d },
        },
      });
    }

    it('beforeunload right after a money-move persists the post-move currency', () => {
      fc.assert(
        fc.property(amountArb, (amount) => {
          mockedSaveCharacter.mockClear();
          const initial = makeCharacter();
          const { result, unmount } = renderHook(() => useCharacter(TEST_ID, initial));
          settle();
          mockedSaveCharacter.mockClear();

          act(() => {
            // Money-move: no saveNow(explicit) — relies on the always-current ref.
            result.current.updateCharacter(moveToTreasury(amount));
          });
          // Before the debounce fires (no timer advance): tab close. The edit's
          // debounce effect has armed pendingRef; flushSave reads the always-current
          // ref and persists the post-move state synchronously.
          act(() => {
            window.dispatchEvent(new Event('beforeunload'));
          });

          const postMove = result.current.character;
          const persisted = lastPersisted();
          expect(persisted).not.toBeNull();
          expect(persisted).toEqual(postMove);
          expect(persisted!.wGC).toBe(amount.gc);
          expect(persisted!.estate.treasury).toEqual(amount);

          unmount();
        }),
        { numRuns: 30 },
      );
    });

    it('visibility-hidden right after a money-move persists the post-move currency', () => {
      fc.assert(
        fc.property(amountArb, (amount) => {
          mockedSaveCharacter.mockClear();
          const initial = makeCharacter();
          const { result, unmount } = renderHook(() => useCharacter(TEST_ID, initial));
          settle();
          mockedSaveCharacter.mockClear();

          act(() => {
            result.current.updateCharacter(moveToTreasury(amount));
          });
          // Before the debounce fires (no timer advance): app backgrounded.
          act(() => {
            Object.defineProperty(document, 'visibilityState', {
              value: 'hidden',
              writable: true,
              configurable: true,
            });
            document.dispatchEvent(new Event('visibilitychange'));
          });

          const postMove = result.current.character;
          const persisted = lastPersisted();
          expect(persisted).not.toBeNull();
          expect(persisted).toEqual(postMove);
          expect(persisted!.estate.treasury).toEqual(amount);

          // Restore visibility for other tests.
          Object.defineProperty(document, 'visibilityState', {
            value: 'visible',
            writable: true,
            configurable: true,
          });

          unmount();
        }),
        { numRuns: 30 },
      );
    });

    it('Character_Switch after a money-move: the pre-switch debounce flush persisted the post-move state', () => {
      fc.assert(
        fc.property(amountArb, (amount) => {
          mockedSaveCharacter.mockClear();
          const charA = makeCharacter();
          const { result, rerender, unmount } = renderHook(
            ({ id, char }: { id: string; char: Character }) => useCharacter(id, char),
            { initialProps: { id: 'switch-char-a', char: charA } },
          );
          settle();
          mockedSaveCharacter.mockClear();

          // Money-move on character A.
          act(() => {
            result.current.updateCharacter(moveToTreasury(amount));
          });
          // Fire the debounce so the money-move is persisted BEFORE the switch.
          settle();

          // The post-move state must have been persisted for character A.
          const afterMove = lastPersisted();
          expect(afterMove).not.toBeNull();
          expect(afterMove!.estate.treasury).toEqual(amount);

          // Now switch to character B (prop-driven reset). The reset must not
          // clobber the money-move persistence that already happened.
          const charB = makeCharacter();
          charB.name = 'Character B';
          act(() => {
            rerender({ id: 'switch-char-b', char: charB });
          });
          settle();

          // The money-move save for A stands: the persisted-for-A snapshot carried
          // the post-move treasury (the reset itself is a no-op save, Req 6.1).
          expect(afterMove!.estate.treasury).toEqual(amount);

          unmount();
        }),
        { numRuns: 20 },
      );
    });
  });

  /**
   * Scenario (c) — Edit during a wound-field Sync_Pass persists both the edit
   * and the derived fields.
   * **Validates: Requirements 4.5** (also 4.4)
   *
   * Editing `chars.S.a` triggers the wound-field Sync_Pass (`syncWoundFields`),
   * which recomputes wSB/wTB2/wWPB. Both the triggering edit and the derived
   * fields must survive into the persisted Character — proving the derived write
   * routed through commit()/ref and neither the edit nor the derived fields were
   * dropped.
   *
   * WFRP4e Core p.36–37 wound formula: Strength Bonus = floor(Strength / 10);
   * `syncWoundFields` writes wSB = raw SB. We assert the derived wSB matches
   * floor(S / 10) rather than inventing a value.
   */
  describe('Scenario (c): edit during wound-field Sync_Pass persists edit + derived fields', () => {
    // 10..89 → SB 1..8 (a non-zero, predictable derived change on a blank char
    // whose S starts at 0).
    const strengthArb = fc.integer({ min: 10, max: 89 });

    it('a Strength advance persists the advance AND the recomputed wSB', () => {
      fc.assert(
        fc.property(strengthArb, (sAdvance) => {
          mockedSaveCharacter.mockClear();
          const initial = makeCharacter();
          const { result, unmount } = renderHook(() => useCharacter(TEST_ID, initial));
          settle();
          mockedSaveCharacter.mockClear();

          act(() => {
            // Triggers syncWoundFields (wound-field Sync_Pass).
            result.current.update('chars.S.a', sAdvance);
          });
          // Let the Sync_Pass and the debounce settle.
          settle();

          const persisted = lastPersisted();
          expect(persisted).not.toBeNull();
          // The triggering edit survived.
          expect(persisted!.chars.S.a).toBe(sAdvance);
          // The derived wound field the Sync_Pass wrote survived, and matches the
          // WFRP4e Core p.36–37 Strength Bonus = floor(Strength / 10).
          expect(persisted!.wSB).toBe(Math.floor(sAdvance / 10));
          // The persisted state equals the final committed state (both writes in).
          expect(persisted).toEqual(result.current.character);

          unmount();
        }),
        { numRuns: 25 },
      );
    });
  });

  /**
   * Scenario (d) — Same-tick freshness: mutate then synchronous flush.
   * **Validates: Requirements 5.1, 5.3**
   *
   * Mutate via update/updateCharacter, then WITHOUT advancing timers dispatch
   * `beforeunload` in the SAME tick. `flushSave` reads `latestCharRef.current`,
   * which `commit` set synchronously, so the persisted Character must equal the
   * just-mutated state — never a predecessor. This is the core anti-staleness
   * property; the mutation value is randomized each run.
   */
  describe('Scenario (d): mutate then synchronous same-tick flush persists post-mutation state', () => {
    const nameArb = fc.string({ minLength: 1, maxLength: 16 });

    it('beforeunload in the same tick as an update persists the post-mutation name', () => {
      fc.assert(
        fc.property(nameArb, (name) => {
          mockedSaveCharacter.mockClear();
          const initial = makeCharacter();
          const { result, unmount } = renderHook(() => useCharacter(TEST_ID, initial));
          settle();
          mockedSaveCharacter.mockClear();

          act(() => {
            result.current.update('name', name);
          });
          // No timer advance: the debounce has NOT fired. flushSave persists the
          // just-mutated state from the always-current ref (Req 5.1: never a
          // predecessor).
          act(() => {
            window.dispatchEvent(new Event('beforeunload'));
          });

          const persisted = lastPersisted();
          expect(persisted).not.toBeNull();
          // Never a predecessor: the persisted name is exactly the just-set value.
          expect(persisted!.name).toBe(name);
          expect(persisted).toEqual(result.current.character);

          unmount();
        }),
        { numRuns: 30 },
      );
    });

    it('beforeunload in the same tick as a money-move updateCharacter persists the post-mutation currency', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 9999 }), (gc) => {
          mockedSaveCharacter.mockClear();
          const initial = makeCharacter();
          const { result, unmount } = renderHook(() => useCharacter(TEST_ID, initial));
          settle();
          mockedSaveCharacter.mockClear();

          act(() => {
            result.current.updateCharacter((c) => ({ ...c, wGC: gc }));
          });
          // No timer advance: debounce has NOT fired; flushSave reads the fresh ref.
          act(() => {
            window.dispatchEvent(new Event('beforeunload'));
          });

          const persisted = lastPersisted();
          expect(persisted).not.toBeNull();
          expect(persisted!.wGC).toBe(gc);
          expect(persisted).toEqual(result.current.character);

          unmount();
        }),
        { numRuns: 30 },
      );
    });
  });
});
