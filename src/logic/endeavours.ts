import type { DowntimePeriod, EndeavourEntry, EntryStatus } from '../types/character';

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
  Warriors: ['Combat Training', 'Drill', 'Challenge', 'Seek Patronage', 'Establish Contacts', 'Tournament'],
  Priests: ['Preach Sermon', 'Pray for Guidance'],
  Doctors: ['Treat Patients', 'Research Remedy'],
  Wizards: ['Study Arcane Lore', 'Brew Potion'],
  Entertainers: ['Perform', 'Compose'],
  Soldiers: ['Combat Training', 'Drill'],
  Servants: ['Serve Master', 'Gather Rumours'],
  Nobles: ['Reputation', 'Seek Patronage'],
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
 * Get the maximum sessionNumber across all periods that have one set.
 * Returns undefined if no periods have a numeric sessionNumber.
 */
export function getMaxSessionNumber(periods: DowntimePeriod[]): number | undefined {
  let max: number | undefined;
  for (const p of periods) {
    if (p.sessionNumber != null) {
      if (max == null || p.sessionNumber > max) {
        max = p.sessionNumber;
      }
    }
  }
  return max;
}

/**
 * Create a new DowntimePeriod with auto-calculated slots from the character's status.
 * Auto-populates sessionNumber = max(existing sessionNumbers) + 1 when at least one
 * existing period has a numeric sessionNumber set.
 */
