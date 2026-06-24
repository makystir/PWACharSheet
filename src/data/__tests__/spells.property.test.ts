import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { SPELL_LIST } from '../../data/spells';

// ─── Canonical name sets ─────────────────────────────────────────────────────

const BLESSINGS = [
  'Blessing of Battle', 'Blessing of Breath', 'Blessing of Charisma',
  'Blessing of Conscience', 'Blessing of Courage', 'Blessing of Finesse',
  'Blessing of Fortune', 'Blessing of Grace', 'Blessing of Hardiness',
  'Blessing of Healing', 'Blessing of The Hunt', 'Blessing of Might',
  'Blessing of Protection', 'Blessing of Recuperation', 'Blessing of Righteousness',
  'Blessing of Savagery', 'Blessing of Tenacity', 'Blessing of Wisdom',
  'Blessing of Wit',
] as const;

const MIRACLES_MANANN = [
  'Becalm', "Drowned Man's Face", 'Fair Winds', "Manann's Bounty", 'Sea Legs', 'Waterwalk',
] as const;

const MIRACLES_MORR = [
  'Death Mask', 'Destroy Undead', 'Dooming', 'Last Rites', "Portal's Threshold", "Stay Morr's Hand",
] as const;

const MIRACLES_MYRMIDIA = [
  'Command the Legion', 'Dismay Foe', 'In Good Order', 'Know Your Enemy',
  'On Deadly Ground', 'Quick Strike', "Shieldmaiden's Devotion", 'Skill of Combat', 'Vengeful Wrath',
] as const;

const MIRACLES_RANALD = [
  'An Invitation', "Cat's Eyes", "Ranald's Grace",
  'Rich Man Poor Man Beggar Man Thief', 'Stay Lucky', "You Ain't Seen Me Right?",
] as const;

const MIRACLES_RHYA = [
  "Rhya's Children", "Rhya's Harvest", "Rhya's Shelter",
  "Rhya's Succour", "Rhya's Touch", "Rhya's Union",
] as const;

const MIRACLES_SHALLYA = [
  "Anchorite's Endurance", 'Balm to a Wounded Mind', 'Bitter Catharsis',
  'Martyr', "Shallya's Tears", 'Unblemished Innocence',
] as const;

const MIRACLES_SIGMAR = [
  'Beacon of Righteous Virtue', 'Heed Not the Witch', "Sigmar's Fiery Hammer",
  'Soulfire', 'Twin-tailed Comet', 'Vanquish the Unrighteous',
] as const;

const MIRACLES_TAAL = [
  'Animal Instincts', 'King of the Wild', 'Leaping Stag',
  'Lord of the Hunt', 'Tanglefoot', 'Tooth and Claw',
] as const;

const MIRACLES_ULRIC = [
  "Hoarfrost's Chill", 'Howl of the Wolf', "Ulric's Fury",
  'Pelt of the Winter Wolf', "The Snow King's Judgement", "Winter's Bite",
] as const;

const MIRACLES_VERENA = [
  'As Verena Is My Witness', 'Blind Justice', 'Shackles of Truth',
  'Sword of Justice', 'Truth Will Out', 'Wisdom of the Owl',
] as const;

const ALL_MIRACLES = [
  ...MIRACLES_MANANN, ...MIRACLES_MORR, ...MIRACLES_MYRMIDIA,
  ...MIRACLES_RANALD, ...MIRACLES_RHYA, ...MIRACLES_SHALLYA,
  ...MIRACLES_SIGMAR, ...MIRACLES_TAAL, ...MIRACLES_ULRIC, ...MIRACLES_VERENA,
] as const;

const ALL_DIVINE_NAMES = new Set<string>([...BLESSINGS, ...ALL_MIRACLES]);

// Pre-compute a name lookup map for SPELL_LIST
const SPELL_BY_NAME = new Map(SPELL_LIST.map(s => [s.name, s]));

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: empire-deity-miracles', () => {
  /**
   * Property 1: All canonical miracles exist in SPELL_LIST
   * Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1
   */
  it('Property 1: All canonical miracles exist in SPELL_LIST', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_MIRACLES),
        (miracleName) => {
          expect(SPELL_BY_NAME.has(miracleName)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: All miracle and blessing entries have non-empty fields
   * Validates: Requirements 1.3, 2.3, 3.3, 4.3, 5.3, 6.3, 7.3, 8.3, 9.3
   */
  it('Property 2: All miracle and blessing entries have non-empty fields', () => {
    const divineNames = [...ALL_DIVINE_NAMES];

    fc.assert(
      fc.property(
        fc.constantFrom(...divineNames),
        (name) => {
          const entry = SPELL_BY_NAME.get(name);
          expect(entry).toBeDefined();
          expect(entry!.name.length).toBeGreaterThan(0);
          expect(entry!.cn.length).toBeGreaterThan(0);
          expect(entry!.range.length).toBeGreaterThan(0);
          expect(entry!.target.length).toBeGreaterThan(0);
          expect(entry!.duration.length).toBeGreaterThan(0);
          expect(entry!.effect.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: All blessings and miracles use cn:"-"
   * Validates: Requirements 1.4, 2.4, 3.4, 4.4, 5.4, 6.4, 7.4, 8.4, 9.4, 10.1, 10.2
   */
  it('Property 3: All blessings and miracles use cn:"-"', () => {
    const divineNames = [...ALL_DIVINE_NAMES];

    fc.assert(
      fc.property(
        fc.constantFrom(...divineNames),
        (name) => {
          const entry = SPELL_BY_NAME.get(name);
          expect(entry).toBeDefined();
          expect(entry!.cn).toBe('-');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Non-divine spells retain numeric CN values
   * Validates: Requirements 11.2
   */
  it('Property 4: Non-divine spells retain numeric CN values', () => {
    const nonDivineSpells = SPELL_LIST.filter(s => !ALL_DIVINE_NAMES.has(s.name));

    fc.assert(
      fc.property(
        fc.constantFrom(...nonDivineSpells),
        (spell) => {
          const parsed = parseInt(spell.cn, 10);
          expect(Number.isNaN(parsed)).toBe(false);
          expect(parsed).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
