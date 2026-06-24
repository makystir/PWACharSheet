import type { CriticalWound } from '../types/character';
import type { HitLocation } from '../components/combat/hitLocationTable';
import type { CriticalWoundTableEntry } from '../data/critical-wound-tables';
import {
  HEAD_CRITICAL_TABLE,
  ARM_CRITICAL_TABLE,
  BODY_CRITICAL_TABLE,
  LEG_CRITICAL_TABLE,
} from '../data/critical-wound-tables';

/**
 * Record a new critical wound with auto-incrementing ID and timestamp.
 */
export function recordCriticalWound(
  wounds: CriticalWound[],
  wound: Omit<CriticalWound, 'id' | 'timestamp'>
): CriticalWound[] {
  const maxId = wounds.length > 0 ? Math.max(...wounds.map(w => w.id)) : 0;
  const newWound: CriticalWound = {
    ...wound,
    id: maxId + 1,
    timestamp: Date.now(),
  };
  return [...wounds, newWound];
}

/**
 * Mark a critical wound as healed by ID.
 */
export function healCriticalWound(
  wounds: CriticalWound[],
  woundId: number
): CriticalWound[] {
  return wounds.map(w =>
    w.id === woundId ? { ...w, healed: true, healedAt: Date.now() } : { ...w }
  );
}

/**
 * Get all active (unhealed) critical wounds.
 */
export function getActiveCriticalWounds(wounds: CriticalWound[]): CriticalWound[] {
  return wounds.filter(w => !w.healed);
}


/**
 * Look up a critical wound entry by hit location and d100 roll.
 * Maps HitLocation to the appropriate Body Location Group table and
 * performs a linear scan to find the matching entry.
 *
 * Returns undefined for non-integer rolls or rolls outside 1-100.
 * Pure function — no side effects.
 */
export function lookupCriticalWound(
  location: HitLocation,
  roll: number
): CriticalWoundTableEntry | undefined {
  if (!Number.isInteger(roll) || roll < 1 || roll > 100) {
    return undefined;
  }

  let table: CriticalWoundTableEntry[];
  switch (location) {
    case 'Head':
      table = HEAD_CRITICAL_TABLE;
      break;
    case 'Left Arm':
    case 'Right Arm':
      table = ARM_CRITICAL_TABLE;
      break;
    case 'Body':
      table = BODY_CRITICAL_TABLE;
      break;
    case 'Left Leg':
    case 'Right Leg':
      table = LEG_CRITICAL_TABLE;
      break;
  }

  return table.find(entry => entry.min <= roll && roll <= entry.max);
}
