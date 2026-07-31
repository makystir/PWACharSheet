import fc from 'fast-check';
import type {
  Character,
  CharacteristicKey,
  CharacteristicValue,
  Skill,
  Talent,
  Condition,
  WeaponItem,
  ArmourItem,
  ArmourPoints,
  SpellItem,
  AmmoItem,
  Companion,
  MutationEntry,
  Trapping,
  Enterprise,
  EnterpriseType,
  EnterpriseCurrency,
  EnterpriseIncomeSource,
  GrudgeEntry,
  GrudgeType,
  GrudgeStatus,
  PsychologyTrait,
  PsychologyType,
  CriticalWound,
  RitualItem,
  Hireling,
  HouseRules,
  Estate,
  YenluiState,
  RangedDamageSBMode,
} from '../../../types/character';
import { BLANK_CHARACTER } from '../../../types/character';

const CHARACTERISTIC_KEYS: CharacteristicKey[] = [
  'WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel',
];

// --- Helper Arbitraries ---

const arbitraryCharacteristicValue: fc.Arbitrary<CharacteristicValue> = fc.record({
  i: fc.integer({ min: 0, max: 99 }),
  a: fc.integer({ min: 0, max: 99 }),
  b: fc.integer({ min: 0, max: 99 }),
});

const arbitraryCharacteristics: fc.Arbitrary<Record<CharacteristicKey, CharacteristicValue>> =
  fc.tuple(
    arbitraryCharacteristicValue, // WS
    arbitraryCharacteristicValue, // BS
    arbitraryCharacteristicValue, // S
    arbitraryCharacteristicValue, // T
    arbitraryCharacteristicValue, // I
    arbitraryCharacteristicValue, // Ag
    arbitraryCharacteristicValue, // Dex
    arbitraryCharacteristicValue, // Int
    arbitraryCharacteristicValue, // WP
    arbitraryCharacteristicValue, // Fel
  ).map(([WS, BS, S, T, I, Ag, Dex, Int, WP, Fel]) => ({
    WS, BS, S, T, I, Ag, Dex, Int, WP, Fel,
  }));

const arbitrarySkill: fc.Arbitrary<Skill> = fc.record({
  n: fc.string({ minLength: 1, maxLength: 30 }),
  c: fc.constantFrom(...CHARACTERISTIC_KEYS),
  a: fc.integer({ min: 0, max: 50 }),
});

const arbitraryTalent: fc.Arbitrary<Talent> = fc.record({
  n: fc.string({ minLength: 1, maxLength: 30 }),
  lvl: fc.integer({ min: 1, max: 5 }),
  desc: fc.string({ minLength: 0, maxLength: 80 }),
});

export const arbitraryCondition: fc.Arbitrary<Condition> = fc.record({
  name: fc.constantFrom(
    'Ablaze', 'Bleeding', 'Blinded', 'Broken', 'Deafened',
    'Entangled', 'Fatigued', 'Poisoned', 'Prone', 'Stunned',
    'Surprised', 'Unconscious',
  ),
  level: fc.integer({ min: 0, max: 3 }),
  duration: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  source: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
});

export const arbitraryWeapon: fc.Arbitrary<WeaponItem> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  group: fc.constantFrom('Basic', 'Cavalry', 'Fencing', 'Brawling', 'Flail', 'Polearm', 'Two-Handed', 'Bow', 'Crossbow', 'Blackpowder', 'Engineering', 'Entangling', 'Explosives', 'Sling', 'Throwing'),
  enc: fc.integer({ min: 0, max: 5 }).map(String),
  rangeReach: fc.option(fc.string({ minLength: 1, maxLength: 15 }), { nil: undefined }),
  damage: fc.string({ minLength: 1, maxLength: 10 }),
  qualities: fc.string({ minLength: 0, maxLength: 50 }),
  equipped: fc.option(fc.boolean(), { nil: undefined }),
});

const arbitraryArmour: fc.Arbitrary<ArmourItem> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  locations: fc.constantFrom('Head', 'Body', 'Arms', 'Legs', 'All', 'Head, Body', 'Arms, Legs'),
  enc: fc.integer({ min: 0, max: 5 }).map(String),
  ap: fc.integer({ min: 1, max: 6 }),
  qualities: fc.string({ minLength: 0, maxLength: 50 }),
  worn: fc.option(fc.boolean(), { nil: undefined }),
});

