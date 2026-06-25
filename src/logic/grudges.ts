import type { Character, GrudgeEntry, GrudgeType } from '../types/character';

/** Form data for creating a new grudge. */
export interface GrudgeFormData {
  offence: string;
  perpetrator: string;
  restitution: string;
  type: GrudgeType;
  isPartyGrudge: boolean;
}

/** Result of validating a grudge form. */
export interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
}

/**
 * Check if a character species string indicates a Dwarf (case-insensitive substring check).
 */
export function isDwarf(species: string): boolean {
  return species.toLowerCase().includes('dwarf');
}

/**
 * Determine if the Grudge panel should be visible for a character.
 * Visible only when useGrudgeBook house rule is enabled AND the character is a Dwarf.
 */
export function isGrudgePanelVisible(character: Character): boolean {
  return character.houseRules.useGrudgeBook === true && isDwarf(character.species);
}

/**
 * Check whether a new party grudge can be added.
 * Returns true if fewer than 3 outstanding party grudges exist.
 */
export function canAddPartyGrudge(grudges: GrudgeEntry[]): boolean {
  const outstandingParty = grudges.filter(
    g => g.isPartyGrudge && g.status === 'outstanding'
  );
  return outstandingParty.length < 3;
}

/**
 * Validate the grudge form data. Trims fields and checks that required
 * fields (offence, perpetrator, restitution) are non-empty.
 */
export function validateGrudgeForm(form: GrudgeFormData): ValidationResult {
  const errors: { field: string; message: string }[] = [];

  if (!form.offence.trim()) {
    errors.push({ field: 'offence', message: 'Offence is required' });
  }
  if (!form.perpetrator.trim()) {
    errors.push({ field: 'perpetrator', message: 'Perpetrator is required' });
  }
  if (!form.restitution.trim()) {
    errors.push({ field: 'restitution', message: 'Restitution is required' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate a UUID using crypto.randomUUID() with a Math.random fallback.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: generate a pseudo-random UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get today's date as an ISO date string (YYYY-MM-DD).
 */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Create a new grudge entry and append it to the character's grudges array.
 * Returns a new Character object (immutable update pattern).
 */
export function createGrudgeEntry(character: Character, form: GrudgeFormData): Character {
  const newEntry: GrudgeEntry = {
    id: generateId(),
    offence: form.offence.trim(),
    perpetrator: form.perpetrator.trim(),
    restitution: form.restitution.trim(),
    type: form.type,
    status: 'outstanding',
    isPartyGrudge: form.isPartyGrudge,
    dateRecorded: todayISO(),
  };

  const existingGrudges = character.grudges ?? [];
  return {
    ...character,
    grudges: [...existingGrudges, newEntry],
  };
}

/**
 * Mark a grudge as satisfied. Sets status to 'satisfied' and dateSatisfied to today.
 * No-op if the grudge is already satisfied or the ID is not found.
 * Returns a new Character object (immutable update pattern).
 */
export function satisfyGrudge(character: Character, grudgeId: string): Character {
  const existingGrudges = character.grudges ?? [];
  const target = existingGrudges.find(g => g.id === grudgeId);

  // No-op if not found or already satisfied
  if (!target || target.status === 'satisfied') {
    return character;
  }

  return {
    ...character,
    grudges: existingGrudges.map(g =>
      g.id === grudgeId
        ? { ...g, status: 'satisfied' as const, dateSatisfied: todayISO() }
        : g
    ),
  };
}

/**
 * Delete a grudge entry by ID.
 * Returns a new Character object with the entry removed (immutable update pattern).
 * No-op if the ID is not found.
 */
export function deleteGrudge(character: Character, grudgeId: string): Character {
  const existingGrudges = character.grudges ?? [];
  const filtered = existingGrudges.filter(g => g.id !== grudgeId);

  // No-op if nothing was removed
  if (filtered.length === existingGrudges.length) {
    return character;
  }

  return {
    ...character,
    grudges: filtered,
  };
}

/**
 * Sort grudges with outstanding entries first, then satisfied entries.
 * Preserves relative order within each group (stable sort).
 */
export function sortGrudges(grudges: GrudgeEntry[]): GrudgeEntry[] {
  return [...grudges].sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === 'outstanding' ? -1 : 1;
  });
}

/**
 * Get the XP reward for a grudge type.
 * Standard: 25 XP, Blood: 50 XP.
 */
export function getGrudgeXP(type: GrudgeType): number {
  return type === 'blood' ? 50 : 25;
}
