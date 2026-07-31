import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CAREER_SCHEMES } from '../careers';
import { SPECIES_DATA } from '../species';

// ─── Expected Values (Source of Truth: docs/dwarfguide.md) ───────────────────

const RUNESMITH_EXPECTED = {
  level1: {
    title: 'Apprentice Runesmith',
    status: 'Silver 2',
    skills: ['Art (Sculpture or Engraving)', 'Consume Alcohol', 'Cool', 'Endurance', 'Evaluate', 'Intuition', 'Lore (Runes)', 'Melee (Basic or Two-handed)', 'Runesmithing', 'Trade (Smith)'],
    talents: ['Detect Artefact', 'Magic Resistance', 'Rune Magic (Rune of Striking)', 'Strong Back'],
  },
  level2: {
    title: 'Runesmith',
    status: 'Silver 5',
    skills: ['Art (Sculpture or Engraving)', 'Athletics', 'Consume Alcohol', 'Cool', 'Dodge', 'Endurance', 'Evaluate', 'Intimidate', 'Intuition', 'Lore (Geology or Metallurgy)', 'Lore (Runes)', 'Melee (Basic or Two-handed)', 'Perception', 'Runesmithing', 'Stealth (Any One)', 'Trade (Smith)'],
    talents: ['Detect Artefact', 'Forgefire', 'Magic Defiance', 'Magic Resistance', 'Magical Sense', 'Rune Magic (All Forms)', 'Rune Magic (Rune of Striking)', 'Strong Back'],
  },
  level3: {
    title: 'Runemaster',
    status: 'Gold 2',
    skills: ['Art (Sculpture or Engraving)', 'Athletics', 'Climb', 'Consume Alcohol', 'Cool', 'Dodge', 'Endurance', 'Evaluate', 'Intimidate', 'Intuition', 'Lore (Geology or Metallurgy)', 'Lore (Runes)', 'Melee (Basic or Two-handed)', 'Navigation', 'Perception', 'Pick Lock', 'Runesmithing', 'Set Trap', 'Stealth (Any One)', 'Trade (Smith)'],
    talents: ['Acute Sense (Touch)', 'Detect Artefact', 'Forgefire', 'Long Memory', 'Magic Defiance', 'Magic Resistance', 'Magical Sense', 'Master Rune Magic (All Forms)', 'Rune Magic (All Forms)', 'Rune Magic (Rune of Striking)', 'Strong Back', 'Tireless'],
  },
  level4: {
    title: 'Runelord',
    status: 'Gold 4',
    skills: ['Art (Sculpture or Engraving)', 'Athletics', 'Climb', 'Consume Alcohol', 'Cool', 'Dodge', 'Endurance', 'Evaluate', 'Intimidate', 'Intuition', 'Leadership', 'Lore (Any)', 'Lore (Geology or Metallurgy)', 'Lore (Runes)', 'Melee (Basic or Two-handed)', 'Navigation', 'Perception', 'Pick Lock', 'Runesmithing', 'Set Trap', 'Stealth (Any One)', 'Trade (Smith)'],
    talents: ['Acute Sense (Touch)', 'Ancestral Grudge', 'Detect Artefact', 'Forgefire', 'Iron Will', 'Long Memory', 'Magic Defiance', 'Magic Resistance', 'Magical Sense', 'Master Rune Magic (All Forms)', 'Menacing', 'Pure Soul', 'Rune Magic (All Forms)', 'Rune Magic (Rune of Striking)', 'Strong Back', 'Tireless'],
  },
};

