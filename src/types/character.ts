import type { AncestorGod } from '../data/deityRunes';
import type { ActiveDisease } from '../logic/diseases';
import type { ObsessionData } from '../logic/obsessions';

export type CharacteristicKey = 'WS' | 'BS' | 'S' | 'T' | 'I' | 'Ag' | 'Dex' | 'Int' | 'WP' | 'Fel';

// Consumables (Requirement 10)
export interface Consumable {
  id: string;
  name: string;
  currentDoses: number;
  maxDoses: number;
  effect: string;
}

// Psychology traits (Requirement 11)
export type PsychologyType = 'Animosity' | 'Hatred' | 'Fear' | 'Terror' | 'Frenzy' | 'Prejudice' | 'Phobia' | 'Trauma';

export interface PsychologyTrait {
  id: string;
  type: PsychologyType;
  target: string;     // For Animosity, Hatred, Prejudice: text target
  rating?: number;    // For Fear, Terror: numeric rating
}

// Initiative tracker (Requirement 19)
export interface Combatant {
  id: string;
  name: string;
  initiative: number;
}

export interface CharacteristicValue {
  i: number;  // Initial
  a: number;  // Advance
  b: number;  // Bonus (from talents)
}

export type ArmourType = 'SoftKit' | 'BoiledLeather' | 'Chainmail' | 'Brigandine' | 'Plate';

export interface ArmourItem {
  name: string;
  locations: string;
  enc: string;
  ap: number;
  qualities: string;
  worn?: boolean;
  runes?: string[];
  armourType?: ArmourType;
  currentAp?: number;
  visorOpen?: boolean;
}

export interface ArmourPoints {
  head: number;
  lArm: number;
  rArm: number;
  body: number;
  lLeg: number;
  rLeg: number;
  shield: number;
}

export interface CareerLevel {
  title: string;
  status: string;
  characteristics: CharacteristicKey[];
  skills: string[];
  talents: string[];
  trappings?: string[];
}

export interface CareerScheme {
  class: string;
  level1?: CareerLevel;
  level2: CareerLevel;
  level3: CareerLevel;
  level4: CareerLevel;
  level5?: CareerLevel;
}

export interface WeaponData {
  name: string;
  group: string;
  enc: string;
  rangeReach?: string;
  damage: string;
  qualities: string;
  maxR?: string;
  optR?: string;
  rangeMod?: string;
  reload?: string;
}

export interface ArmourData {
  name: string;
  locations: string;
  enc: string;
  ap: number;
  qualities: string;
  armourType: ArmourType;
}

export interface SpellData {
  name: string;
  cn: string;
  range: string;
  target: string;
  duration: string;
  effect: string;
  lore: string;
}

export interface ConditionData {
  name: string;
  stackable: boolean;
  maxLevel: number;
  description: string;
  effects: string;
  defaultDuration: string;
  removedBy: string;
}

export interface SpeciesData {
  chars: Record<CharacteristicKey, number>;
  move: number;
  fate: number;
  resilience: number;
  extraPoints: number;
  woundsUseSB: boolean;
  skills: string[];
  talents: string[];
  randomTalentSlots?: number;
  woundMultiplier?: number;
}

export interface TalentData {
  name: string;
  max: string;
  desc: string;
}

export interface RitualItem {
  name: string;
  cn: number;
  type: string;
  learningXP: number;
  ingredients: string;
  conditions: string;
  description: string;
}

export interface SwordDancingTechnique {
  id: string;          // kebab-case identifier, e.g. "ritual-of-cleansing"
  name: string;        // Display name, e.g. "Ritual of Cleansing"
  sl: number;          // Target Success Levels required (1-4)
  description: string; // Effect description
  order: number;       // Learning sequence position (1-10)
}

export interface TalentBonusEntry {
  char: string;
  bonus: number;
}

export interface TrappingData {
  name: string;
  enc: string;
}

