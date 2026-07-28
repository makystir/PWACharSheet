import type { Character, ArmourItem, SpellItem } from '../types/character';
import type { RollResult } from './dice-roller';
import { getBonus, computeAPByLocation } from './calculators';
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
  overcastAllocation: OvercastAllocation | null;
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
  category: 'range' | 'aoe' | 'duration' | 'targets' | 'damage';
  label: string;
  baseValue: string;
  enabled: boolean;
}

// ─── Revised Overcast Table (Winds of Magic) ──────────────────────────────────

/** A single row in the Overcast Table keyed by SL threshold */
export interface OvercastTableRow {
  sl: number;
  targets: string;
  damage: number;
  range: string;
  aoe: string;
  duration: string;
}

/**
 * The Winds of Magic Overcast Table.
 * SL thresholds follow a Fibonacci-like progression: 1, 2, 3, 5, 8, 13, 21+.
 * Each row defines the effect gained when the allocated SL meets or exceeds that threshold.
 * The highest matching row determines the effect for each column.
 */
export const OVERCAST_TABLE: OvercastTableRow[] = [
  { sl: 1,  targets: '+1 Target',  damage: 1, range: '2× Range', aoe: 'Listed AoE',  duration: 'Listed Duration' },
  { sl: 2,  targets: '+1 Target',  damage: 2, range: '2× Range', aoe: 'Listed AoE',  duration: '2× Duration' },
  { sl: 3,  targets: '+1 Target',  damage: 3, range: '2× Range', aoe: '2× AoE',      duration: '2× Duration' },
  { sl: 5,  targets: '+2 Targets', damage: 4, range: '3× Range', aoe: '2× AoE',      duration: '2× Duration' },
  { sl: 8,  targets: '+2 Targets', damage: 5, range: '3× Range', aoe: '2× AoE',      duration: '3× Duration' },
  { sl: 13, targets: '+2 Targets', damage: 6, range: '3× Range', aoe: '2× AoE',      duration: '3× Duration' },
  { sl: 21, targets: '+3 Targets', damage: 7, range: '4× Range', aoe: '3× AoE',      duration: '3× Duration' },
];

/** The result of looking up a single column in the overcast table */
export interface OvercastColumnEffect {
  category: 'targets' | 'damage' | 'range' | 'aoe' | 'duration';
  slSpent: number;
  effect: string;
}

/** Full overcast allocation result for a single casting */
export interface OvercastAllocation {
  surplusSL: number;
  columnEffects: OvercastColumnEffect[];
  unspentSL: number;
}

/**
 * Look up the overcast effect for a given column based on allocated SL.
 * Returns the highest row where allocated SL >= row threshold, or null if SL < 1.
 */
export function lookupOvercastEffect(
  column: 'targets' | 'damage' | 'range' | 'aoe' | 'duration',
  allocatedSL: number,
): string | null {
  if (allocatedSL < 1) return null;

  let bestRow: OvercastTableRow | null = null;
  for (const row of OVERCAST_TABLE) {
    if (allocatedSL >= row.sl) {
      bestRow = row;
    } else {
      break;
    }
  }

  if (!bestRow) return null;

  switch (column) {
    case 'targets': return bestRow.targets;
    case 'damage': return `+${bestRow.damage} Damage`;
    case 'range': return bestRow.range;
    case 'aoe': return bestRow.aoe;
    case 'duration': return bestRow.duration;
  }
}

/**
 * Resolve overcast allocations from surplus SL distributed across columns.
 * Each column may only be accessed once per casting (enforced by the allocations map).
 * The allocations map keys are column names; values are SL assigned to that column.
 * Returns the resolved effects and any unspent SL.
 */
export function resolveOvercastAllocations(
  surplusSL: number,
  allocations: Partial<Record<'targets' | 'damage' | 'range' | 'aoe' | 'duration', number>>,
): OvercastAllocation {
  const columnEffects: OvercastColumnEffect[] = [];
  let totalSpent = 0;

  for (const [column, slSpent] of Object.entries(allocations) as [
    'targets' | 'damage' | 'range' | 'aoe' | 'duration',
    number,
  ][]) {
    if (slSpent <= 0) continue;
    // Cap SL spent to available surplus
    const effectiveSL = Math.min(slSpent, surplusSL - totalSpent);
    if (effectiveSL <= 0) continue;

    const effect = lookupOvercastEffect(column, effectiveSL);
    if (effect) {
      columnEffects.push({ category: column, slSpent: effectiveSL, effect });
      totalSpent += effectiveSL;
    }
  }

  return {
    surplusSL,
    columnEffects,
    unspentSL: surplusSL - totalSpent,
  };
}

