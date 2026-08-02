import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharCurrentCell } from '../CharCurrentCell';
import type { CharCurrentCellProps } from '../CharCurrentCell';

/**
 * Unit tests for CharCurrentCell interaction behaviour.
 * Validates: Requirements 1.1, 1.2, 2.4, 3.2, 3.4, 3.5
 */

function renderCell(overrides: Partial<CharCurrentCellProps> = {}) {
  const defaultProps: CharCurrentCellProps = {
    charKey: 'WS',
    current: 35,
    isTooltipOpen: false,
    onOpen: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<CharCurrentCell {...defaultProps} />), props: defaultProps };
}

describe('CharCurrentCell', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Requirement 1.1: Click opens tooltip ───

  describe('click interaction (Req 1.1)', () => {
    it('calls onOpen with charKey and anchor element on click', () => {
      const { props } = renderCell();
      const cell = screen.getByRole('button');
      fireEvent.click(cell);
      expect(props.onOpen).toHaveBeenCalledTimes(1);
      expect(props.onOpen).toHaveBeenCalledWith('WS', cell);
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

  // ─── Requirement 1.2: Hover opens tooltip after 300ms ───

  describe('hover interaction (Req 1.2)', () => {
    it('calls onOpen after 300ms hover', () => {
      const { props } = renderCell();
      const cell = screen.getByRole('button');
      fireEvent.mouseEnter(cell);
      // Not yet called before 300ms
      expect(props.onOpen).not.toHaveBeenCalled();
      vi.advanceTimersByTime(300);
      expect(props.onOpen).toHaveBeenCalledTimes(1);
      expect(props.onOpen).toHaveBeenCalledWith('WS', cell);
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

  // ─── Requirement 2.4: Mouse leave closes after 200ms ───

  describe('mouse leave (Req 2.4)', () => {
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

  // ─── Requirement 3.5: Enter/Space opens tooltip ───

  describe('keyboard interaction (Req 3.5)', () => {
    it('calls onOpen when Enter is pressed on focused cell', () => {
      const { props } = renderCell();
      const cell = screen.getByRole('button');
      fireEvent.keyDown(cell, { key: 'Enter' });
      expect(props.onOpen).toHaveBeenCalledTimes(1);
      expect(props.onOpen).toHaveBeenCalledWith('WS', cell);
    });

    it('calls onOpen when Space is pressed on focused cell', () => {
      const { props } = renderCell();
      const cell = screen.getByRole('button');
      fireEvent.keyDown(cell, { key: ' ' });
      expect(props.onOpen).toHaveBeenCalledTimes(1);
      expect(props.onOpen).toHaveBeenCalledWith('WS', cell);
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

  // ─── Requirement 3.2: aria-describedby linkage ───

  describe('aria-describedby (Req 3.2)', () => {
    it('has aria-describedby when tooltip is open', () => {
      renderCell({ isTooltipOpen: true, charKey: 'WS' });
      const cell = screen.getByRole('button');
      expect(cell).toHaveAttribute('aria-describedby', 'tooltip-char-WS');
    });

    it('does NOT have aria-describedby when tooltip is closed', () => {
      renderCell({ isTooltipOpen: false });
      const cell = screen.getByRole('button');
      expect(cell).not.toHaveAttribute('aria-describedby');
    });

    it('uses correct charKey in aria-describedby', () => {
      renderCell({ isTooltipOpen: true, charKey: 'Dex' });
      const cell = screen.getByRole('button');
      expect(cell).toHaveAttribute('aria-describedby', 'tooltip-char-Dex');
    });
  });

  // ─── Requirement 3.4: Cell is keyboard-focusable ───

  describe('keyboard focusability (Req 3.4)', () => {
    it('has tabIndex={0} for keyboard accessibility', () => {
      renderCell();
      const cell = screen.getByRole('button');
      expect(cell).toHaveAttribute('tabindex', '0');
    });
  });

  // ─── Displays current value ───

  describe('display', () => {
    it('renders the current value', () => {
      renderCell({ current: 42 });
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });
});