export interface AnimalTemplate {
  name: string;
  species: string;
  M: number;
  WS: number;
  BS: number;
  S: number;
  T: number;
  I: number;
  Ag: number;
  Dex: number;
  Int: number;
  WP: number;
  Fel: number;
  W: number;
  traits: string;
  trained: string[];
  notes: string;
}


export interface Hireling {
  id: number;               // Unique numeric ID (timestamp-based)
  name: string;
  role: string;             // e.g., "Mercenary", "Scout", "Lawyer"
  status: string;           // Social tier, e.g., "Silver 3"

  // Characteristics (matching Companion layout)
  M: number;
  WS: number;
  BS: number;
  S: number;
  T: number;
  I: number;
  Ag: number;
  Dex: number;
  Int: number;
  WP: number;
  Fel: number;
  W: number;                // Max wounds
  wCur: number;             // Current wounds

  // Text block fields
  skills: string;
  talents: string;
  traits: string;
  trappings: string;

  // Flavour
  template: string;         // Template name or empty string
  physicalQuirk: string;
  workEthic: string;
  personalityQuirk: string;

  // Financial
  upkeep: { gc: number; ss: number; d: number };

  // Combat state
  conditions: { name: string; level: number }[];

  // General
  notes: string;
}

export type EntryStatus = 'pending' | 'in_progress' | 'completed';

export interface EndeavourEntry {
  id: string;
  type: string;
  notes: string;
  status: EntryStatus;
  cost?: string;
}

export interface DowntimePeriod {
  id: string;
  label: string;
  slots: number;
  entries: EndeavourEntry[];
  statusWarning: boolean;
  date?: string;
  sessionNumber?: number;
}

export interface Skill {
  n: string;  // Name
  c: string;  // Linked characteristic
  a: number;  // Advances
}

export interface Talent {
  n: string;       // Name
  lvl: number;     // Current level
  desc: string;    // Description
}

export interface Condition {
  name: string;
  level: number;
  duration?: string;
  source?: string;
}

export interface AdvancementEntry {
  timestamp: number;
  type: string;
  name: string;
  from: number;
  to: number;
  xpCost: number;
  careerLevel: string;
  inCareer: boolean;
}

/**
 * A single audited XP award (GM handing out experience). Awarding XP has no
 * fixed RAW formula — it is GM-side data entry (Core p.36 "Awarding
 * Experience") — so this is a plain log of the amount granted and why, not a
 * computed mechanic. Each award raises `xpCur` and `xpTotal` and appends an
 * entry here so the grant can be reviewed/audited rather than silently editing
 * the raw XP fields.
 */
export interface XpAwardEntry {
  /** ms since epoch, set at award time. Also the entry's unique key. */
  timestamp: number;
  /** XP granted (positive) or removed (negative, e.g. an undo/correction). */
  amount: number;
  /** GM-provided reason for the award (e.g. "Session 5", "Great roleplay"). */
  reason: string;
}

export interface CriticalWound {
  id: number;
  timestamp: number;
  location: string;
  description: string;
  effects: string;
  duration: string;
  severity: number;
  healed: boolean;
  healedAt?: number;
}

export interface Modifier {
  name: string;
  value: number;
  target: string;
}

export type MagicSaturation = 'low' | 'normal' | 'heavy' | 'extreme' | 'corrupted';

export interface SessionState {
  active: boolean;
  startTime: number | null;
  woundsAtStart: number;
  fortuneAtStart: number;
  resolveAtStart: number;
  advantageHistory: number[];
  temporaryModifiers: Modifier[];
  magicSaturation: MagicSaturation;
  combatStats: {
    combatsEntered: number;
    totalRounds: number;
    maxAdvantage: number;
  };
}

export interface CombatState {
  inCombat: boolean;
  initiative: number;
  currentRound: number;
  engaged: boolean;
  surprised: boolean;
  /**
   * Ad-hoc combat target (spec: ux-audit-improvements, Req 1). Remembers the
   * current opponent's name, Toughness Bonus, and Armour Points during an active
   * combat so they are not re-typed on each attack. NOT a persisted opponent
   * roster — cleared when combat ends (Req 1.5, 1.7).
   */
  target?: { name: string; tb: number; ap: number };
}