const RUNESCRIBE_EXPECTED = {
  level1: {
    title: 'Apprentice Runescribe',
    status: 'Brass 3',
    skills: ['Art (Writing)', 'Consume Alcohol', 'Entertain (Singing or Storytelling)', 'Evaluate', 'Gamble', 'Haggle', 'Language (Any One)', 'Lore (Any One)', 'Research', 'Stealth (Any One)'],
    talents: ['Read/Write', 'Speedreader', 'Super Numerate', 'Supportive'],
  },
  level2: {
    title: 'Runescribe',
    status: 'Silver 2',
    skills: ['Art (Writing)', 'Consume Alcohol', 'Entertain (Singing or Storytelling)', 'Evaluate', 'Gamble', 'Gossip', 'Haggle', 'Intuition', 'Language (Any One)', 'Lore (Any One)', 'Navigation', 'Perception', 'Research', 'Stealth (Any One)', 'Trade (Any One)'],
    talents: ['Acute Sense (Touch)', 'Bookish', 'Lip Reading', 'Long Memory', 'Read/Write', 'Speedreader', 'Super Numerate', 'Supportive'],
  },
  level3: {
    title: 'Lorekeeper',
    status: 'Silver 5',
    skills: ['Art (Writing)', 'Consume Alcohol', 'Entertain (Singing or Storytelling)', 'Evaluate', 'Gamble', 'Gossip', 'Haggle', 'Heal', 'Intuition', 'Language (Any One)', 'Lore (Any One)', 'Navigation', 'Outdoor Survival', 'Perception', 'Research', 'Stealth (Any One)', 'Track', 'Trade (Any One)'],
    talents: ['Acute Sense (Touch)', 'Ancestral Grudge', 'Bookish', 'Gregarious', 'Linguistics', 'Lip Reading', 'Long Memory', 'Read/Write', 'Savant (Any One)', 'Speedreader', 'Super Numerate', 'Supportive'],
  },
  level4: {
    title: 'Loremaster',
    status: 'Gold 2',
    skills: ['Art (Writing)', 'Consume Alcohol', 'Cool', 'Entertain (Singing or Storytelling)', 'Evaluate', 'Gamble', 'Gossip', 'Haggle', 'Heal', 'Intuition', 'Language (Any One)', 'Lore (Any One)', 'Navigation', 'Outdoor Survival', 'Perception', 'Research', 'Stealth (Any One)', 'Track', 'Trade (Any One)'],
    talents: ['Acute Sense (Touch)', 'Ancestral Grudge', 'Blather', 'Bookish', 'Detect Artefact', 'Gregarious', 'Linguistics', 'Lip Reading', 'Long Memory', 'Public Speaker', 'Read/Write', 'Savant (Any One)', 'Speedreader', 'Super Numerate', 'Supportive', 'Tireless'],
  },
};

const DWARF_SUBRACE_EXPECTED_TALENTS: Record<string, string[]> = {
  'Dwarfs (Karaz-a-Karak)': ['Ancestral Grudge or Resolute', 'Magic Resistance', 'Night Vision', 'Read/Write or Relentless', 'Sturdy'],
  'Dwarfs (Barak Varr)': ['Dealmaker or Strong-minded', 'Magic Resistance', 'Night Vision', 'Read/Write or Resolute', 'Sturdy'],
  'Dwarfs (Karak Azul)': ['Hatred (Orcs and Goblins) or Resolute', 'Magic Resistance', 'Night Vision', 'Read/Write or Relentless', 'Sturdy'],
  'Dwarfs (Karak Eight Peaks)': ['Magic Resistance', 'Night Vision', 'Read/Write or Resolute', 'Strong-minded or Tenacious', 'Sturdy'],
  'Dwarfs (Karak Kadrin)': ['Iron Jaw or Read/Write', 'Magic Resistance', 'Night Vision', 'Resolute or Strong-minded', 'Sturdy'],
  'Dwarfs (Zhufbar)': ['Magic Resistance', 'Night Vision', 'Read/Write or Relentless', 'Strong-minded or Tinker', 'Sturdy'],
  'Dwarfs (Karak Hirn/Black Mountains)': ['Magic Resistance', 'Night Vision', 'Read/Write or Relentless', 'Scale Sheer Surface or Strong-minded', 'Sturdy'],
  'Dwarfs (Karak Izor/The Vaults)': ['Enclosed Fighter or Resolute', 'Magic Resistance', 'Night Vision', 'Read/Write or Relentless', 'Sturdy'],
  'Dwarfs (Karak Norn/Grey Mountains)': ['Magic Resistance', 'Night Vision', 'Read/Write or Relentless', 'Resolute or Stone Soup', 'Sturdy'],
  'Dwarfs (Norse)': ['Carouser or Strong-minded', 'Magic Resistance', 'Night Vision', 'Read/Write or Relentless', 'Sturdy'],
  'Dwarfs (Imperial)': ['Magic Resistance', 'Night Vision', 'Read/Write or Relentless', 'Resolute or Strong-minded', 'Sturdy'],
};

