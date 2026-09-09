import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChipGroup, type ChipOption } from '../ChipGroup';

// ─── Task 14.2: chip touch-target size on small viewports (Req 10.4) ─────────
//
// ChipGroup.module.css sets min-width/min-height: 44px on .chip and .chipSelected
// (and re-affirms min-height on the mobile media query) to satisfy the UI-layout
// touch-target rule. Following the existing *.mobile.test.tsx convention
// (Picker/ConfirmDialog/EditableField), we mock the CSS module so class names
// are predictable strings and assert every chip carries the class that provides
// the ≥44px touch target on a mobile viewport. jsdom does not run layout, so the
// class assertion is how touch-target sizing is verified across the suite.

vi.mock('../ChipGroup.module.css', () => ({
  default: {
    group: 'group',
    chip: 'chip',
    // chipSelected composes chip; in the mock the selected chip carries both so
    // it inherits the same ≥44px touch-target sizing as an unselected chip.
    chipSelected: 'chipSelected chip',
  },
}));

// Mock a 375px mobile viewport (matches other *.mobile.test.tsx files).
beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('max-width: 767px'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

type Loc = 'H' | 'B' | 'L';

const OPTIONS: ChipOption<Loc>[] = [
  { value: 'H', label: 'Head' },
  { value: 'B', label: 'Body' },
  { value: 'L', label: 'Left Leg' },
];

function ControlledChipGroup() {
  const [value, setValue] = useState<Loc>('B');
  return (
    <ChipGroup<Loc>
      ariaLabel="Hit location"
      value={value}
      options={OPTIONS}
      onChange={setValue}
    />
  );
}

describe('ChipGroup mobile touch targets (Req 10.4)', () => {
  it('every chip carries the chip class that provides the ≥44px touch target', () => {
    render(<ControlledChipGroup />);
    const chips = screen.getAllByRole('radio');
    expect(chips).toHaveLength(3);
    chips.forEach((chip) => {
      // Both .chip and .chipSelected (which composes .chip) carry min-height 44px.
      expect(chip.className).toMatch(/\bchip\b/);
    });
  });

  it('the selected chip also carries the chip touch-target sizing', () => {
    render(<ControlledChipGroup />);
    const selected = screen.getByRole('radio', { name: 'Body' });
    expect(selected).toHaveAttribute('aria-checked', 'true');
    // chipSelected composes chip, so the selected chip keeps the 44px min sizing.
    expect(selected.className).toMatch(/chipSelected/);
    expect(selected.className).toMatch(/\bchip\b/);
  });
});
