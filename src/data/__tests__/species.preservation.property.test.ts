import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { SPECIES_DATA } from '../species';

/**
 * Property 2: Preservation - Unchanged Species Data Integrity
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 *
 * For any species entry where the bug condition does NOT hold,
 * all fields must match the observed snapshot of the UNFIXED code.
 *
 * Observation-first methodology: These snapshots are taken from
 * the current (unfixed) SPECIES_DATA values.
 */

// ─── Bug Condition Definition ────────────────────────────────────────────────
// These species+field combos are the ONLY ones being corrected:
// - Halfling: skills field
// - High Elf: skills field
// - High Elves (Sea Elf): talents field

interface BugConditionEntry {
  speciesKey: string;
  affectedField: 'skills' | 'talents';
}

const BUG_CONDITION_ENTRIES: BugConditionEntry[] = [
  { speciesKey: 'Halfling', affectedField: 'skills' },
  { speciesKey: 'High Elf', affectedField: 'skills' },
  { speciesKey: 'High Elves (Sea Elf)', affectedField: 'talents' },
];

function isBugConditionSpecies(key: string): boolean {
  return BUG_CONDITION_ENTRIES.some((e) => e.speciesKey === key);
}

function isAffectedField(speciesKey: string, field: string): boolean {
  return BUG_CONDITION_ENTRIES.some(
    (e) => e.speciesKey === speciesKey && e.affectedField === field
  );
}

// ─── Observed Snapshot: Completely Unaffected Species ─────────────────────────
// These species have NO bug condition entries — all fields must be preserved.

const FULLY_PRESERVED_SPECIES_KEYS = [
  'Human / Reiklander',
  'Dwarf',
  'Dwarfs (Karaz-a-Karak)',
  'Dwarfs (Barak Varr)',
  'Dwarfs (Karak Azul)',
  'Dwarfs (Karak Eight Peaks)',
  'Dwarfs (Karak Kadrin)',
  'Dwarfs (Zhufbar)',
  'Dwarfs (Karak Hirn/Black Mountains)',
  'Dwarfs (Karak Izor/The Vaults)',
  'Dwarfs (Karak Norn/Grey Mountains)',
  'Dwarfs (Norse)',
  'Dwarfs (Imperial)',
  'Wood Elf',
  'High Elves (Caledor)',
  'High Elves (Ellyrion)',
  'High Elves (Avelorn)',
  'High Elves (Saphery)',
  'High Elves (Eataine)',
  'High Elves (Tiranoc)',
  'High Elves (Nagarythe)',
  'High Elves (Chrace)',
  'High Elves (Cothique)',
  'High Elves (Yvresse)',
  'Ogre',
];

// ─── Observed Snapshot: Full Species Data (from UNFIXED code) ────────────────

