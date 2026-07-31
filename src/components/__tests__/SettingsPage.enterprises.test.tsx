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

/** Find the toggle button sibling to a label text within a toggleRow */
function findToggleButton(labelText: string): HTMLButtonElement {
  const label = screen.getByText(labelText);
  // label is ruleLabel div → parent is toggleInfo → parent is toggleRow → querySelector button
  const toggleRow = label.parentElement!.parentElement!;
  return toggleRow.querySelector('button')!;
}

/** Find the description element sibling to a label text within a toggleRow */
function findToggleDescription(labelText: string): HTMLElement {
  const label = screen.getByText(labelText);
  // label is ruleLabel div → parent is toggleInfo → description is next sibling of label
  const toggleInfo = label.parentElement!;
  const descriptions = toggleInfo.querySelectorAll('[class*="ruleDesc"]');
  return descriptions[0] as HTMLElement;
}

// ─── 2.1: Enterprises toggle rendered in Optional Mechanics ─────────────────

describe('SettingsPage — Enterprises toggle (Requirements 2.1–2.6)', () => {
  it('renders the "Enterprises" toggle in the Optional Mechanics section', () => {
    render(<SettingsPage {...makeProps()} />);
    expect(screen.getByText('Enterprises')).toBeInTheDocument();
  });

  // ─── 2.2: Toggle label and description ──────────────────────────────────

  it('displays label "Enterprises" with description "Track business ventures and income sources (Archives Vol. III)"', () => {
    render(<SettingsPage {...makeProps()} />);
    expect(screen.getByText('Enterprises')).toBeInTheDocument();
    expect(screen.getByText('Track business ventures and income sources (Archives Vol. III)')).toBeInTheDocument();
  });

  // ─── 2.3: Toggle OFF state ──────────────────────────────────────────────

  it('shows OFF when useEnterprises is false (default)', () => {
    render(<SettingsPage {...makeProps()} />);
    const toggle = findToggleButton('Enterprises');
    expect(toggle).toHaveTextContent('OFF');
  });

  it('description has muted color when useEnterprises is false', () => {
    render(<SettingsPage {...makeProps()} />);
    const desc = findToggleDescription('Enterprises');
    expect(desc.style.color).toBe('var(--text-muted)');
  });

  // ─── 2.4: Toggle ON state ──────────────────────────────────────────────

  it('shows ON when useEnterprises is true', () => {
    const character = structuredClone(BLANK_CHARACTER);
    character.houseRules.useEnterprises = true;
    render(<SettingsPage {...makeProps({ character })} />);
    const toggle = findToggleButton('Enterprises');
    expect(toggle).toHaveTextContent('ON');
  });

  it('description has default color (no muted override) when useEnterprises is true', () => {
    const character = structuredClone(BLANK_CHARACTER);
    character.houseRules.useEnterprises = true;
    render(<SettingsPage {...makeProps({ character })} />);
    const desc = findToggleDescription('Enterprises');
    // When ON, no inline style is applied (style attribute is empty or not set to muted)
    expect(desc.style.color).not.toBe('var(--text-muted)');
  });

  // ─── 2.5: Toggle click calls update to flip value ───────────────────────

  it('clicking toggle calls update to enable useEnterprises when currently false', () => {
    const update = vi.fn();
    render(<SettingsPage {...makeProps({ update })} />);
    const toggle = findToggleButton('Enterprises');
    fireEvent.click(toggle);
    expect(update).toHaveBeenCalledWith('houseRules.useEnterprises', true);
  });

  it('clicking toggle calls update to disable useEnterprises when currently true', () => {
    const update = vi.fn();
    const character = structuredClone(BLANK_CHARACTER);
    character.houseRules.useEnterprises = true;
    render(<SettingsPage {...makeProps({ update, character })} />);
    const toggle = findToggleButton('Enterprises');
    fireEvent.click(toggle);
    expect(update).toHaveBeenCalledWith('houseRules.useEnterprises', false);
  });

  // ─── 2.6: Toggle immediately reflects new state after click ─────────────

  it('toggle immediately reflects new state after click (re-renders with updated character)', () => {
    const update = vi.fn();
    const character = structuredClone(BLANK_CHARACTER);
    character.houseRules.useEnterprises = false;

    const { rerender } = render(<SettingsPage {...makeProps({ update, character })} />);
    const toggle = findToggleButton('Enterprises');
    expect(toggle).toHaveTextContent('OFF');

    // Simulate the parent re-rendering with the updated value after the update call
    const updatedCharacter = structuredClone(BLANK_CHARACTER);
    updatedCharacter.houseRules.useEnterprises = true;
    rerender(<SettingsPage {...makeProps({ update, character: updatedCharacter })} />);

    const toggleAfter = findToggleButton('Enterprises');
    expect(toggleAfter).toHaveTextContent('ON');
  });
});
