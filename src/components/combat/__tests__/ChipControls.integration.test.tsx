import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AttackFlow } from '../AttackFlow';
import type { AttackFlowProps } from '../AttackFlow';
import { TakeDamagePanel } from '../TakeDamagePanel';
import type { TakeDamagePanelProps } from '../TakeDamagePanel';
import type { Character, WeaponItem, ArmourPoints } from '../../../types/character';
import { BLANK_CHARACTER } from '../../../types/character';

// ─── Task 14.2: chip controls for combat values (Req 10.1, 10.2, 10.3, 10.5) ──
//
// Verifies the two production chip controls surfaced by the select→chip
// migration (task 14.1): AttackFlow Difficulty and TakeDamagePanel Location.
// Both expose their options as a WAI-ARIA radiogroup and preserve every option
// that the prior native <select> offered.

// ─── AttackFlow (Difficulty) helpers ─────────────────────────────────────────

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    ...BLANK_CHARACTER,
    chars: {
      ...BLANK_CHARACTER.chars,
      WS: { i: 40, a: 10, b: 0 }, // total 50
      S: { i: 40, a: 5, b: 0 },   // total 45 → SB 4
    },
    ...overrides,
  };
}

function meleeWeapon(overrides: Partial<WeaponItem> = {}): WeaponItem {
  return {
    name: 'Hand Weapon',
    group: 'Basic',
    enc: '1',
    rangeReach: 'Average',
    damage: '+SB+4',
    qualities: '—',
    ...overrides,
  };
}

const armourPoints: ArmourPoints = {
  head: 2, lArm: 1, rArm: 1, body: 3, lLeg: 0, rLeg: 0, shield: 0,
};

function makeAttackProps(overrides: Partial<AttackFlowProps> = {}): AttackFlowProps {
  return {
    weapons: [meleeWeapon()],
    character: makeCharacter(),
    armourPoints,
    onRoll: vi.fn(),
    updateCharacter: vi.fn(),
    ...overrides,
  };
}

// All seven WFRP4e difficulty levels the old select offered. Chip labels append
// the test modifier, e.g. "Challenging (+0)", so match by a leading-name regex.
const DIFFICULTY_NAMES = [
  'Very Easy',
  'Easy',
  'Average',
  'Challenging',
  'Difficult',
  'Hard',
  'Very Hard',
] as const;

describe('AttackFlow Difficulty chips (Req 10.1, 10.3, 10.5)', () => {
  function openStep2() {
    render(<AttackFlow {...makeAttackProps()} />);
    // Selecting a weapon advances to Step 2 where Difficulty is chosen.
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
  }

  it('renders Difficulty as a radiogroup, not a native select (Req 10.1)', () => {
    openStep2();
    expect(screen.getByRole('radiogroup', { name: 'Difficulty' })).toBeInTheDocument();
    // No native combobox/listbox remains for difficulty.
    expect(screen.queryByRole('combobox', { name: 'Difficulty' })).not.toBeInTheDocument();
  });

  it('preserves all seven difficulty options as chips (Req 10.5)', () => {
    openStep2();
    for (const name of DIFFICULTY_NAMES) {
      // Very Easy / Very Hard are distinct from Easy / Hard; anchor at start.
      const chip = screen.getByRole('radio', { name: new RegExp(`^${name}\\b`) });
      expect(chip).toBeInTheDocument();
    }
    // Exactly seven difficulty chips exist.
    const group = screen.getByRole('radiogroup', { name: 'Difficulty' });
    expect(group.querySelectorAll('[role="radio"]')).toHaveLength(7);
  });

  it('indicates the selected difficulty via aria-checked (Req 10.3)', () => {
    openStep2();
    // Melee default is Challenging.
    expect(screen.getByRole('radio', { name: /^Challenging\b/ })).toHaveAttribute('aria-checked', 'true');
  });
});

// ─── TakeDamagePanel (Location) helpers ──────────────────────────────────────

function makeDamageProps(overrides: Partial<TakeDamagePanelProps> = {}): TakeDamagePanelProps {
  return {
    toughnessBonus: 4,
    armourPoints,
    wCur: 12,
    totalWounds: 14,
    onApplyWounds: vi.fn(),
    ...overrides,
  };
}

// All six WFRP4e hit locations the old select offered. Chip labels equal the
// location name exactly.
const LOCATION_NAMES = ['Head', 'Left Arm', 'Right Arm', 'Body', 'Left Leg', 'Right Leg'] as const;

describe('TakeDamagePanel Location chips (Req 10.2, 10.3, 10.5)', () => {
  it('renders Hit location as a radiogroup, not a native select (Req 10.2)', () => {
    render(<TakeDamagePanel {...makeDamageProps()} />);
    expect(screen.getByRole('radiogroup', { name: 'Hit location' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Hit location' })).not.toBeInTheDocument();
  });

  it('preserves all six hit-location options as chips (Req 10.5)', () => {
    render(<TakeDamagePanel {...makeDamageProps()} />);
    for (const name of LOCATION_NAMES) {
      expect(screen.getByRole('radio', { name })).toBeInTheDocument();
    }
    const group = screen.getByRole('radiogroup', { name: 'Hit location' });
    expect(group.querySelectorAll('[role="radio"]')).toHaveLength(6);
  });

  it('indicates the selected location via aria-checked (Req 10.3)', () => {
    render(<TakeDamagePanel {...makeDamageProps()} />);
    // Default selected location is Body.
    expect(screen.getByRole('radio', { name: 'Body' })).toHaveAttribute('aria-checked', 'true');
    // Selecting another chip moves the checked flag.
    fireEvent.click(screen.getByRole('radio', { name: 'Head' }));
    expect(screen.getByRole('radio', { name: 'Head' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Body' })).toHaveAttribute('aria-checked', 'false');
  });
});
