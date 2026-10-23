import type { WeaponItem } from '../types/character';
import type { HitLocation } from '../components/combat/hitLocationTable';
import { CONDITIONS } from '../data/conditions';

/**
 * Pure consequence-derivation logic for the Attack → Damage → Consequence
 * pipeline (crit-pipeline-design §5.2). No React imports — unit- and
 * property-testable in isolation.
 *
 * Rulebook citations (authoritative source: docs/WarhammerFantasyRoleplay4e.md):
 *  - Pummel → Stunned (test-gated): "If you score a Head hit with a Pummel
 *    weapon, attempt an Opposed Strength/Endurance test … If you win … your
 *    opponent gains a Stunned Condition." (Core p.298.)
 *  - Hack → armour damage (no condition): "If you hit an opponent, you Damage a
 *    struck piece of armour or shield by 1 point as well as wounding the
 *    target." (Core p.298.)
 * No new mechanic is invented here; every condition surfaced comes either from
 * one of those two documented weapon qualities or from the authored critical
 * table effect prose in src/data/critical-wound-tables.ts.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type SuggestedConditionSource = 'weapon-quality' | 'critical-wound';

export interface SuggestedCondition {
  /** Must match a CONDITIONS[].name. */
  name: string;
  /** How many to apply (stacking resolved by applyCondition). */
  count: number;
  /** true = RAW requires a follow-up test (e.g. Pummel's Opposed test). */
  testGated: boolean;
  /** Short explanatory label, e.g. "Pummel (Head): on a won Opposed Str/End test". */
  note?: string;
  source: SuggestedConditionSource;
}

/** Non-condition advisory note (e.g. Hack armour damage). */
export interface AttackAdvisory {
  text: string;
}

/** The pre-mitigation inputs handed to the Defend-side Take Damage panel. */
export interface DefendHandoff {
  /** Weapon damage component only (NOT including SL) — avoids double-counting SL. */
  damage: number;
  /** Effective SL (Damaging-adjusted). */
  sl: number;
  location: HitLocation;
}

// ─── Condition-name vocabulary (built from data at module load) ───────────────

/** Escape regex metacharacters so condition names interpolate safely. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const CONDITION_NAMES: string[] = CONDITIONS.map((c) => c.name);
const CONDITION_MAX_LEVEL = new Map<string, number>(
  CONDITIONS.map((c) => [c.name, c.maxLevel]),
);

/**
 * Global, verb-independent matcher for "[N] <Condition> Condition(s)" fragments.
 * The alternation is generated from CONDITIONS (not a hand-typed literal) so it
 * can never drift from the data. The leading verb (suffer/gain) is deliberately
 * NOT anchored: critical-table effects comma-chain conditions with no repeated
 * verb (e.g. "Suffer 1 Stunned Condition, 1 Bleeding Condition."), and a
 * verb-anchored regex would silently drop the second clause (crit-pipeline-design
 * §5.2, FR-2.3). The optional "the" article handles "Gain the Unconscious Condition".
 */
const CRIT_CONDITION_REGEX = new RegExp(
  '(\\d+)?\\s*(?:the\\s+)?(' + CONDITION_NAMES.map(escapeRegExp).join('|') + ')\\s+Conditions?',
  'gi',
);

/** Canonical condition name (matches CONDITIONS casing) for a captured token. */
function canonicalConditionName(captured: string): string | undefined {
  const lower = captured.toLowerCase();
  return CONDITION_NAMES.find((n) => n.toLowerCase() === lower);
}

/** Clamp a parsed count to the condition's maxLevel (1 for non-stackable). */
function clampCount(name: string, count: number): number {
  const maxLevel = CONDITION_MAX_LEVEL.get(name) ?? 1;
  return Math.min(Math.max(1, count), maxLevel);
}

// ─── Weapon-quality parsing ───────────────────────────────────────────────────

interface QualityPresence {
  token: string;
  /** true ⇒ this quality is one of several "X or Y" alternatives (player choice). */
  choice: boolean;
}

/**
 * Parse a weapon's comma-separated qualities string into tokens, recording
 * whether each token is guaranteed (sole token in its comma segment) or a
 * choice alternative (one of several "or" options). This replaces hasWeaponQuality
 * for Pummel/Hack detection: hasWeaponQuality does an exact per-segment match and
 * therefore misses "X or Y" choice groups such as Warhammer
 * "Unbalanced, Pummel or Penetrating" or Pollaxe "Defensive, Hack or Impale or Pummel"
 * (crit-pipeline-design §5.2, FR-2.2). Parenthetical ratings (e.g. "Slash (2A)")
 * are trimmed to the bare quality token.
 */