export const arbitrarySpell: fc.Arbitrary<SpellItem> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  cn: fc.integer({ min: 0, max: 20 }).map(String),
  range: fc.constantFrom('You', 'Touch', 'Willpower yards', 'Willpower Bonus yards', 'Fellowship Bonus yards'),
  target: fc.constantFrom('You', '1', 'AoE (Willpower Bonus yards)', 'Special'),
  duration: fc.constantFrom('Instant', 'Willpower Bonus Rounds', 'Willpower Bonus Minutes', 'Special'),
  effect: fc.string({ minLength: 1, maxLength: 100 }),
  memorized: fc.option(fc.boolean(), { nil: undefined }),
});

export const arbitraryAmmo: fc.Arbitrary<AmmoItem> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  quantity: fc.integer({ min: 0, max: 50 }),
  max: fc.integer({ min: 1, max: 50 }),
  enc: fc.integer({ min: 0, max: 3 }).map(String),
  qualities: fc.string({ minLength: 0, maxLength: 50 }),
});

export const arbitraryCompanion: fc.Arbitrary<Companion> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  species: fc.constantFrom('Horse', 'Dog', 'Cat', 'Hawk', 'Pony', 'Mule', 'Wolf'),
  M: fc.integer({ min: 1, max: 12 }),
  WS: fc.integer({ min: 5, max: 60 }),
  BS: fc.integer({ min: 0, max: 40 }),
  S: fc.integer({ min: 5, max: 60 }),
  T: fc.integer({ min: 5, max: 60 }),
  I: fc.integer({ min: 5, max: 60 }),
  Ag: fc.integer({ min: 5, max: 60 }),
  Dex: fc.integer({ min: 5, max: 40 }),
  Int: fc.integer({ min: 5, max: 40 }),
  WP: fc.integer({ min: 5, max: 50 }),
  Fel: fc.integer({ min: 5, max: 40 }),
  W: fc.integer({ min: 1, max: 30 }),
  wCur: fc.integer({ min: 0, max: 30 }),
  traits: fc.string({ minLength: 0, maxLength: 80 }),
  trained: fc.array(fc.constantFrom('Broken', 'Drive', 'Entertain', 'Fetch', 'Guard', 'Home', 'Magic', 'Mount', 'War'), { minLength: 0, maxLength: 4 }),
  notes: fc.string({ minLength: 0, maxLength: 50 }),
  isPackAnimal: fc.option(fc.boolean(), { nil: undefined }),
});

export const arbitraryMutation: fc.Arbitrary<MutationEntry> = fc.record({
  id: fc.integer({ min: 1, max: 1000 }),
  type: fc.constantFrom('physical', 'mental') as fc.Arbitrary<'physical' | 'mental'>,
  name: fc.string({ minLength: 1, maxLength: 30 }),
  effect: fc.string({ minLength: 1, maxLength: 80 }),
});

const arbitraryTrapping: fc.Arbitrary<Trapping> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  enc: fc.integer({ min: 0, max: 5 }).map(String),
  quantity: fc.integer({ min: 1, max: 10 }),
  storedOnHorse: fc.option(fc.boolean(), { nil: undefined }),
});

// --- New Optional Section Arbitraries ---

const arbitraryCurrency: fc.Arbitrary<EnterpriseCurrency> = fc.record({
  gc: fc.integer({ min: 0, max: 999 }),
  ss: fc.integer({ min: 0, max: 999 }),
  d: fc.integer({ min: 0, max: 999 }),
});

const arbitraryIncomeSource: fc.Arbitrary<EnterpriseIncomeSource> = fc.record({
  id: fc.string({ minLength: 5, maxLength: 10 }),
  description: fc.string({ minLength: 1, maxLength: 50 }),
  earningSkill: fc.string({ minLength: 1, maxLength: 30 }),
  effectiveStatus: fc.constantFrom('Brass 3', 'Silver 1', 'Silver 2', 'Silver 5', 'Gold 1'),
});

export const arbitraryEnterprise: fc.Arbitrary<Enterprise> = fc.record({
  id: fc.string({ minLength: 5, maxLength: 10 }),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  type: fc.constantFrom(
    'Courier Service', 'Crafting Workshop', 'Criminal Gang', 'Holy Temple',
    'Knightly Order', 'Tavern', 'Market Parlour', 'Noble Estate',
    'Performance Troupe', 'Publishing House',
  ) as fc.Arbitrary<EnterpriseType>,
  expansionLevel: fc.integer({ min: 1, max: 4 }),
  debt: arbitraryCurrency,
  creditorName: fc.string({ minLength: 0, maxLength: 30 }),
  interestPayment: arbitraryCurrency,
  incomeSources: fc.array(arbitraryIncomeSource, { minLength: 0, maxLength: 3 }),
  trappings: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 3 }),
  specialRules: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 3 }),
  notes: fc.string({ minLength: 0, maxLength: 80 }),
});

