import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { SubTabBar } from '../SubTabBar';

// Mock CSS modules
vi.mock('../SubTabBar.module.css', () => ({
  default: {
    subTabBar: 'subTabBar',
    tab: 'tab',
    tabActive: 'tabActive',
  },
}));

// Feature: ux-improvements, Property 10: SubTabBar invokes callback with correct tab id
describe('SubTabBar Property Tests', () => {
  /**
   * Property 10: SubTabBar invokes callback with correct tab id
   * **Validates: Requirements 13.2**
   *
   * For any array of tab definitions and any selected tab index,
   * clicking that tab SHALL invoke the onTabChange callback with
   * exactly the id string of the clicked tab.
   */
  describe('Property 10: SubTabBar invokes callback with correct tab id', () => {
    it('clicking any tab invokes onTabChange with that tab id', () => {
      // Generate arrays of tab definitions with unique ids and valid labels
      const tabsArb = fc.uniqueArray(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
          label: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        }),
        { minLength: 1, maxLength: 10, selector: (tab) => tab.id }
      );

      // Generate a tabs array and a valid index into it
      const tabsWithIndexArb = tabsArb.chain((tabs) =>
        fc.record({
          tabs: fc.constant(tabs),
          clickIndex: fc.integer({ min: 0, max: tabs.length - 1 }),
        })
      );

      fc.assert(
        fc.property(tabsWithIndexArb, ({ tabs, clickIndex }) => {
          cleanup();
          const onTabChange = vi.fn();
          const activeTab = tabs[0].id;

          render(
            <SubTabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
          );

          // Find all tab buttons and click the one at clickIndex
          const tabButtons = screen.getAllByRole('tab');
          expect(tabButtons).toHaveLength(tabs.length);

          fireEvent.click(tabButtons[clickIndex]);

          // Assert onTabChange was called with the exact id of the clicked tab
          expect(onTabChange).toHaveBeenCalledTimes(1);
          expect(onTabChange).toHaveBeenCalledWith(tabs[clickIndex].id);
        }),
        { numRuns: 100 }
      );
    });
  });
});
