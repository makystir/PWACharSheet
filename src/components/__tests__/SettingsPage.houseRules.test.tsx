import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsPage } from '../pages/SettingsPage';
import { BLANK_CHARACTER } from '../../types/character';
import type { ArmourPoints } from '../../types/character';

// ─── Test helpers ────────────────────────────────────────────────────────────

const defaultArmourPoints: ArmourPoints = {
  head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeProps(overrides: Record<string, any> = {}): any {
  return {
    character: structuredClone(BLANK_CHARACTER),
    update: vi.fn(),
    updateCharacter: vi.fn(),
    totalWounds: 10,
    armourPoints: defaultArmourPoints,
    maxEncumbrance: 0,
    coinWeight: 0,
    ...overrides,
  };
}

// ─── 5.2: House Rules card renders all four controls ────────────────────────

describe('SettingsPage — House Rules card rendering', () => {
  it('renders the House Rules section header', () => {
    render(<SettingsPage {...makeProps()} />);
    expect(screen.getByText('House Rules')).toBeInTheDocument();
  });

  it('renders the Ranged Damage SB selector with three options', () => {
    render(<SettingsPage {...makeProps()} />);
    expect(screen.getByText('Ranged Damage SB')).toBeInTheDocument();
    expect(screen.getByText('None (RAW)')).toBeInTheDocument();
    expect(screen.getByText('Half SB')).toBeInTheDocument();
    expect(screen.getByText('Full SB')).toBeInTheDocument();
  });

  it('renders the Impale Crits on 10s toggle', () => {
    render(<SettingsPage {...makeProps()} />);
    expect(screen.getByText('Impale Crits on 10s')).toBeInTheDocument();
    expect(screen.getByText('Impale weapons crit on multiples of 10')).toBeInTheDocument();
  });

  it('renders the Minimum 1 Wound toggle with RAW label', () => {
    render(<SettingsPage {...makeProps()} />);
    expect(screen.getByText('Minimum 1 Wound (RAW)')).toBeInTheDocument();
    expect(screen.getByText('Hits that overcome TB+AP deal at least 1 wound')).toBeInTheDocument();
  });

  it('renders the Advantage Cap numeric input', () => {
    render(<SettingsPage {...makeProps()} />);
    expect(screen.getByText('Advantage Cap')).toBeInTheDocument();
    expect(screen.getByText('Max advantage (0 = uncapped). RAW: IB')).toBeInTheDocument();
  });
});

// ─── 5.2: Ranged Damage SB selector ────────────────────────────────────────

describe('SettingsPage — Ranged Damage SB selector', () => {
  it('clicking "Half SB" calls update with halfSB', () => {
    const update = vi.fn();
    render(<SettingsPage {...makeProps({ update })} />);
    fireEvent.click(screen.getByText('Half SB'));
    expect(update).toHaveBeenCalledWith('houseRules.rangedDamageSBMode', 'halfSB');
  });

  it('clicking "Full SB" calls update with fullSB', () => {
    const update = vi.fn();
    render(<SettingsPage {...makeProps({ update })} />);
    fireEvent.click(screen.getByText('Full SB'));
    expect(update).toHaveBeenCalledWith('houseRules.rangedDamageSBMode', 'fullSB');
  });

  it('clicking "None (RAW)" calls update with none', () => {
    const update = vi.fn();
    render(<SettingsPage {...makeProps({ update })} />);
    fireEvent.click(screen.getByText('None (RAW)'));
    expect(update).toHaveBeenCalledWith('houseRules.rangedDamageSBMode', 'none');
  });

  it('active button matches character.houseRules.rangedDamageSBMode = none (default)', () => {
    const props = makeProps();
    // Default is 'none'
    render(<SettingsPage {...props} />);
    const noneBtn = screen.getByText('None (RAW)');
    const halfBtn = screen.getByText('Half SB');
    const fullBtn = screen.getByText('Full SB');
    // Active button gets selectorBtnActive class, inactive gets selectorBtn
    expect(noneBtn.className).toContain('selectorBtnActive');
    expect(halfBtn.className).not.toContain('selectorBtnActive');
    expect(fullBtn.className).not.toContain('selectorBtnActive');
  });

  it('active button matches character.houseRules.rangedDamageSBMode = halfSB', () => {
    const character = structuredClone(BLANK_CHARACTER);
    character.houseRules.rangedDamageSBMode = 'halfSB';
    render(<SettingsPage {...makeProps({ character })} />);
    const noneBtn = screen.getByText('None (RAW)');
    const halfBtn = screen.getByText('Half SB');
    const fullBtn = screen.getByText('Full SB');
    expect(noneBtn.className).not.toContain('selectorBtnActive');
    expect(halfBtn.className).toContain('selectorBtnActive');
    expect(fullBtn.className).not.toContain('selectorBtnActive');
  });

  it('active button matches character.houseRules.rangedDamageSBMode = fullSB', () => {
    const character = structuredClone(BLANK_CHARACTER);
    character.houseRules.rangedDamageSBMode = 'fullSB';
    render(<SettingsPage {...makeProps({ character })} />);
    const noneBtn = screen.getByText('None (RAW)');
    const halfBtn = screen.getByText('Half SB');
    const fullBtn = screen.getByText('Full SB');
    expect(noneBtn.className).not.toContain('selectorBtnActive');
    expect(halfBtn.className).not.toContain('selectorBtnActive');
    expect(fullBtn.className).toContain('selectorBtnActive');
  });
});

// ─── 5.2: Impale Crits on 10s toggle ───────────────────────────────────────

/** Find the toggle button sibling to a label text within a toggleRow */
function findToggleButton(labelText: string): HTMLButtonElement {
  const label = screen.getByText(labelText);
  // label is ruleLabel div → parent is toggleInfo → parent is toggleRow → querySelector button
  const toggleRow = label.parentElement!.parentElement!;
  return toggleRow.querySelector('button')!;
}

describe('SettingsPage — Impale Crits on 10s toggle', () => {
  it('shows OFF when impaleCritsOnTens is false (default)', () => {
    render(<SettingsPage {...makeProps()} />);
    const impaleToggle = findToggleButton('Impale Crits on 10s');
    expect(impaleToggle).toHaveTextContent('OFF');
  });

  it('shows ON when impaleCritsOnTens is true', () => {
    const character = structuredClone(BLANK_CHARACTER);
    character.houseRules.impaleCritsOnTens = true;
    render(<SettingsPage {...makeProps({ character })} />);
    const impaleToggle = findToggleButton('Impale Crits on 10s');
    expect(impaleToggle).toHaveTextContent('ON');
  });

  it('clicking toggle calls update to enable impaleCritsOnTens', () => {
    const update = vi.fn();
    render(<SettingsPage {...makeProps({ update })} />);
    // Default is false, so clicking should call update with true
    const impaleToggle = findToggleButton('Impale Crits on 10s');
    fireEvent.click(impaleToggle);
    expect(update).toHaveBeenCalledWith('houseRules.impaleCritsOnTens', true);
  });

  it('clicking toggle calls update to disable impaleCritsOnTens', () => {
    const update = vi.fn();
    const character = structuredClone(BLANK_CHARACTER);
    character.houseRules.impaleCritsOnTens = true;
    render(<SettingsPage {...makeProps({ update, character })} />);
    const impaleToggle = findToggleButton('Impale Crits on 10s');
    fireEvent.click(impaleToggle);
    expect(update).toHaveBeenCalledWith('houseRules.impaleCritsOnTens', false);
  });
});

// ─── 5.2: Minimum 1 Wound toggle ───────────────────────────────────────────

describe('SettingsPage — Minimum 1 Wound toggle', () => {
  it('shows ON when min1Wound is true (default/RAW)', () => {
    render(<SettingsPage {...makeProps()} />);
    const min1Toggle = findToggleButton('Minimum 1 Wound (RAW)');
    expect(min1Toggle).toHaveTextContent('ON');
  });

  it('shows OFF when min1Wound is false', () => {
    const character = structuredClone(BLANK_CHARACTER);
    character.houseRules.min1Wound = false;
    render(<SettingsPage {...makeProps({ character })} />);
    const min1Toggle = findToggleButton('Minimum 1 Wound (RAW)');
    expect(min1Toggle).toHaveTextContent('OFF');
  });

  it('clicking toggle calls update to disable min1Wound', () => {
    const update = vi.fn();
    render(<SettingsPage {...makeProps({ update })} />);
    // Default is true, so clicking should call update with false
    const min1Toggle = findToggleButton('Minimum 1 Wound (RAW)');
    fireEvent.click(min1Toggle);
    expect(update).toHaveBeenCalledWith('houseRules.min1Wound', false);
  });

  it('clicking toggle calls update to enable min1Wound', () => {
    const update = vi.fn();
    const character = structuredClone(BLANK_CHARACTER);
    character.houseRules.min1Wound = false;
    render(<SettingsPage {...makeProps({ update, character })} />);
    const min1Toggle = findToggleButton('Minimum 1 Wound (RAW)');
    fireEvent.click(min1Toggle);
    expect(update).toHaveBeenCalledWith('houseRules.min1Wound', true);
  });
});

// ─── 5.2: Advantage Cap numeric input ───────────────────────────────────────

describe('SettingsPage — Advantage Cap input', () => {
  it('displays the default advantage cap value (10)', () => {
    render(<SettingsPage {...makeProps()} />);
    const input = screen.getByDisplayValue('10') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe('number');
  });

  it('changing value calls update with the new number', () => {
    const update = vi.fn();
    render(<SettingsPage {...makeProps({ update })} />);
    const input = screen.getByDisplayValue('10');
    fireEvent.change(input, { target: { value: '5' } });
    expect(update).toHaveBeenCalledWith('houseRules.advantageCap', 5);
  });

  it('clamps value to 0 when negative is entered', () => {
    const update = vi.fn();
    render(<SettingsPage {...makeProps({ update })} />);
    const input = screen.getByDisplayValue('10');
    fireEvent.change(input, { target: { value: '-3' } });
    expect(update).toHaveBeenCalledWith('houseRules.advantageCap', 0);
  });

  it('clamps value to 99 when value exceeds 99', () => {
    const update = vi.fn();
    render(<SettingsPage {...makeProps({ update })} />);
    const input = screen.getByDisplayValue('10');
    fireEvent.change(input, { target: { value: '150' } });
    expect(update).toHaveBeenCalledWith('houseRules.advantageCap', 99);
  });

  it('treats empty input as 0', () => {
    const update = vi.fn();
    render(<SettingsPage {...makeProps({ update })} />);
    const input = screen.getByDisplayValue('10');
    fireEvent.change(input, { target: { value: '' } });
    expect(update).toHaveBeenCalledWith('houseRules.advantageCap', 0);
  });

  it('displays custom advantage cap value', () => {
    const character = structuredClone(BLANK_CHARACTER);
    character.houseRules.advantageCap = 3;
    render(<SettingsPage {...makeProps({ character })} />);
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
  });

  it('allows 0 for uncapped', () => {
    const update = vi.fn();
    render(<SettingsPage {...makeProps({ update })} />);
    const input = screen.getByDisplayValue('10');
    fireEvent.change(input, { target: { value: '0' } });
    expect(update).toHaveBeenCalledWith('houseRules.advantageCap', 0);
  });
});

// ─── 5.2: RAW default labels ────────────────────────────────────────────────

describe('SettingsPage — RAW default labels', () => {
  it('Ranged Damage SB shows "None (RAW)" as the RAW option', () => {
    render(<SettingsPage {...makeProps()} />);
    expect(screen.getByText('None (RAW)')).toBeInTheDocument();
  });

  it('Minimum 1 Wound label includes "(RAW)"', () => {
    render(<SettingsPage {...makeProps()} />);
    expect(screen.getByText('Minimum 1 Wound (RAW)')).toBeInTheDocument();
  });

  it('Advantage Cap description mentions RAW: IB', () => {
    render(<SettingsPage {...makeProps()} />);
    expect(screen.getByText('Max advantage (0 = uncapped). RAW: IB')).toBeInTheDocument();
  });

  it('Impale Crits on 10s defaults to OFF (RAW is no impale crits on 10s)', () => {
    render(<SettingsPage {...makeProps()} />);
    const impaleToggle = findToggleButton('Impale Crits on 10s');
    expect(impaleToggle).toHaveTextContent('OFF');
  });
});
