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
  CLASS_ENDEAVOURS,
  getCostSummary,
  buildPickerItems,
  createEndeavourEntry,
} from '../endeavours';
import type { DowntimePeriod, EndeavourEntry } from '../../types/character';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePeriod(overrides: Partial<DowntimePeriod> = {}): DowntimePeriod {
  return {
    id: '1',
    label: 'Downtime #1',
    slots: 2,
    entries: [],
    statusWarning: false,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<EndeavourEntry> = {}): EndeavourEntry {
  return {
    id: '100',
    type: 'Income',
    notes: '',
    status: 'pending',
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
    const period = createDowntimePeriod('Silver 2', []);
    expect(period.label).toBe('Downtime #1');
    expect(period.slots).toBe(2);
    expect(period.statusWarning).toBe(false);
    expect(period.entries).toEqual([]);
    expect(period.date).toBeUndefined();
    expect(period.sessionNumber).toBeUndefined();
    expect(period.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('"" with count 3 → label "Downtime #4", slots 1, statusWarning true', () => {
    const existingPeriods = Array.from({ length: 3 }, (_, i) => ({
      id: `p${i}`, label: '', slots: 1, entries: [], statusWarning: false,
    })) as import('../../types/character').DowntimePeriod[];
    const period = createDowntimePeriod('', existingPeriods);
    expect(period.label).toBe('Downtime #4');
    expect(period.slots).toBe(1);
    expect(period.statusWarning).toBe(true);
    expect(period.entries).toEqual([]);
    expect(period.date).toBeUndefined();
    expect(period.sessionNumber).toBeUndefined();
  });

  it('"Gold 1" with count 5 → label "Downtime #6", slots 3, statusWarning false', () => {
    const existingPeriods = Array.from({ length: 5 }, (_, i) => ({
      id: `p${i}`, label: '', slots: 1, entries: [], statusWarning: false,
    })) as import('../../types/character').DowntimePeriod[];
    const period = createDowntimePeriod('Gold 1', existingPeriods);
    expect(period.label).toBe('Downtime #6');
    expect(period.slots).toBe(3);
    expect(period.statusWarning).toBe(false);
    expect(period.entries).toEqual([]);
    expect(period.date).toBeUndefined();
    expect(period.sessionNumber).toBeUndefined();
  });
});


// ─── Property 3: Adding a period prepends to the array ──────────────────────
// Feature: endeavours-tracker, Property 3: Adding a period prepends to the array
// Validates: Requirements 1.2

describe('addDowntimePeriod — Property 3: Prepend to array', () => {
  it('prepend to empty array', () => {
    const period = makePeriod({ id: '10' });
    const result = addDowntimePeriod([], period);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(period);
  });

  it('prepend to array with existing periods', () => {
    const existing = [makePeriod({ id: '1' }), makePeriod({ id: '2' })];
    const newPeriod = makePeriod({ id: '3' });
    const result = addDowntimePeriod(existing, newPeriod);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(newPeriod);
    expect(result[1]).toEqual(existing[0]);
    expect(result[2]).toEqual(existing[1]);
  });

  it('new period is at index 0 and length increased by 1', () => {
    const existing = [makePeriod({ id: '5' })];
    const newPeriod = makePeriod({ id: '6' });
    const result = addDowntimePeriod(existing, newPeriod);
    expect(result[0].id).toBe('6');
    expect(result.length).toBe(existing.length + 1);
  });
});

// ─── Property 4: Removing a period preserves all others ─────────────────────
// Feature: endeavours-tracker, Property 4: Removing a period preserves all others
// Validates: Requirements 1.6

describe('removeDowntimePeriod — Property 4: Remove preserves others', () => {
  it('remove from single-element array', () => {
    const periods = [makePeriod({ id: '1' })];
    const result = removeDowntimePeriod(periods, '1');
    expect(result).toHaveLength(0);
  });

  it('remove from multi-element array preserving order', () => {
    const periods = [
      makePeriod({ id: '1', label: 'A' }),
      makePeriod({ id: '2', label: 'B' }),
      makePeriod({ id: '3', label: 'C' }),
    ];
    const result = removeDowntimePeriod(periods, '2');
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe('A');
    expect(result[1].label).toBe('C');
  });

  it('remove with non-existent id returns array unchanged', () => {
    const periods = [makePeriod({ id: '1' }), makePeriod({ id: '2' })];
    const result = removeDowntimePeriod(periods, '999');
    expect(result).toHaveLength(2);
    expect(result).toEqual(periods);
  });
});

// ─── Property 5: Adding an entry always succeeds with correct defaults ──────
// Feature: endeavours-tracker, Property 5: Adding an entry always succeeds with correct defaults
// Validates: Requirements 2.3, 2.6

describe('addEndeavourEntry — Property 5: Add entry always succeeds', () => {
  it('add entry to period with 0 entries', () => {
    const periods = [makePeriod({ id: '1', slots: 2, entries: [] })];
    const entry = makeEntry({ id: '100', type: 'Income', notes: '' });
    const result = addEndeavourEntry(periods, '1', entry);
    expect(result[0].entries).toHaveLength(1);
    expect(result[0].entries[0].type).toBe('Income');
  });

  it('add entry when entries === slots', () => {
    const periods = [makePeriod({
      id: '1',
      slots: 1,
      entries: [makeEntry({ id: '100' })],
    })];
    const entry = makeEntry({ id: '101', type: 'Training' });
    const result = addEndeavourEntry(periods, '1', entry);
    expect(result[0].entries).toHaveLength(2);
  });

  it('add entry when entries > slots', () => {
    const periods = [makePeriod({
      id: '1',
      slots: 1,
      entries: [makeEntry({ id: '100' }), makeEntry({ id: '101' })],
    })];
    const entry = makeEntry({ id: '102', type: 'Crafting' });
    const result = addEndeavourEntry(periods, '1', entry);
    expect(result[0].entries).toHaveLength(3);
  });

  it('verify entry defaults (empty notes, status pending)', () => {
    const periods = [makePeriod({ id: '1' })];
    const entry = makeEntry({ id: '200', type: 'Banking', notes: '' });
    const result = addEndeavourEntry(periods, '1', entry);
    const added = result[0].entries[0];
    expect(added.notes).toBe('');
    expect(added.status).toBe('pending');
    expect(added.type).toBe('Banking');
  });
});

// ─── Property 6: Removing an entry preserves all others ─────────────────────
// Feature: endeavours-tracker, Property 6: Removing an entry preserves all others
// Validates: Requirements 2.7

describe('removeEndeavourEntry — Property 6: Remove entry preserves others', () => {
  it('remove entry from period', () => {
    const periods = [makePeriod({
      id: '1',
      entries: [makeEntry({ id: '100' }), makeEntry({ id: '101' })],
    })];
    const result = removeEndeavourEntry(periods, '1', '100');
    expect(result[0].entries).toHaveLength(1);
    expect(result[0].entries[0].id).toBe('101');
  });

  it('remove with non-existent entry id returns unchanged', () => {
    const entries = [makeEntry({ id: '100' })];
    const periods = [makePeriod({ id: '1', entries })];
    const result = removeEndeavourEntry(periods, '1', '999');
    expect(result[0].entries).toHaveLength(1);
    expect(result[0].entries[0].id).toBe('100');
  });

  it('verify other entries preserved', () => {
    const periods = [makePeriod({
      id: '1',
      entries: [
        makeEntry({ id: '100', type: 'Income' }),
        makeEntry({ id: '101', type: 'Training' }),
        makeEntry({ id: '102', type: 'Crafting' }),
      ],
    })];
    const result = removeEndeavourEntry(periods, '1', '101');
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
      id: '1',
      entries: [makeEntry({ id: '100', notes: '' })],
    })];
    const result = updateEndeavourEntry(periods, '1', '100', 'notes', 'Earned 2 GC');
    expect(result[0].entries[0].notes).toBe('Earned 2 GC');
  });

  it('update status field', () => {
    const periods = [makePeriod({
      id: '1',
      entries: [makeEntry({ id: '100', status: 'pending' })],
    })];
    const result = updateEndeavourEntry(periods, '1', '100', 'status', 'completed');
    expect(result[0].entries[0].status).toBe('completed');
  });

  it('update cost field', () => {
    const periods = [makePeriod({
      id: '1',
      entries: [makeEntry({ id: '100', cost: '' })],
    })];
    const result = updateEndeavourEntry(periods, '1', '100', 'cost', '5 GC');
    expect(result[0].entries[0].cost).toBe('5 GC');
  });

  it('verify other fields unchanged', () => {
    const periods = [makePeriod({
      id: '1',
      entries: [makeEntry({ id: '100', type: 'Income', notes: 'old', status: 'pending' })],
    })];
    const result = updateEndeavourEntry(periods, '1', '100', 'notes', 'new');
    const entry = result[0].entries[0];
    expect(entry.type).toBe('Income');
    expect(entry.status).toBe('pending');
    expect(entry.id).toBe('100');
    expect(entry.notes).toBe('new');
  });

  it('non-existent id returns unchanged', () => {
    const periods = [makePeriod({
      id: '1',
      entries: [makeEntry({ id: '100', notes: 'keep' })],
    })];
    const result = updateEndeavourEntry(periods, '1', '999', 'notes', 'changed');
    expect(result[0].entries[0].notes).toBe('keep');
  });
});

