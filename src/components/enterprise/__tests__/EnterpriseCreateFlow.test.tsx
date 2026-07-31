import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnterpriseCreateFlow } from '../EnterpriseCreateFlow';

// ─── Test helpers ────────────────────────────────────────────────────────────

function setup() {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const result = render(<EnterpriseCreateFlow onConfirm={onConfirm} onCancel={onCancel} />);
  return { onConfirm, onCancel, ...result };
}

const TEMPLATE_DISPLAY_NAMES = [
  'Courier Service',
  'Crafting Workshop',
  'Criminal Gang',
  'Holy Temple',
  'Knightly Order',
  'Tavern',
  'Market Parlour',
  'Noble Estate',
  'Performance Troupe',
  'Publishing House',
];

// ─── 5.1: Template selection renders all 10 types ────────────────────────────

describe('EnterpriseCreateFlow (Requirements 5.1, 5.3, 5.4, 5.5, 5.6)', () => {
  it('renders all 10 enterprise types by display name', () => {
    setup();
    for (const name of TEMPLATE_DISPLAY_NAMES) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  // ─── 5.3: Selecting a template advances to name input step ────────────────

  it('selecting a template advances to the name input step', () => {
    setup();
    fireEvent.click(screen.getByText('Tavern'));
    expect(screen.getByLabelText('Enterprise name')).toBeInTheDocument();
    expect(screen.getByText('Name Your Enterprise')).toBeInTheDocument();
  });

  // ─── 5.3 + confirm: Entering a valid name and confirming calls onConfirm ──

  it('entering a valid name and confirming calls onConfirm with correct type and trimmed name', () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByText('Criminal Gang'));
    const input = screen.getByLabelText('Enterprise name');
    fireEvent.change(input, { target: { value: '  The Thieves Guild  ' } });
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledWith('Criminal Gang', 'The Thieves Guild');
  });

  // ─── 5.4: Empty name shows validation error ───────────────────────────────

  it('submitting an empty name shows validation error and does NOT call onConfirm', () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByText('Tavern'));
    // Leave input empty and click confirm
    fireEvent.click(screen.getByText('Confirm'));
    expect(screen.getByRole('alert')).toHaveTextContent('Enterprise name cannot be empty');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // ─── 5.4: Whitespace-only name shows validation error ─────────────────────

  it('submitting a whitespace-only name shows validation error and does NOT call onConfirm', () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByText('Noble Estate'));
    const input = screen.getByLabelText('Enterprise name');
    fireEvent.change(input, { target: { value: '   \t  ' } });
    fireEvent.click(screen.getByText('Confirm'));
    expect(screen.getByRole('alert')).toHaveTextContent('Enterprise name cannot be empty');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // ─── 5.5: Cancel at step 1 calls onCancel ─────────────────────────────────

  it('clicking Cancel at step 1 (template selection) calls onCancel', () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // ─── 5.5: Cancel at step 2 calls onCancel ─────────────────────────────────

  it('clicking Cancel at step 2 (name input) calls onCancel', () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByText('Crafting Workshop'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // ─── Back at step 2 returns to template selection ──────────────────────────

  it('clicking Back at step 2 returns to template selection without calling onCancel', () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByText('Holy Temple'));
    // We're now at step 2
    expect(screen.getByLabelText('Enterprise name')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Back'));
    // Should be back at step 1 showing template list
    expect(screen.getByText('Select Enterprise Type')).toBeInTheDocument();
    for (const name of TEMPLATE_DISPLAY_NAMES) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(onCancel).not.toHaveBeenCalled();
  });
});
