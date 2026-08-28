import type { CharacteristicKey, CharacteristicValue, ArmourItem, Trapping } from '../types/character';
import type { LocationKey } from './armourLayering';
import { coversLocation, computeArchives3LocationAP } from './armourLayering';
import { getRuneAPBonus } from './runes';
import { calculateTrappingEncumbrance, calculateCarriedTrappingEnc, isEffectivelyWorn } from './encumbrance';

// ─── Characteristic Name Mapping ─────────────────────────────────────────────

const CHAR_NAMES: Record<CharacteristicKey, string> = {
  WS: 'Weapon Skill',
  BS: 'Ballistic Skill',
  S: 'Strength',
  T: 'Toughness',
  I: 'Initiative',
  Ag: 'Agility',
  Dex: 'Dexterity',
  Int: 'Intelligence',
  WP: 'Willpower',
  Fel: 'Fellowship',
};

// ─── Skill Breakdown ─────────────────────────────────────────────────────────

export interface SkillBreakdown {
  charName: string;
  charValue: number;
  advances: number;
  total: number;
}

/**
 * Computes the breakdown for a skill total.
 * charValue = initial + advances + talentBonus of the linked characteristic (clamped to 0).
 * total = charValue + skill advances.
 */
export function getSkillBreakdown(
  charKey: CharacteristicKey,
  chars: Record<CharacteristicKey, CharacteristicValue>,
  advances: number,
): SkillBreakdown {
  const char = chars[charKey];
  const rawValue = char ? char.i + char.a + char.b : 0;
  const charValue = Math.max(0, rawValue);
  return {
    charName: CHAR_NAMES[charKey] ?? charKey,
    charValue,
    advances,
    total: charValue + advances,
  };
}

// ─── Characteristic Bonus Breakdown ──────────────────────────────────────────

export interface CBBreakdown {
  charName: string;
  currentValue: number;
  bonus: number;
}

/**
 * Computes the breakdown for a characteristic bonus (CB).
 * bonus = floor(currentValue / 10), with negatives clamped to 0.
 */
export function getCBBreakdown(
  charKey: CharacteristicKey,
  chars: Record<CharacteristicKey, CharacteristicValue>,
): CBBreakdown {
  const char = chars[charKey];
  const rawValue = char ? char.i + char.a + char.b : 0;
  const currentValue = Math.max(0, rawValue);
  return {
    charName: CHAR_NAMES[charKey] ?? charKey,
    currentValue,
    bonus: Math.floor(currentValue / 10),
  };
}

// ─── Encumbrance Breakdown ───────────────────────────────────────────────────

export interface EncumbranceBreakdown {
  sb: number;
  tb: number;
  strongBackLevel: number;
  sturdyLevel: number;
  total: number;
}

/**
 * Computes the breakdown for max encumbrance.
 * sb = floor(S/10), tb = floor(T/10).
 * total = sb + tb + strongBackLevel + sturdyLevel×2.
 * Core p.293 (base SB+TB), p.146 Strong Back (+1/level), p.146 Sturdy (+2/level).
 * Negative characteristic values are clamped to 0.
 */
export function getEncumbranceBreakdown(
  chars: Record<CharacteristicKey, CharacteristicValue>,
  strongBackLevel: number,
  sturdyLevel: number,
): EncumbranceBreakdown {
  const sRaw = chars.S ? chars.S.i + chars.S.a + chars.S.b : 0;
  const tRaw = chars.T ? chars.T.i + chars.T.a + chars.T.b : 0;
  const sb = Math.floor(Math.max(0, sRaw) / 10);
  const tb = Math.floor(Math.max(0, tRaw) / 10);
  return {
    sb,
    tb,
    strongBackLevel,
    sturdyLevel,
    total: sb + tb + strongBackLevel + sturdyLevel * 2,
  };
}

// ─── Coin Weight Breakdown ───────────────────────────────────────────────────

export interface CoinWeightBreakdown {
  gc: number;
  ss: number;
  d: number;
  total: number;
  isEmpty: boolean;
}

/**
 * Computes the breakdown for coin weight encumbrance.
 * total = floor((gc + ss + d) / 200), isEmpty when all coins are 0.
 */
