import { describe, it, expect } from 'vitest';
import {
  parseStatusTier,
  getDefaultSlots,
  createDowntimePeriod,
  addDowntimePeriod,
  removeDowntimePeriod,
  addEndeavourEntry,
  removeEndeavourEntry,
  updateEndeavourEntry,
  updateDowntimePeriod,
  isElf,
} from '../endeavours';
import type { DowntimePeriod, EndeavourEntry } from '../../types/character';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePeriod(overrides: Partial<DowntimePeriod> = {}): DowntimePeriod {
  return {
    id: 1,
    label: 'Downtime #1',
    slots: 2,
    entries: [],
    statusWarning: false,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<EndeavourEntry> = {}): EndeavourEntry {
  return {
    id: 100,
    type: 'Income',
    notes: '',
    completed: false,
    ...overrides,
  };
}

// ─── Property 1: Status tier parsing maps to correct slot counts ─────────────
// Feature: endeavours-tracker, Property 1: Status tier parsing maps to correct slot counts
// Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5

describe('parseStatusTier — Property 1: Status tier parsing', () => {
  it('"Brass 4" → brass', () => {
    expect(parseStatusTier('Brass 4')).toBe('brass');
  });

  it('"Silver 2" → silver', () => {
    expect(parseStatusTier('Silver 2')).toBe('silver');
  });

  it('"Gold 1" → gold', () => {
    expect(parseStatusTier('Gold 1')).toBe('gold');
  });

  it('"gold 3" → gold (case-insensitive)', () => {
    expect(parseStatusTier('gold 3')).toBe('gold');
  });

  it('"" → null', () => {
    expect(parseStatusTier('')).toBeNull();
  });

  it('"Unknown" → null', () => {
    expect(parseStatusTier('Unknown')).toBeNull();
  });

  it('"Peasant" → null', () => {
    expect(parseStatusTier('Peasant')).toBeNull();
  });
});

// ─── Property 1 (continued): getDefaultSlots ────────────────────────────────
// Feature: endeavours-tracker, Property 1: Status tier parsing maps to correct slot counts
// Validates: Requirements 1.3, 1.4

describe('getDefaultSlots — Property 1: Tier maps to correct slot count', () => {
  it("'brass' → 1", () => {
    expect(getDefaultSlots('brass')).toBe(1);
  });

  it("'silver' → 2", () => {
    expect(getDefaultSlots('silver')).toBe(2);
  });

  it("'gold' → 3", () => {
    expect(getDefaultSlots('gold')).toBe(3);
  });

  it('null → 1', () => {
    expect(getDefaultSlots(null)).toBe(1);
  });
});

// ─── Property 2: Period creation produces correct defaults ───────────────────
// Feature: endeavours-tracker, Property 2: Period creation produces correct defaults
// Validates: Requirements 1.1, 1.3, 1.4

describe('createDowntimePeriod — Property 2: Period creation defaults', () => {
  it('"Silver 2" with count 0 → label "Downtime #1", slots 2, statusWarning false', () => {
    const period = createDowntimePeriod('Silver 2', 0);
    expect(period.label).toBe('Downtime #1');
    expect(period.slots).toBe(2);
    expect(period.statusWarning).toBe(false);
    expect(period.entries).toEqual([]);
  });

  it('"" with count 3 → label "Downtime #4", slots 1, statusWarning true', () => {
    const period = createDowntimePeriod('', 3);
    expect(period.label).toBe('Downtime #4');
    expect(period.slots).toBe(1);
    expect(period.statusWarning).toBe(true);
    expect(period.entries).toEqual([]);
  });

  it('"Gold 1" with count 5 → label "Downtime #6", slots 3, statusWarning false', () => {
    const period = createDowntimePeriod('Gold 1', 5);
    expect(period.label).toBe('Downtime #6');
    expect(period.slots).toBe(3);
    expect(period.statusWarning).toBe(false);
    expect(period.entries).toEqual([]);
  });
});


// ─── Property 3: Adding a period prepends to the array ──────────────────────
// Feature: endeavours-tracker, Property 3: Adding a period prepends to the array
// Validates: Requirements 1.2

describe('addDowntimePeriod — Property 3: Prepend to array', () => {
  it('prepend to empty array', () => {
    const period = makePeriod({ id: 10 });
    const result = addDowntimePeriod([], period);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(period);
  });

  it('prepend to array with existing periods', () => {
    const existing = [makePeriod({ id: 1 }), makePeriod({ id: 2 })];
    const newPeriod = makePeriod({ id: 3 });
    const result = addDowntimePeriod(existing, newPeriod);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(newPeriod);
    expect(result[1]).toEqual(existing[0]);
    expect(result[2]).toEqual(existing[1]);
  });

  it('new period is at index 0 and length increased by 1', () => {
    const existing = [makePeriod({ id: 5 })];
    const newPeriod = makePeriod({ id: 6 });
    const result = addDowntimePeriod(existing, newPeriod);
    expect(result[0].id).toBe(6);
    expect(result.length).toBe(existing.length + 1);
  });
});

// ─── Property 4: Removing a period preserves all others ─────────────────────
// Feature: endeavours-tracker, Property 4: Removing a period preserves all others
// Validates: Requirements 1.6

describe('removeDowntimePeriod — Property 4: Remove preserves others', () => {
  it('remove from single-element array', () => {
    const periods = [makePeriod({ id: 1 })];
    const result = removeDowntimePeriod(periods, 1);
    expect(result).toHaveLength(0);
  });

  it('remove from multi-element array preserving order', () => {
    const periods = [
      makePeriod({ id: 1, label: 'A' }),
      makePeriod({ id: 2, label: 'B' }),
      makePeriod({ id: 3, label: 'C' }),
    ];
    const result = removeDowntimePeriod(periods, 2);
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe('A');
    expect(result[1].label).toBe('C');
  });

  it('remove with non-existent id returns array unchanged', () => {
    const periods = [makePeriod({ id: 1 }), makePeriod({ id: 2 })];
    const result = removeDowntimePeriod(periods, 999);
    expect(result).toHaveLength(2);
    expect(result).toEqual(periods);
  });
});

// ─── Property 5: Adding an entry always succeeds with correct defaults ──────
// Feature: endeavours-tracker, Property 5: Adding an entry always succeeds with correct defaults
// Validates: Requirements 2.3, 2.6

describe('addEndeavourEntry — Property 5: Add entry always succeeds', () => {
  it('add entry to period with 0 entries', () => {
    const periods = [makePeriod({ id: 1, slots: 2, entries: [] })];
    const entry = makeEntry({ id: 100, type: 'Income', notes: '', completed: false });
    const result = addEndeavourEntry(periods, 1, entry);
    expect(result[0].entries).toHaveLength(1);
    expect(result[0].entries[0].type).toBe('Income');
  });

  it('add entry when entries === slots', () => {
    const periods = [makePeriod({
      id: 1,
      slots: 1,
      entries: [makeEntry({ id: 100 })],
    })];
    const entry = makeEntry({ id: 101, type: 'Training' });
    const result = addEndeavourEntry(periods, 1, entry);
    expect(result[0].entries).toHaveLength(2);
  });

  it('add entry when entries > slots', () => {
    const periods = [makePeriod({
      id: 1,
      slots: 1,
      entries: [makeEntry({ id: 100 }), makeEntry({ id: 101 })],
    })];
    const entry = makeEntry({ id: 102, type: 'Crafting' });
    const result = addEndeavourEntry(periods, 1, entry);
    expect(result[0].entries).toHaveLength(3);
  });

  it('verify entry defaults (empty notes, completed false)', () => {
    const periods = [makePeriod({ id: 1 })];
    const entry = makeEntry({ id: 200, type: 'Banking', notes: '', completed: false });
    const result = addEndeavourEntry(periods, 1, entry);
    const added = result[0].entries[0];
    expect(added.notes).toBe('');
    expect(added.completed).toBe(false);
    expect(added.type).toBe('Banking');
  });
});

// ─── Property 6: Removing an entry preserves all others ─────────────────────
// Feature: endeavours-tracker, Property 6: Removing an entry preserves all others
// Validates: Requirements 2.7

describe('removeEndeavourEntry — Property 6: Remove entry preserves others', () => {
  it('remove entry from period', () => {
    const periods = [makePeriod({
      id: 1,
      entries: [makeEntry({ id: 100 }), makeEntry({ id: 101 })],
    })];
    const result = removeEndeavourEntry(periods, 1, 100);
    expect(result[0].entries).toHaveLength(1);
    expect(result[0].entries[0].id).toBe(101);
  });

  it('remove with non-existent entry id returns unchanged', () => {
    const entries = [makeEntry({ id: 100 })];
    const periods = [makePeriod({ id: 1, entries })];
    const result = removeEndeavourEntry(periods, 1, 999);
    expect(result[0].entries).toHaveLength(1);
    expect(result[0].entries[0].id).toBe(100);
  });

  it('verify other entries preserved', () => {
    const periods = [makePeriod({
      id: 1,
      entries: [
        makeEntry({ id: 100, type: 'Income' }),
        makeEntry({ id: 101, type: 'Training' }),
        makeEntry({ id: 102, type: 'Crafting' }),
      ],
    })];
    const result = removeEndeavourEntry(periods, 1, 101);
    expect(result[0].entries).toHaveLength(2);
    expect(result[0].entries[0].type).toBe('Income');
    expect(result[0].entries[1].type).toBe('Crafting');
  });
});

// ─── Property 7: Updating an entry field sets the correct value ─────────────
// Feature: endeavours-tracker, Property 7: Updating an entry field sets the correct value
// Validates: Requirements 3.2, 3.3

describe('updateEndeavourEntry — Property 7: Update entry field', () => {
  it('update notes field', () => {
    const periods = [makePeriod({
      id: 1,
      entries: [makeEntry({ id: 100, notes: '' })],
    })];
    const result = updateEndeavourEntry(periods, 1, 100, 'notes', 'Earned 2 GC');
    expect(result[0].entries[0].notes).toBe('Earned 2 GC');
  });

  it('update completed field', () => {
    const periods = [makePeriod({
      id: 1,
      entries: [makeEntry({ id: 100, completed: false })],
    })];
    const result = updateEndeavourEntry(periods, 1, 100, 'completed', true);
    expect(result[0].entries[0].completed).toBe(true);
  });

  it('verify other fields unchanged', () => {
    const periods = [makePeriod({
      id: 1,
      entries: [makeEntry({ id: 100, type: 'Income', notes: 'old', completed: false })],
    })];
    const result = updateEndeavourEntry(periods, 1, 100, 'notes', 'new');
    const entry = result[0].entries[0];
    expect(entry.type).toBe('Income');
    expect(entry.completed).toBe(false);
    expect(entry.id).toBe(100);
    expect(entry.notes).toBe('new');
  });

  it('non-existent id returns unchanged', () => {
    const periods = [makePeriod({
      id: 1,
      entries: [makeEntry({ id: 100, notes: 'keep' })],
    })];
    const result = updateEndeavourEntry(periods, 1, 999, 'notes', 'changed');
    expect(result[0].entries[0].notes).toBe('keep');
  });
});

// ─── Property 8: Updating a period field sets the correct value ─────────────
// Feature: endeavours-tracker, Property 8: Updating a period field sets the correct value
// Validates: Requirements 1.5

describe('updateDowntimePeriod — Property 8: Update period field', () => {
  it('update slots value', () => {
    const periods = [makePeriod({ id: 1, slots: 2 })];
    const result = updateDowntimePeriod(periods, 1, 'slots', 5);
    expect(result[0].slots).toBe(5);
  });

  it('update label value', () => {
    const periods = [makePeriod({ id: 1, label: 'Downtime #1' })];
    const result = updateDowntimePeriod(periods, 1, 'label', 'After Bögenhafen');
    expect(result[0].label).toBe('After Bögenhafen');
  });

  it('verify other fields unchanged', () => {
    const periods = [makePeriod({
      id: 1,
      label: 'Downtime #1',
      slots: 2,
      statusWarning: false,
      entries: [makeEntry({ id: 100 })],
    })];
    const result = updateDowntimePeriod(periods, 1, 'slots', 4);
    const period = result[0];
    expect(period.slots).toBe(4);
    expect(period.label).toBe('Downtime #1');
    expect(period.id).toBe(1);
    expect(period.statusWarning).toBe(false);
    expect(period.entries).toHaveLength(1);
  });

  it('non-existent id returns unchanged', () => {
    const periods = [makePeriod({ id: 1, slots: 2 })];
    const result = updateDowntimePeriod(periods, 999, 'slots', 5);
    expect(result[0].slots).toBe(2);
  });
});

// ─── Property 9: Elf species detection ──────────────────────────────────────
// Feature: endeavours-tracker, Property 9: Elf species detection
// Validates: Requirements 7.1

describe('isElf — Property 9: Elf species detection', () => {
  it('"Wood Elf" → true', () => {
    expect(isElf('Wood Elf')).toBe(true);
  });

  it('"High Elf" → true', () => {
    expect(isElf('High Elf')).toBe(true);
  });

  it('"elf" → true (case-insensitive)', () => {
    expect(isElf('elf')).toBe(true);
  });

  it('"Human" → false', () => {
    expect(isElf('Human')).toBe(false);
  });

  it('"" → false', () => {
    expect(isElf('')).toBe(false);
  });

  it('"Halfling" → false', () => {
    expect(isElf('Halfling')).toBe(false);
  });

  it('"Dwarf" → false', () => {
    expect(isElf('Dwarf')).toBe(false);
  });
});
