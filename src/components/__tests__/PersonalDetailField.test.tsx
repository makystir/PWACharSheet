import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PersonalDetailField } from '../shared/PersonalDetailField';

const defaultProps = {
  label: 'Hair',
  value: 'Brown',
  onSave: vi.fn(),
  onRoll: vi.fn(),
  dropdownOptions: ['Black', 'Blonde', 'Brown', 'Red'],
  onDropdownSelect: vi.fn(),
  disabled: false,
};

function renderField(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  // Reset mocks for each render call
  props.onSave = overrides.onSave ?? vi.fn();
  props.onRoll = overrides.onRoll ?? vi.fn();
  props.onDropdownSelect = overrides.onDropdownSelect ?? vi.fn();
  return { ...render(<PersonalDetailField {...props} />), props };
}

describe('PersonalDetailField — disabled state', () => {
  it('roll button has aria-disabled="true" when disabled', () => {
    renderField({ disabled: true });
    const rollBtn = screen.getByRole('button', { name: 'Roll Hair' });
    expect(rollBtn).toHaveAttribute('aria-disabled', 'true');
  });

  it('clicking roll button does NOT call onRoll when disabled', async () => {
    const onRoll = vi.fn();
    renderField({ disabled: true, onRoll });
    const rollBtn = screen.getByRole('button', { name: 'Roll Hair' });
    await userEvent.click(rollBtn);
    expect(onRoll).not.toHaveBeenCalled();
  });

  it('dropdown has aria-disabled="true" when disabled', () => {
    renderField({ disabled: true });
    const dropdown = screen.getByRole('combobox', { name: 'Select Hair' });
    expect(dropdown).toHaveAttribute('aria-disabled', 'true');
  });

  it('selecting a dropdown option does NOT call onDropdownSelect when disabled', () => {
    const onDropdownSelect = vi.fn();
    renderField({ disabled: true, onDropdownSelect });
    const dropdown = screen.getByRole('combobox', { name: 'Select Hair' });
    fireEvent.change(dropdown, { target: { value: 'Blonde' } });
    expect(onDropdownSelect).not.toHaveBeenCalled();
  });
});

describe('PersonalDetailField — enabled interactions', () => {
  it('clicking roll button calls onRoll when enabled', async () => {
    const onRoll = vi.fn();
    renderField({ disabled: false, onRoll });
    const rollBtn = screen.getByRole('button', { name: 'Roll Hair' });
    await userEvent.click(rollBtn);
    expect(onRoll).toHaveBeenCalledTimes(1);
  });

  it('roll button does not have aria-disabled when enabled', () => {
    renderField({ disabled: false });
    const rollBtn = screen.getByRole('button', { name: 'Roll Hair' });
    expect(rollBtn).not.toHaveAttribute('aria-disabled');
  });

  it('selecting a dropdown option calls onDropdownSelect with the value', () => {
    const onDropdownSelect = vi.fn();
    renderField({ disabled: false, onDropdownSelect });
    const dropdown = screen.getByRole('combobox', { name: 'Select Hair' });
    fireEvent.change(dropdown, { target: { value: 'Red' } });
    expect(onDropdownSelect).toHaveBeenCalledWith('Red');
  });

  it('dropdown does not have aria-disabled when enabled', () => {
    renderField({ disabled: false });
    const dropdown = screen.getByRole('combobox', { name: 'Select Hair' });
    expect(dropdown).not.toHaveAttribute('aria-disabled');
  });
});

describe('PersonalDetailField — free-text editing', () => {
  it('EditableField remains editable when disabled is true', async () => {
    renderField({ disabled: true, value: 'Auburn' });
    // The EditableField in tap-to-edit mode shows a clickable display div with the value as its name
    const display = screen.getByRole('button', { name: 'Auburn' });
    // Tap to enter edit mode
    await userEvent.click(display);
    // Now an input should appear
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).not.toBeDisabled();
  });

  it('EditableField remains editable after a roll (value updated externally)', async () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <PersonalDetailField
        label="Hair"
        value="Blonde"
        onSave={onSave}
        onRoll={vi.fn()}
        dropdownOptions={['Blonde', 'Red', 'White']}
        onDropdownSelect={vi.fn()}
        disabled={false}
      />
    );

    // Simulate the value changing as if a roll occurred — use a value NOT in dropdownOptions
    rerender(
      <PersonalDetailField
        label="Hair"
        value="Silver"
        onSave={onSave}
        onRoll={vi.fn()}
        dropdownOptions={['Blonde', 'Red', 'White']}
        onDropdownSelect={vi.fn()}
        disabled={false}
      />
    );

    // The new value should be displayed in the editable field
    const display = screen.getByRole('button', { name: 'Silver' });
    expect(display).toBeInTheDocument();

    // Can still tap to edit
    await userEvent.click(display);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).not.toBeDisabled();

    // Type a new free-text value and save
    await userEvent.clear(input);
    await userEvent.type(input, 'Copper');
    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalledWith('Copper');
  });

  it('EditableField remains editable after dropdown selection', async () => {
    const onSave = vi.fn();
    const onDropdownSelect = vi.fn();
    const { rerender } = render(
      <PersonalDetailField
        label="Eyes"
        value=""
        onSave={onSave}
        onRoll={vi.fn()}
        dropdownOptions={['Blue', 'Green', 'Grey']}
        onDropdownSelect={onDropdownSelect}
        disabled={false}
      />
    );

    // Simulate dropdown selection updating the value — use a value NOT in dropdown to avoid ambiguity
    rerender(
      <PersonalDetailField
        label="Eyes"
        value="Pale Green"
        onSave={onSave}
        onRoll={vi.fn()}
        dropdownOptions={['Blue', 'Green', 'Grey']}
        onDropdownSelect={onDropdownSelect}
        disabled={false}
      />
    );

    // Can still tap to edit
    const display = screen.getByRole('button', { name: 'Pale Green' });
    await userEvent.click(display);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).not.toBeDisabled();

    // Type a free-text override
    await userEvent.clear(input);
    await userEvent.type(input, 'Hazel');
    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalledWith('Hazel');
  });
});
