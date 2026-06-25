import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { DowntimePeriod, EndeavourEntry } from '../../types/character';
import {
  movePeriodUp,
  movePeriodDown,
  moveEntryUp,
  moveEntryDown,
  getCostSummary,
  addDowntimePeriod,
  removeDowntimePeriod,
  addEndeavourEntry,
  removeEndeavourEntry,
  createDowntimePeriod,
  createEndeavourEntry,
  updateEndeavourEntry,
  updateDowntimePeriod,
  parseStatusTier,
  getDefaultSlots,
  getMaxSessionNumber,
  getNextSessionNumber,
} from '../endeavours';

// ─── Generators ─────────────────────────────────────────────────────────────

const arbPeriod = fc.record({
  id: fc.uuid(),
  label: fc.string(),
  slots: fc.integer({ min: 1, max: 10 }),
  entries: fc.constant([]) as fc.Arbitrary<EndeavourEntry[]>,
  statusWarning: fc.boolean(),
  date: fc.option(
    fc.tuple(
      fc.integer({ min: 2000, max: 2099 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
    ).map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`),
    { nil: undefined }
  ),
  sessionNumber: fc.option(fc.integer({ min: 1, max: 9999 }), { nil: undefined }),
});

const arbPeriodArray = fc.array(arbPeriod, { minLength: 2, maxLength: 20 })
  .map(periods => periods.map((p, i) => ({ ...p, id: `id-${i}` }))); // ensure unique IDs

const arbEntry: fc.Arbitrary<EndeavourEntry> = fc.record({
  id: fc.uuid(),
  type: fc.string({ minLength: 1, maxLength: 30 }),
  notes: fc.string({ maxLength: 50 }),
  status: fc.constantFrom('pending' as const, 'in_progress' as const, 'completed' as const),
  cost: fc.option(fc.string({ maxLength: 20 }), { nil: undefined }),
});

const arbEntryArray = fc.array(arbEntry, { minLength: 2, maxLength: 20 })
  .map(entries => entries.map((e, i) => ({ ...e, id: `entry-${i}` }))); // ensure unique IDs

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: endeavours-improvements', () => {
  describe('Property 7: Move operations swap exactly two adjacent elements', () => {
    /**
     * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**
     */

    it('movePeriodUp swaps target with predecessor, others unchanged', () => {
      fc.assert(
        fc.property(
          arbPeriodArray,
          fc.nat(),
          (periods, indexSeed) => {
            // Pick a valid index > 0 so move-up has a predecessor
            const index = 1 + (indexSeed % (periods.length - 1));
            const targetId = periods[index].id;

            const result = movePeriodUp(periods, targetId);

            // Swapped elements
            expect(result[index - 1].id).toBe(periods[index].id);
            expect(result[index].id).toBe(periods[index - 1].id);

            // All others unchanged
            for (let i = 0; i < periods.length; i++) {
              if (i !== index && i !== index - 1) {
                expect(result[i].id).toBe(periods[i].id);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('movePeriodDown swaps target with successor, others unchanged', () => {
      fc.assert(
        fc.property(
          arbPeriodArray,
          fc.nat(),
          (periods, indexSeed) => {
            // Pick a valid index < length-1 so move-down has a successor
            const index = indexSeed % (periods.length - 1);
            const targetId = periods[index].id;

            const result = movePeriodDown(periods, targetId);

            // Swapped elements
            expect(result[index + 1].id).toBe(periods[index].id);
            expect(result[index].id).toBe(periods[index + 1].id);

            // All others unchanged
            for (let i = 0; i < periods.length; i++) {
              if (i !== index && i !== index + 1) {
                expect(result[i].id).toBe(periods[i].id);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('movePeriodUp at boundary (first element) returns array unchanged', () => {
      fc.assert(
        fc.property(
          arbPeriodArray,
          (periods) => {
            const firstId = periods[0].id;
            const result = movePeriodUp(periods, firstId);

            // Array should be identical (same reference since no swap occurs)
            expect(result.map(p => p.id)).toEqual(periods.map(p => p.id));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('movePeriodDown at boundary (last element) returns array unchanged', () => {
      fc.assert(
        fc.property(
          arbPeriodArray,
          (periods) => {
            const lastId = periods[periods.length - 1].id;
            const result = movePeriodDown(periods, lastId);

            // Array should be identical
            expect(result.map(p => p.id)).toEqual(periods.map(p => p.id));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('moveEntryUp swaps target with predecessor within period, others unchanged', () => {
      fc.assert(
        fc.property(
          arbEntryArray,
          fc.nat(),
          (entries, indexSeed) => {
            const index = 1 + (indexSeed % (entries.length - 1));
            const periodId = 'period-0';
            const period: DowntimePeriod = {
              id: periodId,
              label: 'Test',
              slots: 3,
              entries,
              statusWarning: false,
            };
            const periods = [period];
            const targetEntryId = entries[index].id;

            const result = moveEntryUp(periods, periodId, targetEntryId);
            const resultEntries = result[0].entries;

            // Swapped elements
            expect(resultEntries[index - 1].id).toBe(entries[index].id);
            expect(resultEntries[index].id).toBe(entries[index - 1].id);

            // All others unchanged
            for (let i = 0; i < entries.length; i++) {
              if (i !== index && i !== index - 1) {
                expect(resultEntries[i].id).toBe(entries[i].id);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('moveEntryDown swaps target with successor within period, others unchanged', () => {
      fc.assert(
        fc.property(
          arbEntryArray,
          fc.nat(),
          (entries, indexSeed) => {
            const index = indexSeed % (entries.length - 1);
            const periodId = 'period-0';
            const period: DowntimePeriod = {
              id: periodId,
              label: 'Test',
              slots: 3,
              entries,
              statusWarning: false,
            };
            const periods = [period];
            const targetEntryId = entries[index].id;

            const result = moveEntryDown(periods, periodId, targetEntryId);
            const resultEntries = result[0].entries;

            // Swapped elements
            expect(resultEntries[index + 1].id).toBe(entries[index].id);
            expect(resultEntries[index].id).toBe(entries[index + 1].id);

            // All others unchanged
            for (let i = 0; i < entries.length; i++) {
              if (i !== index && i !== index + 1) {
                expect(resultEntries[i].id).toBe(entries[i].id);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('moveEntryUp at boundary (first entry) returns unchanged', () => {
      fc.assert(
        fc.property(
          arbEntryArray,
          (entries) => {
            const periodId = 'period-0';
            const period: DowntimePeriod = {
              id: periodId,
              label: 'Test',
              slots: 3,
              entries,
              statusWarning: false,
            };
            const periods = [period];
            const firstEntryId = entries[0].id;

            const result = moveEntryUp(periods, periodId, firstEntryId);
            expect(result[0].entries.map(e => e.id)).toEqual(entries.map(e => e.id));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('moveEntryDown at boundary (last entry) returns unchanged', () => {
      fc.assert(
        fc.property(
          arbEntryArray,
          (entries) => {
            const periodId = 'period-0';
            const period: DowntimePeriod = {
              id: periodId,
              label: 'Test',
              slots: 3,
              entries,
              statusWarning: false,
            };
            const periods = [period];
            const lastEntryId = entries[entries.length - 1].id;

            const result = moveEntryDown(periods, periodId, lastEntryId);
            expect(result[0].entries.map(e => e.id)).toEqual(entries.map(e => e.id));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Reorder preserves collection membership', () => {
    /**
     * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**
     */

    it('movePeriodUp preserves array length and element IDs', () => {
      fc.assert(
        fc.property(
          arbPeriodArray,
          fc.nat(),
          (periods, indexSeed) => {
            const index = indexSeed % periods.length;
            const targetId = periods[index].id;

            const result = movePeriodUp(periods, targetId);

            expect(result.length).toBe(periods.length);
            const resultIds = result.map(p => p.id).sort();
            const originalIds = periods.map(p => p.id).sort();
            expect(resultIds).toEqual(originalIds);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('movePeriodDown preserves array length and element IDs', () => {
      fc.assert(
        fc.property(
          arbPeriodArray,
          fc.nat(),
          (periods, indexSeed) => {
            const index = indexSeed % periods.length;
            const targetId = periods[index].id;

            const result = movePeriodDown(periods, targetId);

            expect(result.length).toBe(periods.length);
            const resultIds = result.map(p => p.id).sort();
            const originalIds = periods.map(p => p.id).sort();
            expect(resultIds).toEqual(originalIds);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('moveEntryUp preserves entries array length and element IDs', () => {
      fc.assert(
        fc.property(
          arbEntryArray,
          fc.nat(),
          (entries, indexSeed) => {
            const index = indexSeed % entries.length;
            const periodId = 'period-0';
            const period: DowntimePeriod = {
              id: periodId,
              label: 'Test',
              slots: 3,
              entries,
              statusWarning: false,
            };
            const periods = [period];
            const targetEntryId = entries[index].id;

            const result = moveEntryUp(periods, periodId, targetEntryId);
            const resultEntries = result[0].entries;

            expect(resultEntries.length).toBe(entries.length);
            const resultIds = resultEntries.map(e => e.id).sort();
            const originalIds = entries.map(e => e.id).sort();
            expect(resultIds).toEqual(originalIds);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('moveEntryDown preserves entries array length and element IDs', () => {
      fc.assert(
        fc.property(
          arbEntryArray,
          fc.nat(),
          (entries, indexSeed) => {
            const index = indexSeed % entries.length;
            const periodId = 'period-0';
            const period: DowntimePeriod = {
              id: periodId,
              label: 'Test',
              slots: 3,
              entries,
              statusWarning: false,
            };
            const periods = [period];
            const targetEntryId = entries[index].id;

            const result = moveEntryDown(periods, periodId, targetEntryId);
            const resultEntries = result[0].entries;

            expect(resultEntries.length).toBe(entries.length);
            const resultIds = resultEntries.map(e => e.id).sort();
            const originalIds = entries.map(e => e.id).sort();
            expect(resultIds).toEqual(originalIds);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Cost summary correctness', () => {
    /**
     * **Validates: Requirements 9.3, 9.4, 9.5**
     */

    it('returns null when all entries have empty or whitespace-only costs', () => {
      const arbEmptyCostEntry: fc.Arbitrary<EndeavourEntry> = fc.record({
        id: fc.uuid(),
        type: fc.string({ minLength: 1, maxLength: 30 }),
        notes: fc.string({ maxLength: 50 }),
        status: fc.constantFrom('pending' as const, 'in_progress' as const, 'completed' as const),
        cost: fc.constantFrom('', '   ', ' \t ', '\n', undefined),
      }).map(e => (e.cost === undefined ? { ...e, cost: undefined } : e)) as fc.Arbitrary<EndeavourEntry>;

      fc.assert(
        fc.property(
          fc.array(arbEmptyCostEntry, { minLength: 0, maxLength: 20 }),
          (entries) => {
            const result = getCostSummary(entries);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns comma-separated string of non-empty costs in order when at least one exists', () => {
      const arbNonEmptyCost = fc.string({ minLength: 1, maxLength: 20 })
        .filter(s => s.trim().length > 0);

      const arbMixedCostEntry = fc.record({
        id: fc.uuid(),
        type: fc.string({ minLength: 1, maxLength: 30 }),
        notes: fc.string({ maxLength: 50 }),
        status: fc.constantFrom('pending' as const, 'in_progress' as const, 'completed' as const),
        cost: fc.oneof(
          arbNonEmptyCost,
          fc.constantFrom('', '   ', undefined),
        ),
      }) as fc.Arbitrary<EndeavourEntry>;

      fc.assert(
        fc.property(
          fc.array(arbMixedCostEntry, { minLength: 1, maxLength: 20 })
            .filter(entries => entries.some(e => e.cost != null && e.cost.trim().length > 0)),
          (entries) => {
            const result = getCostSummary(entries);

            // Must not be null since at least one non-empty cost exists
            expect(result).not.toBeNull();

            // The result should be the comma-separated non-empty costs in order
            const expectedCosts = entries
              .map(e => e.cost)
              .filter((c): c is string => c != null && c.trim().length > 0);
            expect(result).toBe(expectedCosts.join(', '));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: Add/remove period round-trip', () => {
    /**
     * **Validates: Requirements 10.1**
     */

    it('addDowntimePeriod then removeDowntimePeriod returns original array', () => {
      const arbPeriodWithUniqueIds = fc.array(arbPeriod, { minLength: 0, maxLength: 20 })
        .map(periods => periods.map((p, i) => ({ ...p, id: `period-rt-${i}` })));

      fc.assert(
        fc.property(
          arbPeriodWithUniqueIds,
          fc.string({ minLength: 1, maxLength: 50 }),
          (originalPeriods, status) => {
            // Create a new period via createDowntimePeriod
            const newPeriod = createDowntimePeriod(status, originalPeriods);

            // Add the new period
            const withAdded = addDowntimePeriod(originalPeriods, newPeriod);

            // Remove it by its ID
            const afterRemove = removeDowntimePeriod(withAdded, newPeriod.id);

            // Should deep-equal the original
            expect(afterRemove).toEqual(originalPeriods);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Add/remove entry round-trip', () => {
    /**
     * **Validates: Requirements 10.2**
     */

    it('addEndeavourEntry then removeEndeavourEntry returns original entries', () => {
      const arbPeriodWithEntries = fc.array(arbEntry, { minLength: 0, maxLength: 20 })
        .map(entries => entries.map((e, i) => ({ ...e, id: `entry-rt-${i}` })))
        .map(entries => ({
          id: 'target-period',
          label: 'Test Period',
          slots: 3,
          entries,
          statusWarning: false,
          date: undefined,
          sessionNumber: undefined,
        } as DowntimePeriod));

      fc.assert(
        fc.property(
          arbPeriodWithEntries,
          fc.string({ minLength: 1, maxLength: 30 }),
          (period, entryType) => {
            const periods = [period];

            // Create a new entry via createEndeavourEntry
            const newEntry = createEndeavourEntry(entryType);

            // Add the entry to the period
            const withAdded = addEndeavourEntry(periods, period.id, newEntry);

            // Remove it by period ID and entry ID
            const afterRemove = removeEndeavourEntry(withAdded, period.id, newEntry.id);

            // The period's entries should deep-equal the original
            expect(afterRemove[0].entries).toEqual(period.entries);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12: updateEndeavourEntry preserves entry count', () => {
    /**
     * **Validates: Requirements 10.3**
     */

    it('targeted period entries length unchanged after update', () => {
      const arbPeriodWithEntries = fc.array(arbEntry, { minLength: 1, maxLength: 10 })
        .map(entries => entries.map((e, i) => ({ ...e, id: `e-${i}` })));

      const arbPeriodsWithEntries = fc.array(arbPeriodWithEntries, { minLength: 1, maxLength: 5 })
        .map(periodsEntries => periodsEntries.map((entries, i) => ({
          id: `p-${i}`,
          label: `Period ${i}`,
          slots: 3,
          entries,
          statusWarning: false,
          date: undefined,
          sessionNumber: undefined,
        } as DowntimePeriod)));

      const arbField = fc.constantFrom(
        'type' as const,
        'notes' as const,
        'status' as const,
        'cost' as const,
      );

      const arbValue = fc.oneof(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.constantFrom('pending', 'in_progress', 'completed'),
      );

      fc.assert(
        fc.property(
          arbPeriodsWithEntries,
          fc.nat(),
          fc.nat(),
          arbField,
          arbValue,
          (periods, periodSeed, entrySeed, field, value) => {
            const periodIdx = periodSeed % periods.length;
            const targetPeriod = periods[periodIdx];
            const entryIdx = entrySeed % targetPeriod.entries.length;
            const targetEntry = targetPeriod.entries[entryIdx];

            const originalEntryCount = targetPeriod.entries.length;

            const result = updateEndeavourEntry(
              periods,
              targetPeriod.id,
              targetEntry.id,
              field,
              value,
            );

            const resultPeriod = result.find(p => p.id === targetPeriod.id)!;
            expect(resultPeriod.entries.length).toBe(originalEntryCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 13: updateDowntimePeriod preserves period count', () => {
    /**
     * **Validates: Requirements 10.4**
     */

    it('array length unchanged after update', () => {
      const arbPeriodsForUpdate = fc.array(arbPeriod, { minLength: 1, maxLength: 20 })
        .map(periods => periods.map((p, i) => ({ ...p, id: `p-${i}` })));

      const arbField = fc.constantFrom(
        'label' as const,
        'slots' as const,
        'date' as const,
        'sessionNumber' as const,
      );

      const arbValue = fc.oneof(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.integer({ min: 1, max: 10 }),
        fc.constant(undefined),
      );

      fc.assert(
        fc.property(
          arbPeriodsForUpdate,
          fc.nat(),
          arbField,
          arbValue,
          (periods, periodSeed, field, value) => {
            const periodIdx = periodSeed % periods.length;
            const targetPeriod = periods[periodIdx];

            const originalLength = periods.length;

            const result = updateDowntimePeriod(
              periods,
              targetPeriod.id,
              field,
              value,
            );

            expect(result.length).toBe(originalLength);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 14: parseStatusTier output range', () => {
    /**
     * **Validates: Requirements 10.6**
     */

    it('returns value in {gold, silver, brass, null} for any string input', () => {
      const validOutputs = new Set(['gold', 'silver', 'brass', null]);

      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 200 }),
          (input) => {
            const result = parseStatusTier(input);
            expect(validOutputs.has(result)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 15: getDefaultSlots invariant', () => {
    /**
     * **Validates: Requirements 10.7**
     */

    it('returns positive integer >= 1 for all valid tiers', () => {
      const arbTier = fc.constantFrom('brass' as const, 'silver' as const, 'gold' as const, null);

      fc.assert(
        fc.property(
          arbTier,
          (tier) => {
            const result = getDefaultSlots(tier);
            expect(Number.isInteger(result)).toBe(true);
            expect(result).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 16: createDowntimePeriod structure validity', () => {
    /**
     * **Validates: Requirements 10.8**
     */

    it('entries empty, label matches pattern, slots >= 1, id is UUID, date/sessionNumber undefined when no existing sessions', () => {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 200 }),
          fc.integer({ min: 0, max: 1000 }),
          (statusInput, existingCount) => {
            // Build a mock array of existingCount periods with no sessionNumbers
            const existingPeriods = Array.from({ length: existingCount }, (_, i) => ({
              id: `p${i}`, label: '', slots: 1, entries: [] as never[], statusWarning: false,
            }));
            const result = createDowntimePeriod(statusInput, existingPeriods);

            // entries is empty array
            expect(result.entries).toEqual([]);

            // label matches "Downtime #N" where N = existingCount + 1
            expect(result.label).toBe(`Downtime #${existingCount + 1}`);

            // slots >= 1
            expect(result.slots).toBeGreaterThanOrEqual(1);

            // id is a valid UUID
            expect(result.id).toMatch(UUID_REGEX);

            // date is undefined
            expect(result.date).toBeUndefined();

            // sessionNumber is undefined (no existing sessions)
            expect(result.sessionNumber).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ─── Feature: ux-improvements ────────────────────────────────────────────────

describe('Feature: ux-improvements', () => {
  describe('Property 14: Slot calculation from status tier', () => {
    /**
     * **Validates: Requirements 19.1, 19.2**
     *
     * For any status string, if it contains "Gold" (case-insensitive) the slot count
     * SHALL be 3, if it contains "Silver" the slot count SHALL be 2, if it contains
     * "Brass" the slot count SHALL be 1, and if it contains none of these keywords
     * the slot count SHALL be 1 with statusWarning set to true.
     */

    it('Gold status (case-insensitive) yields 3 slots with no statusWarning', () => {
      const arbGoldStatus = fc.tuple(
        fc.string({ maxLength: 20 }),
        fc.constantFrom('Gold', 'gold', 'GOLD', 'GoLd'),
        fc.string({ maxLength: 20 }),
      ).map(([prefix, gold, suffix]) => `${prefix}${gold}${suffix}`);

      fc.assert(
        fc.property(arbGoldStatus, (status) => {
          const tier = parseStatusTier(status);
          const slots = getDefaultSlots(tier);
          expect(tier).toBe('gold');
          expect(slots).toBe(3);
        }),
        { numRuns: 100 }
      );
    });

    it('Silver status (case-insensitive) yields 2 slots with no statusWarning', () => {
      const arbSilverStatus = fc.tuple(
        fc.string({ maxLength: 20 }),
        fc.constantFrom('Silver', 'silver', 'SILVER', 'SiLvEr'),
        fc.string({ maxLength: 20 }),
      ).map(([prefix, silver, suffix]) => `${prefix}${silver}${suffix}`)
        // Ensure "gold" doesn't appear (gold takes priority in parseStatusTier)
        .filter(s => !s.toLowerCase().includes('gold'));

      fc.assert(
        fc.property(arbSilverStatus, (status) => {
          const tier = parseStatusTier(status);
          const slots = getDefaultSlots(tier);
          expect(tier).toBe('silver');
          expect(slots).toBe(2);
        }),
        { numRuns: 100 }
      );
    });

    it('Brass status (case-insensitive) yields 1 slot with no statusWarning', () => {
      const arbBrassStatus = fc.tuple(
        fc.string({ maxLength: 20 }),
        fc.constantFrom('Brass', 'brass', 'BRASS', 'BrAsS'),
        fc.string({ maxLength: 20 }),
      ).map(([prefix, brass, suffix]) => `${prefix}${brass}${suffix}`)
        // Ensure neither "gold" nor "silver" appears (they take priority)
        .filter(s => !s.toLowerCase().includes('gold') && !s.toLowerCase().includes('silver'));

      fc.assert(
        fc.property(arbBrassStatus, (status) => {
          const tier = parseStatusTier(status);
          const slots = getDefaultSlots(tier);
          expect(tier).toBe('brass');
          expect(slots).toBe(1);
        }),
        { numRuns: 100 }
      );
    });

    it('Status without Gold/Silver/Brass yields 1 slot and statusWarning=true', () => {
      const arbUnknownStatus = fc.string({ minLength: 0, maxLength: 100 })
        .filter(s => {
          const lower = s.toLowerCase();
          return !lower.includes('gold') && !lower.includes('silver') && !lower.includes('brass');
        });

      fc.assert(
        fc.property(arbUnknownStatus, (status) => {
          const tier = parseStatusTier(status);
          const slots = getDefaultSlots(tier);
          expect(tier).toBeNull();
          expect(slots).toBe(1);

          // Verify createDowntimePeriod sets statusWarning when tier is null
          const period = createDowntimePeriod(status, []);
          expect(period.statusWarning).toBe(true);
          expect(period.slots).toBe(1);
        }),
        { numRuns: 100 }
      );
    });

    it('createDowntimePeriod sets statusWarning=false when tier is recognized', () => {
      const arbRecognizedStatus = fc.constantFrom(
        'Gold 1', 'Silver 3', 'Brass 5', 'gold 2', 'SILVER 4', 'brass 1'
      );

      fc.assert(
        fc.property(arbRecognizedStatus, (status) => {
          const period = createDowntimePeriod(status, []);
          expect(period.statusWarning).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 15: Session number auto-increment', () => {
    /**
     * **Validates: Requirements 20.1**
     *
     * For any non-empty array of downtime periods where at least one period has a
     * defined numeric sessionNumber, creating a new period SHALL auto-populate its
     * sessionNumber with a value equal to the maximum sessionNumber across all
     * existing periods plus 1.
     */

    it('getNextSessionNumber returns max + 1 when at least one period has a sessionNumber', () => {
      const arbPeriodWithSession = fc.record({
        id: fc.uuid(),
        label: fc.string({ minLength: 1, maxLength: 30 }),
        slots: fc.integer({ min: 1, max: 10 }),
        entries: fc.constant([]) as fc.Arbitrary<EndeavourEntry[]>,
        statusWarning: fc.boolean(),
        date: fc.constant(undefined) as fc.Arbitrary<string | undefined>,
        sessionNumber: fc.integer({ min: 1, max: 9999 }),
      });

      const arbPeriodWithoutSession = fc.record({
        id: fc.uuid(),
        label: fc.string({ minLength: 1, maxLength: 30 }),
        slots: fc.integer({ min: 1, max: 10 }),
        entries: fc.constant([]) as fc.Arbitrary<EndeavourEntry[]>,
        statusWarning: fc.boolean(),
        date: fc.constant(undefined) as fc.Arbitrary<string | undefined>,
        sessionNumber: fc.constant(undefined) as fc.Arbitrary<number | undefined>,
      });

      // At least one period must have a sessionNumber set
      const arbPeriods = fc.tuple(
        fc.array(arbPeriodWithoutSession, { minLength: 0, maxLength: 10 }),
        fc.array(arbPeriodWithSession, { minLength: 1, maxLength: 10 }),
        fc.array(arbPeriodWithoutSession, { minLength: 0, maxLength: 10 }),
      ).map(([before, withSession, after]) => [...before, ...withSession, ...after]);

      fc.assert(
        fc.property(arbPeriods, (periods) => {
          const maxSession = getMaxSessionNumber(periods);
          const nextSession = getNextSessionNumber(periods);

          expect(maxSession).toBeDefined();
          expect(nextSession).toBe(maxSession! + 1);
        }),
        { numRuns: 100 }
      );
    });

    it('getNextSessionNumber returns undefined when no period has a sessionNumber', () => {
      const arbPeriodNoSession = fc.record({
        id: fc.uuid(),
        label: fc.string({ minLength: 1, maxLength: 30 }),
        slots: fc.integer({ min: 1, max: 10 }),
        entries: fc.constant([]) as fc.Arbitrary<EndeavourEntry[]>,
        statusWarning: fc.boolean(),
        date: fc.constant(undefined) as fc.Arbitrary<string | undefined>,
        sessionNumber: fc.constant(undefined) as fc.Arbitrary<number | undefined>,
      });

      fc.assert(
        fc.property(
          fc.array(arbPeriodNoSession, { minLength: 1, maxLength: 20 }),
          (periods) => {
            const nextSession = getNextSessionNumber(periods);
            expect(nextSession).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getNextSessionNumber correctly finds the maximum across scattered sessionNumbers', () => {
      // Generate periods with known max session number to verify correctness
      const arbSessionNumbers = fc.array(fc.integer({ min: 1, max: 9999 }), { minLength: 1, maxLength: 20 });

      fc.assert(
        fc.property(arbSessionNumbers, (sessionNumbers) => {
          const expectedMax = Math.max(...sessionNumbers);
          const periods: DowntimePeriod[] = sessionNumbers.map((sn, i) => ({
            id: `p-${i}`,
            label: `Period ${i}`,
            slots: 1,
            entries: [],
            statusWarning: false,
            date: undefined,
            sessionNumber: sn,
          }));

          const nextSession = getNextSessionNumber(periods);
          expect(nextSession).toBe(expectedMax + 1);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 16: Last session label displays maximum session number', () => {
    /**
     * **Validates: Requirements 20.3**
     *
     * For any non-empty set of periods where at least one has a defined sessionNumber,
     * the "Last session" label SHALL display a value equal to the maximum sessionNumber
     * across all periods.
     */

    it('getMaxSessionNumber returns the maximum sessionNumber across all periods', () => {
      const arbSessionNumbers = fc.array(fc.integer({ min: 1, max: 9999 }), { minLength: 1, maxLength: 20 });

      fc.assert(
        fc.property(arbSessionNumbers, (sessionNumbers) => {
          const expectedMax = Math.max(...sessionNumbers);
          const periods: DowntimePeriod[] = sessionNumbers.map((sn, i) => ({
            id: `p-${i}`,
            label: `Period ${i}`,
            slots: 1,
            entries: [],
            statusWarning: false,
            date: undefined,
            sessionNumber: sn,
          }));

          const maxSession = getMaxSessionNumber(periods);
          expect(maxSession).toBe(expectedMax);
        }),
        { numRuns: 100 }
      );
    });

    it('getMaxSessionNumber returns undefined when no periods have sessionNumber', () => {
      const arbPeriodNoSession = fc.record({
        id: fc.uuid(),
        label: fc.string({ minLength: 1, maxLength: 30 }),
        slots: fc.integer({ min: 1, max: 10 }),
        entries: fc.constant([]) as fc.Arbitrary<EndeavourEntry[]>,
        statusWarning: fc.boolean(),
        date: fc.constant(undefined) as fc.Arbitrary<string | undefined>,
        sessionNumber: fc.constant(undefined) as fc.Arbitrary<number | undefined>,
      });

      fc.assert(
        fc.property(
          fc.array(arbPeriodNoSession, { minLength: 1, maxLength: 20 }),
          (periods) => {
            const maxSession = getMaxSessionNumber(periods);
            expect(maxSession).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getMaxSessionNumber ignores periods without sessionNumber when finding max', () => {
      // Mix of periods with and without session numbers
      const arbSessionNumbers = fc.array(fc.integer({ min: 1, max: 9999 }), { minLength: 1, maxLength: 10 });
      const arbUndefinedCount = fc.integer({ min: 1, max: 10 });

      fc.assert(
        fc.property(arbSessionNumbers, arbUndefinedCount, (sessionNumbers, undefinedCount) => {
          const expectedMax = Math.max(...sessionNumbers);

          const periodsWithSession: DowntimePeriod[] = sessionNumbers.map((sn, i) => ({
            id: `with-${i}`,
            label: `Period ${i}`,
            slots: 1,
            entries: [],
            statusWarning: false,
            date: undefined,
            sessionNumber: sn,
          }));

          const periodsWithoutSession: DowntimePeriod[] = Array.from(
            { length: undefinedCount },
            (_, i) => ({
              id: `without-${i}`,
              label: `No Session ${i}`,
              slots: 1,
              entries: [],
              statusWarning: false,
              date: undefined,
              sessionNumber: undefined,
            })
          );

          // Interleave periods with and without session numbers
          const allPeriods = [...periodsWithoutSession, ...periodsWithSession, ...periodsWithoutSession];

          const maxSession = getMaxSessionNumber(allPeriods);
          expect(maxSession).toBe(expectedMax);
        }),
        { numRuns: 100 }
      );
    });
  });
});
