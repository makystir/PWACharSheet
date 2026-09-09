import type { Character } from '../types/character';

/**
 * Combat_Target helpers (spec: ux-audit-improvements, Requirement 1).
 *
 * The Combat_Target is an ad-hoc, in-combat-only descriptor stored on
 * `combatState.target` holding an opponent's name, Toughness Bonus (TB), and
 * Armour Points (AP). It lets the player avoid re-typing the opponent's TB/AP on
 * every attack (Req 1.1–1.4). It is NOT a persisted opponent roster (Req 1.7) and
 * is cleared when combat ends (Req 1.5, see `clearCombatTarget`).
 *
 * All helpers are pure: they never mutate the input Character. Setters return a
 * new Character whose only changed field is `combatState.target`, leaving every
 * other `combatState` field untouched. TB/AP are clamped to >= 0.
 */

/** Default Combat_Target when none has been entered (Req 1.6). */
const DEFAULT_TARGET: { name: string; tb: number; ap: number } = {
  name: '',
  tb: 0,
  ap: 0,
};

/** Clamp a numeric value to >= 0, coercing non-finite input to 0. */
function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value;
}

/**
 * Read the current Combat_Target, defaulting to `{ name: '', tb: 0, ap: 0 }`
 * when `combatState.target` is unset (Req 1.1, 1.6).
 */
export function getCombatTarget(c: Character): { name: string; tb: number; ap: number } {
  const target = c.combatState.target;
  if (!target) {
    return { ...DEFAULT_TARGET };
  }
  return {
    name: target.name,
    tb: target.tb,
    ap: target.ap,
  };
}

/**
 * Immutably set the Combat_Target name, preserving the existing TB/AP (Req 1.3).
 * Only `combatState.target` changes; all other combat fields are untouched.
 */
export function setCombatTargetName(c: Character, name: string): Character {
  const current = getCombatTarget(c);
  return {
    ...c,
    combatState: {
      ...c.combatState,
      target: { ...current, name },
    },
  };
}

/**
 * Immutably set the Combat_Target Toughness Bonus, clamped to >= 0 (Req 1.3).
 * Only `combatState.target` changes; all other combat fields are untouched.
 */
export function setCombatTargetTB(c: Character, tb: number): Character {
  const current = getCombatTarget(c);
  return {
    ...c,
    combatState: {
      ...c.combatState,
      target: { ...current, tb: clampNonNegative(tb) },
    },
  };
}

/**
 * Immutably set the Combat_Target Armour Points, clamped to >= 0 (Req 1.3).
 * Only `combatState.target` changes; all other combat fields are untouched.
 */
export function setCombatTargetAP(c: Character, ap: number): Character {
  const current = getCombatTarget(c);
  return {
    ...c,
    combatState: {
      ...c.combatState,
      target: { ...current, ap: clampNonNegative(ap) },
    },
  };
}

/**
 * Clear the Combat_Target (Req 1.5, 1.7). Sets `combatState.target = undefined`
 * without touching any other combat field. Called by the endCombat path.
 */
export function clearCombatTarget(c: Character): Character {
  return {
    ...c,
    combatState: {
      ...c.combatState,
      target: undefined,
    },
  };
}
