import { describe, it, expect } from 'vitest';
import { syncWoundFields } from '../calculators';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, CharacteristicKey, CharacteristicValue } from '../../types/character';

// Helper: build a chars record from a simple map of { i, a } overrides (b defaults to 0)
function makeChars(
  overrides: Partial<Record<CharacteristicKey, { i: number; a: number }>> = {}
): Record<CharacteristicKey, CharacteristicValue> {
  const defaults: Record<CharacteristicKey, CharacteristicValue> = {
    WS: { i: 20, a: 0, b: 0 },
    BS: { i: 20, a: 0, b: 0 },
    S:  { i: 20, a: 0, b: 0 },
    T:  { i: 20, a: 0, b: 0 },
    I:  { i: 20, a: 0, b: 0 },
    Ag: { i: 20, a: 0, b: 0 },
    Dex:{ i: 20, a: 0, b: 0 },
    Int:{ i: 20, a: 0, b: 0 },
    WP: { i: 20, a: 0, b: 0 },
    Fel:{ i: 20, a: 0, b: 0 },
  };
  for (const [key, val] of Object.entries(overrides)) {
    defaults[key as CharacteristicKey] = { i: val.i, a: val.a, b: 0 };
  }
  return defaults;
}

// Helper: build a Character with specific chars and wound field overrides
function makeCharacter(
  charOverrides: Partial<Record<CharacteristicKey, { i: number; a: number }>> = {},
  extra: Partial<Character> = {}
): Character {
  return {
    ...BLANK_CHARACTER,
    chars: makeChars(charOverrides),
    ...extra,
  };
}

// ─── Bug Condition Exploration: Wound Component Fields Remain Stale ──────────
// Validates: Requirements 1.1, 1.2, 2.1, 2.2
//
// These tests confirm the bug exists: syncWoundFields does not exist yet,
// so wound component fields are never updated after characteristic advancement.
// All tests are EXPECTED TO FAIL on unfixed code.

describe('syncWoundFields — bug condition exploration', () => {
  it('Test Case 1 — Toughness advance crossing tens boundary: wTB2 should update', () => {
    // T initial=36, advances=4 → T=40, TB=4
    // Expected: wTB2 = 2 × 4 = 8
    // On unfixed code: wTB2 remains 0 (FAIL expected)
    const character = makeCharacter(
      { T: { i: 36, a: 4 } },
    );
    const result = syncWoundFields(character, 0);
    expect(result.wTB2).toBe(8);
  });

  it('Test Case 2 — Strength advance with woundsUseSB=true: wSB should update', () => {
    // S initial=30, advances=5 → S=35, SB=3
    // Expected: wSB = 3
    // On unfixed code: wSB remains 0 (FAIL expected)
    const character = makeCharacter(
      { S: { i: 30, a: 5 } },
      { woundsUseSB: true },
    );
    const result = syncWoundFields(character, 0);
    expect(result.wSB).toBe(3);
  });

  it('Test Case 3 — Willpower advance: wWPB should update', () => {
    // WP initial=25, advances=5 → WP=30, WPB=3
    // Expected: wWPB = 3
    // On unfixed code: wWPB remains 0 (FAIL expected)
    const character = makeCharacter(
      { WP: { i: 25, a: 5 } },
    );
    const result = syncWoundFields(character, 0);
    expect(result.wWPB).toBe(3);
  });

  it('Test Case 4 — Hardy talent: wHardy should update', () => {
    // T=40 (TB=4), Hardy level 1
    // Expected: wHardy = 1 × 4 = 4
    // On unfixed code: wHardy remains 0 (FAIL expected)
    const character = makeCharacter(
      { T: { i: 40, a: 0 } },
    );
    const result = syncWoundFields(character, 1);
    expect(result.wHardy).toBe(4);
  });

  it('Test Case 5 — All wound fields together', () => {
    // S=35 (SB=3), T=40 (TB=4), WP=30 (WPB=3), Hardy level 2, woundsUseSB=true
    // Expected: wSB=3, wTB2=8, wWPB=3, wHardy=2×4=8
    // On unfixed code: all remain 0 (FAIL expected)
    const character = makeCharacter(
      {
        S:  { i: 30, a: 5 },
        T:  { i: 36, a: 4 },
        WP: { i: 25, a: 5 },
      },
      { woundsUseSB: true },
    );
    const result = syncWoundFields(character, 2);
    expect(result.wSB).toBe(3);
    expect(result.wTB2).toBe(8);
    expect(result.wWPB).toBe(3);
    expect(result.wHardy).toBe(8);
  });
});

// ─── Preservation: Non-Wound State Unchanged by Sync ─────────────────────────
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
//
// These tests encode preservation requirements that must hold after the fix.
// Since syncWoundFields does not exist yet, all tests FAIL at import on unfixed code.

