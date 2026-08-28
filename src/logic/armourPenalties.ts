import type { ArmourItem } from '../types/character';

/**
 * Armour test penalties (Stealth and Perception) per WFRP4e.
 *
 * Two distinct penalties come from armour:
 *
 * 1. Stealth — Core p.293 (Armour table footnote): "Wearing any Mail or Plate
 *    confers a Penalty of –10 Stealth each." So the Stealth penalty STACKS:
 *    –10 for every worn Mail (Chainmail) or Plate piece.
 *
 *    Note: the Plate Leggings row lists "–10 Stealth" in its own Penalty
 *    column. That is the same footnote penalty made explicit for a Plate
 *    piece, not an additional one, so we source the Stealth penalty solely
 *    from the "per Mail/Plate piece" footnote to avoid double-counting.
 *
 * 2. Perception — Core p.293 (Armour table, "Penalty" column): specific pieces
 *    (mostly enclosing helmets) impose a Perception penalty. These are per-item
 *    values, independent of the Stealth rule:
 *      • Mail Coif   –10% Perception
 *      • Open Helm   –10% Perception
 *      • Helm        –20% Perception
 *    A Visor helmet worn open also applies –10 Perception (Winds of Magic /
 *    armour quality); that case is handled separately in the UI via visorOpen.
 */

/** Per-item Perception penalty (percent) keyed by canonical armour piece name.
 *  Source: Core p.293 Armour table "Penalty" column. */
const PERCEPTION_PENALTY_BY_NAME: Record<string, number> = {
  // Mail
  'Mail Coif': 10,
  'Chainmail Coif': 10, // app's data uses "Chainmail Coif" for the Mail Coif entry
  // Plate
  'Open Helm': 10,
  'Helm': 20,
  'Great Helm': 20, // app's data uses "Great Helm" for the fully-enclosed Helm entry
};

/** True when a worn armour piece is Mail or Plate (the Stealth-penalty types). */
function isStealthPenaltyItem(item: ArmourItem): boolean {
  return item.worn !== false && (item.armourType === 'Chainmail' || item.armourType === 'Plate');
}

export interface StealthPenaltyBreakdownItem {
  name: string;
  penalty: number; // always 10 per Mail/Plate piece
}

export interface StealthPenaltyResult {
  /** Total Stealth penalty magnitude (positive number; apply as a negative modifier). */
  total: number;
  /** One entry per worn Mail/Plate piece that contributes. */
  items: StealthPenaltyBreakdownItem[];
}

/**
 * Compute the total Stealth penalty from worn armour.
 * Core p.293: –10 Stealth for each worn Mail or Plate piece (stacks).
 */
export function getStealthPenalty(armourList: ArmourItem[]): StealthPenaltyResult {
  const items = armourList
    .filter(isStealthPenaltyItem)
    .map((item) => ({ name: item.name || 'Unnamed', penalty: 10 }));

  return {
    total: items.reduce((sum, i) => sum + i.penalty, 0),
    items,
  };
}

export interface PerceptionPenaltyBreakdownItem {
  name: string;
  penalty: number; // percent penalty magnitude (e.g. 10 or 20)
}

export interface PerceptionPenaltyResult {
  /** Total Perception penalty magnitude (positive percent; apply as negative). */
  total: number;
  /** One entry per worn piece that imposes a Perception penalty. */
  items: PerceptionPenaltyBreakdownItem[];
}

/**
 * Compute the Perception penalties from worn armour.
 * Core p.293 Armour table "Penalty" column: certain enclosing helmets impose a
 * per-item Perception penalty (Mail Coif/Open Helm –10, Helm –20).
 *
 * Penalties are summed if multiple such pieces are worn (they affect the same
 * Perception Test). The GM may rule only the worst applies; we report the sum
 * with a full breakdown so the value is transparent.
 */
export function getPerceptionPenalty(armourList: ArmourItem[]): PerceptionPenaltyResult {
  const items: PerceptionPenaltyBreakdownItem[] = [];

  for (const item of armourList) {
    if (item.worn === false) continue;
    const penalty = PERCEPTION_PENALTY_BY_NAME[item.name];
    if (penalty !== undefined) {
      items.push({ name: item.name || 'Unnamed', penalty });
    }
  }

  return {
    total: items.reduce((sum, i) => sum + i.penalty, 0),
    items,
  };
}
