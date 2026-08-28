import type { ArmourItem } from '../types/character';

/**
 * Armour test penalties (Stealth and Perception) per Archives of the Empire III.
 *
 * This app follows the Archives III armour rules (see armourLayering.ts for the
 * matching AP-combining model). Two distinct penalties come from armour:
 *
 * 1. Stealth — Archives III (p.1531, "Armour and Stealth Tests"): "Wearing any
 *    Chainmail or Plate imposes a penalty of -10 to any Stealth Tests." This is
 *    a FLAT -10 for wearing any chainmail or plate at all — it does NOT stack
 *    per piece. (This replaces the Core Rulebook's "-10 each" footnote.)
 *
 * 2. Perception — Archives III armour table ("Armour Penalty" column): certain
 *    enclosing helmets impose a per-item Perception penalty:
 *      • Open Helm       -10 Perception
 *      • Chainmail Coif  -10 Perception (also -10 Stealth via the rule above)
 *      • Great Helm      -20 Perception
 *      • Bascinet        -20 Perception
 *      • Armet           -20 Perception
 *      • Sallet          -20 Perception
 *    A visor helmet (Bascinet/Armet/Sallet) worn open loses its Perception
 *    penalty (the wearer can see out), so it is suppressed when visorOpen.
 */

/** Per-item Perception penalty (percent) keyed by canonical armour piece name.
 *  Source: Archives of the Empire III armour table ("Armour Penalty" column). */
const PERCEPTION_PENALTY_BY_NAME: Record<string, number> = {
  // Mail
  'Chainmail Coif': 10,
  'Mail Coif': 10, // alias for the same piece
  // Plate helms
  'Open Helm': 10,
  'Great Helm': 20,
  'Bascinet': 20,
  'Armet': 20,
  'Sallet': 20,
};

/** True when a worn armour piece is Mail or Plate (triggers the Stealth penalty). */
function isChainmailOrPlate(item: ArmourItem): boolean {
  return item.worn !== false && (item.armourType === 'Chainmail' || item.armourType === 'Plate');
}

export interface StealthPenaltyBreakdownItem {
  name: string;
  penalty: number;
}

export interface StealthPenaltyResult {
  /** Total Stealth penalty magnitude (positive number; apply as a negative modifier). */
  total: number;
  /** The worn Chainmail/Plate pieces that trigger the (flat) penalty, for display. */
  items: StealthPenaltyBreakdownItem[];
}

/**
 * Compute the Stealth penalty from worn armour.
 * Archives III p.1531: a FLAT -10 to Stealth Tests if any worn Chainmail or
 * Plate is present (it does not stack per piece).
 */
export function getStealthPenalty(armourList: ArmourItem[]): StealthPenaltyResult {
  const triggering = armourList.filter(isChainmailOrPlate);
  const total = triggering.length > 0 ? 10 : 0;
  return {
    total,
    // List the triggering pieces so the breakdown can show why the penalty applies,
    // but the total is flat -10 regardless of how many are worn.
    items: triggering.map((item) => ({ name: item.name || 'Unnamed', penalty: 0 })),
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
 * Archives III armour table: enclosing helmets impose a per-item Perception
 * penalty (Open Helm/Chainmail Coif -10; Great Helm/Bascinet/Armet/Sallet -20).
 * A visor helmet worn open (visorOpen === true) has no Perception penalty.
 *
 * Penalties are summed if multiple penalising pieces are worn. The GM may rule
 * only the worst applies; we report the sum with a full breakdown so the value
 * is transparent.
 */
export function getPerceptionPenalty(armourList: ArmourItem[]): PerceptionPenaltyResult {
  const items: PerceptionPenaltyBreakdownItem[] = [];

  for (const item of armourList) {
    if (item.worn === false) continue;
    // A visor helmet worn open can see out — no Perception penalty.
    if (item.visorOpen === true) continue;
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