const DWARF_SUBRACE_NAMES = Object.keys(DWARF_SUBRACE_EXPECTED_TALENTS);

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Bug Condition: Dwarf Career & Subrace Data Mismatch', () => {
  /**
   * Property 1: Bug Condition - Runesmith career data matches source of truth
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4
   */
  it('Runesmith career levels match expected status, title, skills, and talents', () => {
    const runesmith = CAREER_SCHEMES['Runesmith'];
    const levels = [
      { key: 'level1' as const, expected: RUNESMITH_EXPECTED.level1 },
      { key: 'level2' as const, expected: RUNESMITH_EXPECTED.level2 },
      { key: 'level3' as const, expected: RUNESMITH_EXPECTED.level3 },
      { key: 'level4' as const, expected: RUNESMITH_EXPECTED.level4 },
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...levels),
        ({ key, expected }) => {
          const actual = runesmith[key]!;
          expect(actual.status).toBe(expected.status);
          expect(actual.title).toBe(expected.title);
          expect(actual.skills).toEqual(expected.skills);
          expect(actual.talents).toEqual(expected.talents);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1: Bug Condition - Runescribe career data matches source of truth
   * Validates: Requirements 1.5, 1.6, 1.7, 1.8
   */
  it('Runescribe career levels match expected status, title, skills, and talents', () => {
    const runescribe = CAREER_SCHEMES['Runescribe'];
    const levels = [
      { key: 'level1' as const, expected: RUNESCRIBE_EXPECTED.level1 },
      { key: 'level2' as const, expected: RUNESCRIBE_EXPECTED.level2 },
      { key: 'level3' as const, expected: RUNESCRIBE_EXPECTED.level3 },
      { key: 'level4' as const, expected: RUNESCRIBE_EXPECTED.level4 },
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...levels),
        ({ key, expected }) => {
          const actual = runescribe[key]!;
          expect(actual.status).toBe(expected.status);
          expect(actual.title).toBe(expected.title);
          expect(actual.skills).toEqual(expected.skills);
          expect(actual.talents).toEqual(expected.talents);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1: Bug Condition - Runescribe must NOT include magical talents
   * Validates: Requirements 1.6, 1.7, 1.8
   */
  it('Runescribe career levels must not include magical talents', () => {
    const runescribe = CAREER_SCHEMES['Runescribe'];
    const magicalTalents = ['Rune Magic', 'Runesmithing', 'Master Rune Magic'];
    const levels = ['level2', 'level3', 'level4'] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...levels),
        (key) => {
          const actual = runescribe[key]!;
          for (const magical of magicalTalents) {
            expect(actual.talents).not.toContain(magical);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1: Bug Condition - Dwarf subrace talents match source of truth
   * Validates: Requirements 1.9, 1.10, 1.11
   */
  it('Dwarf subrace talents match expected values with proper "X or Y" choice format', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DWARF_SUBRACE_NAMES),
        (subraceName) => {
          const actual = SPECIES_DATA[subraceName];
          const expected = DWARF_SUBRACE_EXPECTED_TALENTS[subraceName];

          // Should have exactly 5 talent entries
          expect(actual.talents).toHaveLength(5);

          // Should match expected talents exactly
          expect(actual.talents).toEqual(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1: Bug Condition - No standalone "Ancestral Grudge" in non-Karaz-a-Karak subraces
   * Validates: Requirement 1.9
   */
  it('Non-Karaz-a-Karak Dwarf subraces must not have standalone "Ancestral Grudge"', () => {
    const nonKarazSubraces = DWARF_SUBRACE_NAMES.filter(n => n !== 'Dwarfs (Karaz-a-Karak)');

    fc.assert(
      fc.property(
        fc.constantFrom(...nonKarazSubraces),
        (subraceName) => {
          const actual = SPECIES_DATA[subraceName];
          // "Ancestral Grudge" as a standalone (not part of "X or Y") should not exist
          expect(actual.talents).not.toContain('Ancestral Grudge');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1: Bug Condition - Dwarf subrace talents use proper choice format
   * Validates: Requirement 1.10
   */
  it('All Dwarf subrace talent entries use proper "X or Y" choice format where expected', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DWARF_SUBRACE_NAMES),
        (subraceName) => {
          const actual = SPECIES_DATA[subraceName];
          const expected = DWARF_SUBRACE_EXPECTED_TALENTS[subraceName];

          // Count how many expected talents contain " or " (choice format)
          const expectedChoices = expected.filter(t => t.includes(' or '));
          // Count how many actual talents contain " or " (choice format)
          const actualChoices = actual.talents.filter(t => t.includes(' or '));

          // Should have the same number of choice-format talents
          expect(actualChoices.length).toBe(expectedChoices.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
