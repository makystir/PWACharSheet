import type { ArmourItem, ArmourType } from '../types/character';
import { getRuneAPBonus } from './runes';

export type LocationKey = 'head' | 'lArm' | 'rArm' | 'body' | 'lLeg' | 'rLeg';

export interface LayeringResult {
  valid: boolean;
  warnings: string[];
}

/**
 * Map location display strings (from the armour data) to LocationKey values.
 * "Arms" → lArm + rArm, "Legs" → lLeg + rLeg, "Head" → head, "Body" → body.
 */
const LOCATION_TOKEN_MAP: Record<string, LocationKey[]> = {
  head: ['head'],
  arms: ['lArm', 'rArm'],
  body: ['body'],
  legs: ['lLeg', 'rLeg'],
  'left arm': ['lArm'],
  'right arm': ['rArm'],
  'left leg': ['lLeg'],
  'right leg': ['rLeg'],
};

/** Check if an armour item covers a specific location */
export function coversLocation(item: ArmourItem, location: LocationKey): boolean {
  const tokens = item.locations.split(',').map((s) => s.trim().toLowerCase());
  for (const token of tokens) {
    const mapped = LOCATION_TOKEN_MAP[token];
    if (mapped && mapped.includes(location)) {
      return true;
    }
  }
  return false;
}

/** Parse the qualities string into an array of individual quality/flaw names */
function parseQualities(qualities: string): string[] {
  if (!qualities || qualities === '—') return [];
  return qualities.split(',').map((q) => q.trim());
}

/** Check if an item has a specific quality or flaw */
function hasQuality(item: ArmourItem, quality: string): boolean {
  return parseQualities(item.qualities).some(
    (q) => q.toLowerCase() === quality.toLowerCase(),
  );
}

/** Check if an item has the Overcoat quality */
function hasOvercoat(item: ArmourItem): boolean {
  return hasQuality(item, 'Overcoat');
}

/**
 * Get the layer order for an armour type.
 * Soft Kit = 0, Boiled Leather = 1, Chainmail = 2, Brigandine/Plate = 3
 */
function getLayerOrder(item: ArmourItem): number {
  const type = item.armourType;
  switch (type) {
    case 'SoftKit':
      return 0;
    case 'BoiledLeather':
      return 1;
    case 'Chainmail':
      return 2;
    case 'Brigandine':
      return 3;
    case 'Plate':
      return 3;
    default:
      return -1;
  }
}

/**
 * Can `over` be layered on top of `under` at a given location?
 * Based on the layering matrix from the design document.
 */
function canLayerOnTop(under: ArmourItem, over: ArmourItem): boolean {
  const underType = under.armourType;
  const overType = over.armourType;

  if (!underType || !overType) return false;

  // Nothing can go under Soft Kit
  if (overType === 'SoftKit') return false;

  // Soft Kit can go under anything (except another Soft Kit, handled above)
  if (underType === 'SoftKit') return true;

  // Brigandine (has Overcoat) can go over Boiled Leather or Chainmail
  if (overType === 'Brigandine') {
    return underType === 'BoiledLeather' || underType === 'Chainmail';
  }

  // Plate with Overcoat can go over Boiled Leather or Chainmail
  if (overType === 'Plate' && hasOvercoat(over)) {
    return underType === 'BoiledLeather' || underType === 'Chainmail';
  }

  // Plate without Overcoat cannot go over Leather or Chainmail
  // (only over Soft Kit, which is handled above)
  if (overType === 'Plate' && !hasOvercoat(over)) {
    // Can only be over SoftKit (handled above), reject everything else
    return false;
  }

  // Boiled Leather cannot go over anything except Soft Kit (handled above)
  if (overType === 'BoiledLeather') return false;

  // Chainmail cannot go over Boiled Leather
  if (overType === 'Chainmail') return false;

  return false;
}

/**
 * Validate whether a set of armour items can be layered at a given location.
 * Returns valid=true if all pairwise layer combinations are legal.
 * Adds warnings for "Requires Kit" without Soft Kit present.
 */