export interface SessionHistoryEntry {
  startTime: number;
  endTime: number;
  summary: string;
}

export interface QuickAction {
  name: string;
  action: string;
}

export interface ProtectionItem {
  id: string;
  name: string;                // 1-100 characters
  type: 'banner' | 'shrine' | 'gatehouse' | 'oathstone' | 'icon' | 'other';
  location: string;            // 0-200 characters
  runes: string[];             // Max 3 rune IDs from catalogue (category: 'protection')
}

export interface EngineeringItem {
  id: string;
  name: string;                // 1-100 characters
  type: 'Grudge Thrower' | 'Bolt Thrower' | 'Blackpowder Cannon';
  runes: string[];             // Max 3 rune IDs from catalogue (category: 'engineering')
}

export interface DoomRuneActivation {
  runeId: string;
  timestamp: number;           // milliseconds since epoch
  label: string;               // e.g. "Doom Rune activation: Rune of Hearth and Home"
}

export interface WeaponItem {
  name: string;
  group: string;
  enc: string;
  rangeReach?: string;
  damage: string;
  qualities: string;
  maxR?: string;
  optR?: string;
  rangeMod?: string;
  reload?: string;
  equipped?: boolean;
  runes?: string[];
}

export interface SpellItem {
  name: string;
  cn: string;
  range: string;
  target: string;
  duration: string;
  effect: string;
  memorized?: boolean;
}

export interface ChannellingProgress {
  spellName: string;
  accumulatedSL: number;
}

export interface AmmoItem {
  name: string;
  quantity: number;
  max: number;
  enc: string;
  qualities: string;
}

export interface Trapping {
  name: string;
  enc: string;
  quantity: number;
  storedOnHorse?: boolean;
  worn?: boolean; // Core p.293 Worn Items: reduces per-item Enc by 1 (min 0)
  /**
   * Marks the item as packed inside a backpack. Only has a mechanical effect
   * under the "Backpack ignores encumbrance" house rule (HouseRules.ignoreBackpackEnc),
   * where in-backpack items contribute 0 to carried encumbrance. Otherwise it is
   * a purely organisational marker.
   */
  inBackpack?: boolean;
}

export interface Companion {
  name: string;
  species: string;
  M: number;
  WS: number;
  BS: number;
  S: number;
  T: number;
  I: number;
  Ag: number;
  Dex: number;
  Int: number;
  WP: number;
  Fel: number;
  W: number;
  wCur: number;
  traits: string;
  trained: string[];
  notes: string;
  isPackAnimal?: boolean;
}

export interface LedgerEntry {
  timestamp: number;
  type: string;
  description: string;
  amount: { d: number; ss: number; gc: number };
}

export interface Holding {
  name: string;
  type: string;
  status: string;
  location: string;
  income: string;     // legacy string field
  expenses: string;   // legacy string field
  monthlyIncome: { d: number; ss: number; gc: number };
  monthlyExpenses: { d: number; ss: number; gc: number };
  condition: number;
  staff: number;
  notes: string;
}

export interface MutationEntry {
  id: number;
  type: 'physical' | 'mental';
  name: string;
  effect: string;
}

export interface Estate {
  name: string;
  location: string;
  description: string;
  treasury: { d: number; ss: number; gc: number };
  monthlyIncome: { d: number; ss: number; gc: number };
  monthlyExpenses: { d: number; ss: number; gc: number };
  ledger: LedgerEntry[];
  notes: string[];
  holdings: string[];
  properties?: Holding[];
}

// Enterprise types (Archives of the Empire Vol. III)
export type EnterpriseType =
  | 'Courier Service'
  | 'Crafting Workshop'
  | 'Criminal Gang'
  | 'Holy Temple'
  | 'Knightly Order'
  | 'Tavern'
  | 'Market Parlour'
  | 'Noble Estate'
  | 'Performance Troupe'
  | 'Publishing House';

