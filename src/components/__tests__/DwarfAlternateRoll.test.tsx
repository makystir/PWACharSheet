import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DwarfAlternateRoll } from '../shared/DwarfAlternateRoll';

// Helper to mock Math.random to produce a specific d100 result (1-100).
// Math.floor(Math.random() * 100) + 1 → for result R, random must return (R-1)/100.
function mockD100(result: number) {
  vi.spyOn(Math, 'random').mockReturnValue((result - 1) / 100);
}

// Mock Math.random to return different values on successive calls
function mockD100Sequence(...results: number[]) {
  const spy = vi.spyOn(Math, 'random');
  results.forEach((r) => {
    spy.mockReturnValueOnce((r - 1) / 100);
  });
  return spy;
}

const defaultProps = {
  variant: '',
  onHairUpdate: vi.fn(),
  onEyesUpdate: vi.fn(),
  onFeatureUpdate: vi.fn(),
  disabled: false,
};

function renderComponent(overrides: Partial<typeof defaultProps> = {}) {
  const props = {
    ...defaultProps,
    onHairUpdate: overrides.onHairUpdate ?? vi.fn(),
    onEyesUpdate: overrides.onEyesUpdate ?? vi.fn(),
    onFeatureUpdate: overrides.onFeatureUpdate ?? vi.fn(),
    ...overrides,
  };
  return { ...render(<DwarfAlternateRoll {...props} />), props };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DwarfAlternateRoll — Alternate Table Roll', () => {
  // **Validates: Requirements 10.1, 10.5**
  it('clicking "Alternate Table Roll" calls onHairUpdate and onEyesUpdate with table values', async () => {
    // Roll of 1 → row min:1 max:5 → hair: 'Pale Blond', eyes: 'Green'
    mockD100(1);
    const onHairUpdate = vi.fn();
    const onEyesUpdate = vi.fn();
    const user = userEvent.setup();

    renderComponent({ onHairUpdate, onEyesUpdate });

    const rollBtn = screen.getByRole('button', { name: 'Alternate Table Roll' });
    await user.click(rollBtn);

    expect(onHairUpdate).toHaveBeenCalledWith('Pale Blond');
    expect(onEyesUpdate).toHaveBeenCalledWith('Green');
  });

  // **Validates: Requirements 10.5**
  it('alternate table roll with roll=50 returns correct hair/eyes', async () => {
    // Roll of 50 → row min:46 max:50 → hair: 'Bronze', eyes: 'Hazel'
    mockD100(50);
    const onHairUpdate = vi.fn();
    const onEyesUpdate = vi.fn();
    const user = userEvent.setup();

    renderComponent({ onHairUpdate, onEyesUpdate });

    const rollBtn = screen.getByRole('button', { name: 'Alternate Table Roll' });
    await user.click(rollBtn);

    expect(onHairUpdate).toHaveBeenCalledWith('Bronze');
    expect(onEyesUpdate).toHaveBeenCalledWith('Hazel');
  });

  // **Validates: Requirements 10.5**
  it('alternate table roll shows the distinguishing feature for confirmation', async () => {
    // Roll of 1 → feature: 'Large Nose'
    mockD100(1);
    const user = userEvent.setup();

    renderComponent();

    const rollBtn = screen.getByRole('button', { name: 'Alternate Table Roll' });
    await user.click(rollBtn);

    expect(screen.getByText(/Feature:.*Large Nose/)).toBeInTheDocument();
  });
});