// ─── Property 8: Updating a period field sets the correct value ─────────────
// Feature: endeavours-tracker, Property 8: Updating a period field sets the correct value
// Validates: Requirements 1.5

describe('updateDowntimePeriod — Property 8: Update period field', () => {
  it('update slots value', () => {
    const periods = [makePeriod({ id: '1', slots: 2 })];
    const result = updateDowntimePeriod(periods, '1', 'slots', 5);
    expect(result[0].slots).toBe(5);
  });

  it('update label value', () => {
    const periods = [makePeriod({ id: '1', label: 'Downtime #1' })];
    const result = updateDowntimePeriod(periods, '1', 'label', 'After Bögenhafen');
    expect(result[0].label).toBe('After Bögenhafen');
  });

  it('update date field', () => {
    const periods = [makePeriod({ id: '1' })];
    const result = updateDowntimePeriod(periods, '1', 'date', '2024-03-15');
    expect(result[0].date).toBe('2024-03-15');
  });

  it('update sessionNumber field', () => {
    const periods = [makePeriod({ id: '1' })];
    const result = updateDowntimePeriod(periods, '1', 'sessionNumber', 42);
    expect(result[0].sessionNumber).toBe(42);
  });

  it('verify other fields unchanged', () => {
    const periods = [makePeriod({
      id: '1',
      label: 'Downtime #1',
      slots: 2,
      statusWarning: false,
      entries: [makeEntry({ id: '100' })],
    })];
    const result = updateDowntimePeriod(periods, '1', 'slots', 4);
    const period = result[0];
    expect(period.slots).toBe(4);
    expect(period.label).toBe('Downtime #1');
    expect(period.id).toBe('1');
    expect(period.statusWarning).toBe(false);
    expect(period.entries).toHaveLength(1);
  });

  it('non-existent id returns unchanged', () => {
    const periods = [makePeriod({ id: '1', slots: 2 })];
    const result = updateDowntimePeriod(periods, '999', 'slots', 5);
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


// ─── Warrior Endeavours (Up in Arms) ────────────────────────────────────────
// Validates: Requirements 1.1, 1.2, 1.3, 1.5

describe('CLASS_ENDEAVOURS["Warriors"] — Warrior endeavours from Up in Arms', () => {
  const warriors = CLASS_ENDEAVOURS['Warriors'];

  it('contains exactly 6 entries', () => {
    expect(warriors).toHaveLength(6);
  });

  it('retains the original "Combat Training" entry', () => {
    expect(warriors).toContain('Combat Training');
  });

  it('contains "Drill"', () => {
    expect(warriors).toContain('Drill');
  });

  it('contains "Challenge"', () => {
    expect(warriors).toContain('Challenge');
  });

  it('contains "Seek Patronage"', () => {
    expect(warriors).toContain('Seek Patronage');
  });

  it('contains "Establish Contacts"', () => {
    expect(warriors).toContain('Establish Contacts');
  });

  it('contains "Tournament"', () => {
    expect(warriors).toContain('Tournament');
  });
});

// ─── getCostSummary ─────────────────────────────────────────────────────────
// Feature: endeavours-improvements
// Validates: Requirements 9.3, 9.4, 9.5

describe('getCostSummary', () => {
  it('returns null when entries array is empty', () => {
    expect(getCostSummary([])).toBeNull();
  });

  it('returns null when no entries have a cost', () => {
    const entries: EndeavourEntry[] = [
      { id: '1', type: 'Income', notes: '', status: 'pending', cost: '' },
      { id: '2', type: 'Training', notes: '', status: 'pending', cost: undefined },
    ];
    expect(getCostSummary(entries)).toBeNull();
  });

  it('returns null when costs are whitespace-only', () => {
    const entries: EndeavourEntry[] = [
      { id: '1', type: 'Income', notes: '', status: 'pending', cost: '   ' },
      { id: '2', type: 'Training', notes: '', status: 'pending', cost: '  \t ' },
    ];
    expect(getCostSummary(entries)).toBeNull();
  });

  it('returns comma-separated costs for entries with non-empty cost', () => {
    const entries: EndeavourEntry[] = [
      { id: '1', type: 'Commission', notes: '', status: 'pending', cost: '2 GC' },
      { id: '2', type: 'Banking', notes: '', status: 'pending', cost: '5 s' },
    ];
    expect(getCostSummary(entries)).toBe('2 GC, 5 s');
  });

  it('excludes entries with empty/whitespace cost from summary', () => {
    const entries: EndeavourEntry[] = [
      { id: '1', type: 'Commission', notes: '', status: 'pending', cost: '2 GC' },
      { id: '2', type: 'Income', notes: '', status: 'pending', cost: '' },
      { id: '3', type: 'Banking', notes: '', status: 'pending', cost: '1 GC 3 s' },
    ];
    expect(getCostSummary(entries)).toBe('2 GC, 1 GC 3 s');
  });

  it('returns single cost when only one entry has a cost', () => {
    const entries: EndeavourEntry[] = [
      { id: '1', type: 'Income', notes: '', status: 'pending', cost: '' },
      { id: '2', type: 'Commission', notes: '', status: 'pending', cost: '10 GC' },
    ];
    expect(getCostSummary(entries)).toBe('10 GC');
  });
});

// ─── buildPickerItems ───────────────────────────────────────────────────────
// Feature: endeavours-improvements
// Validates: Requirements 6.1, 6.2, 6.3

describe('buildPickerItems', () => {
  it('always includes General group items', () => {
    const items = buildPickerItems('Warriors', false);
    const generalItems = items.filter(i => i.group === 'General');
    expect(generalItems.length).toBe(10); // GENERAL_ENDEAVOURS has 10 items
    expect(generalItems[0].label).toBe('Income');
  });

  it('includes Class group items when className matches CLASS_ENDEAVOURS', () => {
    const items = buildPickerItems('Warriors', false);
    const classItems = items.filter(i => i.group === 'Warriors Class');
    expect(classItems.length).toBe(6);
    expect(classItems.map(i => i.label)).toContain('Combat Training');
    expect(classItems.map(i => i.label)).toContain('Drill');
  });

  it('shows disabled info item when className is non-empty but unmatched', () => {
    const items = buildPickerItems('UnknownClass', false);
    const classItems = items.filter(i => i.group === 'Class');
    expect(classItems.length).toBe(1);
    expect(classItems[0].label).toBe('No class endeavours found for UnknownClass');
    expect(classItems[0].disabled).toBe(true);
  });

  it('omits class group when className is empty string', () => {
    const items = buildPickerItems('', false);
    const classItems = items.filter(i => i.group === 'Class' || i.group.includes('Class'));
    expect(classItems.length).toBe(0);
  });

  it('omits class group when className is whitespace-only', () => {
    const items = buildPickerItems('   ', false);
    const classItems = items.filter(i => i.group === 'Class' || i.group.includes('Class'));
    expect(classItems.length).toBe(0);
  });

  it('includes Species group when isElfChar is true', () => {
    const items = buildPickerItems('Warriors', true);
    const speciesItems = items.filter(i => i.group === 'Species');
    expect(speciesItems.length).toBe(1);
    expect(speciesItems[0].label).toBe('Elf Obligation');
  });

  it('omits Species group when isElfChar is false', () => {
    const items = buildPickerItems('Warriors', false);
    const speciesItems = items.filter(i => i.group === 'Species');
    expect(speciesItems.length).toBe(0);
  });

  it('always includes Custom option in Other group', () => {
    const items = buildPickerItems('', false);
    const customItems = items.filter(i => i.group === 'Other');
    expect(customItems.length).toBe(1);
    expect(customItems[0].label).toBe('✏️ Custom (free text)');
  });

  it('uses exact case-sensitive matching for class names', () => {
    // "warriors" (lowercase) should NOT match "Warriors"
    const items = buildPickerItems('warriors', false);
    const classItems = items.filter(i => i.group === 'Class');
    expect(classItems.length).toBe(1);
    expect(classItems[0].disabled).toBe(true);
    expect(classItems[0].label).toBe('No class endeavours found for warriors');
  });
});

// ─── createEndeavourEntry ───────────────────────────────────────────────────
// Feature: endeavours-improvements
// Validates: Requirements 4.3, 2.2

describe('createEndeavourEntry', () => {
  it('creates entry with correct type', () => {
    const entry = createEndeavourEntry('Income');
    expect(entry.type).toBe('Income');
  });

  it('creates entry with status "pending"', () => {
    const entry = createEndeavourEntry('Training');
    expect(entry.status).toBe('pending');
  });

  it('creates entry with empty cost', () => {
    const entry = createEndeavourEntry('Commission');
    expect(entry.cost).toBe('');
  });

  it('creates entry with empty notes', () => {
    const entry = createEndeavourEntry('Banking');
    expect(entry.notes).toBe('');
  });

  it('creates entry with UUID id', () => {
    const entry = createEndeavourEntry('Crafting');
    // UUID v4 format check
    expect(entry.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('generates unique ids for each call', () => {
    const entry1 = createEndeavourEntry('Income');
    const entry2 = createEndeavourEntry('Income');
    expect(entry1.id).not.toBe(entry2.id);
  });
});