const OBSERVED_SNAPSHOT: Record<string, {
  chars: Record<string, number>;
  move: number;
  fate: number;
  resilience: number;
  extraPoints: number;
  woundsUseSB: boolean;
  woundMultiplier?: number;
  skills: string[];
  talents: string[];
  randomTalentSlots?: number;
}> = {
  'Human / Reiklander': {
    chars: { WS: 20, BS: 20, S: 20, T: 20, I: 20, Ag: 20, Dex: 20, Int: 20, WP: 20, Fel: 20 },
    move: 4,
    fate: 2,
    resilience: 1,
    extraPoints: 3,
    woundsUseSB: true,
    skills: ["Animal Care", "Charm", "Cool", "Evaluate", "Gossip", "Haggle", "Language (Bretonnian)", "Language (Wastelander)", "Leadership", "Lore (Reikland)", "Melee (Basic)", "Ranged (Bow)"],
    talents: ["Doomed", "Savvy or Suave"],
    randomTalentSlots: 3,
  },
  'Dwarf': {
    chars: { WS: 30, BS: 20, S: 20, T: 30, I: 20, Ag: 10, Dex: 30, Int: 20, WP: 40, Fel: 10 },
    move: 3,
    fate: 0,
    resilience: 2,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Intimidate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Geology)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any)"],
    talents: ["Magic Resistance", "Night Vision", "Read/Write or Relentless", "Resolute or Strong-minded", "Sturdy"],
  },
  'Dwarfs (Karaz-a-Karak)': {
    chars: { WS: 30, BS: 20, S: 20, T: 30, I: 20, Ag: 10, Dex: 30, Int: 20, WP: 40, Fel: 10 },
    move: 3,
    fate: 0,
    resilience: 2,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Language (Khazalid)", "Leadership", "Lore (Dwarfs)", "Lore (Geology)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any One)"],
    talents: ["Ancestral Grudge or Resolute", "Magic Resistance", "Night Vision", "Read/Write or Relentless", "Sturdy"],
  },
  'Dwarfs (Barak Varr)': {
    chars: { WS: 30, BS: 20, S: 20, T: 30, I: 20, Ag: 10, Dex: 30, Int: 20, WP: 40, Fel: 10 },
    move: 3,
    fate: 0,
    resilience: 2,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Haggle", "Language (Khazalid)", "Lore (Dwarfs)", "Melee (Basic)", "Navigation", "Sail", "Trade (Any One)"],
    talents: ["Dealmaker or Strong-minded", "Magic Resistance", "Night Vision", "Read/Write or Resolute", "Sturdy"],
  },
  'Dwarfs (Karak Azul)': {
    chars: { WS: 30, BS: 20, S: 20, T: 30, I: 20, Ag: 10, Dex: 30, Int: 20, WP: 40, Fel: 10 },
    move: 3,
    fate: 0,
    resilience: 2,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Climb", "Consume Alcohol", "Cool", "Endurance", "Evaluate", "Haggle", "Intimidate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any One)"],
    talents: ["Hatred (Orcs and Goblins) or Resolute", "Magic Resistance", "Night Vision", "Read/Write or Relentless", "Sturdy"],
  },
  'Dwarfs (Karak Eight Peaks)': {
    chars: { WS: 30, BS: 20, S: 20, T: 30, I: 20, Ag: 10, Dex: 30, Int: 20, WP: 40, Fel: 10 },
    move: 3,
    fate: 0,
    resilience: 2,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Consume Alcohol", "Cool", "Endurance", "Evaluate", "Intuition", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Geology)", "Lore (Warfare)", "Melee (Basic)", "Set Traps", "Trade (Any One)"],
    talents: ["Magic Resistance", "Night Vision", "Read/Write or Resolute", "Strong-minded or Tenacious", "Sturdy"],
  },
  'Dwarfs (Karak Kadrin)': {
    chars: { WS: 30, BS: 20, S: 20, T: 30, I: 20, Ag: 10, Dex: 30, Int: 20, WP: 40, Fel: 10 },
    move: 3,
    fate: 0,
    resilience: 2,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Gamble", "Intimidate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any One)"],
    talents: ["Iron Jaw or Read/Write", "Magic Resistance", "Night Vision", "Resolute or Strong-minded", "Sturdy"],
  },
  'Dwarfs (Zhufbar)': {
    chars: { WS: 30, BS: 20, S: 20, T: 30, I: 20, Ag: 10, Dex: 30, Int: 20, WP: 40, Fel: 10 },
    move: 3,
    fate: 0,
    resilience: 2,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Engineering)", "Lore (Geology)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any One)"],
    talents: ["Magic Resistance", "Night Vision", "Read/Write or Relentless", "Strong-minded or Tinker", "Sturdy"],
  },
  'Dwarfs (Karak Hirn/Black Mountains)': {
    chars: { WS: 30, BS: 20, S: 20, T: 30, I: 20, Ag: 10, Dex: 30, Int: 20, WP: 40, Fel: 10 },
    move: 3,
    fate: 0,
    resilience: 2,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Consume Alcohol", "Climb", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Haggle", "Language (Khazalid)", "Lore (Dwarfs)", "Melee (Basic)", "Play (Horn)", "Trade (Any One)"],
    talents: ["Magic Resistance", "Night Vision", "Read/Write or Relentless", "Scale Sheer Surface or Strong-minded", "Sturdy"],
  },
  'Dwarfs (Karak Izor/The Vaults)': {
    chars: { WS: 30, BS: 20, S: 20, T: 30, I: 20, Ag: 10, Dex: 30, Int: 20, WP: 40, Fel: 10 },
    move: 3,
    fate: 0,
    resilience: 2,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Consume Alcohol", "Climb", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Geology)", "Melee (Basic)", "Outdoor Survival", "Trade (Any One)"],
    talents: ["Enclosed Fighter or Resolute", "Magic Resistance", "Night Vision", "Read/Write or Relentless", "Sturdy"],
  },
  'Dwarfs (Karak Norn/Grey Mountains)': {
    chars: { WS: 30, BS: 20, S: 20, T: 30, I: 20, Ag: 10, Dex: 30, Int: 20, WP: 40, Fel: 10 },
    move: 3,
    fate: 0,
    resilience: 2,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Consume Alcohol", "Climb", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Language (Khazalid)", "Lore (Dwarfs)", "Melee (Basic)", "Perception", "Ranged (Crossbow)", "Trade (Any One)"],
    talents: ["Magic Resistance", "Night Vision", "Read/Write or Relentless", "Resolute or Stone Soup", "Sturdy"],
  },
  'Dwarfs (Norse)': {
    chars: { WS: 30, BS: 20, S: 20, T: 30, I: 20, Ag: 10, Dex: 30, Int: 20, WP: 40, Fel: 10 },
    move: 3,
    fate: 0,
    resilience: 2,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Climb", "Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Language (Khazalid)", "Language (Norse)", "Lore (Dwarfs)", "Melee (Basic)", "Sail", "Trade (Any One)"],
    talents: ["Carouser or Strong-minded", "Magic Resistance", "Night Vision", "Read/Write or Relentless", "Sturdy"],
  },
  'Dwarfs (Imperial)': {
    chars: { WS: 30, BS: 20, S: 20, T: 30, I: 20, Ag: 10, Dex: 30, Int: 20, WP: 40, Fel: 10 },
    move: 3,
    fate: 0,
    resilience: 2,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Consume Alcohol", "Cool", "Endurance", "Entertain (Storytelling)", "Evaluate", "Intimidate", "Language (Khazalid)", "Lore (Dwarfs)", "Lore (Geology)", "Lore (Metallurgy)", "Melee (Basic)", "Trade (Any One)"],
    talents: ["Magic Resistance", "Night Vision", "Read/Write or Relentless", "Resolute or Strong-minded", "Sturdy"],
  },
  'Wood Elf': {
    chars: { WS: 30, BS: 30, S: 20, T: 20, I: 40, Ag: 30, Dex: 30, Int: 30, WP: 30, Fel: 20 },
    move: 5,
    fate: 0,
    resilience: 0,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Athletics", "Climb", "Endurance", "Entertain (Sing)", "Intimidate", "Language (Eltharin)", "Melee (Basic)", "Outdoor Survival", "Perception", "Ranged (Bow)", "Stealth (Rural)", "Track"],
    talents: ["Acute Sense (Sight)", "Hardy or Second Sight", "Night Vision", "Read/Write or Very Resilient", "Rover"],
  },
  'High Elves (Caledor)': {
    chars: { WS: 30, BS: 30, S: 20, T: 20, I: 40, Ag: 30, Dex: 30, Int: 30, WP: 30, Fel: 20 },
    move: 5,
    fate: 0,
    resilience: 0,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Climb", "Cool", "Entertain (Singing)", "Evaluate", "Intimidate", "Language (Eltharin)", "Leadership", "Melee (Basic)", "Navigation", "Perception", "Ranged (Bow)", "Swim"],
    talents: ["Acute Sense (Sight)", "Commanding Presence or Resolute", "Night Vision", "Read/Write", "Second Sight or Strong-minded"],
  },
  'High Elves (Ellyrion)': {
    chars: { WS: 30, BS: 30, S: 20, T: 20, I: 40, Ag: 30, Dex: 30, Int: 30, WP: 30, Fel: 20 },
    move: 5,
    fate: 0,
    resilience: 0,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Animal Care", "Charm Animal", "Cool", "Entertain (Singing)", "Evaluate", "Language (Eltharin)", "Leadership", "Melee (Basic)", "Navigation", "Perception", "Play (Any)", "Ranged (Bow)", "Ride (Horse)"],
    talents: ["Acute Sense (Sight)", "Animal Affinity or Orientation", "Night Vision", "Read/Write", "Second Sight or Sixth Sense"],
  },
  'High Elves (Avelorn)': {
    chars: { WS: 30, BS: 30, S: 20, T: 20, I: 40, Ag: 30, Dex: 30, Int: 30, WP: 30, Fel: 20 },
    move: 5,
    fate: 0,
    resilience: 0,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Athletics", "Cool", "Entertain (Singing)", "Gossip", "Intuition", "Language (Eltharin)", "Leadership", "Melee (Basic)", "Navigation", "Perception", "Play (Any)", "Ranged (Bow)"],
    talents: ["Acute Sense (Sight)", "Attractive or Artistic", "Night Vision", "Read/Write", "Second Sight or Sixth Sense"],
  },
  'High Elves (Saphery)': {
    chars: { WS: 30, BS: 30, S: 20, T: 20, I: 40, Ag: 30, Dex: 30, Int: 30, WP: 30, Fel: 20 },
    move: 5,
    fate: 0,
    resilience: 0,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Cool", "Entertain (Singing)", "Evaluate", "Language (Eltharin)", "Lore (Any)", "Melee (Basic)", "Navigation", "Perception", "Play (Any)", "Ranged (Bow)", "Research"],
    talents: ["Acute Sense (Sight) or Bookish", "Coolheaded or Savvy", "Night Vision", "Read/Write", "Second Sight"],
  },
  'High Elves (Eataine)': {
    chars: { WS: 30, BS: 30, S: 20, T: 20, I: 40, Ag: 30, Dex: 30, Int: 30, WP: 30, Fel: 20 },
    move: 5,
    fate: 0,
    resilience: 0,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Charm", "Cool", "Entertain (Singing)", "Evaluate", "Gossip", "Language (Any)", "Language (Eltharin)", "Leadership", "Melee (Basic)", "Perception", "Sail", "Swim"],
    talents: ["Acute Sense (Sight)", "Dealmaker or Savvy", "Night Vision", "Read/Write", "Schemer or Sixth Sense"],
  },
  'High Elves (Tiranoc)': {
    chars: { WS: 30, BS: 30, S: 20, T: 20, I: 40, Ag: 30, Dex: 30, Int: 30, WP: 30, Fel: 20 },
    move: 5,
    fate: 0,
    resilience: 0,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Animal Care", "Cool", "Endurance", "Entertain (Singing)", "Language (Eltharin)", "Leadership", "Melee (Basic)", "Navigation", "Perception", "Play (Any)", "Ranged (Bow)", "Swim"],
    talents: ["Acute Sense (Sight)", "Coolheaded or Hatred (Dark Elves)", "Night Vision", "Read/Write", "Tenacious or Sixth Sense"],
  },
  'High Elves (Nagarythe)': {
    chars: { WS: 30, BS: 30, S: 20, T: 20, I: 40, Ag: 30, Dex: 30, Int: 30, WP: 30, Fel: 20 },
    move: 5,
    fate: 0,
    resilience: 0,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Athletics", "Cool", "Endurance", "Entertain (Singing)", "Language (Eltharin)", "Melee (Basic)", "Navigation", "Outdoor Survival", "Perception", "Ranged (Bow)", "Stealth (Rural)", "Swim"],
    talents: ["Acute Sense (Sight)", "Coolheaded or Tenacious", "Hatred (Dark Elves)", "Night Vision", "Read/Write", "Rover or Sixth Sense"],
  },
  'High Elves (Chrace)': {
    chars: { WS: 30, BS: 30, S: 20, T: 20, I: 40, Ag: 30, Dex: 30, Int: 30, WP: 30, Fel: 20 },
    move: 5,
    fate: 0,
    resilience: 0,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Cool", "Endurance", "Entertain (Singing)", "Evaluate", "Heal", "Language (Eltharin)", "Leadership", "Melee (Basic)", "Navigation", "Outdoor Survival", "Perception", "Ranged (Bow)", "Set Trap"],
    talents: ["Acute Sense (Sight)", "Hardy or Hunter's Eye", "Night Vision", "Read/Write", "Sixth Sense", "Strider (Woodlands)"],
  },
  'High Elves (Cothique)': {
    chars: { WS: 30, BS: 30, S: 20, T: 20, I: 40, Ag: 30, Dex: 30, Int: 30, WP: 30, Fel: 20 },
    move: 5,
    fate: 0,
    resilience: 0,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Athletics", "Cool", "Entertain (Singing)", "Evaluate", "Haggle", "Language (Eltharin)", "Melee (Basic)", "Navigation", "Perception", "Ranged (Bow)", "Sail", "Swim"],
    talents: ["Acute Sense (Sight)", "Strong Swimmer or Hardy", "Night Vision", "Read/Write", "Orientation or Sixth Sense"],
  },
  'High Elves (Yvresse)': {
    chars: { WS: 30, BS: 30, S: 20, T: 20, I: 40, Ag: 30, Dex: 30, Int: 30, WP: 30, Fel: 20 },
    move: 5,
    fate: 0,
    resilience: 0,
    extraPoints: 2,
    woundsUseSB: true,
    skills: ["Cool", "Endurance", "Entertain (Singing)", "Evaluate", "Intuition", "Language (Eltharin)", "Leadership", "Melee (Basic)", "Navigation", "Perception", "Ranged (Bow)", "Swim"],
    talents: ["Acute Sense (Sight)", "Coolheaded or Stout-hearted", "Night Vision", "Read/Write", "Resolute or Implacable", "Second Sight or Sixth Sense"],
  },
  'Ogre': {
    chars: { WS: 20, BS: 10, S: 35, T: 35, I: 0, Ag: 15, Dex: 10, Int: 10, WP: 20, Fel: 10 },
    move: 6,
    fate: 0,
    resilience: 3,
    extraPoints: 1,
    woundsUseSB: true,
    woundMultiplier: 2,
    skills: ["Athletics", "Consume Alcohol", "Endurance", "Entertain (Storytelling)", "Intimidate", "Language (Grumbarth)", "Lore (Ogres)", "Melee (Basic)", "Melee (Brawling)", "Navigation", "Outdoor Survival", "Track"],
    talents: ["Dirty Fighting", "Large", "Resistance (Chaos)", "Resistance (Poison (Ingested))", "Very Resilient or Very Strong", "Vice (Food)"],
  },
};

