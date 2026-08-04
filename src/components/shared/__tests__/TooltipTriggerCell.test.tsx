import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TooltipTriggerCell } from '../TooltipTriggerCell';
import type { TooltipTriggerCellProps } from '../TooltipTriggerCell';

/**
 * Unit tests for TooltipTriggerCell interaction behaviour.
 * Validates: Requirements 6.1, 6.2, 6.4, 6.5
 */

function renderCell(overrides: Partial<TooltipTriggerCellProps> = {}) {
  const defaultProps: TooltipTriggerCellProps = {
    tooltipId: 'tooltip-test-1',
    displayValue: 42,
    isTooltipOpen: false,
    onOpen: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<TooltipTriggerCell {...defaultProps} />), props: defaultProps };
}

describe('TooltipTriggerCell', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Requirement 6.2: Click opens tooltip immediately ───

  describe('click interaction (Req 6.2)', () => {
    it('calls onOpen with anchor element on click', () => {
      const { props } = renderCell();
      const cell = screen.getByRole('button');
      fireEvent.click(cell);
      expect(props.onOpen).toHaveBeenCalledTimes(1);
      expect(props.onOpen).toHaveBeenCalledWith(cell);
    });

    it('cancels pending hover timeout on click', () => {
      const { props } = renderCell();
      const cell = screen.getByRole('button');
      // Start hovering
      fireEvent.mouseEnter(cell);
      // Click before 300ms elapses
      fireEvent.click(cell);
      // Advance past hover delay
      vi.advanceTimersByTime(300);
      // onOpen should only have been called once (from click, not hover)
      expect(props.onOpen).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Requirement 6.2: Hover opens tooltip after 300ms delay ───

  describe('hover interaction (Req 6.2)', () => {
    it('calls onOpen after 300ms hover', () => {
      const { props } = renderCell();
      const cell = screen.getByRole('button');
      fireEvent.mouseEnter(cell);
      expect(props.onOpen).not.toHaveBeenCalled();
      vi.advanceTimersByTime(300);
      expect(props.onOpen).toHaveBeenCalledTimes(1);
      expect(props.onOpen).toHaveBeenCalledWith(cell);
    });

    it('does NOT call onOpen if hover is less than 300ms', () => {
      const { props } = renderCell();
      const cell = screen.getByRole('button');
      fireEvent.mouseEnter(cell);
      vi.advanceTimersByTime(200);
      fireEvent.mouseLeave(cell);
      vi.advanceTimersByTime(300);
      expect(props.onOpen).not.toHaveBeenCalled();
    });
  });

  // ─── Requirement 6.2: Mouse leave closes after 200ms ───

  describe('mouse leave (Req 6.2)', () => {
    it('calls onClose after 200ms mouse leave', () => {
      const { props } = renderCell();
      const cell = screen.getByRole('button');
      fireEvent.mouseLeave(cell);
      expect(props.onClose).not.toHaveBeenCalled();
      vi.advanceTimersByTime(200);
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onClose if mouse re-enters before 200ms', () => {
      const { props } = renderCell();
      const cell = screen.getByRole('button');
      fireEvent.mouseLeave(cell);
      vi.advanceTimersByTime(100);
      fireEvent.mouseEnter(cell);
      vi.advanceTimersByTime(200);
      expect(props.onClose).not.toHaveBeenCalled();
    });
  });

  // ─── Requirement 6.4: Enter/Space opens tooltip ───

  describe('keyboard interaction (Req 6.4)', () => {
    it('calls onOpen when Enter is pressed', () => {
      const { props } = renderCell();
      const cell = screen.getByRole('button');
      fireEvent.keyDown(cell, { key: 'Enter' });
      expect(props.onOpen).toHaveBeenCalledTimes(1);
      expect(props.onOpen).toHaveBeenCalledWith(cell);
    });

    it('calls onOpen when Space is pressed', () => {
      const { props } = renderCell();
      const cell = screen.getByRole('button');
      fireEvent.keyDown(cell, { key: ' ' });
      expect(props.onOpen).toHaveBeenCalledTimes(1);
      expect(props.onOpen).toHaveBeenCalledWith(cell);
    });

    it('does NOT call onOpen for other keys', () => {
      const { props } = renderCell();
      const cell = screen.getByRole('button');
      fireEvent.keyDown(cell, { key: 'Tab' });
      fireEvent.keyDown(cell, { key: 'Escape' });
      fireEvent.keyDown(cell, { key: 'a' });
      expect(props.onOpen).not.toHaveBeenCalled();
    });
  });

  // ─── Requirement 6.5: aria-describedby linkage ───

  describe('aria-describedby (Req 6.5)', () => {
    it('has aria-describedby when tooltip is open', () => {
      renderCell({ isTooltipOpen: true, tooltipId: 'tooltip-skill-3' });
      const cell = screen.getByRole('button');
      expect(cell).toHaveAttribute('aria-describedby', 'tooltip-skill-3');
    });

    it('does NOT have aria-describedby when tooltip is closed', () => {
      renderCell({ isTooltipOpen: false });
      const cell = screen.getByRole('button');
      expect(cell).not.toHaveAttribute('aria-describedby');
    });
  });

  // ─── Keyboard focusability ───

  describe('keyboard focusability', () => {
    it('has tabIndex={0} for keyboard accessibility', () => {
      renderCell();
      const cell = screen.getByRole('button');
      expect(cell).toHaveAttribute('tabindex', '0');
    });

    it('has role="button"', () => {
      renderCell();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  // ─── Display ───

  describe('display', () => {
    it('renders a numeric display value', () => {
      renderCell({ displayValue: 45 });
      expect(screen.getByText('45')).toBeInTheDocument();
    });

    it('renders a string display value', () => {
      renderCell({ displayValue: '7' });
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      renderCell({ className: 'custom-class' });
      const cell = screen.getByRole('button');
      expect(cell.className).toContain('custom-class');
    });

    it('sets aria-label when provided', () => {
      renderCell({ ariaLabel: 'Skill total for Athletics' });
      const cell = screen.getByRole('button');
      expect(cell).toHaveAttribute('aria-label', 'Skill total for Athletics');
    });
  });
});