function parseQualityPresence(qualities: string): QualityPresence[] {
  if (!qualities) return [];
  const result: QualityPresence[] = [];
  for (const segment of qualities.split(',')) {
    const alternatives = segment.split(/\bor\b/i);
    const isChoice = alternatives.length > 1;
    for (const alt of alternatives) {
      // Strip any parenthetical rating and surrounding whitespace.
      const token = alt.replace(/\(.*?\)/g, '').trim();
      if (token.length > 0) {
        result.push({ token, choice: isChoice });
      }
    }
  }
  return result;
}

/** Find a quality (case-insensitive) among parsed presences, if present. */
function findQuality(presences: QualityPresence[], quality: string): QualityPresence | undefined {
  const lower = quality.toLowerCase();
  return presences.find((p) => p.token.toLowerCase() === lower);
}

/**
 * Conditions and advisories suggested purely from the weapon's qualities and the
 * struck hit location (no critical roll yet). crit-pipeline-design §5.2, FR-2.2.
 *
 * - Pummel present (outright or as an "or" alternative) AND a Head hit →
 *   test-gated Stunned suggestion. The Stunned is always gated behind the
 *   Opposed Strength/Endurance test (Core p.298); when Pummel came from an "or"
 *   choice group, the note additionally flags "if chosen".
 * - Hack present (outright or choice) → an advisory describing the struck-armour
 *   damage (Core p.298). Hack inflicts no condition, so it is never a chip.
 */
export function deriveWeaponQualitySuggestions(
  weapon: WeaponItem,
  location: HitLocation,
): { conditions: SuggestedCondition[]; advisories: AttackAdvisory[] } {
  const conditions: SuggestedCondition[] = [];
  const advisories: AttackAdvisory[] = [];
  const presences = parseQualityPresence(weapon.qualities);

  const pummel = findQuality(presences, 'Pummel');
  if (pummel && location === 'Head') {
    // Core p.298: Head hit with a Pummel weapon → Opposed Strength/Endurance
    // test; on a win the opponent gains a Stunned Condition. The app does not
    // auto-resolve that test (no opponent characteristics), so the chip is
    // marked test-gated and applied only after the player resolves the test.
    const note = pummel.choice
      ? 'Pummel (Head), if chosen: on a won Opposed Str/End test'
      : 'Pummel (Head): on a won Opposed Str/End test';
    conditions.push({
      name: 'Stunned',
      count: 1,
      testGated: true,
      note,
      source: 'weapon-quality',
    });
  }

  const hack = findQuality(presences, 'Hack');
  if (hack) {
    // Core p.298: Hack damages a struck piece of armour or shield by 1 point.
    // No condition is inflicted, so this is an advisory, not a chip.
    const text = hack.choice
      ? 'If Hack chosen: a struck piece of armour or shield is Damaged by 1'
      : 'Hack: a struck piece of armour or shield is Damaged by 1';
    advisories.push({ text });
  }

  return { conditions, advisories };
}

/**
 * Conditions parsed from a critical wound's effect prose. crit-pipeline-design §5.2,
 * FR-2.3.
 *
 * Accepts the raw effect string so a single parser serves both the table entry's
 * singular `CriticalWoundTableEntry.effect` and a persisted `CriticalWound.effects`
 * (plural) — both hold the same authored text. The CombatPage crit bridge passes
 * the recorded wound's stored `effects` (plural); the same function also accepts a
 * table entry's `effect` (singular) pre-record.
 *
 * Every "[N] <Condition> Condition(s)" fragment is captured independently of any
 * leading verb, so comma-chained verb-less clauses are not dropped (e.g. Body
 * "Cracked Ribs" → Stunned ×1 AND Bleeding ×1). Only names present in CONDITIONS
 * produce a suggestion; non-condition effects (permanent stat loss, test
 * penalties) contain no matching fragment and are ignored. Never throws.
 */
export function deriveCriticalWoundSuggestions(effectText: string): SuggestedCondition[] {
  const suggestions: SuggestedCondition[] = [];
  if (!effectText) return suggestions;

  // Reset lastIndex because the regex is a shared global instance.
  CRIT_CONDITION_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CRIT_CONDITION_REGEX.exec(effectText)) !== null) {
    const name = canonicalConditionName(match[2]);
    if (!name) continue;
    const rawCount = match[1] ? parseInt(match[1], 10) : 1;
    suggestions.push({
      name,
      count: clampCount(name, rawCount),
      testGated: false,
      source: 'critical-wound',
    });
  }
  return suggestions;
}

/**
 * The pre-mitigation inputs to hand to the Defend-side Take Damage panel
 * (crit-pipeline-design §5.3). The weapon-damage component and the effective SL
 * are kept separate (not pre-summed) so the Defend panel does not double-count
 * SL when it recomputes Damage + SL − TB − AP from the sheet owner's mitigation.
 */
export function buildDefendHandoff(
  weaponDamageNum: number,
  effectiveSL: number,
  location: HitLocation,
): DefendHandoff {
  return { damage: weaponDamageNum, sl: effectiveSL, location };
}
