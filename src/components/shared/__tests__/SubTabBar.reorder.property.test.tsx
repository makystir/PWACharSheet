import { describe, it, expect, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { SubTabBar } from '../SubTabBar';

// Mock CSS modules
vi.mock('../SubTabBar.module.css', () => ({
  default: {
    subTabBar: 'subTabBar',
    tab: 'tab',
    tabActive: 'tabActive',
    editModeContainer: 'editModeContainer',
    editControls: 'editControls',
    editToggleBtn: 'editToggleBtn',
    resetBtn: 'resetBtn',
    arrowBtn: 'arrowBtn',
    arrowBtnDisabled: 'arrowBtnDisabled',
    tabEditMode: 'tabEditMode',
    tabLabel: 'tabLabel',
    tabMoving: 'tabMoving',
    srOnly: 'srOnly',
  },
}));

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generate an array of tabs with unique IDs and non-empty labels (2-8 tabs) */
const arbitraryTabs = fc.uniqueArray(
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 15 }).filter((s) => /^[a-z][a-z0-9-]*$/.test(s)),
    label: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0 && !s.includes('\n')),
  }),
  { minLength: 2, maxLength: 8, selector: (tab) => tab.id }
);

/** Generate tabs with a valid move index for moveLeft (index > 0) */
const tabsWithLeftMoveIndex = arbitraryTabs.chain((tabs) =>
  fc.record({
    tabs: fc.constant(tabs),
    moveIndex: fc.integer({ min: 1, max: tabs.length - 1 }),
  })
);

