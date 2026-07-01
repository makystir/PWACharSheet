import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterPage } from '../CharacterPage';
import {
  getBonus,
  computeWoundMaximum,
  calculateMaxEncumbrance,
} from '../../../logic/calculators';
import type { Character, CharacteristicKey, CharacteristicValue, ArmourPoints } from '../../../types/character';

/**
 * Validates: Requirements 3.1, 3.2, 3.3
 *
 * Property 2: Preservation - Talent Bonus Display and Derived Calculations Unchanged
 *
 * These tests observe and lock in the CURRENT behavior of the unfixed code.
 * They must PASS on unfixed code, confirming the baseline behavior to preserve.
 */

const CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

// --- Generators ---

const arbitraryCharacteristicValue: fc.Arbitrary<CharacteristicValue> = fc.record({
  i: fc.integer({ min: 0, max: 99 }),
  a: fc.integer({ min: 0, max: 99 }),
  b: fc.integer({ min: 0, max: 9 }),
});

const arbitraryCharacteristics: fc.Arbitrary<Record<CharacteristicKey, CharacteristicValue>> =
  fc.tuple(
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
  ).map(([WS, BS, S, T, I, Ag, Dex, Int, WP, Fel]) => ({
    WS, BS, S, T, I, Ag, Dex, Int, WP, Fel,
  }));

// --- Helpers ---

function createCharacterWithChars(chars: Record<CharacteristicKey, CharacteristicValue>): Character {
  return {
    _v: 7,
    name: 'Test',
    species: 'Human',
    class: '',
    career: 'Soldier',
    careerLevel: 'Silver 1',
    careerPath: '',
    status: '',
    age: '',
    height: '',
    hair: '',
    eyes: '',
    chars,
    charBonusOverrides: {} as Character['charBonusOverrides'],
    move: { m: 4, w: 8, r: 16 },
    fate: 2,
    fortune: 2,
    resilience: 2,
    resolve: 2,
    motivation: '',
    speciesExtraPoints: 3,
    speciesSkills: [],
    speciesTalents: [],
    woundsUseSB: true,
    xpCur: 0,
    xpSpent: 0,
    xpTotal: 0,
    conditions: [],
    advantage: 0,
    sessionState: { active: false, startTime: 0, elapsed: 0, xpAwarded: 0 },
    combatState: { active: false, round: 0, engaged: false },
    advancementLog: [],
    advancementLogArchive: [],
    sessionHistory: [],
    quickActions: [],
    criticalWounds: [],
    bSkills: [],
    aSkills: [],
    talents: [],
    ambS: '',
    ambL: '',
    partyN: '',
    partyS: '',
    partyL: '',
    partyM: '',
    psych: '',
    armour: [],
    ap: { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 },
    trappings: [],
    wD: 0,
    wSS: 0,
    wGC: 0,
    eMax: 0,
    eMaxOverride: null,
    wSB: 0,
    wTB2: 0,
    wWPB: 0,
    wHardy: 0,
    wCur: 12,
    weapons: [],
    spells: [],
    channellingProgress: [],
    ammo: [],
    corr: 0,
    sin: 0,
    muts: '',
    mutations: [],
    companions: [],
    estate: { holdings: [], ledger: [], retainers: [], notes: '' },
    endeavours: [],
    portrait: '',
    houseRules: {} as Character['houseRules'],
    knownRunes: [],
    learnedTechniques: [],
    log: [],
  } as Character;
}

const defaultArmourPoints: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

