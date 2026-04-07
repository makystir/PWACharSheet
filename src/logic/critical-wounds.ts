import type { CriticalWound } from '../types/character';

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
