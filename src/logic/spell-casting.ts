import type { Character, SpellItem } from '../types/character';
import type { RollResult } from './dice-roller';
import { getBonus } from './calculators';
import {
  MINOR_MISCAST_TABLE,
  MAJOR_MISCAST_TABLE,
  type MiscastTableEntry,
} from '../data/miscast-tables';

// Re-export MiscastTableEntry as MiscastEntry for consumers
export type MiscastEntry = MiscastTableEntry;

/** Result of resolving a casting test against a spell */
export interface CastingResult {
  rollResult: RollResult;
  spell: SpellItem;
  cn: number;
  slAchieved: number;
  castSuccess: boolean;
  surplusSL: number;
  overcastSlots: number;
  isCriticalCast: boolean;
  isFumbledCast: boolean;
  triggerMinorMiscast: boolean;
  triggerMajorMiscast: boolean;
  isMagicMissile: boolean;
  hitLocation: string | null;
  damage: number | null;
  isFullyChannelled: boolean;
  isUndispellable: boolean;
}

/** Overcast option descriptor */
export interface OvercastOption {
  category: 'range' | 'aoe' | 'duration' | 'targets';
  label: string;
  baseValue: string;
  enabled: boolean;
}

/** Result of resolving a channelling test */
export interface ChannellingResult {
  spellName: string;
  accumulatedSL: number;
  ready: boolean;
}

/** Miscast roll result */
export interface MiscastResult {
  roll: number;
  entry: MiscastEntry;
  additionalRolls?: MiscastResult[];
}

// ─── Hit Location Table ───────────────────────────────────────────────────────

const HIT_LOCATIONS: { min: number; max: number; name: string }[] = [
  { min: 1, max: 9, name: 'Head' },
  { min: 10, max: 24, name: 'Left Arm' },
  { min: 25, max: 44, name: 'Right Arm' },
  { min: 45, max: 79, name: 'Body' },
  { min: 80, max: 89, name: 'Left Leg' },
  { min: 90, max: 100, name: 'Right Leg' },
];

// ─── Task 3.1: Casting Target Computation ─────────────────────────────────────

/**
 * Compute the base target number for a Language (Magick) casting test.
 * Returns Int total (i + a + b) + Language (Magick) skill advances.
 * If the character lacks the skill, advances default to 0.
 */
export function computeCastingTarget(character: Character): number {
  const intChar = character.chars.Int;
  const intTotal = intChar.i + intChar.a + intChar.b;

  // Search both bSkills and aSkills for Language (Magick)
  const allSkills = [...character.bSkills, ...character.aSkills];
  const langMagick = allSkills.find((s) => s.n === 'Language (Magick)');
  const advances = langMagick ? langMagick.a : 0;

  return intTotal + advances;
}

/**
 * Compute the base target number for a Channelling test.
 * Returns WP total (i + a + b) + Channelling skill advances.
 * Checks for both "Channelling" and "Channelling (Lore)" variants using startsWith.
 */
export function computeChannellingTarget(character: Character): number {
  const wpChar = character.chars.WP;
  const wpTotal = wpChar.i + wpChar.a + wpChar.b;

  const allSkills = [...character.bSkills, ...character.aSkills];
  const channelling = allSkills.find(
    (s) => s.n === 'Channelling' || s.n.startsWith('Channelling ('),
  );
  const advances = channelling ? channelling.a : 0;

  return wpTotal + advances;
}

// ─── Task 3.4: Utility Functions ──────────────────────────────────────────────

/**
 * Check if a spell is a magic missile based on its effect text.
 * Looks for "Dmg", "damage", or "Magic missile" (case-insensitive).
 */
export function isMagicMissile(spell: SpellItem): boolean {
  const lower = spell.effect.toLowerCase();
  return lower.includes('dmg') || lower.includes('damage') || lower.includes('magic missile');
}

/**
 * Parse the damage bonus from a spell's effect text.
 * Recognises patterns: "Dmg +4", "Dmg +0", "Dmg WPB", "Dmg TB".
 * Returns the numeric damage component.
 */
function parseDamageFromEffect(effect: string, wpBonus: number): number {
  // Try "Dmg +N" or "Dmg N" patterns
  const plusMatch = effect.match(/Dmg\s*\+?\s*(\d+)/i);
  if (plusMatch) {
    return parseInt(plusMatch[1], 10);
  }

  // Try "Dmg WPB"
  if (/Dmg\s+WPB/i.test(effect)) {
    return wpBonus;
  }

  // Try "Dmg TB" — TB not available in this context, return 0
  if (/Dmg\s+TB/i.test(effect)) {
    return 0;
  }

  return 0;
}

/**
 * Compute magic missile damage: parsed_damage + wpBonus + castingSL.
 */
export function computeMagicMissileDamage(
  spell: SpellItem,
  wpBonus: number,
  castingSL: number,
): number {
  const baseDamage = parseDamageFromEffect(spell.effect, wpBonus);
  return baseDamage + wpBonus + castingSL;
}

/**
 * Reverse a d100 roll's digits to get the hit location roll.
 * e.g. 34→43, 70→7, 100→1, 5→50.
 * Roll 100 is treated as "00" → reversed "00" → 0 → clamped to 1.
 * Single digits (1-9) are padded to two digits first (5→"05"→"50"→50).
 */
export function reverseRollDigits(roll: number): number {
  // Treat 100 as "00"
  const effective = roll === 100 ? 0 : roll;

  // Pad to two digits
  const str = effective.toString().padStart(2, '0');
  const reversed = str.split('').reverse().join('');
  const result = parseInt(reversed, 10);

  // Clamp minimum to 1
  return Math.max(1, result);
}

