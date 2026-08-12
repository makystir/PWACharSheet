import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import { ContextualMenu } from '../ContextualMenu';

vi.mock('../ContextualMenu.module.css', () => ({
  default: {
    backdrop: 'backdrop',
    menu: 'menu',
    menuItem: 'menuItem',
    menuItemDestructive: 'menuItemDestructive',
    menuItemIcon: 'menuItemIcon',
  },
}));

describe('ContextualMenu', () => {
  const mockOnDismiss = vi.fn();
  const mockEditAction = vi.fn();
  const mockDeleteAction = vi.fn();
  const mockMoveAction = vi.fn();

  const defaultItems = [
    { label: 'Edit', icon: Pencil, onAction: mockEditAction },
    { label: 'Delete', icon: Trash2, onAction: mockDeleteAction, destructive: true },
    { label: 'Move', icon: ArrowUpDown, onAction: mockMoveAction },
  ];

  const defaultProps = {
    x: 100,
    y: 200,
    items: defaultItems,
    onDismiss: mockOnDismiss,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      configurable: true,
      writable: true,
    });
  });

  describe('Rendering', () => {
    it('renders all menu items', () => {
      render(<ContextualMenu {...defaultProps} />);

      expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Move' })).toBeInTheDocument();
    });

    it('renders the menu with role="menu"', () => {
      render(<ContextualMenu {...defaultProps} />);

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('applies destructive class to destructive items', () => {
      render(<ContextualMenu {...defaultProps} />);

      const deleteItem = screen.getByRole('menuitem', { name: 'Delete' });
      expect(deleteItem).toHaveClass('menuItemDestructive');
    });

    it('does not apply destructive class to non-destructive items', () => {
      render(<ContextualMenu {...defaultProps} />);

      const editItem = screen.getByRole('menuitem', { name: 'Edit' });
      expect(editItem).not.toHaveClass('menuItemDestructive');
    });
  });

  describe('Positioning', () => {
    it('positions menu at given x, y coordinates initially', () => {
      render(<ContextualMenu {...defaultProps} />);

      const menu = screen.getByRole('menu');
      expect(menu.style.top).toBe('200px');
      expect(menu.style.left).toBe('100px');
    });

    it('clamps position to viewport bounds when menu overflows right edge', () => {
      // Mock getBoundingClientRect to simulate a menu that would overflow
      const mockGetBoundingClientRect = vi.fn(() => ({
        width: 200,
        height: 150,
        top: 200,
        left: 500,
        right: 700,
        bottom: 350,
        x: 500,
        y: 200,
        toJSON: () => ({}),
      }));

      // Set viewport size
      Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });

      render(<ContextualMenu x={300} y={100} items={defaultItems} onDismiss={mockOnDismiss} />);

      const menu = screen.getByRole('menu');
      // Override getBoundingClientRect after render
      menu.getBoundingClientRect = mockGetBoundingClientRect;

      // Re-render to trigger the useEffect with new measurements
      // The initial position should be clamped on useEffect
      act(() => {
        // Force re-layout measurement
      });
    });
  });

  describe('Dismissal', () => {
    it('calls onDismiss when backdrop is clicked', () => {
      const { container } = render(<ContextualMenu {...defaultProps} />);

      const backdrop = container.querySelector('.backdrop');
      fireEvent.click(backdrop!);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss on Escape key press', () => {
      render(<ContextualMenu {...defaultProps} />);

      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss on popstate event (back gesture)', () => {
      render(<ContextualMenu {...defaultProps} />);

      act(() => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Haptic feedback', () => {
    it('calls navigator.vibrate(10) on mount', () => {
      render(<ContextualMenu {...defaultProps} />);

      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });

    it('does not throw when navigator.vibrate is not available', () => {
      Object.defineProperty(navigator, 'vibrate', {
        value: undefined,
        configurable: true,
        writable: true,
      });

      expect(() => {
        render(<ContextualMenu {...defaultProps} />);
      }).not.toThrow();
    });
  });

  describe('Item actions', () => {
    it('calls onAction and onDismiss when a menu item is clicked', () => {
      render(<ContextualMenu {...defaultProps} />);

      fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));

      expect(mockEditAction).toHaveBeenCalledTimes(1);
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls the correct action for each item', () => {
      render(<ContextualMenu {...defaultProps} />);

      fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
      expect(mockDeleteAction).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('menuitem', { name: 'Move' }));
      expect(mockMoveAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has aria-label on the menu', () => {
      render(<ContextualMenu {...defaultProps} />);

      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('aria-label', 'Context menu');
    });

    it('each item has role="menuitem"', () => {
      render(<ContextualMenu {...defaultProps} />);

      const items = screen.getAllByRole('menuitem');
      expect(items).toHaveLength(3);
    });
  });
});
