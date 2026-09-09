import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AttackFlow } from '../AttackFlow';
import type { AttackFlowProps } from '../AttackFlow';
import type { Character, ArmourPoints } from '../../../types/character';
import { BLANK_CHARACTER } from '../../../types/character';

// ─── Test helpers ────────────────────────────────────────────────────────────

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    ...BLANK_CHARACTER,
    ...overrides,
  };
}

const defaultArmourPoints: ArmourPoints = {
  head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0,
};

function makeProps(overrides: Partial<AttackFlowProps> = {}): AttackFlowProps {
  return {
    weapons: [],
    character: makeCharacter(),
    armourPoints: defaultArmourPoints,
    onRoll: vi.fn(),
    updateCharacter: vi.fn(),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AttackFlow — action-oriented empty state (Requirements 12.1, 12.3)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders copy directing the user to add a weapon when there are no weapons', () => {
    render(<AttackFlow {...makeProps({ weapons: [] })} />);

    // Heading + description reference adding a weapon (action-oriented copy).
    expect(screen.getByText('No weapons available')).toBeInTheDocument();
    expect(screen.getByText(/add a weapon/i)).toBeInTheDocument();
  });

  it('shows an "Add Weapon" action button and invokes onAddWeapon when clicked', () => {
    const onAddWeapon = vi.fn();
    render(<AttackFlow {...makeProps({ weapons: [], onAddWeapon })} />);

    const addBtn = screen.getByRole('button', { name: /add weapon/i });
    expect(addBtn).toBeInTheDocument();

    fireEvent.click(addBtn);
    expect(onAddWeapon).toHaveBeenCalledTimes(1);
  });

  it('does not render the add-weapon action button when no onAddWeapon callback is provided', () => {
    render(<AttackFlow {...makeProps({ weapons: [] })} />);

    // The directive copy is still present, but there is no action button.
    expect(screen.getByText(/add a weapon/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add weapon/i })).not.toBeInTheDocument();
  });
});
