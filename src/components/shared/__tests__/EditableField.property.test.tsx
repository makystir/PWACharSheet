import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import { EditableField } from '../EditableField';

// Feature: ux-improvements, Property 2: Numeric EditableField saves correctly on blur
// Feature: ux-improvements, Property 3: EditableField keyboard commit and revert

vi.mock('../EditableField.module.css', () => ({
  default: {
    container: 'container',
    label: 'label',
    display: 'display',
    input: 'input',
    alwaysEditableInput: 'alwaysEditableInput',
    underlineAffordance: 'underlineAffordance',
  },
}));

// ─── Generators ─────────────────────────────────────────────────────────────

/** Arbitrary valid numeric values including 0, negatives, and large integers */
const arbNumericValue = fc.oneof(
  fc.integer({ min: -999999, max: 999999 }),
  fc.constant(0),
  fc.integer({ min: -99, max: 99 })
);

/** Arbitrary non-numeric strings that should coerce to 0 */
const arbNonNumericString = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t'),
  fc.constantFrom('abc', 'hello', 'xyz', 'NaN', 'undefined', 'null', 'foo bar', '---', '***'),
  fc.array(fc.constantFrom('a', 'b', 'c', 'x', 'y', 'z', ' ', '!', '@', '#'), { minLength: 1, maxLength: 10 })
    .map(chars => chars.join(''))
);

/** Arbitrary text values for draft content (for keyboard commit/revert) */
const arbDraftText = fc.string({ minLength: 0, maxLength: 20 });

/** Arbitrary initial numeric value for the always-editable field */
const arbInitialNumericValue = fc.integer({ min: -9999, max: 9999 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-improvements', () => {
  describe('Property 2: Numeric EditableField saves correctly on blur', () => {
    /**
     * **Validates: Requirements 3.3, 3.5**
     */

    it('for any numeric value typed into a numeric EditableField, blurring invokes onSave with that numeric value', () => {
      fc.assert(
        fc.property(
          arbNumericValue,
          (numericValue) => {
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

            const input = container.querySelector('input')!;

            // Clear and type the numeric value
            fireEvent.change(input, { target: { value: String(numericValue) } });
            fireEvent.blur(input);

            expect(onSave).toHaveBeenCalledWith(numericValue);

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for any non-numeric string, blurring invokes onSave with 0', () => {
      fc.assert(
        fc.property(
          arbNonNumericString,
          (nonNumericStr) => {
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

            const input = container.querySelector('input')!;

            // Type non-numeric value
            fireEvent.change(input, { target: { value: nonNumericStr } });
            fireEvent.blur(input);

            expect(onSave).toHaveBeenCalledWith(0);

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: EditableField keyboard commit and revert', () => {
    /**
     * **Validates: Requirements 3.4**
     */

    it('pressing Enter invokes onSave with the draft numeric value in always-editable mode', () => {
      fc.assert(
        fc.property(
          arbInitialNumericValue,
          arbNumericValue,
          (initialValue, draftValue) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Test"
                value={initialValue}
                type="number"
                mode="always-editable"
                onSave={onSave}
              />
            );

            const input = container.querySelector('input')!;

            // Type the draft value
            fireEvent.change(input, { target: { value: String(draftValue) } });
            fireEvent.keyDown(input, { key: 'Enter' });

            expect(onSave).toHaveBeenCalledWith(draftValue);

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('pressing Escape reverts the displayed value to the last saved value without invoking onSave', () => {
      fc.assert(
        fc.property(
          arbInitialNumericValue,
          arbNumericValue.filter(v => v !== 0),
          (initialValue, draftValue) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Test"
                value={initialValue}
                type="number"
                mode="always-editable"
                onSave={onSave}
              />
            );

            const input = container.querySelector('input')! as HTMLInputElement;

            // Type the draft value
            fireEvent.change(input, { target: { value: String(draftValue) } });
            fireEvent.keyDown(input, { key: 'Escape' });

            // onSave should NOT have been called
            expect(onSave).not.toHaveBeenCalled();

            // The input value should revert to the initial saved value
            expect(input.value).toBe(String(initialValue));

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('pressing Enter in tap-to-edit mode invokes onSave with the draft text value', () => {
      fc.assert(
        fc.property(
          arbDraftText.filter(s => s.length > 0),
          (draftValue) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Test"
                value="original"
                type="text"
                mode="tap-to-edit"
                onSave={onSave}
              />
            );

            // Click to enter edit mode - scope queries to container
            const displayElement = container.querySelector('[role="button"]')!;
            fireEvent.click(displayElement);

            const input = container.querySelector('input')!;

            // Type the draft value
            fireEvent.change(input, { target: { value: draftValue } });
            fireEvent.keyDown(input, { key: 'Enter' });

            expect(onSave).toHaveBeenCalledWith(draftValue);

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('pressing Escape in tap-to-edit mode reverts to last saved value without invoking onSave', () => {
      // Use strings with at least one non-whitespace char to avoid DOM text content normalization edge cases
      const arbVisibleString = fc.string({ minLength: 1, maxLength: 15 })
        .filter(s => s.trim().length > 0);

      fc.assert(
        fc.property(
          arbVisibleString,
          arbVisibleString,
          (savedValue, draftValue) => {
            const onSave = vi.fn();
            const { unmount, container } = render(
              <EditableField
                label="Test"
                value={savedValue}
                type="text"
                mode="tap-to-edit"
                onSave={onSave}
              />
            );

            // Click to enter edit mode - scope queries to container
            const displayElement = container.querySelector('[role="button"]')!;
            fireEvent.click(displayElement);

            const input = container.querySelector('input')!;

            // Type the draft value
            fireEvent.change(input, { target: { value: draftValue } });
            fireEvent.keyDown(input, { key: 'Escape' });

            // onSave should NOT have been called
            expect(onSave).not.toHaveBeenCalled();

            // Should have reverted back to display mode showing the saved value
            const display = container.querySelector('[role="button"]')!;
            expect(display.textContent).toBe(savedValue);

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