export function validateLayering(
  items: ArmourItem[],
  location: LocationKey,
): LayeringResult {
  // Filter to items that actually cover this location and are worn
  const covering = items.filter(
    (item) => coversLocation(item, location) && item.worn !== false,
  );

  const warnings: string[] = [];
  let valid = true;

  if (covering.length <= 1) {
    // Check "Requires Kit" even for single items
    checkRequiresKit(covering, warnings);
    return { valid, warnings };
  }

  // Sort by layer order (innermost first)
  const sorted = [...covering].sort(
    (a, b) => getLayerOrder(a) - getLayerOrder(b),
  );

  // Validate each pair: each item must be validly layered over the one below it
  for (let i = 0; i < sorted.length - 1; i++) {
    const under = sorted[i];
    const over = sorted[i + 1];

    // Same armour type at the same layer cannot stack (e.g., two Soft Kits)
    if (
      under.armourType === over.armourType &&
      getLayerOrder(under) === getLayerOrder(over)
    ) {
      // Exception: Brigandine and Plate can coexist at layer 3 if one has Overcoat
      if (
        !(
          (under.armourType === 'Brigandine' && over.armourType === 'Plate') ||
          (under.armourType === 'Plate' && over.armourType === 'Brigandine')
        )
      ) {
        valid = false;
        warnings.push(
          `Cannot layer ${over.name} over ${under.name}: same armour type`,
        );
        continue;
      }
    }

    if (!canLayerOnTop(under, over)) {
      valid = false;
      warnings.push(`Cannot layer ${over.name} over ${under.name}`);
    }
  }

  // Check "Requires Kit" warning
  checkRequiresKit(covering, warnings);

  return { valid, warnings };
}

/** Check if any item has "Requires Kit" without a Soft Kit present */
function checkRequiresKit(items: ArmourItem[], warnings: string[]): void {
  const hasSoftKit = items.some((item) => item.armourType === 'SoftKit');
  const requiresKit = items.filter((item) => hasQuality(item, 'Requires Kit'));

  if (!hasSoftKit && requiresKit.length > 0) {
    for (const item of requiresKit) {
      warnings.push(
        `${item.name} has "Requires Kit" but no Soft Kit is worn in this location`,
      );
    }
  }
}

/**
 * Check if a specific piece can be added to existing worn armour at a location.
 * Returns true if the new piece can validly layer with all existing pieces.
 */
export function canLayerOver(
  existing: ArmourItem[],
  newPiece: ArmourItem,
  location: LocationKey,
): boolean {
  // Filter existing to items that cover this location
  const covering = existing.filter(
    (item) => coversLocation(item, location) && item.worn !== false,
  );

  if (covering.length === 0) return true;

  // Check the new piece against all existing items
  // The new piece must be able to layer on top of (or underneath) the existing items
  const allItems = [...covering, newPiece];
  const result = validateLayering(allItems, location);
  return result.valid;
}

/**
 * Calculate the total effective AP at a location from validly layered pieces.
 * Sums currentAp (or ap if currentAp is not set) for all worn items covering the location.
 */
export function calculateEffectiveAP(
  items: ArmourItem[],
  location: LocationKey,
): number {
  const covering = items.filter(
    (item) => coversLocation(item, location) && item.worn !== false,
  );

  return covering.reduce((sum, item) => {
    const ap = item.currentAp ?? item.ap;
    return sum + ap;
  }, 0);
}

/**
 * Check if the Weakpoints flaw is suppressed for Plate armour at a location.
 * Returns true if there's a Plate item with Weakpoints AND a Soft Kit with Reinforced quality
 * in the same location.
 */
export function isWeakpointsSuppressed(
  items: ArmourItem[],
  location: LocationKey,
): boolean {
  const covering = items.filter(
    (item) => coversLocation(item, location) && item.worn !== false,
  );

  const hasPlateWithWeakpoints = covering.some(
    (item) => item.armourType === 'Plate' && hasQuality(item, 'Weakpoints'),
  );

  const hasReinforcedSoftKit = covering.some(
    (item) => item.armourType === 'SoftKit' && hasQuality(item, 'Reinforced'),
  );

  return hasPlateWithWeakpoints && hasReinforcedSoftKit;
}

// ─── Archives of the Empire III — Combining Armour ──────────────────────────
//
// This app follows the "Combining Armour" rules from Archives of the Empire
// Vol. III (p.188 area), which REPLACE the Core Rulebook's Flexible-based
// layering. Under Archives III, armour is not freely "layered by grade";
// instead, at each Hit Location a legal stack is built from at most:
//   • one Soft Kit (worn under everything), plus
//   • one base body layer — Boiled Leather OR Chainmail, plus
//   • one Overcoat layer — Brigandine or a Plate Breastplate (both have the
//     Overcoat quality) which alone may be worn over leather/mail.
// Plate limb/head pieces (Bracers, Leggings, Helms) are NOT Overcoat: they may
// only be worn over a Soft Kit, so they do not combine with mail/leather.
//
// The location's AP is the sum of the AP of the best LEGAL stack, reproducing
// the Archives III "Alphonse" worked example (soft kit 1 + mail 2 + breastplate
// 3 = 6 AP on the body). Illegal combinations still compute the best legal
// subset for the total; validateLayering() surfaces warnings separately.