export function getCoinWeightBreakdown(
  gc: number,
  ss: number,
  d: number,
): CoinWeightBreakdown {
  const sum = gc + ss + d;
  return {
    gc,
    ss,
    d,
    total: Math.floor(sum / 200),
    isEmpty: sum === 0,
  };
}

// ─── Armour Points Breakdown ─────────────────────────────────────────────────

export interface APBreakdownItem {
  name: string;
  /** Effective AP of this piece (currentAp if damaged, plus rune bonus). */
  ap: number;
  /**
   * Whether this piece actually contributes to the applied total under the
   * Archives of the Empire III combining rules. Non-contributing pieces are
   * still listed so the user can see every factor.
   */
  contributes: boolean;
}

export interface APBreakdown {
  locationLabel: string;
  items: APBreakdownItem[];
  total: number;
}

/**
 * Computes the breakdown for armour points at a given body location.
 *
 * Uses the Archives of the Empire III combining rules (see armourLayering.ts)
 * so the tooltip matches the applied AP used by combat and the body map. The
 * total is the AP of the best legal stack (Soft Kit + base + Overcoat, or a
 * standalone plate piece). Uses currentAp so damaged armour is reflected.
 *
 * Every worn covering piece is still listed so users can see all contributing
 * factors (calculated-totals steering guideline 4); pieces not part of the
 * best legal stack are flagged with contributes=false.
 */
export function getAPBreakdown(
  armourItems: ArmourItem[],
  location: LocationKey,
  locationLabel: string,
): APBreakdown {
  const worn = armourItems.filter((item) => item.worn === true && coversLocation(item, location));

  // Compute the Archives III total and which pieces contribute, using each
  // piece's current (damaged) AP as the basis.
  const archives = computeArchives3LocationAP(worn, location, (i) => i.currentAp ?? i.ap);
  const contributing = new Set(archives.contributingNames);

  // Track how many of each name we've marked contributing, so duplicates named
  // items don't all light up when only one is part of the stack.
  const remaining = new Map<string, number>();
  for (const name of archives.contributingNames) {
    remaining.set(name, (remaining.get(name) ?? 0) + 1);
  }

  const items: APBreakdownItem[] = worn.map((item) => {
    const name = item.name || 'Unnamed';
    const baseAp = item.currentAp !== undefined ? item.currentAp : item.ap;
    const ap = baseAp + getRuneAPBonus(item.runes ?? []);
    let contributes = false;
    if (contributing.has(name) && (remaining.get(name) ?? 0) > 0) {
      contributes = true;
      remaining.set(name, (remaining.get(name) ?? 0) - 1);
    }
    return { name, ap, contributes };
  });

  return {
    locationLabel,
    items,
    total: archives.total,
  };
}

// ─── Trapping Encumbrance Breakdown ──────────────────────────────────────────

export interface TrappingEncBreakdownLine {
  name: string;
  baseEnc: number;
  worn: boolean;
  quantity: number;
  effective: number;
}

export interface TrappingEncBreakdown {
  lines: TrappingEncBreakdownLine[];
  total: number;
}

/**
 * Computes the breakdown for the carried trappings encumbrance total.
 * Includes only carried trappings (storedOnHorse !== true), one line per
 * trapping. Each line's `effective` value uses the read-time worn state
 * (isEffectivelyWorn) so the reported worn marker and effective contribution
 * match calculateCarriedTrappingEnc. Zero-value lines are included so users
 * can see every contributing factor (calculated-totals steering guideline 4).
 * `total` equals calculateCarriedTrappingEnc(trappings).
 * Core p.293 "Worn Items": worn items have per-item Enc reduced by 1 (min 0).
 */
export function getTrappingEncBreakdown(trappings: Trapping[]): TrappingEncBreakdown {
  const lines = trappings
    .filter((t) => t.storedOnHorse !== true)
    .map((t) => {
      const worn = isEffectivelyWorn(t);
      return {
        name: t.name || 'Unnamed',
        baseEnc: parseFloat(t.enc) || 0,
        worn,
        quantity: t.quantity || 1,
        effective: calculateTrappingEncumbrance(t.enc, t.quantity, worn),
      };
    });

  return {
    lines,
    total: calculateCarriedTrappingEnc(trappings),
  };
}
