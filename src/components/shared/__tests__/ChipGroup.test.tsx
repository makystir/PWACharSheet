import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChipGroup, type ChipOption } from '../ChipGroup';

// ─── Tests for the reusable ChipGroup control (ux-audit-improvements Req 10) ──
//
// ChipGroup is the shared chip control that replaced the native <select> for
// frequently-changed combat values (AttackFlow Difficulty, TakeDamagePanel
// Location). It renders a WAI-ARIA radiogroup: container role="radiogroup"
// with an aria-label, each chip role="radio" carrying aria-checked, a roving
// tabindex, and Arrow/Home/End keyboard navigation that commits the selection.

type Size = 'S' | 'M' | 'L';

const SIZE_OPTIONS: ChipOption<Size>[] = [
  { value: 'S', label: 'Small' },
  { value: 'M', label: 'Medium' },
  { value: 'L', label: 'Large' },
];

/**
 * Controlled test host: ChipGroup is a controlled component (value + onChange),
 * so a stateful host is needed for the selection to actually move when a chip
 * is clicked or keyboard-navigated.
 */
function ControlledChipGroup({
  initial = 'M',
  onChangeSpy,
  ariaLabel = 'Size',
}: {
  initial?: Size;
  onChangeSpy?: (v: Size) => void;
  ariaLabel?: string;
}) {
  const [value, setValue] = useState<Size>(initial);
  return (
    <ChipGroup<Size>
      ariaLabel={ariaLabel}
      value={value}
      options={SIZE_OPTIONS}
      onChange={(v) => {
        onChangeSpy?.(v);
        setValue(v);
      }}
    />
  );
}

// ─── Req 10.5: all options present and selectable ────────────────────────────

describe('ChipGroup — all options present and selectable (Req 10.5)', () => {
  it('renders one radio per option, inside a labelled radiogroup', () => {
    render(<ControlledChipGroup />);
    const group = screen.getByRole('radiogroup', { name: 'Size' });
    expect(group).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(SIZE_OPTIONS.length);
    expect(screen.getByRole('radio', { name: 'Small' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Large' })).toBeInTheDocument();
  });

  it('selects an option and fires onChange when a chip is clicked', () => {
    const onChangeSpy = vi.fn();
    render(<ControlledChipGroup onChangeSpy={onChangeSpy} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Large' }));
    expect(onChangeSpy).toHaveBeenCalledWith('L');
    expect(screen.getByRole('radio', { name: 'Large' })).toHaveAttribute('aria-checked', 'true');
  });
});

// ─── Req 10.3: selected state indicated ──────────────────────────────────────

describe('ChipGroup — selected state indicated (Req 10.3)', () => {
  it('marks the current value with aria-checked=true and others false', () => {
    render(<ControlledChipGroup initial="M" />);
    expect(screen.getByRole('radio', { name: 'Medium' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Small' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'Large' })).toHaveAttribute('aria-checked', 'false');
  });

  it('moves the checked flag when the selection changes', () => {
    render(<ControlledChipGroup initial="M" />);
    fireEvent.click(screen.getByRole('radio', { name: 'Small' }));
    expect(screen.getByRole('radio', { name: 'Small' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Medium' })).toHaveAttribute('aria-checked', 'false');
  });

  it('applies a distinct CSS class to the selected chip (visual indication)', () => {
    render(<ControlledChipGroup initial="M" />);
    const selected = screen.getByRole('radio', { name: 'Medium' });
    const unselected = screen.getByRole('radio', { name: 'Small' });
    expect(selected.className).not.toBe(unselected.className);
    expect(selected.className).toMatch(/chipSelected/);
  });
});

// ─── Roving tabindex + keyboard operability (radiogroup semantics) ───────────

describe('ChipGroup — roving tabindex', () => {
  it('keeps only the selected chip in the tab order', () => {
    render(<ControlledChipGroup initial="M" />);
    expect(screen.getByRole('radio', { name: 'Medium' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Small' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('radio', { name: 'Large' })).toHaveAttribute('tabindex', '-1');
  });
});

describe('ChipGroup — keyboard navigation (Req 10 radiogroup semantics)', () => {
  it('ArrowRight moves and commits the selection to the next chip', () => {
    const onChangeSpy = vi.fn();
    render(<ControlledChipGroup initial="S" onChangeSpy={onChangeSpy} />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Small' }), { key: 'ArrowRight' });
    expect(onChangeSpy).toHaveBeenLastCalledWith('M');
    expect(screen.getByRole('radio', { name: 'Medium' })).toHaveAttribute('aria-checked', 'true');
  });

  it('ArrowDown behaves like ArrowRight', () => {
    render(<ControlledChipGroup initial="S" />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Small' }), { key: 'ArrowDown' });
    expect(screen.getByRole('radio', { name: 'Medium' })).toHaveAttribute('aria-checked', 'true');
  });

  it('ArrowLeft moves and commits the selection to the previous chip', () => {
    render(<ControlledChipGroup initial="M" />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Medium' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('radio', { name: 'Small' })).toHaveAttribute('aria-checked', 'true');
  });

  it('ArrowUp behaves like ArrowLeft', () => {
    render(<ControlledChipGroup initial="M" />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Medium' }), { key: 'ArrowUp' });
    expect(screen.getByRole('radio', { name: 'Small' })).toHaveAttribute('aria-checked', 'true');
  });

  it('ArrowRight wraps from the last chip to the first', () => {
    render(<ControlledChipGroup initial="L" />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Large' }), { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: 'Small' })).toHaveAttribute('aria-checked', 'true');
  });

  it('ArrowLeft wraps from the first chip to the last', () => {
    render(<ControlledChipGroup initial="S" />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Small' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('radio', { name: 'Large' })).toHaveAttribute('aria-checked', 'true');
  });

  it('Home jumps to the first chip', () => {
    render(<ControlledChipGroup initial="L" />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Large' }), { key: 'Home' });
    expect(screen.getByRole('radio', { name: 'Small' })).toHaveAttribute('aria-checked', 'true');
  });

  it('End jumps to the last chip', () => {
    render(<ControlledChipGroup initial="S" />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Small' }), { key: 'End' });
    expect(screen.getByRole('radio', { name: 'Large' })).toHaveAttribute('aria-checked', 'true');
  });

  it('ignores non-navigation keys', () => {
    const onChangeSpy = vi.fn();
    render(<ControlledChipGroup initial="M" onChangeSpy={onChangeSpy} />);
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Medium' }), { key: 'a' });
    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: 'Medium' })).toHaveAttribute('aria-checked', 'true');
  });
});
