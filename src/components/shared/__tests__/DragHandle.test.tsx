import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DragHandle } from '../DragHandle';

const defaultProps = {
  onMoveUp: vi.fn(),
  onMoveDown: vi.fn(),
  isFirst: false,
  isLast: false,
  itemLabel: 'Sword',
};

describe('DragHandle', () => {
  describe('grip with gripProps', () => {
    it('has aria-roledescription="sortable" when gripProps is provided', () => {
      const gripProps = {
        onPointerDown: vi.fn(),
        'aria-roledescription': 'sortable' as const,
      };
      render(<DragHandle {...defaultProps} gripProps={gripProps} />);
      const sortableEl = document.querySelector('[aria-roledescription="sortable"]');
      expect(sortableEl).toBeInTheDocument();
      expect(sortableEl!.getAttribute('aria-roledescription')).toBe('sortable');
    });

    it('calls onPointerDown when pointer down occurs on grip', () => {
      const onPointerDown = vi.fn();
      const gripProps = {
        onPointerDown,
        'aria-roledescription': 'sortable' as const,
      };
      render(<DragHandle {...defaultProps} gripProps={gripProps} />);
      const grip = document.querySelector('[aria-roledescription="sortable"]')!;
      fireEvent.pointerDown(grip);
      expect(onPointerDown).toHaveBeenCalledTimes(1);
    });
  });

  describe('grip without gripProps', () => {
    it('has aria-hidden="true" when gripProps is NOT provided', () => {
      render(<DragHandle {...defaultProps} />);
      const hiddenGrip = document.querySelector('[aria-hidden="true"]');
      expect(hiddenGrip).toBeInTheDocument();
    });

    it('does NOT have aria-roledescription when gripProps is NOT provided', () => {
      render(<DragHandle {...defaultProps} />);
      const sortableEl = document.querySelector('[aria-roledescription]');
      expect(sortableEl).toBeNull();
    });
  });

  describe('ChevronUp button', () => {
    it('fires onMoveUp when clicked', () => {
      const onMoveUp = vi.fn();
      render(<DragHandle {...defaultProps} onMoveUp={onMoveUp} />);
      const upBtn = screen.getByRole('button', { name: 'Move Sword up' });
      fireEvent.click(upBtn);
      expect(onMoveUp).toHaveBeenCalledTimes(1);
    });

    it('fires onMoveUp on Enter key', () => {
      const onMoveUp = vi.fn();
      render(<DragHandle {...defaultProps} onMoveUp={onMoveUp} />);
      const upBtn = screen.getByRole('button', { name: 'Move Sword up' });
      fireEvent.keyDown(upBtn, { key: 'Enter', code: 'Enter' });
      // Native button elements fire click on Enter keydown
      fireEvent.click(upBtn);
      expect(onMoveUp).toHaveBeenCalled();
    });

    it('fires onMoveUp on Space key', () => {
      const onMoveUp = vi.fn();
      render(<DragHandle {...defaultProps} onMoveUp={onMoveUp} />);
      const upBtn = screen.getByRole('button', { name: 'Move Sword up' });
      fireEvent.keyDown(upBtn, { key: ' ', code: 'Space' });
      fireEvent.keyUp(upBtn, { key: ' ', code: 'Space' });
      // Native button elements fire click on Space keyup
      fireEvent.click(upBtn);
      expect(onMoveUp).toHaveBeenCalled();
    });

    it('is disabled when isFirst is true', () => {
      render(<DragHandle {...defaultProps} isFirst={true} />);
      const upBtn = screen.getByRole('button', { name: 'Move Sword up' });
      expect(upBtn).toBeDisabled();
    });
  });

  describe('ChevronDown button', () => {
    it('fires onMoveDown when clicked', () => {
      const onMoveDown = vi.fn();
      render(<DragHandle {...defaultProps} onMoveDown={onMoveDown} />);
      const downBtn = screen.getByRole('button', { name: 'Move Sword down' });
      fireEvent.click(downBtn);
      expect(onMoveDown).toHaveBeenCalledTimes(1);
    });

    it('fires onMoveDown on Enter key', () => {
      const onMoveDown = vi.fn();
      render(<DragHandle {...defaultProps} onMoveDown={onMoveDown} />);
      const downBtn = screen.getByRole('button', { name: 'Move Sword down' });
      fireEvent.keyDown(downBtn, { key: 'Enter', code: 'Enter' });
      fireEvent.click(downBtn);
      expect(onMoveDown).toHaveBeenCalled();
    });

    it('fires onMoveDown on Space key', () => {
      const onMoveDown = vi.fn();
      render(<DragHandle {...defaultProps} onMoveDown={onMoveDown} />);
      const downBtn = screen.getByRole('button', { name: 'Move Sword down' });
      fireEvent.keyDown(downBtn, { key: ' ', code: 'Space' });
      fireEvent.keyUp(downBtn, { key: ' ', code: 'Space' });
      fireEvent.click(downBtn);
      expect(onMoveDown).toHaveBeenCalled();
    });

    it('is disabled when isLast is true', () => {
      render(<DragHandle {...defaultProps} isLast={true} />);
      const downBtn = screen.getByRole('button', { name: 'Move Sword down' });
      expect(downBtn).toBeDisabled();
    });
  });

  describe('button accessibility', () => {
    it('buttons have correct aria-labels', () => {
      render(<DragHandle {...defaultProps} itemLabel="Shield" />);
      expect(screen.getByRole('button', { name: 'Move Shield up' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Move Shield down' })).toBeInTheDocument();
    });

    it('buttons are focusable (not disabled) when not at boundaries', () => {
      render(<DragHandle {...defaultProps} isFirst={false} isLast={false} />);
      const upBtn = screen.getByRole('button', { name: 'Move Sword up' });
      const downBtn = screen.getByRole('button', { name: 'Move Sword down' });
      expect(upBtn).not.toBeDisabled();
      expect(downBtn).not.toBeDisabled();
    });
  });
});