describe('DwarfAlternateRoll — Feature Confirmation Flow', () => {
  // **Validates: Requirements 10.5, 11.4**
  it('confirming the feature calls onFeatureUpdate with the feature value', async () => {
    // Roll of 96 → feature: 'Big Belly'
    mockD100(96);
    const onFeatureUpdate = vi.fn();
    const user = userEvent.setup();

    renderComponent({ onFeatureUpdate });

    const rollBtn = screen.getByRole('button', { name: 'Alternate Table Roll' });
    await user.click(rollBtn);

    expect(screen.getByText(/Feature:.*Big Belly/)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Confirm feature' });
    await user.click(confirmBtn);

    expect(onFeatureUpdate).toHaveBeenCalledWith('Big Belly');
  });

  // **Validates: Requirements 10.5**
  it('dismissing the feature does NOT call onFeatureUpdate', async () => {
    // Roll of 31 → feature: 'Attractive Eyes'
    mockD100(31);
    const onFeatureUpdate = vi.fn();
    const user = userEvent.setup();

    renderComponent({ onFeatureUpdate });

    const rollBtn = screen.getByRole('button', { name: 'Alternate Table Roll' });
    await user.click(rollBtn);

    expect(screen.getByText(/Feature:.*Attractive Eyes/)).toBeInTheDocument();

    const dismissBtn = screen.getByRole('button', { name: 'Dismiss feature' });
    await user.click(dismissBtn);

    expect(onFeatureUpdate).not.toHaveBeenCalled();
  });

  // **Validates: Requirements 10.5**
  it('feature confirmation UI disappears after confirming', async () => {
    mockD100(1);
    const user = userEvent.setup();

    renderComponent();

    const rollBtn = screen.getByRole('button', { name: 'Alternate Table Roll' });
    await user.click(rollBtn);

    expect(screen.getByText(/Feature:.*Large Nose/)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Confirm feature' });
    await user.click(confirmBtn);

    expect(screen.queryByText(/Feature:.*Large Nose/)).not.toBeInTheDocument();
  });

  // **Validates: Requirements 10.5**
  it('feature confirmation UI disappears after dismissing', async () => {
    mockD100(1);
    const user = userEvent.setup();

    renderComponent();

    const rollBtn = screen.getByRole('button', { name: 'Alternate Table Roll' });
    await user.click(rollBtn);

    expect(screen.getByText(/Feature:.*Large Nose/)).toBeInTheDocument();

    const dismissBtn = screen.getByRole('button', { name: 'Dismiss feature' });
    await user.click(dismissBtn);

    expect(screen.queryByText(/Feature:.*Large Nose/)).not.toBeInTheDocument();
  });
});

describe('DwarfAlternateRoll — Disabled State', () => {
  // **Validates: Requirements 10.6**
  it('alternate table roll button has aria-disabled="true" when disabled', () => {
    renderComponent({ disabled: true });

    const rollBtn = screen.getByRole('button', { name: 'Alternate Table Roll' });
    expect(rollBtn).toHaveAttribute('aria-disabled', 'true');
  });

  // **Validates: Requirements 10.6**
  it('clicking alternate table roll does nothing when disabled', async () => {
    mockD100(50);
    const onHairUpdate = vi.fn();
    const onEyesUpdate = vi.fn();
    const user = userEvent.setup();

    renderComponent({ disabled: true, onHairUpdate, onEyesUpdate });

    const rollBtn = screen.getByRole('button', { name: 'Alternate Table Roll' });
    await user.click(rollBtn);

    expect(onHairUpdate).not.toHaveBeenCalled();
    expect(onEyesUpdate).not.toHaveBeenCalled();
  });

  // **Validates: Requirements 10.6**
  it('"Roll Feature" button has aria-disabled="true" when disabled', () => {
    renderComponent({ disabled: true });

    const rollFeatureBtn = screen.getByRole('button', { name: 'Roll Feature' });
    expect(rollFeatureBtn).toHaveAttribute('aria-disabled', 'true');
  });

  // **Validates: Requirements 10.6**
  it('clicking "Roll Feature" does nothing when disabled', async () => {
    mockD100(50);
    const onFeatureUpdate = vi.fn();
    const user = userEvent.setup();

    renderComponent({ disabled: true, onFeatureUpdate });

    const rollFeatureBtn = screen.getByRole('button', { name: 'Roll Feature' });
    await user.click(rollFeatureBtn);

    expect(onFeatureUpdate).not.toHaveBeenCalled();
    // No feature confirmation should appear
    expect(screen.queryByRole('button', { name: 'Confirm feature' })).not.toBeInTheDocument();
  });
});

describe('DwarfAlternateRoll — Feature Replacement', () => {
  // **Validates: Requirements 11.5**
  it('a new alternate roll replaces the previously displayed feature', async () => {
    const user = userEvent.setup();
    // First roll: 1 → feature 'Large Nose'
    // Second roll: 96 → feature 'Big Belly'
    mockD100Sequence(1, 96);

    renderComponent();

    const rollBtn = screen.getByRole('button', { name: 'Alternate Table Roll' });

    // First roll
    await user.click(rollBtn);
    expect(screen.getByText(/Feature:.*Large Nose/)).toBeInTheDocument();

    // Second roll (without confirming first)
    await user.click(rollBtn);
    expect(screen.queryByText(/Feature:.*Large Nose/)).not.toBeInTheDocument();
    expect(screen.getByText(/Feature:.*Big Belly/)).toBeInTheDocument();
  });

  // **Validates: Requirements 11.5**
  it('confirming after replacement stores the latest feature', async () => {
    const onFeatureUpdate = vi.fn();
    const user = userEvent.setup();
    // First roll: 1 → feature 'Large Nose'
    // Second roll: 91 → feature 'Big Ears'
    mockD100Sequence(1, 91);

    renderComponent({ onFeatureUpdate });

    const rollBtn = screen.getByRole('button', { name: 'Alternate Table Roll' });

    // First roll
    await user.click(rollBtn);
    // Second roll replaces
    await user.click(rollBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Confirm feature' });
    await user.click(confirmBtn);

    expect(onFeatureUpdate).toHaveBeenCalledWith('Big Ears');
    expect(onFeatureUpdate).not.toHaveBeenCalledWith('Large Nose');
  });
});

describe('DwarfAlternateRoll — Roll Feature Button (standalone)', () => {
  // **Validates: Requirements 11.1, 11.2**
  it('"Roll Feature" button rolls d100 and directly calls onFeatureUpdate', async () => {
    // Roll of 61 → feature row min:61 max:65 → feature: 'Barrel-Chested'
    mockD100(61);
    const onFeatureUpdate = vi.fn();
    const user = userEvent.setup();

    renderComponent({ onFeatureUpdate });

    const rollFeatureBtn = screen.getByRole('button', { name: 'Roll Feature' });
    await user.click(rollFeatureBtn);

    expect(onFeatureUpdate).toHaveBeenCalledWith('Barrel-Chested');
  });

  // **Validates: Requirements 11.2**
  it('"Roll Feature" does not apply regional modifier', async () => {
    // Norse variant would normally shift by -5 for the alternate table,
    // but Roll Feature uses no modifier.
    // Roll of 6 → row min:6 max:10 → feature: 'Flat Nose' (unmodified)
    mockD100(6);
    const onFeatureUpdate = vi.fn();
    const user = userEvent.setup();

    renderComponent({ variant: 'Dwarfs (Norse)', onFeatureUpdate });

    const rollFeatureBtn = screen.getByRole('button', { name: 'Roll Feature' });
    await user.click(rollFeatureBtn);

    expect(onFeatureUpdate).toHaveBeenCalledWith('Flat Nose');
  });

  // **Validates: Requirements 11.1**
  it('"Roll Feature" does NOT call onHairUpdate or onEyesUpdate', async () => {
    mockD100(50);
    const onHairUpdate = vi.fn();
    const onEyesUpdate = vi.fn();
    const onFeatureUpdate = vi.fn();
    const user = userEvent.setup();

    renderComponent({ onHairUpdate, onEyesUpdate, onFeatureUpdate });

    const rollFeatureBtn = screen.getByRole('button', { name: 'Roll Feature' });
    await user.click(rollFeatureBtn);

    expect(onHairUpdate).not.toHaveBeenCalled();
    expect(onEyesUpdate).not.toHaveBeenCalled();
  });

  // **Validates: Requirements 11.5**
  it('"Roll Feature" replaces previous feature directly', async () => {
    const onFeatureUpdate = vi.fn();
    const user = userEvent.setup();
    // First: roll 1 → 'Large Nose', Second: roll 96 → 'Big Belly'
    mockD100Sequence(1, 96);

    renderComponent({ onFeatureUpdate });

    const rollFeatureBtn = screen.getByRole('button', { name: 'Roll Feature' });
    await user.click(rollFeatureBtn);
    await user.click(rollFeatureBtn);

    expect(onFeatureUpdate).toHaveBeenCalledTimes(2);
    expect(onFeatureUpdate).toHaveBeenNthCalledWith(1, 'Large Nose');
    expect(onFeatureUpdate).toHaveBeenNthCalledWith(2, 'Big Belly');
  });
});

describe('DwarfAlternateRoll — Feature Dropdown', () => {
  // **Validates: Requirements 11.3**
  it('renders a dropdown with all 20 distinguishing features', () => {
    renderComponent();

    const dropdown = screen.getByRole('combobox', { name: 'Select distinguishing feature' });
    const options = dropdown.querySelectorAll('option');
    // 20 features + 1 placeholder option
    const featureOptions = Array.from(options).filter(o => (o as HTMLOptionElement).value !== '');
    expect(featureOptions).toHaveLength(20);
  });

  // **Validates: Requirements 11.3, 11.4**
  it('selecting a feature from dropdown calls onFeatureUpdate', async () => {
    const onFeatureUpdate = vi.fn();
    const user = userEvent.setup();

    renderComponent({ onFeatureUpdate });

    const dropdown = screen.getByRole('combobox', { name: 'Select distinguishing feature' });
    await user.selectOptions(dropdown, 'Scarred Skin');

    expect(onFeatureUpdate).toHaveBeenCalledWith('Scarred Skin');
  });

  // **Validates: Requirements 11.5**
  it('selecting a new feature from dropdown replaces the previous one', async () => {
    const onFeatureUpdate = vi.fn();
    const user = userEvent.setup();

    renderComponent({ onFeatureUpdate });

    const dropdown = screen.getByRole('combobox', { name: 'Select distinguishing feature' });
    await user.selectOptions(dropdown, 'Large Nose');
    await user.selectOptions(dropdown, 'Big Belly');

    expect(onFeatureUpdate).toHaveBeenCalledWith('Large Nose');
    expect(onFeatureUpdate).toHaveBeenCalledWith('Big Belly');
    expect(onFeatureUpdate).toHaveBeenCalledTimes(2);
  });
});
