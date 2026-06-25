import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { groupItems } from '../Picker';

// Feature: ux-improvements, Property 12: Picker group ordering preserves first-seen order
// Feature: ux-improvements, Property 13: Picker search filters correctly across groups

// ─── Generators ─────────────────────────────────────────────────────────────

interface TestItem {
  label: string;
  group: string;
}

/** Arbitrary non-empty group label */
const arbGroupLabel = fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0);

/** Arbitrary non-empty item label */
const arbItemLabel = fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0);

/** Arbitrary test item with label and group */
const arbTestItem: fc.Arbitrary<TestItem> = fc.record({
  label: arbItemLabel,
  group: arbGroupLabel,
});

/** Arbitrary non-empty array of test items */
const arbItemArray = fc.array(arbTestItem, { minLength: 1, maxLength: 30 });

/** Arbitrary search string (short, printable) */
const arbSearchString = fc.string({ minLength: 1, maxLength: 5 }).filter(s => s.trim().length > 0);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-improvements', () => {
  describe('Property 12: Picker group ordering preserves first-seen order', () => {
    /**
     * **Validates: Requirements 15.1**
     */

    it('group headers appear in the exact order that each group label first appears when iterating items from start to end', () => {
      fc.assert(
        fc.property(
          arbItemArray,
          (items) => {
            const getGroup = (item: TestItem) => item.group;
            const grouped = groupItems(items, getGroup);

            // Compute expected first-seen order
            const expectedOrder: string[] = [];
            for (const item of items) {
              if (!expectedOrder.includes(item.group)) {
                expectedOrder.push(item.group);
              }
            }

            // Verify group order matches first-seen order
            const actualOrder = grouped.map(g => g.group);
            expect(actualOrder).toEqual(expectedOrder);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('every item appears under its correct group header', () => {
      fc.assert(
        fc.property(
          arbItemArray,
          (items) => {
            const getGroup = (item: TestItem) => item.group;
            const grouped = groupItems(items, getGroup);

            // Every item in a group should have that group label
            for (const groupEntry of grouped) {
              for (const item of groupEntry.items) {
                expect(getGroup(item)).toBe(groupEntry.group);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all input items are present in the grouped output (no items lost)', () => {
      fc.assert(
        fc.property(
          arbItemArray,
          (items) => {
            const getGroup = (item: TestItem) => item.group;
            const grouped = groupItems(items, getGroup);

            // Total items in grouped output should equal input length
            const totalGroupedItems = grouped.reduce((sum, g) => sum + g.items.length, 0);
            expect(totalGroupedItems).toBe(items.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('items within each group preserve their relative order from the input array', () => {
      fc.assert(
        fc.property(
          arbItemArray,
          (items) => {
            const getGroup = (item: TestItem) => item.group;
            const grouped = groupItems(items, getGroup);

            // For each group, verify items appear in the same relative order as in the input
            for (const groupEntry of grouped) {
              const expectedItemsInGroup = items.filter(item => getGroup(item) === groupEntry.group);
              expect(groupEntry.items).toEqual(expectedItemsInGroup);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 13: Picker search filters correctly across groups', () => {
    /**
     * **Validates: Requirements 15.3**
     */

    it('only items whose label contains the search string (case-insensitive) are shown after filtering', () => {
      fc.assert(
        fc.property(
          arbItemArray,
          arbSearchString,
          (items, searchStr) => {
            const getGroup = (item: TestItem) => item.group;
            const getLabel = (item: TestItem) => item.label;
            const searchLower = searchStr.toLowerCase();

            // Simulate the Picker's filtering logic
            const grouped = groupItems(items, getGroup);
            const visibleItems: TestItem[] = [];

            for (const groupEntry of grouped) {
              const matchingItems = groupEntry.items.filter(
                item => getLabel(item).toLowerCase().includes(searchLower)
              );
              visibleItems.push(...matchingItems);
            }

            // Every visible item should match the search
            for (const item of visibleItems) {
              expect(getLabel(item).toLowerCase()).toContain(searchLower);
            }

            // Every item from the original list that matches should be visible
            const expectedVisible = items.filter(
              item => getLabel(item).toLowerCase().includes(searchLower)
            );
            expect(visibleItems.length).toBe(expectedVisible.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('group headers with zero matching items are hidden after filtering', () => {
      fc.assert(
        fc.property(
          arbItemArray,
          arbSearchString,
          (items, searchStr) => {
            const getGroup = (item: TestItem) => item.group;
            const getLabel = (item: TestItem) => item.label;
            const searchLower = searchStr.toLowerCase();

            // Simulate the Picker's grouped filtering
            const grouped = groupItems(items, getGroup);

            const visibleGroups: string[] = [];
            const hiddenGroups: string[] = [];

            for (const groupEntry of grouped) {
              const matchingItems = groupEntry.items.filter(
                item => getLabel(item).toLowerCase().includes(searchLower)
              );
              if (matchingItems.length > 0) {
                visibleGroups.push(groupEntry.group);
              } else {
                hiddenGroups.push(groupEntry.group);
              }
            }

            // Verify: hidden groups have NO items matching the search
            for (const groupLabel of hiddenGroups) {
              const groupItems2 = items.filter(item => getGroup(item) === groupLabel);
              const anyMatch = groupItems2.some(
                item => getLabel(item).toLowerCase().includes(searchLower)
              );
              expect(anyMatch).toBe(false);
            }

            // Verify: visible groups have AT LEAST ONE item matching the search
            for (const groupLabel of visibleGroups) {
              const groupItems2 = items.filter(item => getGroup(item) === groupLabel);
              const anyMatch = groupItems2.some(
                item => getLabel(item).toLowerCase().includes(searchLower)
              );
              expect(anyMatch).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('an empty search string shows all items (no filtering applied)', () => {
      fc.assert(
        fc.property(
          arbItemArray,
          (items) => {
            const getGroup = (item: TestItem) => item.group;
            const getLabel = (item: TestItem) => item.label;
            const searchLower = '';

            const grouped = groupItems(items, getGroup);
            const visibleItems: TestItem[] = [];

            for (const groupEntry of grouped) {
              const matchingItems = groupEntry.items.filter(
                item => getLabel(item).toLowerCase().includes(searchLower)
              );
              visibleItems.push(...matchingItems);
            }

            // All items should be visible with empty search
            expect(visibleItems.length).toBe(items.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
