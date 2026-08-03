import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AgeTierSelector } from '../AgeTierSelector';
import { HIGH_ELF_AGE_TIERS } from '../../../data/personal-details';

describe('AgeTierSelector', () => {
  // **Validates: Requirements 3.1**
  it('renders all 5 High Elf age tiers as options', () => {
    render(<AgeTierSelector onTierChange={vi.fn()} />);

    const select = screen.getByRole('combobox', { name: 'High Elf age tier' });
    const options = select.querySelectorAll('option');

    expect(options).toHaveLength(5);
    expect(options[0]).toHaveTextContent('Time of Ending');
    expect(options[1]).toHaveTextContent('Time of Steel');
    expect(options[2]).toHaveTextContent('Time of Incursion');
    expect(options[3]).toHaveTextContent('Time of Voyages');
    expect(options[4]).toHaveTextContent('Time of the Sage');
  });

  // **Validates: Requirements 3.8**
  it('defaults to "Time of Ending" when no selection is made', () => {
    render(<AgeTierSelector onTierChange={vi.fn()} />);

    const select = screen.getByRole('combobox', { name: 'High Elf age tier' }) as HTMLSelectElement;
    expect(select.value).toBe('0');

    const selectedOption = select.options[select.selectedIndex];
    expect(selectedOption).toHaveTextContent('Time of Ending');
  });

  // **Validates: Requirements 3.1, 14.3**
  it('has the correct aria-label for accessibility', () => {
    render(<AgeTierSelector onTierChange={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: 'High Elf age tier' })).toBeInTheDocument();
  });

  // **Validates: Requirements 3.2**
  it('calls onTierChange with the selected tier when selection changes', async () => {
    const onTierChange = vi.fn();
    const user = userEvent.setup();

    render(<AgeTierSelector onTierChange={onTierChange} />);

    const select = screen.getByRole('combobox', { name: 'High Elf age tier' });
    await user.selectOptions(select, '3');

    expect(onTierChange).toHaveBeenCalledTimes(1);
    expect(onTierChange).toHaveBeenCalledWith(HIGH_ELF_AGE_TIERS[3]);
  });

  // **Validates: Requirements 3.1**
  it('calls onTierChange with Time of the Sage tier data', async () => {
    const onTierChange = vi.fn();
    const user = userEvent.setup();

    render(<AgeTierSelector onTierChange={onTierChange} />);

    const select = screen.getByRole('combobox', { name: 'High Elf age tier' });
    await user.selectOptions(select, '4');

    expect(onTierChange).toHaveBeenCalledWith({
      label: 'Time of the Sage',
      base: 580,
      diceCount: 30,
    });
  });
});