/** True if an item is a Plate Breastplate-style Overcoat plate (Overcoat + Plate). */
function isOvercoatPlate(item: ArmourItem): boolean {
  return item.armourType === 'Plate' && hasOvercoat(item);
}

/** Result of an Archives III per-location AP computation. */
export interface Archives3APResult {
  /** Total AP at the location from the best legal stack. */
  total: number;
  /** Names of the armour items that contribute to that total. */
  contributingNames: string[];
}

/**
 * Select the armour items that form the best legal Archives III stack among a
 * set of pieces already covering a single location.
 *
 * Returns the contributing items (a subset): at most one Soft Kit, plus the
 * highest-AP combination of a base layer (leather/mail) + Overcoat
 * (brigandine/breastplate), OR a single standalone plate piece — whichever
 * yields the highest AP. Illegal loadouts still resolve to their best legal
 * subset (validateLayering surfaces warnings separately).
 *
 * @param covering  Items covering the location (caller filters by worn/location).
 * @param apOf  AP basis for an item (base `ap` by default, or `currentAp`).
 *              Rune AP bonuses are always added on top.
 */
export function selectArchives3ContributingItems(
  covering: ArmourItem[],
  apOf: (item: ArmourItem) => number = (i) => i.ap,
): ArmourItem[] {
  const effAP = (item: ArmourItem) => apOf(item) + getRuneAPBonus(item.runes ?? []);

  // Highest-AP piece in each Archives III band.
  let softKit: ArmourItem | null = null;         // Soft Kit
  let base: ArmourItem | null = null;             // Boiled Leather OR Chainmail
  let overcoat: ArmourItem | null = null;         // Brigandine / Plate Breastplate (Overcoat)
  let standalonePlate: ArmourItem | null = null;  // Non-overcoat Plate (Bracers/Leggings/Helm)

  const consider = (slot: ArmourItem | null, item: ArmourItem): ArmourItem =>
    !slot || effAP(item) > effAP(slot) ? item : slot;

  for (const item of covering) {
    switch (item.armourType) {
      case 'SoftKit':
        softKit = consider(softKit, item);
        break;
      case 'BoiledLeather':
      case 'Chainmail':
        base = consider(base, item);
        break;
      case 'Brigandine':
        overcoat = consider(overcoat, item);
        break;
      case 'Plate':
        if (isOvercoatPlate(item)) overcoat = consider(overcoat, item);
        else standalonePlate = consider(standalonePlate, item);
        break;
      default:
        // Unknown/legacy armourType: treat as a base-ish layer so it still
        // contributes its own AP (highest wins) rather than being ignored.
        base = consider(base, item);
        break;
    }
  }

  const baseAP = base ? effAP(base) : 0;
  const overcoatAP = overcoat ? effAP(overcoat) : 0;
  const plateAP = standalonePlate ? effAP(standalonePlate) : 0;
  const baseOvercoat = baseAP + overcoatAP;
  const outer = Math.max(baseOvercoat, plateAP, baseAP, overcoatAP);

  const contributing: ArmourItem[] = [];
  if (softKit) contributing.push(softKit);
  if (outer === baseOvercoat && (base || overcoat)) {
    if (base) contributing.push(base);
    if (overcoat) contributing.push(overcoat);
  } else if (outer === plateAP && standalonePlate) {
    contributing.push(standalonePlate);
  } else if (outer === baseAP && base) {
    contributing.push(base);
  } else if (outer === overcoatAP && overcoat) {
    contributing.push(overcoat);
  }

  return contributing;
}

/**
 * Compute the AP at a single location under the Archives III combining rules.
 *
 * @param items  All armour items (already worn-filtered by the caller if desired).
 * @param location  The body location to compute.
 * @param apOf  Returns the AP basis for an item (e.g. base `ap`, or `currentAp`).
 *              Rune AP bonuses are added on top automatically.
 */
export function computeArchives3LocationAP(
  items: ArmourItem[],
  location: LocationKey,
  apOf: (item: ArmourItem) => number = (i) => i.ap,
): Archives3APResult {
  const covering = items.filter((item) => coversLocation(item, location));
  const contributing = selectArchives3ContributingItems(covering, apOf);

  const total = Math.max(
    0,
    contributing.reduce((sum, item) => sum + apOf(item) + getRuneAPBonus(item.runes ?? []), 0),
  );

  return {
    total,
    contributingNames: contributing.map((i) => i.name || 'Unnamed'),
  };
}
