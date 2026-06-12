import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EditableField } from '../EditableField';

// Mock CSS modules
vi.mock('../EditableField.module.css', () => ({
  default: {
    container: 'container',
    label: 'label',
    display: 'display',
    input: 'input',
  },
}));

describe('EditableField mobile interaction', () => {
  // **Validates: Requirements 14.2**
  describe('Requirement 14.2: Number-type field presents numeric keyboard via inputmode="numeric"', () => {
    it('renders inputMode="numeric" attribute when type is number and in edit mode', () => {
      const onSave = vi.fn();
      render(
        <EditableField label="Wounds" value={12} type="number" onSave={onSave} />
      );

      // Click the display element to enter edit mode
      const displayElement = screen.getByRole('button');
      fireEvent.click(displayElement);

      // Assert the input has inputMode="numeric"
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('inputMode', 'numeric');
    });

    it('does not set inputMode for text-type fields', () => {
      const onSave = vi.fn();
      render(
        <EditableField label="Name" value="Brunhilde" type="text" onSave={onSave} />
      );

      // Click the display element to enter edit mode
      const displayElement = screen.getByRole('button');
      fireEvent.click(displayElement);

      // Assert the input does NOT have inputMode attribute
      const input = screen.getByRole('textbox');
      expect(input).not.toHaveAttribute('inputMode');
    });
  });

  // **Validates: Requirements 18.1**
  describe('Requirement 18.1: Display state minimum tap target of 44px height', () => {
    it('applies the display CSS class which provides min-height 44px on mobile', () => {
      const onSave = vi.fn();
      render(
        <EditableField label="Strength" value={40} type="number" onSave={onSave} />
      );

      // The display element should have the display class (which has min-height: 44px in the mobile media query)
      const displayElement = screen.getByRole('button');
      expect(displayElement).toHaveClass('display');
    });

    it('display element is clickable to enter edit mode (tap target is interactive)', () => {
      const onSave = vi.fn();
      render(
        <EditableField label="Toughness" value={35} type="number" onSave={onSave} />
      );

      const displayElement = screen.getByRole('button');
      expect(displayElement).toHaveAttribute('tabIndex', '0');

      // Click to enter edit mode
      fireEvent.click(displayElement);

      // Should now be in edit mode with an input visible
      const input = screen.getByRole('spinbutton');
      expect(input).toBeInTheDocument();
    });
  });
});