describe('Feature: characteristic-bonus-display — Preservation Properties', () => {
  /**
   * Validates: Requirements 3.1
   *
   * Property: For all CharacteristicValue objects (i: 0-99, a: 0-99, b: 0-9),
   * the talent bonus cell displays c.b (or "—" when zero) - unchanged from pre-fix.
   */
  it('Property 2a: Talent bonus cell displays c.b or "—" when zero', () => {
    fc.assert(
      fc.property(
        arbitraryCharacteristics,
        (chars) => {
          const character = createCharacterWithChars(chars);

          const { container } = render(
            <CharacterPage
              character={character}
              update={vi.fn()}
              updateCharacter={vi.fn()}
              totalWounds={12}
              armourPoints={defaultArmourPoints}
              maxEncumbrance={30}
              coinWeight={0}
              rollHistory={[]}
              addRoll={vi.fn()}
              clearHistory={vi.fn()}
            />
          );

          // The characteristics table is rendered in the Identity tab by default
          const table = container.querySelector('table');
          if (!table) return;

          // Find the talent bonus column index dynamically by header title
          const headers = table.querySelectorAll('thead th');
          let talentBonusColIndex = -1;
          headers.forEach((th, idx) => {
            if (th.getAttribute('title') === 'Talent Bonus') {
              talentBonusColIndex = idx;
            }
          });
          expect(talentBonusColIndex).toBeGreaterThan(-1);

          const rows = table.querySelectorAll('tbody tr');

          // Each row corresponds to a characteristic in CHAR_KEYS order
          CHAR_KEYS.forEach((key, index) => {
            const row = rows[index];
            if (!row) return;
            const cells = row.querySelectorAll('td');
            const bonusCell = cells[talentBonusColIndex];
            const c = chars[key];
            const expectedDisplay = c.b > 0 ? String(c.b) : '—';
            expect(bonusCell?.textContent).toBe(expectedDisplay);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 3.2
   *
   * Property: For all valid inputs, getBonus(value) equals Math.floor(value / 10)
   * (function behavior preserved).
   */
  it('Property 2b: getBonus(value) equals Math.floor(value / 10) for all valid inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 207 }), // max possible: 99 + 99 + 9 = 207
        (value) => {
          expect(getBonus(value)).toBe(Math.floor(value / 10));
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Validates: Requirements 3.2
   *
   * Property: For random S, T, WP values and Hardy levels,
   * computeWoundMaximum returns identical results to the expected formula.
   */
  it('Property 2c: computeWoundMaximum matches expected formula for all inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 207 }), // strength total
        fc.integer({ min: 0, max: 207 }), // toughness total
        fc.integer({ min: 0, max: 207 }), // willpower total
        fc.integer({ min: 0, max: 5 }),   // hardy level
        fc.boolean(),                       // woundsUseSB
        (strength, toughness, willpower, hardyLevel, woundsUseSB) => {
          const result = computeWoundMaximum(strength, toughness, willpower, hardyLevel, woundsUseSB);

          const expectedSB = woundsUseSB ? Math.floor(strength / 10) : 0;
          const expectedTB = 2 * Math.floor(toughness / 10);
          const expectedWPB = Math.floor(willpower / 10);
          const expectedHardy = hardyLevel * Math.floor(toughness / 10);
          const expectedTotal = expectedSB + expectedTB + expectedWPB + expectedHardy;

          expect(result.sb).toBe(expectedSB);
          expect(result.tb).toBe(expectedTB);
          expect(result.wpb).toBe(expectedWPB);
          expect(result.hardy).toBe(expectedHardy);
          expect(result.total).toBe(expectedTotal);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Validates: Requirements 3.2, 3.3
   *
   * Property: For random S, T values and Strong Back levels,
   * calculateMaxEncumbrance returns identical results to the expected formula.
   */
  it('Property 2d: calculateMaxEncumbrance matches expected formula for all inputs', () => {
    fc.assert(
      fc.property(
        arbitraryCharacteristics,
        fc.integer({ min: 0, max: 5 }), // strongBackLevel
        (chars, strongBackLevel) => {
          const result = calculateMaxEncumbrance(chars, strongBackLevel);

          const sTotal = chars.S.i + chars.S.a + chars.S.b;
          const tTotal = chars.T.i + chars.T.a + chars.T.b;
          const expectedSB = Math.floor(sTotal / 10);
          const expectedTB = Math.floor(tTotal / 10);
          const expected = Math.max(0, expectedSB + expectedTB + strongBackLevel);

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });
});
