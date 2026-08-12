import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import { EditableField } from '../EditableField';

// Feature: ux-polish-improvements, Property 1: Non-numeric input detection

vi.mock('../EditableField.module.css', () => ({
  default: {
    container: 'container',
    label: 'label',
    display: 'display',
    input: 'input',
    inputError: 'inputError',
    alwaysEditableInput: 'alwaysEditableInput',
    underlineAffordance: 'underlineAffordance',
    errorMessage: 'errorMessage',
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Simulates entering a non-numeric string into a type="number" input in jsdom.
 *
 * jsdom's `<input type="number">` sanitizes non-numeric values to "" on the
 * `.value` property, making it impossible to test validation logic for
 * arbitrary non-numeric strings through normal fireEvent.change.
 *
 * We temporarily swap the input type to "text" before dispatching the change
 * event, then restore it. This mimics how paste operations or programmatic
 * value changes can deliver arbitrary text to the component's onChange handler
 * in real browsers.
 */
function setNonNumericValue(input: HTMLInputElement, value: string) {
  input.type = 'text';
  fireEvent.change(input, { target: { value } });
  input.type = 'number';
}

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Generate arbitrary strings that cannot be parsed as finite numbers.
 * A string is non-numeric if `!Number.isFinite(Number(str))`.
 * This includes: alphabetic text, multiple decimals, special values like
 * "NaN", "Infinity", "-Infinity", symbols, mixed alphanumeric, etc.
 */
const arbNonFiniteNumericString = fc.oneof(
  // Alphabetic / word strings
  fc.stringMatching(/^[a-zA-Z]{1,10}$/),
  // Multiple decimal points (e.g., "12.3.4")
  fc.tuple(
    fc.integer({ min: 0, max: 999 }),
    fc.integer({ min: 0, max: 99 }),
    fc.integer({ min: 0, max: 99 })
  ).map(([a, b, c]) => `${a}.${b}.${c}`),
  // Special non-finite string values
  fc.constantFrom('NaN', 'Infinity', '-Infinity', 'undefined', 'null', 'true', 'false'),
  // Strings with symbols that prevent numeric parsing
  fc.stringMatching(/^[!@#$%^&*()]{1,5}$/),
  // Mixed alphanumeric (letter followed by digit or vice versa)
  fc.tuple(
    fc.stringMatching(/^[a-z]{1,4}$/),
    fc.integer({ min: 0, max: 99 })
  ).map(([s, n]) => `${s}${n}${s}`),
  // Arbitrary strings filtered to only those that aren't finite numbers and not empty/whitespace
  fc.string({ minLength: 1, maxLength: 15 })
    .filter(s => s.trim() !== '' && !Number.isFinite(Number(s)))
);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-polish-improvements', () => {
  // Feature: ux-polish-improvements, Property 1: Non-numeric input detection
  describe('Property 1: Non-numeric input detection', () => {
    /**
     * **Validates: Requirements 3.1, 3.5**
     *
     * For any string that cannot be parsed as a finite number
     * (i.e., `!Number.isFinite(Number(input))`), when entered into a numeric
     * EditableField, the component SHALL display an error state and NOT call `onSave`.
     */

    it('always-editable mode: non-numeric input displays error and does not call onSave on blur', () => {
      fc.assert(
        fc.property(
          arbNonFiniteNumericString,
          (nonNumericInput) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Test"
                value={0}
                type="number"
                mode="always-editable"
                onSave={onSave}
              />
            );

            const input = container.querySelector('input') as HTMLInputElement;

            // Enter non-numeric value (bypassing jsdom number input sanitization)
            setNonNumericValue(input, nonNumericInput);
            fireEvent.blur(input);

            // Error state: aria-invalid should be true
            expect(input.getAttribute('aria-invalid')).toBe('true');

            // Error message should be displayed with role="alert"
            const errorAlert = container.querySelector('[role="alert"]');
            expect(errorAlert).not.toBeNull();
            expect(errorAlert!.textContent).toBe('Must be a number');

            // onSave should NOT have been called
            expect(onSave).not.toHaveBeenCalled();

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('always-editable mode: non-numeric input displays error and does not call onSave on Enter', () => {
      fc.assert(
        fc.property(
          arbNonFiniteNumericString,
          (nonNumericInput) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Test"
                value={42}
                type="number"
                mode="always-editable"
                onSave={onSave}
              />
            );

            const input = container.querySelector('input') as HTMLInputElement;

            // Enter non-numeric value (bypassing jsdom number input sanitization)
            setNonNumericValue(input, nonNumericInput);
            fireEvent.keyDown(input, { key: 'Enter' });

            // Error state: aria-invalid should be true
            expect(input.getAttribute('aria-invalid')).toBe('true');

            // Error message should be displayed
            const errorAlert = container.querySelector('[role="alert"]');
            expect(errorAlert).not.toBeNull();
            expect(errorAlert!.textContent).toBe('Must be a number');

            // onSave should NOT have been called
            expect(onSave).not.toHaveBeenCalled();

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('tap-to-edit mode: non-numeric input displays error and does not call onSave on blur', () => {
      fc.assert(
        fc.property(
          arbNonFiniteNumericString,
          (nonNumericInput) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Test"
                value={10}
                type="number"
                mode="tap-to-edit"
                onSave={onSave}
              />
            );

            // Click to enter edit mode
            const displayElement = container.querySelector('[role="button"]')!;
            fireEvent.click(displayElement);

            const input = container.querySelector('input') as HTMLInputElement;

            // Enter non-numeric value (bypassing jsdom number input sanitization)
            setNonNumericValue(input, nonNumericInput);
            fireEvent.blur(input);

            // Error state: aria-invalid should be true
            expect(input.getAttribute('aria-invalid')).toBe('true');

            // Error message should be displayed with role="alert"
            const errorAlert = container.querySelector('[role="alert"]');
            expect(errorAlert).not.toBeNull();
            expect(errorAlert!.textContent).toBe('Must be a number');

            // onSave should NOT have been called
            expect(onSave).not.toHaveBeenCalled();

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: ux-polish-improvements, Property 2: Error clearance on valid input
  describe('Property 2: Error clearance on valid input', () => {
    /**
     * **Validates: Requirements 3.3**
     *
     * For any EditableField in an error state, when the user provides a valid
     * input (non-empty for required fields, parseable number for numeric fields),
     * the error state SHALL be removed immediately on the same change event.
     */

    // Generator: valid numeric strings (finite numbers)
    const arbValidNumericString = fc.oneof(
      fc.integer({ min: -9999, max: 9999 }).map(String),
      fc.float({ min: -9999, max: 9999, noNaN: true, noDefaultInfinity: true })
        .filter(n => Number.isFinite(n))
        .map(n => n.toString()),
      fc.constantFrom('0', '1', '-1', '100', '3.14', '-2.5', '0.001')
    );

    // Generator: non-empty strings for required text fields
    const arbNonEmptyString = fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => s.trim() !== '');

    it('always-editable numeric mode: error clears immediately when valid number is entered', () => {
      fc.assert(
        fc.property(
          arbValidNumericString,
          (validInput) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Test"
                value={0}
                type="number"
                mode="always-editable"
                onSave={onSave}
              />
            );

            const input = container.querySelector('input') as HTMLInputElement;

            // First, put the field into an error state by entering non-numeric input and blurring
            input.type = 'text';
            fireEvent.change(input, { target: { value: 'abc' } });
            input.type = 'number';
            fireEvent.blur(input);

            // Confirm we're in error state
            expect(input.getAttribute('aria-invalid')).toBe('true');
            expect(container.querySelector('[role="alert"]')).not.toBeNull();

            // Now provide valid input via onChange — error should clear immediately
            input.type = 'text';
            fireEvent.change(input, { target: { value: validInput } });
            input.type = 'number';

            // Error state should be removed immediately (before blur)
            expect(input.getAttribute('aria-invalid')).not.toBe('true');
            expect(container.querySelector('[role="alert"]')).toBeNull();

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('tap-to-edit numeric mode: error clears immediately when valid number is entered', () => {
      fc.assert(
        fc.property(
          arbValidNumericString,
          (validInput) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Test"
                value={5}
                type="number"
                mode="tap-to-edit"
                onSave={onSave}
              />
            );

            // Enter edit mode
            const displayElement = container.querySelector('[role="button"]')!;
            fireEvent.click(displayElement);

            const input = container.querySelector('input') as HTMLInputElement;

            // Put field into error state with non-numeric input + blur
            input.type = 'text';
            fireEvent.change(input, { target: { value: 'xyz' } });
            input.type = 'number';
            fireEvent.blur(input);

            // Confirm error state
            expect(input.getAttribute('aria-invalid')).toBe('true');
            expect(container.querySelector('[role="alert"]')).not.toBeNull();

            // Now provide valid input — error should clear immediately on change
            input.type = 'text';
            fireEvent.change(input, { target: { value: validInput } });
            input.type = 'number';

            // Error should be gone before any blur
            expect(input.getAttribute('aria-invalid')).not.toBe('true');
            expect(container.querySelector('[role="alert"]')).toBeNull();

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('tap-to-edit required text mode: error clears immediately when non-empty input is provided', () => {
      fc.assert(
        fc.property(
          arbNonEmptyString,
          (validInput) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Name"
                value="Initial"
                type="text"
                mode="tap-to-edit"
                required={true}
                onSave={onSave}
              />
            );

            // Enter edit mode
            const displayElement = container.querySelector('[role="button"]')!;
            fireEvent.click(displayElement);

            const input = container.querySelector('input') as HTMLInputElement;

            // Put field into error state: clear the field and blur
            fireEvent.change(input, { target: { value: '' } });
            fireEvent.blur(input);

            // Confirm error state ("Required")
            expect(input.getAttribute('aria-invalid')).toBe('true');
            const errorAlert = container.querySelector('[role="alert"]');
            expect(errorAlert).not.toBeNull();
            expect(errorAlert!.textContent).toBe('Required');

            // Now provide valid non-empty input — error should clear immediately
            fireEvent.change(input, { target: { value: validInput } });

            // Error should be gone before any blur
            expect(input.getAttribute('aria-invalid')).not.toBe('true');
            expect(container.querySelector('[role="alert"]')).toBeNull();

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ─── Property 10: Invalid values never saved to store ───────────────────────
  // Feature: ux-polish-improvements, Property 10
  describe('Property 10: Invalid values never saved to store', () => {
    /**
     * **Validates: Requirements 3.5**
     *
     * For any invalid input (non-numeric string in a number field, or empty value
     * in a required field), the `onSave` callback SHALL NOT be invoked, and the
     * character data store SHALL remain unchanged.
     */

    // ─── Scenario A: Non-numeric input in number fields ───────────────────────

    it('always-editable number field: non-numeric input never triggers onSave on blur', () => {
      fc.assert(
        fc.property(
          arbNonFiniteNumericString,
          (invalidInput) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Stat"
                value={5}
                type="number"
                mode="always-editable"
                onSave={onSave}
              />
            );

            const input = container.querySelector('input') as HTMLInputElement;
            setNonNumericValue(input, invalidInput);
            fireEvent.blur(input);

            expect(onSave).not.toHaveBeenCalled();
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('always-editable number field: non-numeric input never triggers onSave on Enter', () => {
      fc.assert(
        fc.property(
          arbNonFiniteNumericString,
          (invalidInput) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Stat"
                value={5}
                type="number"
                mode="always-editable"
                onSave={onSave}
              />
            );

            const input = container.querySelector('input') as HTMLInputElement;
            setNonNumericValue(input, invalidInput);
            fireEvent.keyDown(input, { key: 'Enter' });

            expect(onSave).not.toHaveBeenCalled();
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('tap-to-edit number field: non-numeric input never triggers onSave on blur', () => {
      fc.assert(
        fc.property(
          arbNonFiniteNumericString,
          (invalidInput) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Stat"
                value={10}
                type="number"
                mode="tap-to-edit"
                onSave={onSave}
              />
            );

            const displayElement = container.querySelector('[role="button"]')!;
            fireEvent.click(displayElement);

            const input = container.querySelector('input') as HTMLInputElement;
            setNonNumericValue(input, invalidInput);
            fireEvent.blur(input);

            expect(onSave).not.toHaveBeenCalled();
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('tap-to-edit number field: non-numeric input never triggers onSave on Enter', () => {
      fc.assert(
        fc.property(
          arbNonFiniteNumericString,
          (invalidInput) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Stat"
                value={10}
                type="number"
                mode="tap-to-edit"
                onSave={onSave}
              />
            );

            const displayElement = container.querySelector('[role="button"]')!;
            fireEvent.click(displayElement);

            const input = container.querySelector('input') as HTMLInputElement;
            setNonNumericValue(input, invalidInput);
            fireEvent.keyDown(input, { key: 'Enter' });

            expect(onSave).not.toHaveBeenCalled();
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    // ─── Scenario B: Empty value in required fields ───────────────────────────

    /** Generator: empty or whitespace-only strings (which count as "empty") */
    const arbEmptyOrWhitespace = fc.oneof(
      fc.constant(''),
      fc.stringMatching(/^[ \t]{1,5}$/)
    );

    it('always-editable required field: empty input never triggers onSave on blur', () => {
      fc.assert(
        fc.property(
          arbEmptyOrWhitespace,
          (emptyInput) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Name"
                value="Valid"
                type="number"
                mode="always-editable"
                required={true}
                onSave={onSave}
              />
            );

            const input = container.querySelector('input') as HTMLInputElement;
            setNonNumericValue(input, emptyInput);
            fireEvent.blur(input);

            expect(onSave).not.toHaveBeenCalled();
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('always-editable required field: empty input never triggers onSave on Enter', () => {
      fc.assert(
        fc.property(
          arbEmptyOrWhitespace,
          (emptyInput) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Name"
                value="Valid"
                type="number"
                mode="always-editable"
                required={true}
                onSave={onSave}
              />
            );

            const input = container.querySelector('input') as HTMLInputElement;
            setNonNumericValue(input, emptyInput);
            fireEvent.keyDown(input, { key: 'Enter' });

            expect(onSave).not.toHaveBeenCalled();
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('tap-to-edit required field: empty input never triggers onSave on blur', () => {
      fc.assert(
        fc.property(
          arbEmptyOrWhitespace,
          (emptyInput) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Name"
                value="Something"
                type="text"
                mode="tap-to-edit"
                required={true}
                onSave={onSave}
              />
            );

            const displayElement = container.querySelector('[role="button"]')!;
            fireEvent.click(displayElement);

            const input = container.querySelector('input') as HTMLInputElement;
            fireEvent.change(input, { target: { value: emptyInput } });
            fireEvent.blur(input);

            expect(onSave).not.toHaveBeenCalled();
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('tap-to-edit required field: empty input never triggers onSave on Enter', () => {
      fc.assert(
        fc.property(
          arbEmptyOrWhitespace,
          (emptyInput) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Name"
                value="Something"
                type="text"
                mode="tap-to-edit"
                required={true}
                onSave={onSave}
              />
            );

            const displayElement = container.querySelector('[role="button"]')!;
            fireEvent.click(displayElement);

            const input = container.querySelector('input') as HTMLInputElement;
            fireEvent.change(input, { target: { value: emptyInput } });
            fireEvent.keyDown(input, { key: 'Enter' });

            expect(onSave).not.toHaveBeenCalled();
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