// ─── Observed Snapshot: Partially Affected Species (non-corrected fields) ────

const HALFLING_PRESERVED_FIELDS = {
  chars: { WS: 10, BS: 30, S: 10, T: 20, I: 20, Ag: 20, Dex: 30, Int: 20, WP: 30, Fel: 30 },
  move: 3,
  fate: 0,
  resilience: 2,
  extraPoints: 3,
  woundsUseSB: false,
  talents: ["Acute Sense (Taste)", "Night Vision", "Resistance (Chaos)", "Small"],
  randomTalentSlots: 2,
};

const SEA_ELF_PRESERVED_FIELDS = {
  chars: { WS: 30, BS: 30, S: 20, T: 20, I: 40, Ag: 30, Dex: 30, Int: 30, WP: 30, Fel: 20 },
  move: 5,
  fate: 0,
  resilience: 0,
  extraPoints: 2,
  woundsUseSB: true,
  skills: ["Cool", "Endurance", "Entertain (Singing)", "Evaluate", "Gossip", "Haggle", "Language (Eltharin)", "Language (Any)", "Melee (Basic)", "Navigation", "Sail", "Swim"],
};

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Preservation: Unchanged Species Data Integrity', () => {
  /**
   * Property 2: Preservation - Unchanged Species Data Integrity
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
   *
   * For all species keys where isBugCondition is false,
   * all fields match the observed snapshot.
   */
  it('fully preserved species have all fields matching observed snapshot', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FULLY_PRESERVED_SPECIES_KEYS),
        (speciesKey) => {
          const actual = SPECIES_DATA[speciesKey];
          const expected = OBSERVED_SNAPSHOT[speciesKey];

          // Characteristics
          expect(actual.chars).toEqual(expected.chars);
          // Movement & meta
          expect(actual.move).toBe(expected.move);
          expect(actual.fate).toBe(expected.fate);
          expect(actual.resilience).toBe(expected.resilience);
          expect(actual.extraPoints).toBe(expected.extraPoints);
          expect(actual.woundsUseSB).toBe(expected.woundsUseSB);
          // Skills and talents
          expect(actual.skills).toEqual(expected.skills);
          expect(actual.talents).toEqual(expected.talents);
          // Optional fields
          if (expected.randomTalentSlots !== undefined) {
            expect(actual.randomTalentSlots).toBe(expected.randomTalentSlots);
          }
          if (expected.woundMultiplier !== undefined) {
            expect((actual as any).woundMultiplier).toBe(expected.woundMultiplier);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
   *
   * For Halfling non-corrected fields (everything except skills),
   * values match observed snapshot.
   */
  it('Halfling non-corrected fields match observed snapshot', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'chars', 'move', 'fate', 'resilience',
          'extraPoints', 'woundsUseSB', 'talents', 'randomTalentSlots'
        ),
        (field) => {
          const actual = SPECIES_DATA['Halfling'];
          const expected = HALFLING_PRESERVED_FIELDS;

          switch (field) {
            case 'chars':
              expect(actual.chars).toEqual(expected.chars);
              break;
            case 'move':
              expect(actual.move).toBe(expected.move);
              break;
            case 'fate':
              expect(actual.fate).toBe(expected.fate);
              break;
            case 'resilience':
              expect(actual.resilience).toBe(expected.resilience);
              break;
            case 'extraPoints':
              expect(actual.extraPoints).toBe(expected.extraPoints);
              break;
            case 'woundsUseSB':
              expect(actual.woundsUseSB).toBe(expected.woundsUseSB);
              break;
            case 'talents':
              expect(actual.talents).toEqual(expected.talents);
              break;
            case 'randomTalentSlots':
              expect(actual.randomTalentSlots).toBe(expected.randomTalentSlots);
              break;
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
   *
   * For Sea Elf non-corrected fields (everything except talents),
   * values match observed snapshot.
   */
  it('Sea Elf non-corrected fields match observed snapshot', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'chars', 'move', 'fate', 'resilience',
          'extraPoints', 'woundsUseSB', 'skills'
        ),
        (field) => {
          const actual = SPECIES_DATA['High Elves (Sea Elf)'];
          const expected = SEA_ELF_PRESERVED_FIELDS;

          switch (field) {
            case 'chars':
              expect(actual.chars).toEqual(expected.chars);
              break;
            case 'move':
              expect(actual.move).toBe(expected.move);
              break;
            case 'fate':
              expect(actual.fate).toBe(expected.fate);
              break;
            case 'resilience':
              expect(actual.resilience).toBe(expected.resilience);
              break;
            case 'extraPoints':
              expect(actual.extraPoints).toBe(expected.extraPoints);
              break;
            case 'woundsUseSB':
              expect(actual.woundsUseSB).toBe(expected.woundsUseSB);
              break;
            case 'skills':
              expect(actual.skills).toEqual(expected.skills);
              break;
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
