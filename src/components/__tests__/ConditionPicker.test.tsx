import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConditionPicker } from '../combat/ConditionPicker';
import type { ConditionPickerProps } from '../combat/ConditionPicker';
import type { Condition } from '../../types/character';
import { CONDITIONS } from '../../data/conditions';

function makeProps(overrides: Partial<ConditionPickerProps> = {}): ConditionPickerProps {
  return {
    conditions: [],
    onApply: vi.fn(),
    onRemove: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

// ─── Rendering (4.1, 4.2) ────────────────────────────────────────────────────

describe('ConditionPicker — Rendering', () => {
  it('renders a modal overlay with dialog role', () => {
    render(<ConditionPicker {...makeProps()} />);
    expect(screen.getByTestId('condition-picker-overlay')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Condition Picker' })).toBeInTheDocument();
  });

  it('renders all 12 conditions from CONDITIONS data', () => {
    render(<ConditionPicker {...makeProps()} />);
    for (const cond of CONDITIONS) {
      expect(screen.getByTestId(`condition-${cond.name}`)).toBeInTheDocument();
    }
    expect(CONDITIONS).toHaveLength(12);
  });

  it('renders the "Conditions" title', () => {
    render(<ConditionPicker {...makeProps()} />);
    expect(screen.getByText('Conditions')).toBeInTheDocument();
  });
});

// ─── Active condition display (4.3) ──────────────────────────────────────────

describe('ConditionPicker — Active Conditions', () => {
  it('highlights active conditions with colored background', () => {
    const conditions: Condition[] = [{ name: 'Bleeding', level: 1 }];
    render(<ConditionPicker {...makeProps({ conditions })} />);
    const badge = screen.getByTestId('condition-Bleeding');
    expect(badge.style.background).toBe('rgba(200, 80, 80, 0.3)');
  });

  it('shows inactive conditions with default background', () => {
    render(<ConditionPicker {...makeProps({ conditions: [] })} />);
    const badge = screen.getByTestId('condition-Stunned');
    expect(badge.style.background).not.toBe('rgba(200, 80, 80, 0.3)');
  });

  it('shows level for stackable conditions with level > 1', () => {
    const conditions: Condition[] = [{ name: 'Ablaze', level: 3 }];
    render(<ConditionPicker {...makeProps({ conditions })} />);
    expect(screen.getByLabelText('Increment Ablaze')).toHaveTextContent('Ablaze (3)');
  });

  it('does not show level for conditions at level 1', () => {
    const conditions: Condition[] = [{ name: 'Stunned', level: 1 }];
    render(<ConditionPicker {...makeProps({ conditions })} />);
    expect(screen.getByLabelText('Increment Stunned')).toHaveTextContent('Stunned');
    expect(screen.getByLabelText('Increment Stunned')).not.toHaveTextContent('(1)');
  });

  it('shows ✕ remove button only for active conditions', () => {
    const conditions: Condition[] = [{ name: 'Prone', level: 1 }];
    render(<ConditionPicker {...makeProps({ conditions })} />);
    expect(screen.getByLabelText('Remove Prone')).toBeInTheDocument();
    expect(screen.queryByLabelText('Remove Stunned')).not.toBeInTheDocument();
  });
});

// ─── Apply and Remove (4.6) ──────────────────────────────────────────────────

describe('ConditionPicker — Apply and Remove', () => {
  it('calls onApply when tapping an inactive condition name', () => {
    const onApply = vi.fn();
    render(<ConditionPicker {...makeProps({ onApply })} />);
    fireEvent.click(screen.getByLabelText('Apply Stunned'));
    expect(onApply).toHaveBeenCalledWith('Stunned');
  });

  it('calls onApply when tapping an active condition name (increment)', () => {
    const onApply = vi.fn();
    const conditions: Condition[] = [{ name: 'Bleeding', level: 2 }];
    render(<ConditionPicker {...makeProps({ conditions, onApply })} />);
    fireEvent.click(screen.getByLabelText('Increment Bleeding'));
    expect(onApply).toHaveBeenCalledWith('Bleeding');
  });

  it('calls onRemove when tapping ✕ on an active condition', () => {
    const onRemove = vi.fn();
    const conditions: Condition[] = [{ name: 'Blinded', level: 1 }];
    render(<ConditionPicker {...makeProps({ conditions, onRemove })} />);
    fireEvent.click(screen.getByLabelText('Remove Blinded'));
    expect(onRemove).toHaveBeenCalledWith('Blinded');
  });
});

// ─── Info button / Tooltip (4.4) ─────────────────────────────────────────────

describe('ConditionPicker — Info Tooltip', () => {
  it('renders an info button for each condition', () => {
    render(<ConditionPicker {...makeProps()} />);
    for (const cond of CONDITIONS) {
      expect(screen.getByLabelText(`Info for ${cond.name}`)).toBeInTheDocument();
    }
  });

  it('opens tooltip when info button is clicked', () => {
    render(<ConditionPicker {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Info for Ablaze'));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Ablaze');
  });

  it('closes tooltip when info button is clicked again', () => {
    render(<ConditionPicker {...makeProps()} />);
    const infoBtn = screen.getByLabelText('Info for Ablaze');
    fireEvent.click(infoBtn);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.click(infoBtn);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

// ─── Close behavior (4.5) ────────────────────────────────────────────────────

describe('ConditionPicker — Close Behavior', () => {
  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<ConditionPicker {...makeProps({ onClose })} />);
    fireEvent.click(screen.getByLabelText('Close condition picker'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked (outside modal)', () => {
    const onClose = vi.fn();
    render(<ConditionPicker {...makeProps({ onClose })} />);
    fireEvent.click(screen.getByTestId('condition-picker-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when modal content is clicked', () => {
    const onClose = vi.fn();
    render(<ConditionPicker {...makeProps({ onClose })} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<ConditionPicker {...makeProps({ onClose })} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
