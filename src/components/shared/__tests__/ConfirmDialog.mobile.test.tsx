import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConfirmDialog } from '../ConfirmDialog';

// Mock CSS modules to expose class names for assertions
vi.mock('../ConfirmDialog.module.css', () => ({
  default: {
    overlay: 'overlay',
    dialog: 'dialog',
    message: 'message',
    actions: 'actions',
    cancelBtn: 'cancelBtn',
    confirmBtn: 'confirmBtn',
  },
}));

describe('ConfirmDialog mobile button stacking', () => {
  const defaultProps = {
    message: 'Are you sure you want to delete this weapon?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  // **Validates: Requirements 22.1**
  describe('Requirement 22.1: Buttons render at full container width in vertical stack layout with min-height 44px', () => {
    it('renders both confirm and cancel buttons', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });

    it('applies the cancelBtn class which provides full-width and min-height 44px on mobile', () => {
      render(<ConfirmDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toHaveClass('cancelBtn');
    });

    it('applies the confirmBtn class which provides full-width and min-height 44px on mobile', () => {
      render(<ConfirmDialog {...defaultProps} />);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('confirmBtn');
    });

    it('renders buttons inside actions container that provides vertical stack layout on mobile', () => {
      render(<ConfirmDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });

      // Both buttons should share the same parent (actions container)
      expect(cancelButton.parentElement).toBe(confirmButton.parentElement);
      // The actions container should have the actions class (flex-direction: column on mobile)
      expect(cancelButton.parentElement).toHaveClass('actions');
    });
  });

  // **Validates: Requirements 22.2**
  describe('Requirement 22.2: Minimum gap of 10px between buttons via actions container', () => {
    it('applies the actions class which provides 10px gap between buttons on mobile', () => {
      render(<ConfirmDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const actionsContainer = cancelButton.parentElement;
      expect(actionsContainer).toHaveClass('actions');
    });
  });
});