export interface EnterpriseIncomeSource {
  id: string;
  description: string;      // max 200 characters
  earningSkill: string;     // max 100 characters
  effectiveStatus: string;  // max 50 characters, e.g. "Silver 2"
}

export interface EnterpriseCurrency {
  gc: number;  // gold crowns (0-999)
  ss: number;  // silver shillings (0-999)
  d: number;   // brass pennies (0-999)
}

export interface Enterprise {
  id: string;                          // crypto.randomUUID()
  name: string;                        // max 100 characters
  type: EnterpriseType;
  expansionLevel: number;              // 1-4
  debt: EnterpriseCurrency;
  creditorName: string;                // max 100 characters
  interestPayment: EnterpriseCurrency;
  incomeSources: EnterpriseIncomeSource[];  // max 20
  trappings: string[];                 // max 50 entries, each max 200 chars
  specialRules: string[];              // max 20 entries, each max 500 chars
  notes: string;                       // max 2000 characters
}

export type GrudgeType = 'standard' | 'blood';
export type GrudgeStatus = 'outstanding' | 'satisfied';

export interface GrudgeEntry {
  id: string;              // crypto.randomUUID() or fallback
  offence: string;         // Description of the wrong
  perpetrator: string;     // Who did it
  restitution: string;     // What's required
  type: GrudgeType;        // Standard (25 XP) or Blood (50 XP)
  status: GrudgeStatus;    // Outstanding or Satisfied
  isPartyGrudge: boolean;  // Shared by party
  dateRecorded: string;    // ISO date string (YYYY-MM-DD)
  dateSatisfied?: string;  // ISO date string, set when satisfied
}

export type RangedDamageSBMode = 'none' | 'halfSB' | 'fullSB';

/**
 * Configurable initiative rolling rule (spec: ux-audit-improvements, Req 4.4).
 * Per the "Roll For Initiative!" optional rules (WFRP4e Core p.156):
 * - 'initiativePlusD10': the app's default — roll 1d10 and add it to Initiative.
 * - 'initiativeAgilityTest': roll an Initiative Test to determine a SL,
 *   ordered by the resulting orderable value.
 * Combatants act in Initiative order, highest first (Core p.156 "Initiative Order").
 */
export type InitiativeFormula = 'initiativePlusD10' | 'initiativeAgilityTest';

export interface MagicalBurnout {
  type: 'temporary' | 'permanent';
  daysRemaining: number;    // For temporary: days of no-casting remaining. For permanent: 0
  startedAt: number;        // Timestamp when burnout started
}

export interface LearnedCant {
  lore: string;
  cantName: string;
}

export type YenluiState = 'light' | 'balanced' | 'dark';

export interface HouseRules {
  rangedDamageSBMode: RangedDamageSBMode;
  impaleCritsOnTens: boolean;
  min1Wound: boolean;
  advantageCap: number;
  useGroupAdvantage: boolean;
  useYenlui: boolean;
  useGrudgeBook: boolean;
  usePsychologyTracker: boolean;
  useCriticalDeflection: boolean;
  useEnterprises: boolean;
  useCants: boolean;
  /**
   * House rule: items marked as inside a backpack contribute 0 to the
   * character's carried encumbrance (carrying capacity is unchanged).
   */
  ignoreBackpackEnc: boolean;
  /**
   * Initiative rolling rule (spec: ux-audit-improvements, Req 4.4).
   * Default 'initiativePlusD10' (WFRP4e Core p.156 "Roll For Initiative!").
   * Backfilled for older saves via deepMerge against BLANK_CHARACTER.
   */
  initiativeFormula: InitiativeFormula;
}

/**
 * Unified event log data model (spec: unified-event-log).
 *
 * The event log is a single, per-character, append-only stream of structured
 * display/audit events. It is NEVER read to reconstruct mechanics — advancement
 * (undo/redo, archive) and the estate ledger (wealth math) remain the
 * authoritative typed structures and only mirror into this log.
 */

