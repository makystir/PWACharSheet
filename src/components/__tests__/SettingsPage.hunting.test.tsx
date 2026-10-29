import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsPage } from '../pages/SettingsPage';
import { BLANK_CHARACTER } from '../../types/character';
import type { ArmourPoints } from '../../types/character';

const defaultArmourPoints: ArmourPoints = {
  head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0,
};

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

function findToggleButton(labelText: string): HTMLButtonElement {
  const label = screen.getByText(labelText);
  const toggleRow = label.parentElement!.parentElement!;
  return toggleRow.querySelector('button')!;
}

function findToggleDescription(labelText: string): HTMLElement {
  const label = screen.getByText(labelText);
  const toggleInfo = label.parentElement!;
  const descriptions = toggleInfo.querySelectorAll('[class*="ruleDesc"]');
  return descriptions[0] as HTMLElement;
}

describe('SettingsPage — Hunting toggle (FR-1)', () => {
  it('renders the "Hunting" toggle in Optional Mechanics with the Deft Steps source label', () => {
    render(<SettingsPage {...makeProps()} />);
    expect(screen.getByText('Hunting')).toBeInTheDocument();
    expect(
      screen.getByText('Reference tables for hunting game, animals, and lodges (Deft Steps)'),
    ).toBeInTheDocument();
  });

  it('defaults to OFF with a muted description', () => {
    render(<SettingsPage {...makeProps()} />);
    expect(findToggleButton('Hunting')).toHaveTextContent('OFF');
    expect(findToggleDescription('Hunting').style.color).toBe('var(--text-muted)');
  });

  it('shows ON and the "Find it on" hint when enabled', () => {
    const character = structuredClone(BLANK_CHARACTER);
    character.houseRules.useHunting = true;
    render(<SettingsPage {...makeProps({ character })} />);
    expect(findToggleButton('Hunting')).toHaveTextContent('ON');
    expect(screen.getByText('Find it on: Endeavours page → Hunting tab')).toBeInTheDocument();
  });

  it('clicking the toggle calls update to flip useHunting', () => {
    const update = vi.fn();
    render(<SettingsPage {...makeProps({ update })} />);
    fireEvent.click(findToggleButton('Hunting'));
    expect(update).toHaveBeenCalledWith('houseRules.useHunting', true);
  });
});
