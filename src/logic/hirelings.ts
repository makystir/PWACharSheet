import type { Hireling } from '../types/character';
import type { HirelingProfile } from '../data/hirelings';

/**
 * Sums upkeep fields across all hirelings.
 * Treats missing or zero values as excluded from totals.
 */
export function computeHirelingUpkeep(hirelings: Hireling[]): { gc: number; ss: number; d: number } {
  return hirelings.reduce(
    (total, h) => ({
      gc: total.gc + (h.upkeep.gc || 0),
      ss: total.ss + (h.upkeep.ss || 0),
      d: total.d + (h.upkeep.d || 0),
    }),
    { gc: 0, ss: 0, d: 0 }
  );
}

/**
 * Generates a unique numeric ID using an incrementing counter combined with timestamp.
 * The counter ensures uniqueness even when called multiple times within the same millisecond.
 */
let _hirelingIdCounter = 0;
export function generateHirelingId(): number {
  _hirelingIdCounter += 1;
  return Date.now() * 1000 + (_hirelingIdCounter % 1000);
}

/**
 * Returns a random entry from a d100 table array.
 */
export function rollRandomQuirk(table: string[]): string {
  const index = Math.floor(Math.random() * table.length);
  return table[index];
}

/**
 * Returns true iff the hireling's current wounds are zero or below.
 */
export function isIncapacitated(hireling: Hireling): boolean {
  return hireling.wCur <= 0;
}

/**
 * Clamps a wound value to [0, maxW].
 */
export function clampWounds(wCur: number, maxW: number): number {
  return Math.max(0, Math.min(wCur, maxW));
}

/**
 * Creates a new Hireling from a pre-defined profile.
 * Sets generated ID, full wounds, and default empty fields for quirks/template/notes/conditions.
 */
export function createHirelingFromProfile(profile: HirelingProfile): Hireling {
  return {
    id: generateHirelingId(),
    name: profile.name,
    role: profile.role,
    status: profile.status,
    M: profile.M,
    WS: profile.WS,
    BS: profile.BS,
    S: profile.S,
    T: profile.T,
    I: profile.I,
    Ag: profile.Ag,
    Dex: profile.Dex,
    Int: profile.Int,
    WP: profile.WP,
    Fel: profile.Fel,
    W: profile.W,
    wCur: profile.W, // Start at full wounds
    skills: profile.skills,
    talents: profile.talents,
    traits: profile.traits,
    trappings: profile.trappings,
    template: '',
    physicalQuirk: '',
    workEthic: '',
    personalityQuirk: '',
    upkeep: { gc: 0, ss: 0, d: 0 },
    conditions: [],
    notes: '',
  };
}

/**
 * Creates a blank hireling with all zeros/empty strings and a generated ID.
 */
export function createBlankHireling(): Hireling {
  return {
    id: generateHirelingId(),
    name: '',
    role: '',
    status: '',
    M: 0,
    WS: 0,
    BS: 0,
    S: 0,
    T: 0,
    I: 0,
    Ag: 0,
    Dex: 0,
    Int: 0,
    WP: 0,
    Fel: 0,
    W: 0,
    wCur: 0,
    skills: '',
    talents: '',
    traits: '',
    trappings: '',
    template: '',
    physicalQuirk: '',
    workEthic: '',
    personalityQuirk: '',
    upkeep: { gc: 0, ss: 0, d: 0 },
    conditions: [],
    notes: '',
  };
}