/** Coarse grouping used for filtering the timeline. (Req 1.3) */
export type LogCategory =
  | 'roll'
  | 'advancement'
  | 'combat'
  | 'wealth'
  | 'condition'
  | 'session'
  | 'system';

/**
 * A single structured record in the event log. (Req 1.2)
 * Stored oldest-first; the timeline reverses for display.
 */
export interface LogEvent {
  /** Unique within a character's eventLog (UUID-style string). */
  id: string;
  /** ms since epoch, set at append time. */
  timestamp: number;
  /** Coarse category for filtering. */
  category: LogCategory;
  /** Discriminator within a category, e.g. 'roll.skill', 'combat.attack'. */
  type: string;
  /** Human-readable, pre-rendered summary for the timeline. */
  summary: string;
  /** Structured detail; shape depends on `type` (see per-category payloads). */
  payload: Record<string, unknown>;
}

/**
 * Payload for `category: 'roll'` events (migrated roll history).
 * Captures enough to render the details roll history previously showed. (Req 4.2)
 */
export interface RollEventPayload {
  /** Skill or characteristic name. */
  name: string;
  /** d100 result. */
  roll: number;
  /** Target number. */
  target: number;
  /** Success levels. */
  sl: number;
  /** Whether the roll passed. */
  passed: boolean;
  /** True on a critical success. */
  isCritical?: boolean;
  /** True on a fumble. */
  isFumble?: boolean;
}

/**
 * Payload for `category: 'advancement'` mirror events. (Req 5.2, 5.4)
 * Display-only mirror of an `AdvancementEntry`; never read back for mechanics.
 */
export interface AdvancementEventPayload {
  /** Mirrors `AdvancementEntry.type`. */
  entryType: string;
  /** Name of the advanced characteristic/skill/talent/etc. */
  name: string;
  /** Value before the advance. */
  from: number;
  /** Value after the advance. */
  to: number;
  /** XP cost of the advance. */
  xpCost: number;
  /** True for undo mirror events. */
  undo?: boolean;
}

/**
 * Payload for `category: 'advancement'` XP-award mirror events.
 * Display-only mirror of an `XpAwardEntry`; never read back for XP math.
 */
export interface XpAwardEventPayload {
  /** XP granted (positive) or removed (negative). */
  amount: number;
  /** GM-provided reason for the award. */
  reason: string;
}

/**
 * Payload for `category: 'wealth'` mirror events. (Req 6.2)
 * Display-only mirror of a `LedgerEntry`; never read back for treasury math.
 */
export interface WealthEventPayload {
  /** Mirrors `LedgerEntry.type`. */
  entryType: string;
  /** Description of the ledger entry. */
  description: string;
  /** Monetary amount in d/ss/gc. */
  amount: { d: number; ss: number; gc: number };
}

