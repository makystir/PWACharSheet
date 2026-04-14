import type { DowntimePeriod, EndeavourEntry } from '../types/character';

/** General Endeavours available to all characters. */
export const GENERAL_ENDEAVOURS: string[] = [
  'Income', 'Banking', 'Training', 'Crafting', 'Commission',
  'Consult an Expert', 'Changing Career', 'Animal Training',
  'Unusual Learning', 'Invent',
];

/** Class-specific Endeavours keyed by character class. */
export const CLASS_ENDEAVOURS: Record<string, string[]> = {
  Academics: ['Research Lore', 'Reputation'],
  Burghers: ['Foment Dissent', 'Reputation'],
  Courtiers: ['Reputation'],
  Peasants: ['Foment Dissent'],
  Rangers: ['Combat Training', 'Latest News'],
  Riverfolk: ['Latest News'],
  Rogues: ['Study a Mark'],
  Warriors: ['Combat Training'],
};

/**
 * Parse a WFRP status string to extract the tier.
 * Case-insensitive search for "Gold", "Silver", "Brass".
 */
export function parseStatusTier(status: string): 'gold' | 'silver' | 'brass' | null {
  const lower = status.toLowerCase();
  if (lower.includes('gold')) return 'gold';
  if (lower.includes('silver')) return 'silver';
  if (lower.includes('brass')) return 'brass';
  return null;
}

/**
 * Get the default endeavour slot count for a tier.
 * brass=1, silver=2, gold=3. Null tier defaults to 1.
 */
export function getDefaultSlots(tier: 'brass' | 'silver' | 'gold' | null): number {
  if (tier === 'gold') return 3;
  if (tier === 'silver') return 2;
  return 1;
}

/**
 * Create a new DowntimePeriod with auto-calculated slots from the character's status.
 */
export function createDowntimePeriod(status: string, existingCount: number): DowntimePeriod {
  const tier = parseStatusTier(status);
  return {
    id: Date.now(),
    label: `Downtime #${existingCount + 1}`,
    slots: getDefaultSlots(tier),
    entries: [],
    statusWarning: tier === null,
  };
}

/**
 * Add a DowntimePeriod to the endeavours array (prepend for reverse-chronological order).
 */
export function addDowntimePeriod(endeavours: DowntimePeriod[], period: DowntimePeriod): DowntimePeriod[] {
  return [period, ...endeavours];
}

/**
 * Remove a DowntimePeriod by id. No-op if id not found.
 */
export function removeDowntimePeriod(endeavours: DowntimePeriod[], periodId: number): DowntimePeriod[] {
  return endeavours.filter(p => p.id !== periodId);
}

/**
 * Add an EndeavourEntry to a specific period. Always succeeds regardless of slot count.
 */
export function addEndeavourEntry(
  endeavours: DowntimePeriod[],
  periodId: number,
  entry: EndeavourEntry,
): DowntimePeriod[] {
  return endeavours.map(p =>
    p.id === periodId ? { ...p, entries: [...p.entries, entry] } : p
  );
}

/**
 * Remove an EndeavourEntry from a specific period. No-op if not found.
 */
export function removeEndeavourEntry(
  endeavours: DowntimePeriod[],
  periodId: number,
  entryId: number,
): DowntimePeriod[] {
  return endeavours.map(p =>
    p.id === periodId
      ? { ...p, entries: p.entries.filter(e => e.id !== entryId) }
      : p
  );
}

/**
 * Update a single field on the targeted EndeavourEntry within a period.
 */
export function updateEndeavourEntry(
  endeavours: DowntimePeriod[],
  periodId: number,
  entryId: number,
  field: keyof EndeavourEntry,
  value: EndeavourEntry[keyof EndeavourEntry],
): DowntimePeriod[] {
  return endeavours.map(p =>
    p.id === periodId
      ? {
          ...p,
          entries: p.entries.map(e =>
            e.id === entryId ? { ...e, [field]: value } : e
          ),
        }
      : p
  );
}

/**
 * Update a single field (label or slots) on the targeted DowntimePeriod.
 */
export function updateDowntimePeriod(
  endeavours: DowntimePeriod[],
  periodId: number,
  field: keyof DowntimePeriod,
  value: DowntimePeriod[keyof DowntimePeriod],
): DowntimePeriod[] {
  return endeavours.map(p =>
    p.id === periodId ? { ...p, [field]: value } : p
  );
}

/**
 * Check if a character species string indicates an Elf (case-insensitive substring check).
 */
export function isElf(species: string): boolean {
  return species.toLowerCase().includes('elf');
}
