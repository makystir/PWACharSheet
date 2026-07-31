import type { ArmourItem, ArmourType } from '../types/character';

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