export interface Character {
  _v: 8;
  name: string;
  species: string;
  class: string;
  career: string;
  careerLevel: string;
  careerPath: string;
  status: string;
  age: string;
  height: string;
  hair: string;
  eyes: string;
  chars: Record<CharacteristicKey, CharacteristicValue>;
  charBonusOverrides: Record<CharacteristicKey, boolean>;
  move: { m: number; w: number; r: number };
  fate: number;
  fortune: number;
  resilience: number;
  resolve: number;
  motivation: string;
  speciesExtraPoints: number;
  speciesSkills: string[];
  speciesTalents: string[];
  woundsUseSB: boolean;
  xpCur: number;
  xpSpent: number;
  xpTotal: number;
  conditions: Condition[];
  advantage: number;
  sessionState: SessionState;
  combatState: CombatState;
  advancementLog: AdvancementEntry[];
  advancementLogArchive: AdvancementEntry[];
  /**
   * Audit log of XP awards (GM grants). Optional for backward-compatible loads
   * of pre-feature characters; concrete (`[]`) on new characters. Stored
   * oldest-first; the UI reverses for display.
   */
  xpLog?: XpAwardEntry[];
  sessionHistory: SessionHistoryEntry[];
  quickActions: QuickAction[];
  criticalWounds: CriticalWound[];
  bSkills: Skill[];
  aSkills: Skill[];
  talents: Talent[];
  ambS: string;
  ambL: string;
  partyN: string;
  partyS: string;
  partyL: string;
  partyM: string;
  psych: string;
  armour: ArmourItem[];
  ap: ArmourPoints;
  trappings: Trapping[];
  wD: number;
  wSS: number;
  wGC: number;
  eMax: number;
  eMaxOverride: number | null;
  wSB: number;
  wTB2: number;
  wWPB: number;
  wHardy: number;
  wCur: number;
  weapons: WeaponItem[];
  spells: SpellItem[];
  channellingProgress: ChannellingProgress[];
  ammo: AmmoItem[];
  corr: number;
  sin: number;
  muts: string;
  mutations: MutationEntry[];
  companions: Companion[];
  estate: Estate;
  endeavours: DowntimePeriod[];
  portrait?: string;
  houseRules: HouseRules;
  hirelings: Hireling[];
  patronDeity?: AncestorGod;
  knownRunes?: string[];
  learnedTechniques?: string[];  // Array of technique ids
  learnedCants?: LearnedCant[];
  protectionItems?: ProtectionItem[];
  engineeringItems?: EngineeringItem[];
  doomRuneActivations?: DoomRuneActivation[];
  forgingCharges?: Record<string, number>;  // key: engineeringItem.id, value: remaining charges
  diseases?: ActiveDisease[];
  grudges?: GrudgeEntry[];
  yenluiState?: YenluiState;
  obsession?: ObsessionData;
  magicalBurnout?: MagicalBurnout;
  consumables?: Consumable[];
  psychologyTraits?: PsychologyTrait[];
  enterprises?: Enterprise[];
  brokenTally?: number;
  rituals?: RitualItem[];
  arcaneMarks?: string[];
  initiativeList?: Combatant[];
  activeInitiativeIndex?: number;
  /**
   * Unified event log (spec: unified-event-log). Optional for backward-compatible
   * loads of pre-feature characters; concrete (`[]`) on new characters. Display/audit
   * only — never read to reconstruct mechanics.
   */
  eventLog?: LogEvent[];
  log: string[];
}

export interface CharacterSummary {
  id: string;
  name: string;
  species: string;
  career: string;
  careerLevel: string;
  lastModified: number;
}

export interface CharacterIndex {
  activeId: string;
  characters: CharacterSummary[];
}


const DEFAULT_CHARS: Record<CharacteristicKey, CharacteristicValue> = {
  WS: { i: 0, a: 0, b: 0 },
  BS: { i: 0, a: 0, b: 0 },
  S: { i: 0, a: 0, b: 0 },
  T: { i: 0, a: 0, b: 0 },
  I: { i: 0, a: 0, b: 0 },
  Ag: { i: 0, a: 0, b: 0 },
  Dex: { i: 0, a: 0, b: 0 },
  Int: { i: 0, a: 0, b: 0 },
  WP: { i: 0, a: 0, b: 0 },
  Fel: { i: 0, a: 0, b: 0 },
};

const DEFAULT_BONUS_OVERRIDES: Record<CharacteristicKey, boolean> = {
  WS: false, BS: false, S: false, T: false, I: false,
  Ag: false, Dex: false, Int: false, WP: false, Fel: false,
};