/** Result of resolving a channelling test */
export interface ChannellingResult {
  spellName: string;
  accumulatedSL: number;
  ready: boolean;
  isCriticalChannelling: boolean;
  isFumbledChannelling: boolean;
  triggerMinorMiscast: boolean;
  bonusSL: number;
}

/** Result of resolving an interruption to channelling */
export interface InterruptionResult {
  coolTestPassed: boolean;
  accumulatedSL: number;
  triggerMinorMiscast: boolean;
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
export function parseDamageFromEffect(effect: string, wpBonus?: number, tbBonus?: number): number {
  // Try "Dmg +N" or "Dmg N" patterns
  const plusMatch = effect.match(/Dmg\s*\+?\s*(\d+)/i);
  if (plusMatch) {
    return parseInt(plusMatch[1], 10);
  }

  // Try "Dmg WPB"
  if (/Dmg\s+WPB/i.test(effect)) {
    return wpBonus ?? 0;
  }

  // Try "Dmg TB"
  if (/Dmg\s+TB/i.test(effect)) {
    return tbBonus ?? 0;
  }

  return 0;
}

/**
 * Compute magic missile damage: parseDamageFromEffect(effect, wpBonus, tbBonus) + castingSL.
 * The parseDamageFromEffect function resolves "Dmg WPB" to the wpBonus value already,
 * so we do NOT add wpBonus again on top.
 */
export function computeMagicMissileDamage(
  spell: SpellItem,
  castingSL: number,
  wpBonus?: number,
  tbBonus?: number,
): number {
  const baseDamage = parseDamageFromEffect(spell.effect, wpBonus, tbBonus);
  return baseDamage + castingSL;
}

/**
 * Formats the damage formula for display in the spell table.
 * Returns null for non-magic-missile spells.
 *
 * Examples:
 *   "Dmg +4"  → "Dmg: 4 + SL"
 *   "Dmg WPB" → "Dmg: WPB(4) + SL"  (if wpBonus=4)
 *   "Dmg TB"  → "Dmg: TB(3) + SL"   (if tbBonus=3)
 *   "Healing" → null
 */
export function formatDamageBreakdown(
  spell: SpellItem,
  wpBonus: number,
  tbBonus: number,
): string | null {
  if (!isMagicMissile(spell)) {
    return null;
  }

  const effect = spell.effect;

  // Check "Dmg WPB" pattern first (before the numeric pattern, since "WPB" is more specific)
  if (/Dmg\s+WPB/i.test(effect)) {
    return `Dmg: WPB(${wpBonus}) + SL`;
  }

  // Check "Dmg TB" pattern
  if (/Dmg\s+TB/i.test(effect)) {
    return `Dmg: TB(${tbBonus}) + SL`;
  }

  // Check "Dmg +N" or "Dmg N" pattern
  const plusMatch = effect.match(/Dmg\s*\+?\s*(\d+)/i);
  if (plusMatch) {
    return `Dmg: ${plusMatch[1]} + SL`;
  }

  // Spell is a magic missile but doesn't match a specific pattern — default to 0
  return `Dmg: 0 + SL`;
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
 * Damage is enabled only for magic missile spells.
 * AoE is always enabled.
 */
export function computeOvercastOptions(spell: SpellItem): OvercastOption[] {
  const isSelfOnly = spell.range === 'You' && spell.target === 'You';
  const isTouch = spell.range === 'Touch';
  const isInstant = spell.duration === 'Instant';
  const spellIsMagicMissile = isMagicMissile(spell);

  return [
    {
      category: 'targets',
      label: 'Targets',
      baseValue: spell.target,
      enabled: !isSelfOnly,
    },
    {
      category: 'damage',
      label: 'Extra Damage',
      baseValue: 'Spell Damage',
      enabled: spellIsMagicMissile,
    },
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
    const tChar = character.chars.T;
    const tTotal = tChar.i + tChar.a + tChar.b;
    const tbBonus = getBonus(tTotal);
    damage = computeMagicMissileDamage(spell, slAchieved, wpb, tbBonus);
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
    overcastAllocation: null,
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
 * Check if the character has the Aethyric Attunement talent.
 */
export function hasAethyricAttunement(character: Character): boolean {
  return character.talents.some((t) => t.n.startsWith('Aethyric Attunement'));
}

/**
 * Resolve a channelling test per the Winds of Magic rules.
 *
 * - On success (passed && sl > 0), adds SL to currentProgress.
 * - Critical Channelling (doubles + success): adds WP Bonus SL on top of normal SL.
 *   Triggers Minor Miscast unless the character has Aethyric Attunement.
 * - Fumbled Channelling (doubles + failure): all accumulated SL are lost, Minor Miscast triggered.
 * - On normal failure, progress is unchanged.
 * - Marks ready when accumulated >= spellCN.
 */
export function resolveChannellingResult(
  rollResult: RollResult,
  currentProgress: number,
  spellCN: number,
  character?: Character,
): ChannellingResult {
  let accumulatedSL = currentProgress;
  let isCriticalChannelling = false;
  let isFumbledChannelling = false;
  let triggerMinorMiscast = false;
  let bonusSL = 0;

  if (rollResult.isFumble) {
    // Fumbled Channelling: doubles + failure → lose all SL + Minor Miscast
    isFumbledChannelling = true;
    accumulatedSL = 0;
    triggerMinorMiscast = true;
  } else if (rollResult.isCritical) {
    // Critical Channelling: doubles + success → add normal SL + WP Bonus SL
    isCriticalChannelling = true;

    // Add normal SL first
    if (rollResult.sl > 0) {
      accumulatedSL += rollResult.sl;
    }

    // Add WP Bonus SL
    if (character) {
      const wpChar = character.chars.WP;
      const wpTotal = wpChar.i + wpChar.a + wpChar.b;
      bonusSL = getBonus(wpTotal);
      accumulatedSL += bonusSL;
    }

    // Minor Miscast unless Aethyric Attunement
    if (!character || !hasAethyricAttunement(character)) {
      triggerMinorMiscast = true;
    }
  } else if (rollResult.passed && rollResult.sl > 0) {
    // Normal success: add SL
    accumulatedSL += rollResult.sl;
  }
  // Normal failure: progress unchanged

  const ready = accumulatedSL >= spellCN;

  return {
    spellName: '',
    accumulatedSL,
    ready,
    isCriticalChannelling,
    isFumbledChannelling,
    triggerMinorMiscast,
    bonusSL,
  };
}

/**
 * Resolve an interruption during channelling.
 *
 * When a channelling wizard is interrupted, they must pass a Hard (-20) Cool Test.
 * - If passed: channelling continues, SL is preserved.
 * - If failed: all channelled SL are lost and a Minor Miscast occurs.
 *
 * @param coolTestResult - The result of the Hard (-20) Cool test
 * @param currentProgress - Current accumulated channelling SL
 * @returns InterruptionResult with the outcome
 */
export function resolveChannellingInterruption(
  coolTestResult: RollResult,
  currentProgress: number,
): InterruptionResult {
  if (coolTestResult.passed) {
    return {
      coolTestPassed: true,
      accumulatedSL: currentProgress,
      triggerMinorMiscast: false,
    };
  }

  // Failed Cool test: lose all SL + Minor Miscast
  return {
    coolTestPassed: false,
    accumulatedSL: 0,
    triggerMinorMiscast: true,
  };
}

// ─── Armour Casting Penalty ───────────────────────────────────────────────────

/**
 * Determine if an armour item is metal-based (mail, plate, chain, etc.).
 */
export function isMetalArmour(item: ArmourItem): boolean {
  const lower = item.name.toLowerCase();
  return (
    lower.includes('mail') ||
    lower.includes('plate') ||
    lower.includes('chain') ||
    lower.includes('breastplate') ||
    lower.includes('helm') ||
    lower.includes('metal') ||
    lower.includes('steel') ||
    lower.includes('iron') ||
    lower.includes('gromril') ||
    lower.includes('ithilmar')
  );
}

/**
 * Determine if an armour item is leather/hide-based (leather, hide, fur, etc.).
 */
export function isLeatherArmour(item: ArmourItem): boolean {
  const lower = item.name.toLowerCase();
  return (
    lower.includes('leather') ||
    lower.includes('hide') ||
    lower.includes('fur') ||
    lower.includes('pelt') ||
    lower.includes('skin') ||
    lower.includes('bark')
  );
}

/**
 * Check if a character has a specific lore's Arcane Magic talent.
 * Matches patterns like "Arcane Magic (Metal)", "Arcane Magic (Chamon)",
 * "Arcane Magic (Lore of Metal)".
 */
function hasArcaneMagicLore(character: Character, ...loreKeywords: string[]): boolean {
  return character.talents.some((t) => {
    if (!t.n.startsWith('Arcane Magic')) return false;
    const lower = t.n.toLowerCase();
    return loreKeywords.some((kw) => lower.includes(kw.toLowerCase()));
  });
}

/**
 * Calculate the casting penalty from armour.
 * Penalty is -1 SL per Armour Point on the character's most-armoured location (worn items only).
 *
 * Exemptions:
 * - Metal (Chamon) wizards wearing only metal armour are exempt.
 * - Beasts (Ghur) wizards wearing only leather/hide armour are exempt.
 *
 * Returns a non-negative integer representing the SL penalty magnitude.
 * e.g., returns 3 meaning the character suffers -3 SL on casting/channelling.
 */
export function getArmourCastingPenalty(character: Character): number {
  const wornArmour = character.armour.filter((item) => item.worn === true && item.ap > 0);

  // No worn armour with AP → no penalty
  if (wornArmour.length === 0) return 0;

  // Check exemptions
  const isMetalWizard = hasArcaneMagicLore(character, 'metal', 'chamon');
  const isBeastsWizard = hasArcaneMagicLore(character, 'beasts', 'ghur');

  if (isMetalWizard && wornArmour.every(isMetalArmour)) {
    return 0;
  }

  if (isBeastsWizard && wornArmour.every(isLeatherArmour)) {
    return 0;
  }

  // Compute AP per location from worn armour
  const apByLocation = computeAPByLocation(character.armour);

  // Find the highest AP value across all locations
  const highestAP = Math.max(
    apByLocation.head,
    apByLocation.leftArm,
    apByLocation.rightArm,
    apByLocation.body,
    apByLocation.leftLeg,
    apByLocation.rightLeg,
  );

  return highestAP;
}

// ─── Overcast Damage Preview ──────────────────────────────────────────────────

/**
 * Compute overcast damage preview given base damage and allocation count.
 * Uses the OVERCAST_TABLE to determine the bonus damage for the allocated SL.
 * Returns { base, bonus, total } for display in the overcast allocator.
 */
export function computeOvercastDamagePreview(
  baseDamage: number,
  damageAllocation: number
): { base: number; bonus: number; total: number } {
  // Handle NaN/undefined baseDamage gracefully
  const safeBase = Number.isFinite(baseDamage) ? baseDamage : 0;

  if (damageAllocation <= 0) {
    return { base: safeBase, bonus: 0, total: safeBase };
  }

  // Find highest matching row in OVERCAST_TABLE
  let bonus = 0;
  for (const row of OVERCAST_TABLE) {
    if (damageAllocation >= row.sl) {
      bonus = row.damage;
    } else {
      break;
    }
  }

  return { base: safeBase, bonus, total: safeBase + bonus };
}

// ─── Spell Damage Clarity: Formatting Functions ───────────────────────────────

/**
 * Formats the damage breakdown for the cast result dialog.
 * Shows the full arithmetic: modifier + SL(X) = Total
 * or modifier + SL(X) + Overcast(Y) = Total when overcast applies.
 *
 * Examples:
 *   (4, 3, 0) → "4 + SL(3) = 7"
 *   (4, 3, 2) → "4 + SL(3) + Overcast(2) = 9"
 */
export function formatCastDamageBreakdown(
  damageModifier: number,
  castingSL: number,
  overcastBonus?: number,
): string {
  const effectiveOvercast = overcastBonus && overcastBonus > 0 ? overcastBonus : 0;
  const total = damageModifier + castingSL + effectiveOvercast;

  if (effectiveOvercast > 0) {
    return `${damageModifier} + SL(${castingSL}) + Overcast(${effectiveOvercast}) = ${total}`;
  }

  return `${damageModifier} + SL(${castingSL}) = ${total}`;
}