export const arbitraryGrudgeEntry: fc.Arbitrary<GrudgeEntry> = fc.record({
  id: fc.string({ minLength: 5, maxLength: 10 }),
  offence: fc.string({ minLength: 1, maxLength: 50 }),
  perpetrator: fc.string({ minLength: 1, maxLength: 30 }),
  restitution: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constantFrom('standard', 'blood') as fc.Arbitrary<GrudgeType>,
  status: fc.constantFrom('outstanding', 'satisfied') as fc.Arbitrary<GrudgeStatus>,
  isPartyGrudge: fc.boolean(),
  dateRecorded: fc.constant('2024-01-15'),
  dateSatisfied: fc.option(fc.constant('2024-03-20'), { nil: undefined }),
});

export const arbitraryPsychologyTrait: fc.Arbitrary<PsychologyTrait> = fc.record({
  id: fc.string({ minLength: 5, maxLength: 10 }),
  type: fc.constantFrom('Animosity', 'Hatred', 'Fear', 'Terror', 'Frenzy', 'Prejudice', 'Phobia', 'Trauma') as fc.Arbitrary<PsychologyType>,
  target: fc.string({ minLength: 1, maxLength: 30 }),
  rating: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
});

export const arbitraryCriticalWound: fc.Arbitrary<CriticalWound> = fc.record({
  id: fc.integer({ min: 1, max: 1000 }),
  timestamp: fc.integer({ min: 1000000, max: 9999999 }),
  location: fc.constantFrom('Head', 'Body', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg'),
  description: fc.string({ minLength: 1, maxLength: 50 }),
  effects: fc.string({ minLength: 1, maxLength: 80 }),
  duration: fc.constantFrom('Until healed', 'Permanent', '1d10 days', 'Until treated'),
  severity: fc.integer({ min: 1, max: 4 }),
  healed: fc.boolean(),
  healedAt: fc.option(fc.integer({ min: 1000000, max: 9999999 }), { nil: undefined }),
});

export const arbitraryRitualItem: fc.Arbitrary<RitualItem> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  cn: fc.integer({ min: 0, max: 20 }),
  type: fc.constantFrom('Ward', 'Enchantment', 'Summoning', 'Divination', 'Curse'),
  learningXP: fc.integer({ min: 50, max: 200 }),
  ingredients: fc.string({ minLength: 0, maxLength: 50 }),
  conditions: fc.string({ minLength: 0, maxLength: 50 }),
  description: fc.string({ minLength: 1, maxLength: 80 }),
});

export const arbitraryHireling: fc.Arbitrary<Hireling> = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  name: fc.string({ minLength: 1, maxLength: 20 }),
  role: fc.constantFrom('Mercenary', 'Scout', 'Lawyer', 'Physician', 'Servant', 'Guard'),
  status: fc.constantFrom('Brass 3', 'Silver 1', 'Silver 3', 'Gold 1'),
  M: fc.integer({ min: 3, max: 6 }),
  WS: fc.integer({ min: 10, max: 60 }),
  BS: fc.integer({ min: 10, max: 60 }),
  S: fc.integer({ min: 10, max: 60 }),
  T: fc.integer({ min: 10, max: 60 }),
  I: fc.integer({ min: 10, max: 60 }),
  Ag: fc.integer({ min: 10, max: 60 }),
  Dex: fc.integer({ min: 10, max: 60 }),
  Int: fc.integer({ min: 10, max: 60 }),
  WP: fc.integer({ min: 10, max: 60 }),
  Fel: fc.integer({ min: 10, max: 60 }),
  W: fc.integer({ min: 5, max: 20 }),
  wCur: fc.integer({ min: 0, max: 20 }),
  skills: fc.string({ minLength: 0, maxLength: 80 }),
  talents: fc.string({ minLength: 0, maxLength: 50 }),
  traits: fc.string({ minLength: 0, maxLength: 50 }),
  trappings: fc.string({ minLength: 0, maxLength: 50 }),
  template: fc.string({ minLength: 0, maxLength: 20 }),
  physicalQuirk: fc.string({ minLength: 0, maxLength: 30 }),
  workEthic: fc.string({ minLength: 0, maxLength: 30 }),
  personalityQuirk: fc.string({ minLength: 0, maxLength: 30 }),
  upkeep: arbitraryCurrency,
  conditions: fc.array(
    fc.record({ name: fc.string({ minLength: 1, maxLength: 15 }), level: fc.integer({ min: 0, max: 3 }) }),
    { minLength: 0, maxLength: 3 },
  ),
  notes: fc.string({ minLength: 0, maxLength: 50 }),
});

