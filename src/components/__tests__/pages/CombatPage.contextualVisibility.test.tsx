import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatPage } from '../../pages/CombatPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function renderCombatPage(overrides: Partial<Character> = {}, extraProps: { rollHistory?: Array<{ name: string; result: number; target: number; sl: number; success: boolean; timestamp: number }>; clearHistory?: () => void } = {}) {
  const char = makeCharacter(overrides);
  const update = vi.fn();
  const updateCharacter = vi.fn();

  const { container } = render(
    <CombatPage
      character={char}
      characterId="test-char-id"
      update={update}
      updateCharacter={updateCharacter}
      totalWounds={10}
      armourPoints={defaultAP}
      maxEncumbrance={5}
      coinWeight={0}
      rollHistory={extraProps.rollHistory}
      clearHistory={extraProps.clearHistory}
    />
  );

  return { container, update, updateCharacter };
}

const COMBAT_ACTIVE = { inCombat: true, initiative: 0, currentRound: 1, engaged: false, surprised: false };

// ─── Requirement 8.1: SpellCastingPanel hidden when no spells/talents ───────

describe('CombatPage contextual visibility - SpellCastingPanel', () => {
  it('hides SpellCastingPanel when character has no spells and no spellcaster talents', () => {
    renderCombatPage({ spells: [], talents: [] });
    expect(screen.queryByText('Spells & Prayers')).not.toBeInTheDocument();
  });

  it('shows SpellCastingPanel when character has spells', () => {
    renderCombatPage({
      spells: [{ name: 'Fireball', cn: 6, range: '48', target: '1', duration: 'Instant', effect: 'damage', lore: 'Fire' }],
    });
    expect(screen.getByText('Spells & Prayers')).toBeInTheDocument();
  });

  it('shows SpellCastingPanel when character has a spellcasting talent', () => {
    renderCombatPage({
      spells: [],
      talents: [{ n: 'Arcane Magic', a: 1 }],
    });
    expect(screen.getByText('Spells & Prayers')).toBeInTheDocument();
  });
});

// ─── Requirement 8.2: Compact "Add Weapon" prompt when no weapons ───────────

describe('CombatPage contextual visibility - Weapons empty state', () => {
  it('shows compact "Add Weapon" prompt when character has no weapons', () => {
    renderCombatPage({ weapons: [] });
    // The EmptyState component renders "Add Weapon" as both heading and button label
    const addWeaponElements = screen.getAllByText('Add Weapon');
    expect(addWeaponElements.length).toBeGreaterThanOrEqual(1);
  });

  it('does not show the full WeaponCards empty state when weapons are empty', () => {
    renderCombatPage({ weapons: [] });
    expect(screen.queryByText('No weapons equipped — add one from the rulebook or create a custom weapon.')).not.toBeInTheDocument();
  });

  it('shows WeaponCards when character has weapons', () => {
    renderCombatPage({
      weapons: [{ name: 'Sword', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '—' }],
    });
    expect(screen.getByText('Sword')).toBeInTheDocument();
  });
});

// ─── Requirement 8.3: Hide Ammo Tracker when no ammo items ──────────────────

describe('CombatPage contextual visibility - Ammo Tracker', () => {
  it('hides Ammo Tracker section when character has no ammo items', () => {
    renderCombatPage({
      ammo: [],
      combatState: COMBAT_ACTIVE,
    });
    expect(screen.queryByText('Ammo Tracker')).not.toBeInTheDocument();
  });

  it('shows Ammo Tracker section when character has ammo items', () => {
    renderCombatPage({
      ammo: [{ name: 'Arrows', quantity: 12, max: 12, enc: '0', qualities: '' }],
      combatState: COMBAT_ACTIVE,
    });
    // Ammo Tracker is in Status mode
    fireEvent.click(screen.getByRole('tab', { name: 'Status' }));
    expect(screen.getByText('Ammo Tracker')).toBeInTheDocument();
  });
});

// ─── Requirement 8.4: Hide Roll History when empty ──────────────────────────

describe('CombatPage contextual visibility - Roll History', () => {
  it('hides Roll History section when rollHistory is empty', () => {
    renderCombatPage(
      { combatState: COMBAT_ACTIVE },
      { rollHistory: [], clearHistory: vi.fn() },
    );
    expect(screen.queryByText('Roll History')).not.toBeInTheDocument();
  });

  it('hides Roll History section when rollHistory is undefined', () => {
    renderCombatPage(
      { combatState: COMBAT_ACTIVE },
      { rollHistory: undefined, clearHistory: undefined },
    );
    expect(screen.queryByText('Roll History')).not.toBeInTheDocument();
  });

  it('shows Roll History section when rollHistory has entries', () => {
    renderCombatPage(
      { combatState: COMBAT_ACTIVE },
      {
        rollHistory: [{ name: 'Melee (Basic)', result: 42, target: 50, sl: 0, success: true, timestamp: Date.now() }],
        clearHistory: vi.fn(),
      },
    );
    // Roll History is in Status mode
    fireEvent.click(screen.getByRole('tab', { name: 'Status' }));
    expect(screen.getByText('Roll History')).toBeInTheDocument();
  });
});

// ─── Requirement 14.1: FortuneResolvePanel hidden/collapsed when dashboard active ──

describe('CombatPage contextual visibility - Fortune/Resolve Panel', () => {
  it('renders Fortune & Resolve as a collapsed section (dashboard shows compact version)', () => {
    const { container } = renderCombatPage({ combatState: COMBAT_ACTIVE });
    // Fortune & Resolve is in Status mode
    fireEvent.click(screen.getByRole('tab', { name: 'Status' }));
    // The Fortune & Resolve section is wrapped in a CollapsibleSection that is collapsed by default
    const fortuneHeader = screen.getByText('Fortune & Resolve');
    expect(fortuneHeader).toBeInTheDocument();
    // The content should be collapsed (aria-hidden="true" on content wrapper)
    const collapsibleContent = fortuneHeader.closest('[class*="header"]')?.parentElement?.querySelector('[aria-hidden]');
    expect(collapsibleContent).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not render the FortuneResolvePanel content visibly by default', () => {
    renderCombatPage({ combatState: COMBAT_ACTIVE });
    // The full panel's interactive elements (Spend Fortune/Resolve buttons) should not be accessible
    // since the CollapsibleSection is collapsed by default
    expect(screen.queryByText('Spend Fortune')).not.toBeInTheDocument();
  });
});
