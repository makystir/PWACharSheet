import type { ArmourItem, ArmourType } from '../types/character';
import { type LocationKey, coversLocation, isWeakpointsSuppressed, selectArchives3ContributingItems } from './armourLayering';

export interface CombatArmourContext {
  armourItems: ArmourItem[];       // Items covering the hit location (worn, at that location)
  toHitRollEven: boolean;          // Whether the to-hit roll was even
  isCriticalHit: boolean;          // Whether a critical hit was scored
  attackerHasImpale: boolean;      // Whether attacking weapon has Impale quality
  isMissileFrontal?: boolean;      // For Bascinet bonus
}

export interface ArmourCombatResult {
  effectiveAP: number;             // AP after quality/flaw adjustments
  partialBypassed: boolean;        // Partial flaw caused AP to be ignored
  impenetrableNegatesCrit: boolean; // Impenetrable negates critical wound
  weakpointsBypassed: boolean;     // Weakpoints caused all AP to be ignored
  notes: string[];                 // Display notes
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

/**
 * Check if an item is a Bascinet with visor closed.
 * Bascinets have the Visor quality; when visorOpen is false (default), visor is closed.
 */
function isBascinetVisorClosed(item: ArmourItem): boolean {
  return (
    item.name.toLowerCase().includes('bascinet') &&
    hasQuality(item, 'Visor') &&
    item.visorOpen !== true
  );
}

/**
 * Determine if the Partial flaw triggers for a given item in this combat context.
 *
 * Partial triggers when:
 * - The item has the Partial flaw (explicitly listed, OR visor is open on a Visor helmet)
 * - AND (to-hit roll is even OR a Critical Hit is scored)
 */
function isPartialTriggered(
  item: ArmourItem,
  toHitRollEven: boolean,
  isCriticalHit: boolean,
): boolean {
  // Check if item has Partial flaw — either explicitly or via open visor
  const hasPartial =
    hasQuality(item, 'Partial') ||
    (hasQuality(item, 'Visor') && item.visorOpen === true);

  if (!hasPartial) return false;

  return toHitRollEven || isCriticalHit;
}

/**
 * Apply armour quality/flaw combat effects to determine effective AP.
 *
 * Processing order per item:
 * 1. Start with currentAp ?? ap as the piece's AP contribution
 * 2. Check Partial flaw — if triggered, set contribution to 0
 * 3. Check Weakpoints + Impale — if triggered (and not suppressed), set contribution to 0
 * 4. Apply Bascinet frontal missile bonus (+1 AP)
 * 5. Check Impenetrable — if Critical Hit AND roll is odd, negate critical
 * 6. Sum all contributions for effectiveAP
 */
export function resolveArmourCombatEffects(context: CombatArmourContext): ArmourCombatResult {
  const {
    armourItems,
    toHitRollEven,
    isCriticalHit,
    attackerHasImpale,
    isMissileFrontal,
  } = context;

  let effectiveAP = 0;
  let partialBypassed = false;
  let impenetrableNegatesCrit = false;
  let weakpointsBypassed = false;
  const notes: string[] = [];

  // Check if weakpoints is suppressed for the whole set of items
  // We pass a dummy location since all items are already filtered to the hit location
  const weakpointsSuppressed = isWeakpointsSuppressedForItems(armourItems);

  // Only the pieces forming the best legal Archives III stack contribute AP.
  // (Reinforced Soft Kit weakpoints-suppression is still evaluated across the
  // full worn set above, so a non-contributing reinforced kit can still
  // suppress a plate's Weakpoints.) Uses currentAp as the AP basis.
  const contributingItems = selectArchives3ContributingItems(
    armourItems,
    (i) => i.currentAp ?? i.ap,
  );

  for (const item of contributingItems) {
    let contribution = item.currentAp ?? item.ap;

    // 1. Partial flaw check
    if (isPartialTriggered(item, toHitRollEven, isCriticalHit)) {
      contribution = 0;
      partialBypassed = true;
      if (isCriticalHit && !toHitRollEven) {
        notes.push('Partial: AP ignored (Critical Hit)');
      } else {
        notes.push('Partial: AP ignored (to-hit roll even)');
      }
    }

    // 2. Weakpoints + Impale check (only if not already bypassed by Partial)
    if (
      contribution > 0 &&
      hasQuality(item, 'Weakpoints') &&
      isCriticalHit &&
      attackerHasImpale &&
      !weakpointsSuppressed
    ) {
      contribution = 0;
      weakpointsBypassed = true;
      notes.push('Weakpoints: All AP ignored (Impale + Critical Hit)');
    }

    // 3. Bascinet frontal missile bonus
    if (
      contribution > 0 &&
      isBascinetVisorClosed(item) &&
      isMissileFrontal
    ) {
      contribution += 1;
      notes.push('Bascinet: +1 AP (frontal missile)');
    }

    // 4. Impenetrable critical negation
    if (
      hasQuality(item, 'Impenetrable') &&
      isCriticalHit &&
      !toHitRollEven // odd roll
    ) {
      impenetrableNegatesCrit = true;
      notes.push('Impenetrable: Critical Wound negated (to-hit roll odd)');
    }

    effectiveAP += contribution;
  }

  return {
    effectiveAP,
    partialBypassed,
    impenetrableNegatesCrit,
    weakpointsBypassed,
    notes,
  };
}

/**
 * Check if Weakpoints is suppressed for a set of items already at the same location.
 * This avoids needing to pass a location key when items are pre-filtered.
 *
 * Returns true if there's a Plate item with Weakpoints AND a Soft Kit with Reinforced.
 */
function isWeakpointsSuppressedForItems(items: ArmourItem[]): boolean {
  const hasPlateWithWeakpoints = items.some(
    (item) => item.armourType === 'Plate' && hasQuality(item, 'Weakpoints'),
  );
  const hasReinforcedSoftKit = items.some(
    (item) => item.armourType === 'SoftKit' && hasQuality(item, 'Reinforced'),
  );
  return hasPlateWithWeakpoints && hasReinforcedSoftKit;
}

/**
 * Check if Critical Deflection is available for a given location.
 *
 * Returns true when:
 * - useCriticalDeflection house rule is enabled
 * - At least one armour item at the location has currentAp > 0
 */
export function canDeflectCritical(
  armourItems: ArmourItem[],
  _location: LocationKey,
  useCriticalDeflection: boolean,
): boolean {
  if (!useCriticalDeflection) return false;

  return armourItems.some((item) => {
    const currentAp = item.currentAp ?? item.ap;
    return currentAp > 0;
  });
}

/**
 * Apply Critical Deflection to an armour item.
 * Returns a new ArmourItem with currentAp reduced by 1 (clamped to 0 minimum).
 */
export function applyDeflection(item: ArmourItem): ArmourItem {
  const currentAp = item.currentAp ?? item.ap;
  const newAp = Math.max(0, currentAp - 1);

  return {
    ...item,
    currentAp: newAp,
  };
}


// ─── Penetrating Quality ─────────────────────────────────────────────────────

export interface PenetratingResult {
  effectiveAP: number;
  notes: string[];
}

const METALLIC_ARMOUR_TYPES: ArmourType[] = ['Chainmail', 'Brigandine', 'Plate'];

/**
 * Classify whether an armour type is metallic.
 * - Metallic: Chainmail, Brigandine, Plate
 * - Non-metallic: SoftKit, BoiledLeather
 * - Undefined armourType → treat as non-metallic (conservative)
 */
export function isMetallicArmour(armourType: ArmourType | undefined): boolean {
  if (armourType === undefined) return false;
  return METALLIC_ARMOUR_TYPES.includes(armourType);
}

/**
 * Apply Penetrating weapon quality to armour items at a hit location.
 * - Non-metallic (SoftKit, BoiledLeather, undefined): AP set to 0
 * - Metallic (Chainmail, Brigandine, Plate): AP reduced by 1 (min 0 per item)
 *
 * When disabled, returns baseEffectiveAP unchanged.
 */
export function resolvePenetratingEffect(
  armourItems: ArmourItem[],
  baseEffectiveAP: number,
  penetratingEnabled: boolean,
): PenetratingResult {
  if (!penetratingEnabled) {
    return { effectiveAP: baseEffectiveAP, notes: [] };
  }

  let effectiveAP = 0;
  const notes: string[] = [];

  for (const item of armourItems) {
    const itemAP = item.currentAp ?? item.ap;
    const metallic = isMetallicArmour(item.armourType);

    if (!metallic) {
      // Non-metallic: AP set to 0
      if (itemAP > 0) {
        notes.push(`Penetrating: ${item.name} ignored (non-metallic)`);
      }
      // contributes 0
    } else {
      // Metallic: AP reduced by 1 (min 0)
      const reduced = Math.max(0, itemAP - 1);
      effectiveAP += reduced;
      if (itemAP > 0) {
        notes.push(`Penetrating: ${item.name} AP ${itemAP} → ${reduced} (metallic)`);
      }
    }
  }

  return { effectiveAP, notes };
}
