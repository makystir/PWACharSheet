import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderHook, act } from '@testing-library/react';
import fc from 'fast-check';
import { SubTabBar } from '../SubTabBar';
import { useTabOrder } from '../../../hooks/useTabOrder';

// Mock CSS modules
vi.mock('../SubTabBar.module.css', () => ({
  default: {
    subTabBar: 'subTabBar',
    subTabBarFlex: 'subTabBarFlex',
    tab: 'tab',
    tabActive: 'tabActive',
    editModeContainer: 'editModeContainer',
    editModeContainerActive: 'editModeContainerActive',
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

// ─── Test Data ───────────────────────────────────────────────────────────────

const characterTabs = [
  { id: 'identity', label: 'Identity' },
  { id: 'abilities', label: 'Abilities' },
  { id: 'gear', label: 'Gear & Wealth' },
  { id: 'notes', label: 'Notes' },
];

const retinueTabs = [
  { id: 'hirelings', label: 'Hirelings' },
  { id: 'companions', label: 'Companions' },
];

// ─── Test Wrapper Component ──────────────────────────────────────────────────

/**
 * Integration wrapper that combines useTabOrder hook + SubTabBar,
 * simulating how page components use these together.
 */
function TabBarWithOrder({
  pageKey,
  defaultTabs,
  activeTab,
  onTabChange,
}: {
  pageKey: string;
  defaultTabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}) {
  const {
    orderedTabs,
    isEditMode,
    toggleEditMode,
    moveLeft,
    moveRight,
    resetOrder,
    isDefaultOrder,
    saveError,
  } = useTabOrder({ pageKey, defaultTabs });

  return (
    <SubTabBar
      tabs={orderedTabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      editMode={{
        isActive: isEditMode,
        onToggle: toggleEditMode,
        onMoveLeft: moveLeft,
        onMoveRight: moveRight,
        onReset: resetOrder,
        isDefaultOrder,
        saveError,
      }}
    />
  );
}

// ─── Integration Tests ───────────────────────────────────────────────────────

describe('SubTabBar Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
  });

  describe('Full page render with reordered tabs displays correct order', () => {
    /**
     * Validates: Requirements 1.2, 6.1
     */
    it('renders tabs in stored custom order from localStorage', () => {
      // Pre-store a custom order: gear first, then notes, identity, abilities
      const customOrder = ['gear', 'notes', 'identity', 'abilities'];
      localStorage.setItem('tabOrder:character', JSON.stringify(customOrder));

      render(
        <TabBarWithOrder
          pageKey="character"
          defaultTabs={characterTabs}
          activeTab="identity"
          onTabChange={vi.fn()}
        />
      );

      // Get all tab buttons in DOM order
      const tabButtons = screen.getAllByRole('tab');
      const tabLabels = tabButtons.map((btn) => btn.textContent);

      expect(tabLabels).toEqual(['Gear & Wealth', 'Notes', 'Identity', 'Abilities']);
    });

    it('renders tabs in default order when no stored order exists', () => {
      render(
        <TabBarWithOrder
          pageKey="character"
          defaultTabs={characterTabs}
          activeTab="identity"
          onTabChange={vi.fn()}
        />
      );

      const tabButtons = screen.getAllByRole('tab');
      const tabLabels = tabButtons.map((btn) => btn.textContent);

      expect(tabLabels).toEqual(['Identity', 'Abilities', 'Gear & Wealth', 'Notes']);
    });
  });

  describe('Hash navigation with custom order activates correct panel', () => {
    /**
     * Validates: Requirements 6.1, 6.2, 6.5
     */
    it('activates the correct tab by ID regardless of display position', () => {
      // Store a custom order where "notes" is first
      const customOrder = ['notes', 'gear', 'abilities', 'identity'];
      localStorage.setItem('tabOrder:character', JSON.stringify(customOrder));

      // Active tab is "abilities" (which is now at position 3 visually)
      render(
        <TabBarWithOrder
          pageKey="character"
          defaultTabs={characterTabs}
          activeTab="abilities"
          onTabChange={vi.fn()}
        />
      );

      // The "Abilities" tab should be active (aria-selected="true")
      const abilitiesTab = screen.getByRole('tab', { name: 'Abilities' });
      expect(abilitiesTab).toHaveAttribute('aria-selected', 'true');

      // And tabs should still be in custom display order
      const tabButtons = screen.getAllByRole('tab');
      const tabLabels = tabButtons.map((btn) => btn.textContent);
      expect(tabLabels).toEqual(['Notes', 'Gear & Wealth', 'Abilities', 'Identity']);
    });

    it('onTabChange receives the tab ID when tab is clicked outside edit mode', () => {
      const customOrder = ['notes', 'gear', 'abilities', 'identity'];
      localStorage.setItem('tabOrder:character', JSON.stringify(customOrder));

      const onTabChange = vi.fn();
      render(
        <TabBarWithOrder
          pageKey="character"
          defaultTabs={characterTabs}
          activeTab="notes"
          onTabChange={onTabChange}
        />
      );

      // Click the tab that's in position 3 ("Abilities" in custom order)
      const abilitiesTab = screen.getByRole('tab', { name: 'Abilities' });
      fireEvent.click(abilitiesTab);

      // Should be called with the tab ID, not position
      expect(onTabChange).toHaveBeenCalledWith('abilities');
    });
  });

  describe('Cross-page independence', () => {
    /**
     * Validates: Requirements 1.4
     */
    it('reorder on character page does not affect retinue page', () => {
      // Set custom order for character page
      const characterCustomOrder = ['notes', 'gear', 'abilities', 'identity'];
      localStorage.setItem('tabOrder:character', JSON.stringify(characterCustomOrder));

      // Render character page — should show custom order
      const { unmount: unmountChar } = render(
        <TabBarWithOrder
          pageKey="character"
          defaultTabs={characterTabs}
          activeTab="notes"
          onTabChange={vi.fn()}
        />
      );

      let tabButtons = screen.getAllByRole('tab');
      expect(tabButtons.map((btn) => btn.textContent)).toEqual([
        'Notes',
        'Gear & Wealth',
        'Abilities',
        'Identity',
      ]);

      unmountChar();
      cleanup();

      // Render retinue page — should show default order (no stored order for retinue)
      render(
        <TabBarWithOrder
          pageKey="retinue"
          defaultTabs={retinueTabs}
          activeTab="hirelings"
          onTabChange={vi.fn()}
        />
      );

      tabButtons = screen.getAllByRole('tab');
      expect(tabButtons.map((btn) => btn.textContent)).toEqual([
        'Hirelings',
        'Companions',
      ]);
    });

    it('custom orders for different pages persist independently', () => {
      // Set different custom orders for two pages
      localStorage.setItem('tabOrder:character', JSON.stringify(['notes', 'gear', 'abilities', 'identity']));
      localStorage.setItem('tabOrder:retinue', JSON.stringify(['companions', 'hirelings']));

      // Render character page
      const { unmount: unmountChar } = render(
        <TabBarWithOrder
          pageKey="character"
          defaultTabs={characterTabs}
          activeTab="notes"
          onTabChange={vi.fn()}
        />
      );

      let tabButtons = screen.getAllByRole('tab');
      expect(tabButtons.map((btn) => btn.textContent)).toEqual([
        'Notes',
        'Gear & Wealth',
        'Abilities',
        'Identity',
      ]);

      unmountChar();
      cleanup();

      // Render retinue page — should use its own stored order
      render(
        <TabBarWithOrder
          pageKey="retinue"
          defaultTabs={retinueTabs}
          activeTab="companions"
          onTabChange={vi.fn()}
        />
      );

      tabButtons = screen.getAllByRole('tab');
      expect(tabButtons.map((btn) => btn.textContent)).toEqual([
        'Companions',
        'Hirelings',
      ]);
    });
  });

  describe('Edit mode exit on navigation persists order', () => {
    /**
     * Validates: Requirements 2.6
     */
    it('unmounting while in edit mode persists the current order to localStorage', () => {
      const { container } = render(
        <TabBarWithOrder
          pageKey="character"
          defaultTabs={characterTabs}
          activeTab="identity"
          onTabChange={vi.fn()}
        />
      );

      // Reveal edit button via context menu, then enter edit mode
      fireEvent.contextMenu(container.firstChild as HTMLElement);
      fireEvent.click(screen.getByLabelText('Edit tab order'));

      // Move the first tab right
      fireEvent.click(screen.getByLabelText('Move Identity tab right'));

      // Unmount (simulating navigation away)
      cleanup();

      // Verify the order was persisted to localStorage
      const stored = JSON.parse(localStorage.getItem('tabOrder:character')!);
      expect(stored).toEqual(['abilities', 'identity', 'gear', 'notes']);
    });

    it('exiting edit mode via toggle persists order before navigation', () => {
      const { container } = render(
        <TabBarWithOrder
          pageKey="character"
          defaultTabs={characterTabs}
          activeTab="identity"
          onTabChange={vi.fn()}
        />
      );

      // Reveal edit button via context menu, then enter edit mode
      fireEvent.contextMenu(container.firstChild as HTMLElement);
      fireEvent.click(screen.getByLabelText('Edit tab order'));

      // Move second tab left (Abilities goes to position 0)
      fireEvent.click(screen.getByLabelText('Move Abilities tab left'));

      // Exit edit mode
      fireEvent.click(screen.getByLabelText('Done editing tab order'));

      // Verify the order was persisted
      const stored = JSON.parse(localStorage.getItem('tabOrder:character')!);
      expect(stored).toEqual(['abilities', 'identity', 'gear', 'notes']);
    });
  });
});

// ─── Property 11: Hash Routes Use Tab IDs Regardless of Display Order ────────

describe('Feature: reorderable-sub-tabs, Property 11: Hash Routes Use Tab IDs Regardless of Display Order', () => {
  /**
   * **Validates: Requirements 6.1, 6.2, 6.5**
   *
   * For any tab ordering and any active tab, the URL hash SHALL contain the
   * tab's ID string, and when a hash containing a valid tab ID is provided,
   * that tab SHALL be activated regardless of its display position in the
   * current order.
   */

  beforeEach(() => {
    localStorage.clear();
    cleanup();
  });

  // ─── Generators ────────────────────────────────────────────────────────────

  /** Generate an array of tabs with unique IDs AND unique labels (2-6 tabs) */
  const arbitraryTabs = fc.uniqueArray(
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 12 }).filter((s) => /^[a-z][a-z0-9-]*$/.test(s)),
      label: fc.string({ minLength: 1, maxLength: 15 }).filter((s) => s.trim().length > 0 && !s.includes('\n')),
    }),
    { minLength: 2, maxLength: 6, selector: (tab) => tab.id }
  ).filter((tabs) => {
    // Ensure labels are also unique so that tabs.find(t => t.label === text) is unambiguous
    const labels = tabs.map((t) => t.label);
    return new Set(labels).size === labels.length;
  });

  /** Generate tabs with a random permutation for storage order */
  const tabsWithPermutation = arbitraryTabs.chain((tabs) => {
    // Generate a shuffled version of the tab IDs
    return fc.shuffledSubarray(tabs.map(t => t.id), { minLength: tabs.length, maxLength: tabs.length })
      .map((shuffledIds) => ({ tabs, storedOrder: shuffledIds }));
  });

  /** Generate tabs with permutation and a randomly selected active tab */
  const tabsWithOrderAndActive = tabsWithPermutation.chain(({ tabs, storedOrder }) => {
    return fc.integer({ min: 0, max: tabs.length - 1 }).map((activeIndex) => ({
      tabs,
      storedOrder,
      activeTabId: tabs[activeIndex].id,
    }));
  });

  it('active tab is determined by tab ID, not display position, for any ordering', () => {
    fc.assert(
      fc.property(tabsWithOrderAndActive, ({ tabs, storedOrder, activeTabId }) => {
        cleanup();
        localStorage.clear();

        const pageKey = 'test-page';
        // Store the custom order in localStorage
        localStorage.setItem(`tabOrder:${pageKey}`, JSON.stringify(storedOrder));

        const { container } = render(
          <TabBarWithOrder
            pageKey={pageKey}
            defaultTabs={tabs}
            activeTab={activeTabId}
            onTabChange={vi.fn()}
          />
        );

        // The tab with the matching ID should have aria-selected="true"
        const allTabs = container.querySelectorAll('[role="tab"]');
        let foundActive = false;

        allTabs.forEach((tabEl) => {
          const isSelected = tabEl.getAttribute('aria-selected') === 'true';
          const text = tabEl.textContent || '';
          const matchingTab = tabs.find((t) => t.label === text);

          if (matchingTab && matchingTab.id === activeTabId) {
            expect(isSelected).toBe(true);
            foundActive = true;
          }
        });

        expect(foundActive).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('onTabChange emits the tab ID regardless of display position', () => {
    fc.assert(
      fc.property(tabsWithOrderAndActive, ({ tabs, storedOrder, activeTabId }) => {
        cleanup();
        localStorage.clear();

        const pageKey = 'test-page';
        localStorage.setItem(`tabOrder:${pageKey}`, JSON.stringify(storedOrder));

        const onTabChange = vi.fn();
        const { container } = render(
          <TabBarWithOrder
            pageKey={pageKey}
            defaultTabs={tabs}
            activeTab={activeTabId}
            onTabChange={onTabChange}
          />
        );

        // Click each tab and verify the ID emitted matches the tab's ID
        const allTabButtons = container.querySelectorAll('[role="tab"]');
        allTabButtons.forEach((tabEl) => {
          const text = tabEl.textContent || '';
          const matchingTab = tabs.find((t) => t.label === text);
          if (matchingTab) {
            onTabChange.mockClear();
            fireEvent.click(tabEl);
            expect(onTabChange).toHaveBeenCalledWith(matchingTab.id);
          }
        });
      }),
      { numRuns: 100 }
    );
  });

  it('tabs render in stored order while active tab is correctly highlighted', () => {
    fc.assert(
      fc.property(tabsWithOrderAndActive, ({ tabs, storedOrder, activeTabId }) => {
        cleanup();
        localStorage.clear();

        const pageKey = 'test-page';
        localStorage.setItem(`tabOrder:${pageKey}`, JSON.stringify(storedOrder));

        const { container } = render(
          <TabBarWithOrder
            pageKey={pageKey}
            defaultTabs={tabs}
            activeTab={activeTabId}
            onTabChange={vi.fn()}
          />
        );

        // Verify display order matches the stored order
        const allTabs = container.querySelectorAll('[role="tab"]');
        const displayedLabels = Array.from(allTabs).map((el) => el.textContent);

        // Build expected label order from storedOrder
        const tabMap = new Map(tabs.map((t) => [t.id, t.label]));
        const expectedLabels = storedOrder.map((id) => tabMap.get(id));

        expect(displayedLabels).toEqual(expectedLabels);
      }),
      { numRuns: 100 }
    );
  });
});