export const arbitraryHouseRules: fc.Arbitrary<HouseRules> = fc.record({
  rangedDamageSBMode: fc.constantFrom('none', 'halfSB', 'fullSB') as fc.Arbitrary<RangedDamageSBMode>,
  impaleCritsOnTens: fc.boolean(),
  min1Wound: fc.boolean(),
  advantageCap: fc.integer({ min: 0, max: 20 }),
  useGroupAdvantage: fc.boolean(),
  useYenlui: fc.boolean(),
  useGrudgeBook: fc.boolean(),
  usePsychologyTracker: fc.boolean(),
  useCriticalDeflection: fc.boolean(),
  useEnterprises: fc.boolean(),
});

export const arbitraryEstate: fc.Arbitrary<Estate> = fc.record({
  name: fc.string({ minLength: 0, maxLength: 30 }),
  location: fc.string({ minLength: 0, maxLength: 30 }),
  description: fc.string({ minLength: 0, maxLength: 80 }),
  treasury: arbitraryCurrency,
  monthlyIncome: arbitraryCurrency,
  monthlyExpenses: arbitraryCurrency,
  ledger: fc.constant([]),
  notes: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 3 }),
  holdings: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 3 }),
});

export const arbitraryArmourPoints: fc.Arbitrary<ArmourPoints> = fc.record({
  head: fc.integer({ min: 0, max: 10 }),
  lArm: fc.integer({ min: 0, max: 10 }),
  rArm: fc.integer({ min: 0, max: 10 }),
  body: fc.integer({ min: 0, max: 10 }),
  lLeg: fc.integer({ min: 0, max: 10 }),
  rLeg: fc.integer({ min: 0, max: 10 }),
  shield: fc.integer({ min: 0, max: 5 }),
});

// --- Main Character Arbitrary ---

export function arbitraryCharacter(): fc.Arbitrary<Character> {
  return fc.record({
    chars: arbitraryCharacteristics,
    bSkills: fc.array(arbitrarySkill, { minLength: 0, maxLength: 5 }),
    aSkills: fc.array(arbitrarySkill, { minLength: 0, maxLength: 5 }),
    talents: fc.array(arbitraryTalent, { minLength: 0, maxLength: 5 }),
    conditions: fc.array(arbitraryCondition, { minLength: 0, maxLength: 5 }),
    weapons: fc.array(arbitraryWeapon, { minLength: 0, maxLength: 5 }),
    armour: fc.array(arbitraryArmour, { minLength: 0, maxLength: 5 }),
    spells: fc.array(arbitrarySpell, { minLength: 0, maxLength: 5 }),
    ammo: fc.array(arbitraryAmmo, { minLength: 0, maxLength: 5 }),
    companions: fc.array(arbitraryCompanion, { minLength: 0, maxLength: 5 }),
    mutations: fc.array(arbitraryMutation, { minLength: 0, maxLength: 5 }),
    trappings: fc.array(arbitraryTrapping, { minLength: 0, maxLength: 5 }),
    criticalWounds: fc.array(arbitraryCriticalWound, { minLength: 0, maxLength: 3 }),
    hirelings: fc.array(arbitraryHireling, { minLength: 0, maxLength: 3 }),
    enterprises: fc.array(arbitraryEnterprise, { minLength: 0, maxLength: 3 }),
    grudges: fc.array(arbitraryGrudgeEntry, { minLength: 0, maxLength: 3 }),
    psychologyTraits: fc.array(arbitraryPsychologyTrait, { minLength: 0, maxLength: 4 }),
    rituals: fc.array(arbitraryRitualItem, { minLength: 0, maxLength: 3 }),
    estate: arbitraryEstate,
    houseRules: arbitraryHouseRules,
    yenluiState: fc.option(
      fc.constantFrom('light', 'balanced', 'dark') as fc.Arbitrary<YenluiState>,
      { nil: undefined },
    ),
    name: fc.string({ minLength: 0, maxLength: 30 }),
    species: fc.constantFrom('Human', 'Dwarf', 'Halfling', 'High Elf', 'Wood Elf'),
    career: fc.string({ minLength: 0, maxLength: 30 }),
    careerLevel: fc.string({ minLength: 0, maxLength: 30 }),
    wCur: fc.integer({ min: 0, max: 30 }),
    wHardy: fc.integer({ min: 0, max: 5 }),
    fate: fc.integer({ min: 0, max: 5 }),
    fortune: fc.integer({ min: 0, max: 5 }),
    resilience: fc.integer({ min: 0, max: 5 }),
    resolve: fc.integer({ min: 0, max: 5 }),
    corr: fc.integer({ min: 0, max: 20 }),
    sin: fc.integer({ min: 0, max: 10 }),
  }).map((generated) => ({
    ...BLANK_CHARACTER,
    ...generated,
    _v: 7 as const,
  }));
}
