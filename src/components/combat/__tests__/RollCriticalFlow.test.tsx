import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RollCriticalFlow } from '../RollCriticalFlow';
import type { RollCriticalFlowProps } from '../RollCriticalFlow';
import { HEAD_CRITICAL_TABLE } from '../../../data/critical-wound-tables';

function makeProps(overrides: Partial<RollCriticalFlowProps> = {}): RollCriticalFlowProps {
  return {
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe('RollCriticalFlow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders location selector with 6 options', () => {
    render(<RollCriticalFlow {...makeProps()} />);

    const select = screen.getByLabelText('Location');
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(6);

    const optionValues = Array.from(options).map((o) => o.textContent);
    expect(optionValues).toEqual([
      'Head',
      'Left Arm',
      'Right Arm',
      'Body',
      'Left Leg',
      'Right Leg',
    ]);
  });

  it('pre-selects location from prop', () => {
    render(<RollCriticalFlow {...makeProps({ preselectedLocation: 'Left Leg' })} />);

    const select = screen.getByLabelText('Location') as HTMLSelectElement;
    expect(select.value).toBe('Left Leg');
  });

  it('disables lookup for empty input', () => {
    render(<RollCriticalFlow {...makeProps()} />);

    const lookupBtn = screen.getByRole('button', { name: 'Look Up' });
    expect(lookupBtn).toBeDisabled();
  });

  it('disables lookup for non-integer input', () => {
    render(<RollCriticalFlow {...makeProps()} />);

    const input = screen.getByLabelText('d100 Roll');
    fireEvent.change(input, { target: { value: '5.5' } });

    const lookupBtn = screen.getByRole('button', { name: 'Look Up' });
    expect(lookupBtn).toBeDisabled();
  });

  it('shows inline error for non-integer values', () => {
    render(<RollCriticalFlow {...makeProps()} />);

    const input = screen.getByLabelText('d100 Roll');
    fireEvent.change(input, { target: { value: '3.7' } });

    expect(screen.getByText('Enter a whole number between 1 and 100')).toBeInTheDocument();
  });

  it('shows inline error for out-of-range values (> 100)', () => {
    render(<RollCriticalFlow {...makeProps()} />);

    const input = screen.getByLabelText('d100 Roll');
    fireEvent.change(input, { target: { value: '101' } });

    expect(screen.getByText('Roll must be between 1 and 100')).toBeInTheDocument();
  });

  it('shows inline error for out-of-range values (< 1)', () => {
    render(<RollCriticalFlow {...makeProps()} />);

    const input = screen.getByLabelText('d100 Roll');
    fireEvent.change(input, { target: { value: '0' } });

    expect(screen.getByText('Roll must be between 1 and 100')).toBeInTheDocument();
  });

  it('displays preview card on successful lookup', () => {
    render(<RollCriticalFlow {...makeProps()} />);

    const input = screen.getByLabelText('d100 Roll');
    fireEvent.change(input, { target: { value: '5' } });

    const lookupBtn = screen.getByRole('button', { name: 'Look Up' });
    fireEvent.click(lookupBtn);

    // First Head table entry covers roll 5 (min=1, max=10)
    const entry = HEAD_CRITICAL_TABLE[0];
    expect(screen.getByText(entry.name)).toBeInTheDocument();
    expect(screen.getByText(entry.effect)).toBeInTheDocument();
    expect(screen.getByText(`Severity ${entry.severity}`)).toBeInTheDocument();
  });

  it('calls onConfirm with correct CriticalWound shape', () => {
    const onConfirm = vi.fn();
    render(<RollCriticalFlow {...makeProps({ onConfirm, preselectedLocation: 'Head' })} />);

    const input = screen.getByLabelText('d100 Roll');
    fireEvent.change(input, { target: { value: '5' } });

    const lookupBtn = screen.getByRole('button', { name: 'Look Up' });
    fireEvent.click(lookupBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmBtn);

    const entry = HEAD_CRITICAL_TABLE[0];
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      location: 'Head',
      description: entry.name,
      effects: entry.effect,
      severity: entry.severity,
      duration: '',
      healed: false,
    });
  });

  it('calls onCancel without creating wound (from input state)', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<RollCriticalFlow {...makeProps({ onCancel, onConfirm })} />);

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onCancel without creating wound (from preview state)', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<RollCriticalFlow {...makeProps({ onCancel, onConfirm })} />);

    const input = screen.getByLabelText('d100 Roll');
    fireEvent.change(input, { target: { value: '5' } });

    const lookupBtn = screen.getByRole('button', { name: 'Look Up' });
    fireEvent.click(lookupBtn);

    // Now in preview state, click Cancel
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('random roll generates value 1–100 and auto-lookups', () => {
    // Mock Math.random to return 0.49 → Math.floor(0.49 * 100) + 1 = 50
    vi.spyOn(Math, 'random').mockReturnValue(0.49);

    render(<RollCriticalFlow {...makeProps({ preselectedLocation: 'Head' })} />);

    const rollBtn = screen.getByRole('button', { name: 'Roll' });
    fireEvent.click(rollBtn);

    // Should auto-lookup: roll 50 on Head table → entry at index 4 (min=41, max=50)
    const entry = HEAD_CRITICAL_TABLE[4]; // "Concussion"
    expect(screen.getByText(entry.name)).toBeInTheDocument();
    expect(screen.getByText(entry.effect)).toBeInTheDocument();
    expect(screen.getByText(`Severity ${entry.severity}`)).toBeInTheDocument();
  });
});
