import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SubTabBar } from '../SubTabBar';

// Mock CSS modules with class names matching the real module
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

const baseTabs = [
  { id: 'identity', label: 'Identity' },
  { id: 'abilities', label: 'Abilities' },
  { id: 'gear', label: 'Gear & Wealth' },
  { id: 'notes', label: 'Notes' },
];

function makeEditMode(overrides: Partial<NonNullable<Parameters<typeof SubTabBar>[0]['editMode']>> = {}) {
  return {
    isActive: false,
    onToggle: vi.fn(),
    onMoveLeft: vi.fn(),
    onMoveRight: vi.fn(),
    onReset: vi.fn(),
    isDefaultOrder: true,
    saveError: false,
    ...overrides,
  };
}

describe('SubTabBar edit mode', () => {
  /**
   * Validates: Requirements 2.1, 7.3
   * Toggle button rendering and icon switch
   */
  describe('toggle button rendering and icon switch', () => {
    it('renders "Edit tab order" aria-label when edit mode is inactive', () => {
      render(
        <SubTabBar
          tabs={baseTabs}
          activeTab="identity"
          onTabChange={vi.fn()}
          editMode={makeEditMode({ isActive: false })}
        />
      );

      const toggleBtn = screen.getByLabelText('Edit tab order');
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn.tagName).toBe('BUTTON');
    });

    it('renders "Done editing tab order" aria-label when edit mode is active', () => {
      render(
        <SubTabBar
          tabs={baseTabs}
          activeTab="identity"
          onTabChange={vi.fn()}
          editMode={makeEditMode({ isActive: true })}
        />
      );

      const toggleBtn = screen.getByLabelText('Done editing tab order');
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn.tagName).toBe('BUTTON');
    });

    it('calls onToggle when the toggle button is clicked', () => {
      const onToggle = vi.fn();
      render(
        <SubTabBar
          tabs={baseTabs}
          activeTab="identity"
          onTabChange={vi.fn()}
          editMode={makeEditMode({ isActive: false, onToggle })}
        />
      );

      fireEvent.click(screen.getByLabelText('Edit tab order'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Validates: Requirements 4.1, 4.5, 4.6
   * Reset button disabled state and announcement
   */
  describe('reset button disabled state and announcement', () => {
    it('reset button is disabled when isDefaultOrder is true', () => {
      render(
        <SubTabBar
          tabs={baseTabs}
          activeTab="identity"
          onTabChange={vi.fn()}
          editMode={makeEditMode({ isActive: true, isDefaultOrder: true })}
        />
      );

      const resetBtn = screen.getByLabelText('Reset tab order');
      expect(resetBtn).toBeDisabled();
    });

    it('reset button is enabled when isDefaultOrder is false', () => {
      render(
        <SubTabBar
          tabs={baseTabs}
          activeTab="identity"
          onTabChange={vi.fn()}
          editMode={makeEditMode({ isActive: true, isDefaultOrder: false })}
        />
      );

      const resetBtn = screen.getByLabelText('Reset tab order');
      expect(resetBtn).not.toBeDisabled();
    });

    it('clicking reset announces "Tab order reset to default" via aria-live region', () => {
      const onReset = vi.fn();
      render(
        <SubTabBar
          tabs={baseTabs}
          activeTab="identity"
          onTabChange={vi.fn()}
          editMode={makeEditMode({ isActive: true, isDefaultOrder: false, onReset })}
        />
      );

      const resetBtn = screen.getByLabelText('Reset tab order');
      fireEvent.click(resetBtn);

      expect(onReset).toHaveBeenCalledTimes(1);

      // Verify the aria-live region shows the reset announcement
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion!.textContent).toBe('Tab order reset to default');
    });
  });

  /**
   * Validates: Requirements 3.7
   * Animation class presence on tab wrappers in edit mode
   */
  describe('animation class presence on moved tabs', () => {
    it('tabEditMode class (with CSS transition) is present on tab wrappers in edit mode', () => {
      render(
        <SubTabBar
          tabs={baseTabs}
          activeTab="identity"
          onTabChange={vi.fn()}
          editMode={makeEditMode({ isActive: true })}
        />
      );

      // In edit mode, tabs are wrapped in divs with the tabEditMode class
      const tabWrappers = document.querySelectorAll('.tabEditMode');
      expect(tabWrappers).toHaveLength(baseTabs.length);
    });

    it('tabEditMode class is NOT present when edit mode is inactive', () => {
      render(
        <SubTabBar
          tabs={baseTabs}
          activeTab="identity"
          onTabChange={vi.fn()}
          editMode={makeEditMode({ isActive: false })}
        />
      );

      const tabWrappers = document.querySelectorAll('.tabEditMode');
      expect(tabWrappers).toHaveLength(0);
    });
  });

  /**
   * Validates: Requirements 2.2, 4.6
   * 44px touch targets at mobile viewport via CSS module classes
   *
   * Note: jsdom cannot compute actual pixel dimensions from CSS.
   * We verify the correct CSS module classes are applied, which in the real
   * CSS module have mobile media queries ensuring ≥44px touch targets.
   */
  describe('44px touch targets via CSS module classes', () => {
    it('editToggleBtn class is applied to the toggle button', () => {
      render(
        <SubTabBar
          tabs={baseTabs}
          activeTab="identity"
          onTabChange={vi.fn()}
          editMode={makeEditMode({ isActive: true })}
        />
      );

      const toggleBtn = screen.getByLabelText('Done editing tab order');
      expect(toggleBtn.className).toContain('editToggleBtn');
    });

    it('resetBtn class is applied to the reset button', () => {
      render(
        <SubTabBar
          tabs={baseTabs}
          activeTab="identity"
          onTabChange={vi.fn()}
          editMode={makeEditMode({ isActive: true })}
        />
      );

      const resetBtn = screen.getByLabelText('Reset tab order');
      expect(resetBtn.className).toContain('resetBtn');
    });

    it('arrowBtn class is applied to enabled arrow buttons', () => {
      render(
        <SubTabBar
          tabs={baseTabs}
          activeTab="identity"
          onTabChange={vi.fn()}
          editMode={makeEditMode({ isActive: true })}
        />
      );

      // The second tab (index 1) should have both arrows enabled
      const moveLeftBtn = screen.getByLabelText('Move Abilities tab left');
      expect(moveLeftBtn.className).toContain('arrowBtn');
    });

    it('arrowBtnDisabled class is applied to boundary arrow buttons', () => {
      render(
        <SubTabBar
          tabs={baseTabs}
          activeTab="identity"
          onTabChange={vi.fn()}
          editMode={makeEditMode({ isActive: true })}
        />
      );

      // First tab's left arrow should be disabled
      const moveLeftFirst = screen.getByLabelText('Move Identity tab left');
      expect(moveLeftFirst.className).toContain('arrowBtnDisabled');

      // Last tab's right arrow should be disabled
      const moveRightLast = screen.getByLabelText('Move Notes tab right');
      expect(moveRightLast.className).toContain('arrowBtnDisabled');
    });
  });
});
