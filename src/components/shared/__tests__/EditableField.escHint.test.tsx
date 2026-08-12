import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock CSS modules
vi.mock('../EditableField.module.css', () => ({
  default: {
    container: 'container',
    label: 'label',
    display: 'display',
    input: 'input',
    inputError: 'inputError',
    errorMessage: 'errorMessage',
    escHint: 'escHint',
    alwaysEditableInput: 'alwaysEditableInput',
    underlineAffordance: 'underlineAffordance',
  },
}));

// We need to reset the module-level escapeUsageCounter between tests
// by re-importing the module fresh each time
let EditableField: typeof import('../EditableField').EditableField;

describe('EditableField escape-to-revert hint', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    // Reset module to clear the module-level escapeUsageCounter Map
    vi.resetModules();
    const mod = await import('../EditableField');
    EditableField = mod.EditableField;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // **Validates: Requirements 5.1, 5.2**
  describe('Requirement 5.1/5.2: Hint appears after 1-second delay', () => {
    it('does not show the hint immediately upon entering edit mode', () => {
      const onSave = vi.fn();
      render(
        <EditableField label="Name" value="Brunhilde" type="text" onSave={onSave} />
      );

      // Enter edit mode
      const displayElement = screen.getByRole('button');
      fireEvent.click(displayElement);

      // Hint should NOT be visible immediately
      expect(screen.queryByText('Esc to revert')).not.toBeInTheDocument();
    });

    it('shows the hint after 1 second in edit mode', () => {
      const onSave = vi.fn();
      render(
        <EditableField label="Name" value="Brunhilde" type="text" onSave={onSave} />
      );

      // Enter edit mode
      const displayElement = screen.getByRole('button');
      fireEvent.click(displayElement);

      // Advance timer by 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Hint should now be visible
      expect(screen.getByText('Esc to revert')).toBeInTheDocument();
    });

    it('does not show the hint before 1 second has elapsed', () => {
      const onSave = vi.fn();
      render(
        <EditableField label="Name" value="Brunhilde" type="text" onSave={onSave} />
      );

      // Enter edit mode
      const displayElement = screen.getByRole('button');
      fireEvent.click(displayElement);

      // Advance only 999ms
      act(() => {
        vi.advanceTimersByTime(999);
      });

      // Hint should NOT be visible yet
      expect(screen.queryByText('Esc to revert')).not.toBeInTheDocument();
    });

    it('renders the hint with the escHint CSS class', () => {
      const onSave = vi.fn();
      render(
        <EditableField label="Name" value="Brunhilde" type="text" onSave={onSave} />
      );

      // Enter edit mode
      const displayElement = screen.getByRole('button');
      fireEvent.click(displayElement);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      const hint = screen.getByText('Esc to revert');
      expect(hint).toHaveClass('escHint');
    });
  });

  // **Validates: Requirement 5.3**
  describe('Requirement 5.3: Hint disappears on exit', () => {
    it('hides the hint when Escape is pressed', () => {
      const onSave = vi.fn();
      render(
        <EditableField label="Name" value="Brunhilde" type="text" onSave={onSave} />
      );

      // Enter edit mode
      const displayElement = screen.getByRole('button');
      fireEvent.click(displayElement);

      // Wait for hint to appear
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('Esc to revert')).toBeInTheDocument();

      // Press Escape to revert and exit
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Escape' });

      // Hint should be gone (field is no longer in edit mode)
      expect(screen.queryByText('Esc to revert')).not.toBeInTheDocument();
    });

    it('hides the hint when field saves via Enter', () => {
      const onSave = vi.fn();
      render(
        <EditableField label="Name" value="Brunhilde" type="text" onSave={onSave} />
      );

      // Enter edit mode
      const displayElement = screen.getByRole('button');
      fireEvent.click(displayElement);

      // Wait for hint to appear
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('Esc to revert')).toBeInTheDocument();

      // Press Enter to save and exit
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });

      // Hint should be gone
      expect(screen.queryByText('Esc to revert')).not.toBeInTheDocument();
    });

    it('hides the hint when field loses focus (blur)', () => {
      const onSave = vi.fn();
      render(
        <EditableField label="Name" value="Brunhilde" type="text" onSave={onSave} />
      );

      // Enter edit mode
      const displayElement = screen.getByRole('button');
      fireEvent.click(displayElement);

      // Wait for hint to appear
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('Esc to revert')).toBeInTheDocument();

      // Blur the input
      const input = screen.getByRole('textbox');
      fireEvent.blur(input);

      // Hint should be gone
      expect(screen.queryByText('Esc to revert')).not.toBeInTheDocument();
    });
  });

  // **Validates: Requirement 5.4**
  describe('Requirement 5.4: Hint suppression after 3 escape uses', () => {
    it('suppresses the hint after the user has used Escape 3 times', () => {
      const onSave = vi.fn();
      const { unmount } = render(
        <EditableField label="Name" value="Brunhilde" type="text" onSave={onSave} />
      );

      // Use Escape 3 times
      for (let i = 0; i < 3; i++) {
        // Enter edit mode
        const displayEl = screen.getByRole('button');
        fireEvent.click(displayEl);

        // Press Escape
        const input = screen.getByRole('textbox');
        fireEvent.keyDown(input, { key: 'Escape' });
      }

      // Enter edit mode again (4th time)
      const displayEl = screen.getByRole('button');
      fireEvent.click(displayEl);

      // Wait well past the delay
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Hint should NOT appear because escape was used 3 times
      expect(screen.queryByText('Esc to revert')).not.toBeInTheDocument();

      unmount();
    });

    it('still shows the hint before the 3rd escape use', () => {
      const onSave = vi.fn();
      render(
        <EditableField label="Name" value="Brunhilde" type="text" onSave={onSave} />
      );

      // Use Escape 2 times
      for (let i = 0; i < 2; i++) {
        const displayEl = screen.getByRole('button');
        fireEvent.click(displayEl);

        const input = screen.getByRole('textbox');
        fireEvent.keyDown(input, { key: 'Escape' });
      }

      // Enter edit mode again (3rd time)
      const displayEl = screen.getByRole('button');
      fireEvent.click(displayEl);

      // Wait for hint
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Hint should still appear (only 2 escapes used so far)
      expect(screen.getByText('Esc to revert')).toBeInTheDocument();
    });

    it('suppression persists across multiple renders within the same session', () => {
      const onSave = vi.fn();

      // First render: use escape 3 times
      const { unmount: unmount1 } = render(
        <EditableField label="Name" value="Brunhilde" type="text" onSave={onSave} />
      );

      for (let i = 0; i < 3; i++) {
        const displayEl = screen.getByRole('button');
        fireEvent.click(displayEl);
        const input = screen.getByRole('textbox');
        fireEvent.keyDown(input, { key: 'Escape' });
      }
      unmount1();

      // Second render: hint should be suppressed
      render(
        <EditableField label="Strength" value={40} type="number" onSave={onSave} />
      );

      const displayEl = screen.getByRole('button');
      fireEvent.click(displayEl);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.queryByText('Esc to revert')).not.toBeInTheDocument();
    });
  });
});