export const BLANK_CHARACTER: Character = {
  _v: 8,
  name: '',
  species: '',
  class: '',
  career: '',
  careerLevel: '',
  careerPath: '',
  status: '',
  age: '',
  height: '',
  hair: '',
  eyes: '',
  chars: DEFAULT_CHARS,
  charBonusOverrides: DEFAULT_BONUS_OVERRIDES,
  move: { m: 0, w: 0, r: 0 },
  fate: 0,
  fortune: 0,
  resilience: 0,
  resolve: 0,
  motivation: '',
  speciesExtraPoints: 0,
  speciesSkills: [],
  speciesTalents: [],
  woundsUseSB: true,
  xpCur: 0,
  xpSpent: 0,
  xpTotal: 0,
  conditions: [],
  advantage: 0,
  sessionState: {
    active: false,
    startTime: null,
    woundsAtStart: 0,
    fortuneAtStart: 0,
    resolveAtStart: 0,
    advantageHistory: [],
    temporaryModifiers: [],
    magicSaturation: 'normal',
    combatStats: {
      combatsEntered: 0,
      totalRounds: 0,
      maxAdvantage: 0,
    },
  },
  combatState: {
    inCombat: false,
    initiative: 0,
    currentRound: 0,
    engaged: false,
    surprised: false,
  },
  advancementLog: [],
  advancementLogArchive: [],
  xpLog: [],
  sessionHistory: [],
  quickActions: [],
  criticalWounds: [],
  bSkills: [
    { n: 'Art', c: 'Dex', a: 0 }, { n: 'Athletics', c: 'Ag', a: 0 }, { n: 'Bribery', c: 'Fel', a: 0 },
    { n: 'Charm', c: 'Fel', a: 0 }, { n: 'Charm Animal', c: 'WP', a: 0 }, { n: 'Climb', c: 'S', a: 0 },
    { n: 'Cool', c: 'WP', a: 0 }, { n: 'Consume Alcohol', c: 'T', a: 0 }, { n: 'Dodge', c: 'Ag', a: 0 },
    { n: 'Drive', c: 'Ag', a: 0 }, { n: 'Endurance', c: 'T', a: 0 }, { n: 'Entertain', c: 'Fel', a: 0 },
    { n: 'Gamble', c: 'Int', a: 0 }, { n: 'Gossip', c: 'Fel', a: 0 }, { n: 'Haggle', c: 'Fel', a: 0 },
    { n: 'Intimidate', c: 'S', a: 0 }, { n: 'Intuition', c: 'I', a: 0 }, { n: 'Leadership', c: 'Fel', a: 0 },
    { n: 'Melee (Basic)', c: 'WS', a: 0 }, { n: 'Melee ()', c: 'WS', a: 0 },
    { n: 'Navigation', c: 'I', a: 0 }, { n: 'Outdoor Survival', c: 'Int', a: 0 },
    { n: 'Perception', c: 'I', a: 0 }, { n: 'Ride', c: 'Ag', a: 0 }, { n: 'Row', c: 'S', a: 0 },
    { n: 'Stealth ()', c: 'Ag', a: 0 },
  ],
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
  wCur: 0,
  weapons: [],
  spells: [],
  channellingProgress: [],
  ammo: [],
  corr: 0,
  sin: 0,
  muts: '',
  mutations: [],
  companions: [],
  hirelings: [],
  estate: {
    name: '',
    location: '',
    description: '',
    treasury: { d: 0, ss: 0, gc: 0 },
    monthlyIncome: { d: 0, ss: 0, gc: 0 },
    monthlyExpenses: { d: 0, ss: 0, gc: 0 },
    ledger: [],
    notes: [],
    holdings: [],
  },
  endeavours: [],
  portrait: '',
  houseRules: {
    rangedDamageSBMode: 'none',
    impaleCritsOnTens: true,
    min1Wound: true,
    advantageCap: 10,
    useGroupAdvantage: false,
    useYenlui: false,
    useGrudgeBook: false,
    usePsychologyTracker: false,
    useCriticalDeflection: false,
    useEnterprises: false,
    useCants: false,
    ignoreBackpackEnc: false,
    // Default initiative rule: roll 1d10 + Initiative (Core p.156).
    initiativeFormula: 'initiativePlusD10',
  },
  knownRunes: [],
  learnedTechniques: [],
  learnedCants: [],
  protectionItems: [],
  engineeringItems: [],
  doomRuneActivations: [],
  forgingCharges: {},
  diseases: [],
  rituals: [],
  arcaneMarks: [],
  eventLog: [],
  log: [],
};