describe('syncWoundFields — preservation', () => {
  it('Test Case 1 — wCur is never modified', () => {
    const character = makeCharacter(
      { S: { i: 30, a: 0 }, T: { i: 30, a: 0 }, WP: { i: 30, a: 0 } },
      { wCur: 8 },
    );
    const result = syncWoundFields(character, 0);
    expect(result.wCur).toBe(8);
  });

  it('Test Case 2 — Non-wound characteristics unchanged', () => {
    const charOverrides = {
      WS: { i: 35, a: 5 },
      BS: { i: 40, a: 3 },
      S:  { i: 30, a: 0 },
      T:  { i: 30, a: 0 },
      I:  { i: 25, a: 10 },
      Ag: { i: 30, a: 2 },
      Dex:{ i: 28, a: 7 },
      Int:{ i: 45, a: 1 },
      WP: { i: 30, a: 0 },
      Fel:{ i: 50, a: 0 },
    };
    const character = makeCharacter(charOverrides);
    const result = syncWoundFields(character, 0);

    expect(result.chars.WS).toEqual({ i: 35, a: 5, b: 0 });
    expect(result.chars.BS).toEqual({ i: 40, a: 3, b: 0 });
    expect(result.chars.I).toEqual({ i: 25, a: 10, b: 0 });
    expect(result.chars.Ag).toEqual({ i: 30, a: 2, b: 0 });
    expect(result.chars.Dex).toEqual({ i: 28, a: 7, b: 0 });
    expect(result.chars.Int).toEqual({ i: 45, a: 1, b: 0 });
    expect(result.chars.Fel).toEqual({ i: 50, a: 0, b: 0 });
  });

  it('Test Case 3 — Returns same object when no fields changed', () => {
    // Pre-set wound fields to match what syncWoundFields would compute:
    // S=30 → SB=3, T=40 → TB=4, WP=20 → WPB=2, Hardy=0
    // wSB=3, wTB2=8, wWPB=2, wHardy=0
    const character = makeCharacter(
      { S: { i: 30, a: 0 }, T: { i: 40, a: 0 }, WP: { i: 20, a: 0 } },
      { wSB: 3, wTB2: 8, wWPB: 2, wHardy: 0 },
    );
    const result = syncWoundFields(character, 0);
    expect(result).toBe(character); // same reference — no unnecessary re-render
  });

  it('Test Case 4 — woundsUseSB=false still computes wSB', () => {
    // Halfling: woundsUseSB=false, S=30 (SB=3)
    // wSB field stores the bonus regardless of whether it's used in the total
    const character = makeCharacter(
      { S: { i: 30, a: 0 } },
      { woundsUseSB: false },
    );
    const result = syncWoundFields(character, 0);
    expect(result.wSB).toBe(3);
  });

  it('Test Case 5 — Zero characteristics produce zero wound fields', () => {
    const character = makeCharacter(
      { S: { i: 0, a: 0 }, T: { i: 0, a: 0 }, WP: { i: 0, a: 0 } },
    );
    const result = syncWoundFields(character, 0);
    expect(result.wSB).toBe(0);
    expect(result.wTB2).toBe(0);
    expect(result.wWPB).toBe(0);
    expect(result.wHardy).toBe(0);
  });

  it('Test Case 6 — Boundary: characteristics at tens boundary (10, 20, 30)', () => {
    // S=10 (SB=1), T=20 (TB=2), WP=30 (WPB=3)
    const character = makeCharacter(
      { S: { i: 10, a: 0 }, T: { i: 20, a: 0 }, WP: { i: 30, a: 0 } },
    );
    const result = syncWoundFields(character, 0);
    expect(result.wSB).toBe(1);
    expect(result.wTB2).toBe(4);
    expect(result.wWPB).toBe(3);
  });

  it('Test Case 7 — Boundary: characteristics just below tens boundary (9, 19, 29)', () => {
    // S=9 (SB=0), T=19 (TB=1), WP=29 (WPB=2)
    const character = makeCharacter(
      { S: { i: 9, a: 0 }, T: { i: 19, a: 0 }, WP: { i: 29, a: 0 } },
    );
    const result = syncWoundFields(character, 0);
    expect(result.wSB).toBe(0);
    expect(result.wTB2).toBe(2);
    expect(result.wWPB).toBe(2);
  });

  it('Test Case 8 — Hardy level 0 produces wHardy=0', () => {
    // T=40 (TB=4), Hardy=0
    const character = makeCharacter(
      { T: { i: 40, a: 0 } },
    );
    const result = syncWoundFields(character, 0);
    expect(result.wHardy).toBe(0);
  });

  it('Test Case 9 — Hardy level 3 with high Toughness', () => {
    // T=50 (TB=5), Hardy=3 → wHardy = 3 × 5 = 15
    const character = makeCharacter(
      { T: { i: 50, a: 0 } },
    );
    const result = syncWoundFields(character, 3);
    expect(result.wHardy).toBe(15);
  });
});