export function createDowntimePeriod(status: string, existingPeriods: DowntimePeriod[]): DowntimePeriod {
  const tier = parseStatusTier(status);
  const maxSession = getMaxSessionNumber(existingPeriods);
  return {
    id: generateId(),
    label: `Downtime #${existingPeriods.length + 1}`,
    slots: getDefaultSlots(tier),
    entries: [],
    statusWarning: tier === null,
    date: undefined,
    sessionNumber: maxSession != null ? maxSession + 1 : undefined,
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
 * Uses String() comparison to support both legacy numeric and UUID string IDs.
 */
export function removeDowntimePeriod(endeavours: DowntimePeriod[], periodId: string): DowntimePeriod[] {
  return endeavours.filter(p => String(p.id) !== String(periodId));
}

/**
 * Add an EndeavourEntry to a specific period. Always succeeds regardless of slot count.
 * Uses String() comparison to support both legacy numeric and UUID string IDs.
 */
export function addEndeavourEntry(
  endeavours: DowntimePeriod[],
  periodId: string,
  entry: EndeavourEntry,
): DowntimePeriod[] {
  return endeavours.map(p =>
    String(p.id) === String(periodId) ? { ...p, entries: [...p.entries, entry] } : p
  );
}

/**
 * Remove an EndeavourEntry from a specific period. No-op if not found.
 * Uses String() comparison to support both legacy numeric and UUID string IDs.
 */
export function removeEndeavourEntry(
  endeavours: DowntimePeriod[],
  periodId: string,
  entryId: string,
): DowntimePeriod[] {
  return endeavours.map(p =>
    String(p.id) === String(periodId)
      ? { ...p, entries: p.entries.filter(e => String(e.id) !== String(entryId)) }
      : p
  );
}

/**
 * Update a single field on the targeted EndeavourEntry within a period.
 * Supports all EndeavourEntry fields including status and cost.
 * Uses String() comparison to support both legacy numeric and UUID string IDs.
 */
export function updateEndeavourEntry(
  endeavours: DowntimePeriod[],
  periodId: string,
  entryId: string,
  field: keyof EndeavourEntry,
  value: EndeavourEntry[keyof EndeavourEntry],
): DowntimePeriod[] {
  return endeavours.map(p =>
    String(p.id) === String(periodId)
      ? {
          ...p,
          entries: p.entries.map(e =>
            String(e.id) === String(entryId) ? { ...e, [field]: value } : e
          ),
        }
      : p
  );
}

/**
 * Update a single field on the targeted DowntimePeriod.
 * Supports all DowntimePeriod fields including date and sessionNumber.
 * Uses String() comparison to support both legacy numeric and UUID string IDs.
 */
export function updateDowntimePeriod(
  endeavours: DowntimePeriod[],
  periodId: string,
  field: keyof DowntimePeriod,
  value: DowntimePeriod[keyof DowntimePeriod],
): DowntimePeriod[] {
  return endeavours.map(p =>
    String(p.id) === String(periodId) ? { ...p, [field]: value } : p
  );
}

/**
 * Swap a DowntimePeriod with its predecessor in the array.
 * No-op if the period is already first or not found.
 */
export function movePeriodUp(periods: DowntimePeriod[], id: string): DowntimePeriod[] {
  const index = periods.findIndex(p => String(p.id) === String(id));
  if (index <= 0) return periods;
  const result = [...periods];
  [result[index - 1], result[index]] = [result[index], result[index - 1]];
  return result;
}

/**
 * Swap a DowntimePeriod with its successor in the array.
 * No-op if the period is already last or not found.
 */
export function movePeriodDown(periods: DowntimePeriod[], id: string): DowntimePeriod[] {
  const index = periods.findIndex(p => String(p.id) === String(id));
  if (index === -1 || index >= periods.length - 1) return periods;
  const result = [...periods];
  [result[index], result[index + 1]] = [result[index + 1], result[index]];
  return result;
}

/**
 * Swap an EndeavourEntry with its predecessor within the specified period.
 * No-op if the entry is already first, or the period/entry is not found.
 */
export function moveEntryUp(periods: DowntimePeriod[], periodId: string, entryId: string): DowntimePeriod[] {
  return periods.map(p => {
    if (String(p.id) !== String(periodId)) return p;
    const idx = p.entries.findIndex(e => String(e.id) === String(entryId));
    if (idx <= 0) return p;
    const entries = [...p.entries];
    [entries[idx - 1], entries[idx]] = [entries[idx], entries[idx - 1]];
    return { ...p, entries };
  });
}

/**
 * Swap an EndeavourEntry with its successor within the specified period.
 * No-op if the entry is already last, or the period/entry is not found.
 */
export function moveEntryDown(periods: DowntimePeriod[], periodId: string, entryId: string): DowntimePeriod[] {
  return periods.map(p => {
    if (String(p.id) !== String(periodId)) return p;
    const idx = p.entries.findIndex(e => String(e.id) === String(entryId));
    if (idx === -1 || idx >= p.entries.length - 1) return p;
    const entries = [...p.entries];
    [entries[idx], entries[idx + 1]] = [entries[idx + 1], entries[idx]];
    return { ...p, entries };
  });
}

/**
 * Check if a character species string indicates an Elf (case-insensitive substring check).
 */
export function isElf(species: string): boolean {
  return species.toLowerCase().includes('elf');
}

/**
 * Generate a UUID using crypto.randomUUID() with a Math.random fallback.
 */
export function generateId(): string {
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
 * Cycle an entry's status in the order: pending → in_progress → completed → pending.
 */
export function cycleStatus(current: EntryStatus): EntryStatus {
  if (current === 'pending') return 'in_progress';
  if (current === 'in_progress') return 'completed';
  return 'pending';
}

/**
 * Migrate a legacy entry that may have a boolean `completed` field instead of `status`.
 * Converts completed=true to status "completed", completed=false to status "pending".
 * Preserves all other fields (id, type, notes, cost).
 */
export function migrateEntryStatus(entry: EndeavourEntry | Record<string, unknown>): EndeavourEntry {
  const record = entry as Record<string, unknown>;
  // If entry already has a valid status field, use it directly
  if ('status' in record && (record.status === 'pending' || record.status === 'in_progress' || record.status === 'completed')) {
    // Entry is already in the new format — return it directly (strip legacy completed field if present)
    if ('completed' in record) {
      const { completed: _completed, ...rest } = record;
      return { id: rest.id, type: rest.type, notes: rest.notes, status: rest.status, cost: rest.cost } as EndeavourEntry;
    }
    return entry as EndeavourEntry;
  }

  // Convert legacy boolean completed to status
  const status: EntryStatus = record.completed === true ? 'completed' : 'pending';
  return {
    id: record.id,
    type: record.type,
    notes: record.notes,
    status,
    cost: record.cost,
  } as EndeavourEntry;
}

/**
 * Parse and validate a session number string.
 * Returns the integer if valid (1–9999 inclusive), otherwise null.
 */
export function validateSessionNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const num = Number(trimmed);
  if (!Number.isInteger(num)) return null;
  if (num < 1 || num > 9999) return null;
  return num;
}

/** Interface for picker items used in the endeavour type selector. */
export interface PickerItem {
  label: string;
  group: string;
  disabled?: boolean;
}

/**
 * Get a cost summary for a list of entries.
 * Returns a comma-separated string of non-empty, non-whitespace costs, or null if none qualify.
 */
export function getCostSummary(entries: EndeavourEntry[]): string | null {
  const costs = entries
    .map(e => e.cost)
    .filter((cost): cost is string => cost != null && cost.trim().length > 0);
  return costs.length > 0 ? costs.join(', ') : null;
}

/**
 * Build grouped picker items for the endeavour type selector.
 * - Always includes General endeavours
 * - Includes Class endeavours if className matches a key in CLASS_ENDEAVOURS
 * - Shows info message if className is non-empty but unmatched
 * - Omits class group entirely if className is empty/undefined/whitespace
 * - Includes Species (Elf) items if isElfChar is true
 * - Always includes Custom option
 */
export function buildPickerItems(className: string, isElfChar: boolean): PickerItem[] {
  const items: PickerItem[] = [];

  // General Endeavours - always included
  for (const e of GENERAL_ENDEAVOURS) {
    items.push({ group: 'General', label: e });
  }

  // Class Endeavours - depends on className
  const trimmedClass = className?.trim() ?? '';
  if (trimmedClass.length > 0) {
    const classEndeavours = CLASS_ENDEAVOURS[trimmedClass];
    if (classEndeavours) {
      for (const e of classEndeavours) {
        items.push({ group: `${trimmedClass} Class`, label: e });
      }
    } else {
      // Non-empty class but not found in map - show info message
      items.push({
        group: 'Class',
        label: `No class endeavours found for ${trimmedClass}`,
        disabled: true,
      });
    }
  }

  // Species - Elf Obligation
  if (isElfChar) {
    items.push({ group: 'Species', label: 'Elf Obligation' });
  }

  // Custom option - always included
  items.push({ group: 'Other', label: '✏️ Custom (free text)' });

  return items;
}

/**
 * Get the next session number for a new period.
 * Returns max(existing sessionNumbers) + 1, or undefined if none have a sessionNumber set.
 */
export function getNextSessionNumber(periods: DowntimePeriod[]): number | undefined {
  const max = getMaxSessionNumber(periods);
  return max !== undefined ? max + 1 : undefined;
}

/**
 * Create a new EndeavourEntry with a UUID id, pending status, and empty cost.
 */
export function createEndeavourEntry(type: string): EndeavourEntry {
  return {
    id: generateId(),
    type,
    notes: '',
    status: 'pending',
    cost: '',
  };
}
