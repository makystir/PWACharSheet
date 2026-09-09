import type { Combatant, Character, InitiativeFormula } from '../types/character';
import { getBonus } from './calculators';
import { resolveRoll } from './dice-roller';

/**
 * Sort combatants by initiative descending.
 * For equal initiatives, maintains insertion order (stable sort).
 */
export function sortByInitiative(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort((a, b) => b.initiative - a.initiative);
}

/**
 * Advance active index to next combatant, wrapping at end.
 * Returns 0 if totalCombatants is 0 or negative.
 */
export function nextTurn(activeIndex: number, totalCombatants: number): number {
  if (totalCombatants <= 0) return 0;
  return (activeIndex + 1) % totalCombatants;
}

// ---------------------------------------------------------------------------
// Initiative rolling (spec: ux-audit-improvements, Requirement 4)
// ---------------------------------------------------------------------------
//
// Source of truth: WFRP4e Core "Roll For Initiative!" (Core p.156). The rulebook
// offers several optional ways to randomise the Initiative Order (Core p.156
// "Initiative Order": combatants act highest-first):
//
//   1. Each character rolls an Initiative Test to determine a SL.
//   2. Each character rolls 1d10 and adds it to their Initiative.
//   3. Each character rolls 1d10 and adds it to Agility Bonus + Initiative Bonus.
//
// This module implements a configurable house rule (Req 4.4) with two options:
//   - 'initiativePlusD10'    — the app default (see FLAG below).
//   - 'initiativeAgilityTest' — the Initiative-Test-based (SL-ordered) variant.
//
// FLAG (rules-compliance ambiguity, surfaced to the user):
//   The design doc / task specify `initiativePlusD10` = `getBonus(Initiative) + d10`,
//   i.e. d10 added to the Initiative *Bonus*. The Core p.156 second bullet actually
//   adds d10 to the full *Initiative* characteristic, while its third bullet adds
//   d10 to `Agility Bonus + Initiative Bonus`. This implementation follows the
//   design's "Initiative Bonus + d10" convention as instructed; if the group wants
//   strict RAW, the second bullet ("Initiative + d10") would omit the getBonus()
//   call. Both remain orderable highest-first per Core p.156.

/** A single die roll in the range 1..10. */
export type DieFn = () => number;

/** Default d10 die: uniform integer in [1, 10]. */
function defaultD10(): number {
  return Math.floor(Math.random() * 10) + 1;
}

/**
 * Result of rolling initiative. `value` is the orderable number used to place
 * the combatant in the Initiative Order (highest first, Core p.156). `die` is the
 * raw d10 (or test) roll, `formula` records which rule produced it, and
 * `breakdown` is a human-readable calculation string for the calculated-total
 * tooltip (per the calculated-total-tooltips steering rule).
 */
export interface InitiativeRollResult {
  /** Orderable initiative value (higher acts first). */
  value: number;
  /** The raw die result driving the roll (d10 for both formulas). */
  die: number;
  /** Which Initiative_Formula produced this result. */
  formula: InitiativeFormula;
  /** Human-readable calculation, e.g. "Ibonus 4 + d10(7) = 11". */
  breakdown: string;
}

/** Total value of the Initiative (I) characteristic: initial + advances + bonus mod. */
function initiativeTotal(character: Character): number {
  const i = character.chars.I;
  return i.i + i.a + i.b;
}

/**
 * Roll initiative for a character using the configured Initiative_Formula
 * (spec: ux-audit-improvements, Req 4.2, 4.4, 4.6). Cites WFRP4e Core p.156
 * "Roll For Initiative!" and "Initiative Order".
 *
 * The die function is injected for testability (Req: deterministic tests) and
 * defaults to a uniform d10. All characteristics are read from the passed
 * character (Req 4.6).
 *
 * - 'initiativePlusD10': `getBonus(Initiative total) + d10` (Core p.156, "d10 +
 *   Initiative" convention; see the FLAG above regarding bonus vs. full value).
 * - 'initiativeAgilityTest': an Initiative-Test-based orderable value (Core p.156,
 *   "roll an Initiative Test to determine a SL"). We resolve the d10 as a test
 *   against the Initiative characteristic to obtain a Success Level (SL), then
 *   produce an orderable integer that preserves the rulebook's ranking intent
 *   (higher Initiative Bonus + higher SL acts first, matching the p.156 tie-break
 *   that favours higher characteristics). See the FLAG note: the exact mapping of
 *   an Initiative Test to a single orderable integer is not spelled out in RAW, so
 *   this uses `Ibonus + SL` as a deterministic, monotonic choice.
 */
export function rollInitiative(
  formula: InitiativeFormula,
  character: Character,
  dieFn: DieFn = defaultD10,
): InitiativeRollResult {
  const die = dieFn();

  if (formula === 'initiativeAgilityTest') {
    // Core p.156: "roll an Initiative Test to determine a SL".
    // We use the injected d10 to drive a percentile-style test against the
    // Initiative characteristic. Because a d10 is 1..10, we scale it to a
    // representative d100 roll (die × 10) so resolveRoll can compute a SL from
    // the tens digit against the Initiative target number.
    const target = initiativeTotal(character);
    const iBonus = getBonus(target);
    const percentile = die * 10; // 1→10, 10→100; monotonic in the die result
    const { sl } = resolveRoll(percentile, target);
    // Orderable value keeps the p.156 ranking intent: higher Initiative Bonus and
    // higher SL act earlier. See FLAG: RAW does not pin this to a single integer.
    const value = iBonus + sl;
    return {
      value,
      die,
      formula,
      breakdown: `Ibonus ${iBonus} + Test SL ${sl >= 0 ? '+' : ''}${sl} = ${value}`,
    };
  }

  // 'initiativePlusD10' (default): Initiative Bonus + d10 (Core p.156).
  const target = initiativeTotal(character);
  const iBonus = getBonus(target);
  const value = iBonus + die;
  return {
    value,
    die,
    formula,
    breakdown: `Ibonus ${iBonus} + d10(${die}) = ${value}`,
  };
}