/**
 * Map a reversed roll value to a hit location name.
 * 1-9: Head, 10-24: Left Arm, 25-44: Right Arm,
 * 45-79: Body, 80-89: Left Leg, 90-100: Right Leg.
 */
export function getHitLocation(reversedRoll: number): string {
  const clamped = Math.min(100, Math.max(1, reversedRoll));
  const loc = HIT_LOCATIONS.find((h) => clamped >= h.min && clamped <= h.max);
  return loc ? loc.name : 'Body';
}

/**
 * Check if the character has the Instinctive Diction talent.
 */
export function hasInstinctiveDiction(character: Character): boolean {
  return character.talents.some((t) => t.n.startsWith('Instinctive Diction'));
}

/**
 * Look up a miscast result from the Minor or Major Miscast Table.
 * Clamps roll to [1, 100] and returns the matching entry.
 */
export function lookupMiscast(
  roll: number,
  table: 'minor' | 'major',
): MiscastEntry {
  const clamped = Math.min(100, Math.max(1, roll));
  const tableData = table === 'minor' ? MINOR_MISCAST_TABLE : MAJOR_MISCAST_TABLE;
  const entry = tableData.find((e) => clamped >= e.min && clamped <= e.max);
  // Should always find an entry since tables cover 1-100, but fallback just in case
  return entry ?? tableData[0];
}

// ─── Task 3.2: Casting Resolution and Overcast Logic ──────────────────────────

/**
 * Compute the number of overcast slots from surplus SL.
 * Returns floor(max(0, sl - cn) / 2).
 */
export function computeOvercastSlots(sl: number, cn: number): number {
  return Math.floor(Math.max(0, sl - cn) / 2);
}

/**
 * Compute available overcast options for a spell.
 * Disables Range/Targets when range="You" AND target="You".
 * Disables Range when range="Touch".
 * Disables Duration when duration="Instant".
 * AoE is always enabled.
 */
export function computeOvercastOptions(spell: SpellItem): OvercastOption[] {
  const isSelfOnly = spell.range === 'You' && spell.target === 'You';
  const isTouch = spell.range === 'Touch';
  const isInstant = spell.duration === 'Instant';

  return [
    {
      category: 'range',
      label: 'Range',
      baseValue: spell.range,
      enabled: !isSelfOnly && !isTouch,
    },
    {
      category: 'aoe',
      label: 'Area of Effect',
      baseValue: spell.range,
      enabled: true,
    },
    {
      category: 'duration',
      label: 'Duration',
      baseValue: spell.duration,
      enabled: !isInstant,
    },
    {
      category: 'targets',
      label: 'Targets',
      baseValue: spell.target,
      enabled: !isSelfOnly,
    },
  ];
}

/**
 * Resolve a casting test result against a spell.
 * Determines success (SL >= CN or totalPower override), surplus SL,
 * overcast slots, critical/fumble/miscast triggers, magic missile
 * damage, and hit location.
 */
export function resolveCastingResult(
  rollResult: RollResult,
  spell: SpellItem,
  character: Character,
  options?: {
    totalPower?: boolean;
    unstoppableForce?: boolean;
    channelledCN?: number;
  },
): CastingResult {
  const cn = options?.channelledCN !== undefined
    ? options.channelledCN
    : parseInt(spell.cn, 10) || 0;

  const slAchieved = rollResult.sl;
  const totalPower = options?.totalPower === true;

  // Cast success: SL >= CN, or Total Power override
  const castSuccess = totalPower || slAchieved >= cn;

  const surplusSL = Math.max(0, slAchieved - cn);
  const overcastSlots = computeOvercastSlots(slAchieved, cn);

  const isCriticalCast = rollResult.isCritical;
  const isFumbledCast = rollResult.isFumble;

  // Miscast triggers
  const triggerMinorMiscast =
    (isCriticalCast && !hasInstinctiveDiction(character)) || isFumbledCast;
  const triggerMajorMiscast = false; // Set later by UI for cascading chaos

  const spellIsMagicMissile = isMagicMissile(spell);

  // Hit location for magic missiles on successful cast
  let hitLocation: string | null = null;
  if (spellIsMagicMissile && castSuccess) {
    const reversed = reverseRollDigits(rollResult.roll);
    hitLocation = getHitLocation(reversed);
  }

  // Damage for magic missiles on successful cast
  let damage: number | null = null;
  if (spellIsMagicMissile && castSuccess) {
    const wpChar = character.chars.WP;
    const wpTotal = wpChar.i + wpChar.a + wpChar.b;
    const wpb = getBonus(wpTotal);
    damage = computeMagicMissileDamage(spell, wpb, slAchieved);
  }

  const isFullyChannelled = options?.channelledCN === 0;
  const isUndispellable = options?.unstoppableForce === true;

  return {
    rollResult,
    spell,
    cn,
    slAchieved,
    castSuccess,
    surplusSL,
    overcastSlots,
    isCriticalCast,
    isFumbledCast,
    triggerMinorMiscast,
    triggerMajorMiscast,
    isMagicMissile: spellIsMagicMissile,
    hitLocation,
    damage,
    isFullyChannelled,
    isUndispellable,
  };
}

// ─── Task 3.3: Channelling Resolution ─────────────────────────────────────────

/**
 * Resolve a channelling test.
 * On success (passed && sl > 0), adds SL to currentProgress.
 * Marks ready when accumulated >= spellCN.
 * On failure, progress is unchanged.
 */
export function resolveChannellingResult(
  rollResult: RollResult,
  currentProgress: number,
  spellCN: number,
): ChannellingResult {
  let accumulatedSL = currentProgress;

  if (rollResult.passed && rollResult.sl > 0) {
    accumulatedSL += rollResult.sl;
  }

  const ready = accumulatedSL >= spellCN;

  return {
    spellName: '',
    accumulatedSL,
    ready,
  };
}