/** Generate tabs with a valid move index for moveRight (index < length - 1) */
const tabsWithRightMoveIndex = arbitraryTabs.chain((tabs) =>
  fc.record({
    tabs: fc.constant(tabs),
    moveIndex: fc.integer({ min: 0, max: tabs.length - 2 }),
  })
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderEditMode(tabs: { id: string; label: string }[], handlers?: {
  onMoveLeft?: (index: number) => void;
  onMoveRight?: (index: number) => void;
}) {
  const activeTab = tabs[0].id;
  return render(
    <SubTabBar
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={vi.fn()}
      editMode={{
        isActive: true,
        onToggle: vi.fn(),
        onMoveLeft: handlers?.onMoveLeft ?? vi.fn(),
        onMoveRight: handlers?.onMoveRight ?? vi.fn(),
        onReset: vi.fn(),
        isDefaultOrder: false,
        saveError: false,
      }}
    />
  );
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: reorderable-sub-tabs, Property 6: Boundary Arrows Disabled', () => {
  /**
   * **Validates: Requirements 3.4, 3.5, 7.6**
   *
   * For any non-empty tab list rendered in edit mode, the left-arrow button
   * on the first tab SHALL have aria-disabled="true" and the right-arrow
   * button on the last tab SHALL have aria-disabled="true".
   */
  it('first tab left-arrow and last tab right-arrow have aria-disabled="true"', () => {
    fc.assert(
      fc.property(arbitraryTabs, (tabs) => {
        cleanup();
        const { container } = renderEditMode(tabs);

        // First tab's left-arrow should be disabled
        const firstTabId = tabs[0].id;
        const firstLeftArrow = container.querySelector(
          `[data-tab-id="${firstTabId}"][data-direction="left"]`
        );
        expect(firstLeftArrow).not.toBeNull();
        expect(firstLeftArrow).toHaveAttribute('aria-disabled', 'true');

        // Last tab's right-arrow should be disabled
        const lastTabId = tabs[tabs.length - 1].id;
        const lastRightArrow = container.querySelector(
          `[data-tab-id="${lastTabId}"][data-direction="right"]`
        );
        expect(lastRightArrow).not.toBeNull();
        expect(lastRightArrow).toHaveAttribute('aria-disabled', 'true');

        // Middle tabs (if any) should NOT have their arrows disabled
        for (let i = 1; i < tabs.length - 1; i++) {
          const midLeftArrow = container.querySelector(
            `[data-tab-id="${tabs[i].id}"][data-direction="left"]`
          );
          const midRightArrow = container.querySelector(
            `[data-tab-id="${tabs[i].id}"][data-direction="right"]`
          );
          expect(midLeftArrow).not.toHaveAttribute('aria-disabled', 'true');
          expect(midRightArrow).not.toHaveAttribute('aria-disabled', 'true');
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: reorderable-sub-tabs, Property 7: Focus Follows Moved Tab', () => {
  /**
   * **Validates: Requirements 3.8, 7.5**
   *
   * For any tab moved via an arrow button (left or right), after the move
   * completes, document.activeElement SHALL be the same type of arrow button
   * (left or right) on that same tab in its new position.
   */
  it('after moveLeft, focus is on the left-arrow of the moved tab', () => {
    fc.assert(
      fc.property(tabsWithLeftMoveIndex, ({ tabs, moveIndex }) => {
        cleanup();
        // Track updated tabs after the move
        const updatedTabs = [...tabs];
        const onMoveLeft = vi.fn((index: number) => {
          // Swap elements to simulate the move
          const temp = updatedTabs[index];
          updatedTabs[index] = updatedTabs[index - 1];
          updatedTabs[index - 1] = temp;
        });

        const { container, rerender } = renderEditMode(tabs, { onMoveLeft });

        // Click the left-arrow on the tab at moveIndex
        const tabId = tabs[moveIndex].id;
        const leftArrow = container.querySelector(
          `[data-tab-id="${tabId}"][data-direction="left"]`
        ) as HTMLButtonElement;
        expect(leftArrow).not.toBeNull();

        fireEvent.click(leftArrow);
        expect(onMoveLeft).toHaveBeenCalledWith(moveIndex);

        // Re-render with the new tab order (simulating parent state update)
        rerender(
          <SubTabBar
            tabs={updatedTabs}
            activeTab={updatedTabs[0].id}
            onTabChange={vi.fn()}
            editMode={{
              isActive: true,
              onToggle: vi.fn(),
              onMoveLeft: vi.fn(),
              onMoveRight: vi.fn(),
              onReset: vi.fn(),
              isDefaultOrder: false,
              saveError: false,
            }}
          />
        );

        // Focus should be on the left-arrow button of the moved tab
        const focusedElement = document.activeElement as HTMLElement;
        expect(focusedElement).toHaveAttribute('data-tab-id', tabId);
        expect(focusedElement).toHaveAttribute('data-direction', 'left');
      }),
      { numRuns: 100 }
    );
  });

  it('after moveRight, focus is on the right-arrow of the moved tab', () => {
    fc.assert(
      fc.property(tabsWithRightMoveIndex, ({ tabs, moveIndex }) => {
        cleanup();
        const updatedTabs = [...tabs];
        const onMoveRight = vi.fn((index: number) => {
          const temp = updatedTabs[index];
          updatedTabs[index] = updatedTabs[index + 1];
          updatedTabs[index + 1] = temp;
        });

        const { container, rerender } = renderEditMode(tabs, { onMoveRight });

        // Click the right-arrow on the tab at moveIndex
        const tabId = tabs[moveIndex].id;
        const rightArrow = container.querySelector(
          `[data-tab-id="${tabId}"][data-direction="right"]`
        ) as HTMLButtonElement;
        expect(rightArrow).not.toBeNull();

        fireEvent.click(rightArrow);
        expect(onMoveRight).toHaveBeenCalledWith(moveIndex);

        // Re-render with new tab order
        rerender(
          <SubTabBar
            tabs={updatedTabs}
            activeTab={updatedTabs[0].id}
            onTabChange={vi.fn()}
            editMode={{
              isActive: true,
              onToggle: vi.fn(),
              onMoveLeft: vi.fn(),
              onMoveRight: vi.fn(),
              onReset: vi.fn(),
              isDefaultOrder: false,
              saveError: false,
            }}
          />
        );

        // Focus should be on the right-arrow button of the moved tab
        const focusedElement = document.activeElement as HTMLElement;
        expect(focusedElement).toHaveAttribute('data-tab-id', tabId);
        expect(focusedElement).toHaveAttribute('data-direction', 'right');
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: reorderable-sub-tabs, Property 13: Arrow Button Aria-Labels Contain Direction and Tab Label', () => {
  /**
   * **Validates: Requirements 7.1**
   *
   * For any tab list rendered in edit mode, each left-arrow button's aria-label
   * SHALL contain the word "left" and the tab's label text, and each right-arrow
   * button's aria-label SHALL contain the word "right" and the tab's label text.
   */
  it('each arrow button aria-label includes direction word and tab label', () => {
    fc.assert(
      fc.property(arbitraryTabs, (tabs) => {
        cleanup();
        const { container } = renderEditMode(tabs);

        for (const tab of tabs) {
          const leftArrow = container.querySelector(
            `[data-tab-id="${tab.id}"][data-direction="left"]`
          );
          const rightArrow = container.querySelector(
            `[data-tab-id="${tab.id}"][data-direction="right"]`
          );

          expect(leftArrow).not.toBeNull();
          expect(rightArrow).not.toBeNull();

          const leftLabel = leftArrow!.getAttribute('aria-label') || '';
          const rightLabel = rightArrow!.getAttribute('aria-label') || '';

          // Left arrow label contains "left" (case-insensitive) and tab label
          expect(leftLabel.toLowerCase()).toContain('left');
          expect(leftLabel).toContain(tab.label);

          // Right arrow label contains "right" (case-insensitive) and tab label
          expect(rightLabel.toLowerCase()).toContain('right');
          expect(rightLabel).toContain(tab.label);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: reorderable-sub-tabs, Property 14: Move Announcements via Aria-Live', () => {
  /**
   * **Validates: Requirements 7.2**
   *
   * For any tab move operation, the aria-live region SHALL contain text that
   * includes the moved tab's label and its new 1-based numeric position.
   */
  it('aria-live region contains tab label and new position after moveLeft', () => {
    fc.assert(
      fc.property(tabsWithLeftMoveIndex, ({ tabs, moveIndex }) => {
        cleanup();
        const updatedTabs = [...tabs];
        const onMoveLeft = vi.fn((index: number) => {
          const temp = updatedTabs[index];
          updatedTabs[index] = updatedTabs[index - 1];
          updatedTabs[index - 1] = temp;
        });

        const { container, rerender } = renderEditMode(tabs, { onMoveLeft });

        const tabId = tabs[moveIndex].id;
        const tabLabel = tabs[moveIndex].label;
        const leftArrow = container.querySelector(
          `[data-tab-id="${tabId}"][data-direction="left"]`
        ) as HTMLButtonElement;

        fireEvent.click(leftArrow);

        // Re-render with updated tabs
        rerender(
          <SubTabBar
            tabs={updatedTabs}
            activeTab={updatedTabs[0].id}
            onTabChange={vi.fn()}
            editMode={{
              isActive: true,
              onToggle: vi.fn(),
              onMoveLeft: vi.fn(),
              onMoveRight: vi.fn(),
              onReset: vi.fn(),
              isDefaultOrder: false,
              saveError: false,
            }}
          />
        );

        // Find aria-live region
        const liveRegion = container.querySelector('[aria-live="polite"]');
        expect(liveRegion).not.toBeNull();
        const liveText = liveRegion!.textContent || '';

        // Should contain the tab's label
        expect(liveText).toContain(tabLabel);

        // New position is moveIndex (0-based, moved left by 1) → 1-based = moveIndex
        const newPosition = moveIndex; // was at moveIndex, moved left → now at moveIndex-1 (0-based) → moveIndex (1-based)
        expect(liveText).toContain(String(newPosition));
      }),
      { numRuns: 100 }
    );
  });

  it('aria-live region contains tab label and new position after moveRight', () => {
    fc.assert(
      fc.property(tabsWithRightMoveIndex, ({ tabs, moveIndex }) => {
        cleanup();
        const updatedTabs = [...tabs];
        const onMoveRight = vi.fn((index: number) => {
          const temp = updatedTabs[index];
          updatedTabs[index] = updatedTabs[index + 1];
          updatedTabs[index + 1] = temp;
        });

        const { container, rerender } = renderEditMode(tabs, { onMoveRight });

        const tabId = tabs[moveIndex].id;
        const tabLabel = tabs[moveIndex].label;
        const rightArrow = container.querySelector(
          `[data-tab-id="${tabId}"][data-direction="right"]`
        ) as HTMLButtonElement;

        fireEvent.click(rightArrow);

        // Re-render with updated tabs
        rerender(
          <SubTabBar
            tabs={updatedTabs}
            activeTab={updatedTabs[0].id}
            onTabChange={vi.fn()}
            editMode={{
              isActive: true,
              onToggle: vi.fn(),
              onMoveLeft: vi.fn(),
              onMoveRight: vi.fn(),
              onReset: vi.fn(),
              isDefaultOrder: false,
              saveError: false,
            }}
          />
        );

        // Find aria-live region
        const liveRegion = container.querySelector('[aria-live="polite"]');
        expect(liveRegion).not.toBeNull();
        const liveText = liveRegion!.textContent || '';

        // Should contain the tab's label
        expect(liveText).toContain(tabLabel);

        // New position is moveIndex + 2 (1-based: was at moveIndex+1, now at moveIndex+2)
        const newPosition = moveIndex + 2;
        expect(liveText).toContain(String(newPosition));
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: reorderable-sub-tabs, Property 15: DOM Focus Order Matches Visual Display Order', () => {
  /**
   * **Validates: Requirements 7.7**
   *
   * For any tab order in edit mode, the DOM sequence of focusable tab-related
   * elements SHALL match the current visual display order of the tabs.
   */
  it('focusable elements appear in DOM order matching visual tab order', () => {
    fc.assert(
      fc.property(arbitraryTabs, (tabs) => {
        cleanup();
        const { container } = renderEditMode(tabs);

        // Get all buttons with data-tab-id (arrow buttons) in DOM order
        const arrowButtons = Array.from(
          container.querySelectorAll<HTMLElement>('[data-tab-id]')
        );

        // Extract the tab IDs in DOM order (each tab has left-arrow, then right-arrow)
        // So we expect pairs: [tab0-left, tab0-right, tab1-left, tab1-right, ...]
        const tabIdsInDomOrder: string[] = [];
        for (const btn of arrowButtons) {
          const tabId = btn.getAttribute('data-tab-id')!;
          if (!tabIdsInDomOrder.includes(tabId)) {
            tabIdsInDomOrder.push(tabId);
          }
        }

        // The order of unique tab IDs from DOM should match the visual (input) order
        const expectedOrder = tabs.map((t) => t.id);
        expect(tabIdsInDomOrder).toEqual(expectedOrder);

        // Additionally verify that tab role buttons (labels) are in order
        const tabRoleButtons = container.querySelectorAll('[role="tab"]');
        const tabRoleIds: string[] = [];
        tabRoleButtons.forEach((btn) => {
          const text = btn.textContent || '';
          const matchingTab = tabs.find((t) => t.label === text);
          if (matchingTab && !tabRoleIds.includes(matchingTab.id)) {
            tabRoleIds.push(matchingTab.id);
          }
        });

        expect(tabRoleIds).toEqual(expectedOrder);
      }),
      { numRuns: 100 }
    );
  });
});
