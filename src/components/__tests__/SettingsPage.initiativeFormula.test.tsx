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
    characterId: 'test-char',
    update: vi.fn(),
    updateCharacter: vi.fn(),
    totalWounds: 10,
    armourPoints: defaultArmourPoints,
    maxEncumbrance: 0,
    coinWeight: 0,
    ...overrides,
  };
}

const PLUS_D10 = 'Initiative + 1d10';
const AGILITY_TEST = 'Initiative/Agility Test';

// ─── 7.2 / 7.3: Initiative Formula selector rendering (Req 4.4) ──────────────

describe('SettingsPage — Initiative Formula selector rendering', () => {
  it('renders the Initiative Formula rule with both options', () => {
    render(<SettingsPage {...makeProps()} />);
    expect(screen.getByText('Initiative Formula')).toBeInTheDocument();
    expect(screen.getByText('How Initiative order is rolled in combat')).toBeInTheDocument();
    expect(screen.getByText(PLUS_D10)).toBeInTheDocument();
    expect(screen.getByText(AGILITY_TEST)).toBeInTheDocument();
  });
});

// ─── 7.3: Selector updates houseRules.initiativeFormula (Req 4.4) ────────────

describe('SettingsPage — Initiative Formula selector updates the house rule', () => {
  it('clicking "Initiative/Agility Test" calls update with initiativeAgilityTest', () => {
    const update = vi.fn();
    render(<SettingsPage {...makeProps({ update })} />);
    fireEvent.click(screen.getByText(AGILITY_TEST));
    expect(update).toHaveBeenCalledWith('houseRules.initiativeFormula', 'initiativeAgilityTest');
  });

  it('clicking "Initiative + 1d10" calls update with initiativePlusD10', () => {
    const update = vi.fn();
    render(<SettingsPage {...makeProps({ update })} />);
    fireEvent.click(screen.getByText(PLUS_D10));
    expect(update).toHaveBeenCalledWith('houseRules.initiativeFormula', 'initiativePlusD10');
  });
});

// ─── 7.3: Active state reflects the current formula ──────────────────────────

describe('SettingsPage — Initiative Formula active state', () => {
  it('marks "Initiative + 1d10" active by default', () => {
    render(<SettingsPage {...makeProps()} />);
    expect(screen.getByText(PLUS_D10).className).toContain('selectorBtnActive');
    expect(screen.getByText(AGILITY_TEST).className).not.toContain('selectorBtnActive');
  });

  it('marks "Initiative/Agility Test" active when configured', () => {
    const character = structuredClone(BLANK_CHARACTER);
    character.houseRules.initiativeFormula = 'initiativeAgilityTest';
    render(<SettingsPage {...makeProps({ character })} />);
    expect(screen.getByText(AGILITY_TEST).className).toContain('selectorBtnActive');
    expect(screen.getByText(PLUS_D10).className).not.toContain('selectorBtnActive');
  });
});
