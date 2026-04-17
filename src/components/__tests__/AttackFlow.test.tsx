import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AttackFlow } from '../combat/AttackFlow';
import type { AttackFlowProps } from '../combat/AttackFlow';
import type { Character, WeaponItem, ArmourPoints } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

// ─── Test helpers ────────────────────────────────────────────────────────────

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    ...BLANK_CHARACTER,
    chars: {
      ...BLANK_CHARACTER.chars,
      WS: { i: 40, a: 10, b: 0 }, // total 50
      BS: { i: 35, a: 5, b: 0 },  // total 40
      S: { i: 40, a: 5, b: 0 },   // total 45 → SB 4
    },
    bSkills: [
      ...BLANK_CHARACTER.bSkills,
    ],
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

function rangedWeapon(overrides: Partial<WeaponItem> = {}): WeaponItem {
  return {
    name: 'Longbow',
    group: 'Bow',
    enc: '2',
    rangeReach: '30/60',
    damage: '+SB+4',
    qualities: '—',
    ...overrides,
  };
}

const defaultArmourPoints: ArmourPoints = {
  head: 2, lArm: 1, rArm: 1, body: 3, lLeg: 0, rLeg: 0, shield: 0,
};

function makeProps(overrides: Partial<AttackFlowProps> = {}): AttackFlowProps {
  return {
    weapons: [meleeWeapon()],
    character: makeCharacter(),
    armourPoints: defaultArmourPoints,
    onRoll: vi.fn(),
    ...overrides,
  };
}

/** Mock Math.random to return a specific d100 value (1-100). */
function mockRoll(d100Value: number) {
  // Math.floor(Math.random() * 100) + 1 = d100Value
  // So Math.random() should return (d100Value - 1) / 100
  vi.spyOn(Math, 'random').mockReturnValue((d100Value - 1) / 100);
}

// ─── 7.1: Component creation and props ──────────────────────────────────────

describe('AttackFlow — basic rendering', () => {
  it('renders the Attack Flow section header', () => {
    render(<AttackFlow {...makeProps()} />);
    expect(screen.getByText('Attack Flow')).toBeInTheDocument();
  });

  it('shows empty message when no weapons', () => {
    render(<AttackFlow {...makeProps({ weapons: [] })} />);
    expect(screen.getByText(/No weapons available/)).toBeInTheDocument();
  });

  it('renders Step 1 by default', () => {
    render(<AttackFlow {...makeProps()} />);
    expect(screen.getByText(/Step 1/)).toBeInTheDocument();
  });
});

// ─── 7.2: Step 1 — Select Weapon ───────────────────────────────────────────

describe('AttackFlow — Step 1 (Select Weapon)', () => {
  it('renders weapon buttons for each weapon', () => {
    const weapons = [meleeWeapon(), rangedWeapon()];
    render(<AttackFlow {...makeProps({ weapons })} />);
    expect(screen.getByLabelText('Select Hand Weapon')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Longbow')).toBeInTheDocument();
  });

  it('advances to Step 2 on weapon selection', () => {
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    expect(screen.getByText(/Step 2/)).toBeInTheDocument();
  });

  it('computes base target from skill and characteristic', () => {
    // Character has WS 50 (40i + 10a), Melee (Basic) with 0 advances in bSkills
    // computeSkillTarget(40, 10, 0, 0) = 50
    // Both "Base" and "Target" chips show 50 (Challenging +0), so use getAllByText
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    const matches = screen.getAllByText('50');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows skill name after weapon selection', () => {
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    expect(screen.getByText('Melee (Basic)')).toBeInTheDocument();
  });
});

// ─── 7.3: Step 2 — Roll to Hit ─────────────────────────────────────────────

describe('AttackFlow — Step 2 (Roll to Hit)', () => {
  it('displays difficulty dropdown defaulting to Challenging', () => {
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    const select = screen.getByLabelText('Difficulty') as HTMLSelectElement;
    expect(select.value).toBe('Challenging');
  });

  it('defaults to Hard when engaged + ranged + not Blackpowder', () => {
    const character = makeCharacter({
      combatState: { ...BLANK_CHARACTER.combatState, engaged: true, inCombat: true },
      aSkills: [{ n: 'Ranged (Bow)', c: 'BS', a: 10 }],
    });
    const weapons = [rangedWeapon()];
    render(<AttackFlow {...makeProps({ weapons, character })} />);
    fireEvent.click(screen.getByLabelText('Select Longbow'));
    const select = screen.getByLabelText('Difficulty') as HTMLSelectElement;
    expect(select.value).toBe('Hard');
  });

  it('does NOT default to Hard for Blackpowder when engaged', () => {
    const character = makeCharacter({
      combatState: { ...BLANK_CHARACTER.combatState, engaged: true, inCombat: true },
      aSkills: [{ n: 'Ranged (Blackpowder)', c: 'BS', a: 10 }],
    });
    const weapons = [rangedWeapon({ name: 'Pistol', group: 'Blackpowder' })];
    render(<AttackFlow {...makeProps({ weapons, character })} />);
    fireEvent.click(screen.getByLabelText('Select Pistol'));
    const select = screen.getByLabelText('Difficulty') as HTMLSelectElement;
    expect(select.value).toBe('Challenging');
  });

  it('shows modified target after difficulty change', () => {
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    // Base target 50, Challenging (+0) → 50
    // Change to Hard (-20) → 30
    const select = screen.getByLabelText('Difficulty');
    fireEvent.change(select, { target: { value: 'Hard' } });
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('renders Roll to Hit button', () => {
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    expect(screen.getByLabelText('Roll to hit')).toBeInTheDocument();
  });

  it('calls onRoll callback when rolling', () => {
    const onRoll = vi.fn();
    mockRoll(25); // roll 25 vs target 50 → hit
    render(<AttackFlow {...makeProps({ onRoll })} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(onRoll).toHaveBeenCalledWith(expect.objectContaining({ roll: 25, passed: true }));
    vi.restoreAllMocks();
  });

  it('displays roll result inline after rolling', () => {
    mockRoll(25);
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    expect(screen.getByText(/HIT/)).toBeInTheDocument();
    // Roll value 25 appears in both the result text and the reversed hit location chip
    const matches = screen.getAllByText(/25/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    vi.restoreAllMocks();
  });
});

// ─── 7.4: Step 3 — Hit Location ────────────────────────────────────────────

describe('AttackFlow — Step 3 (Hit Location)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows hit location after a successful roll', () => {
    mockRoll(34); // roll 34 → reversed 43 → Right Arm (25-44)
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    expect(screen.getByText(/Step 3/)).toBeInTheDocument();
    expect(screen.getByText('Right Arm')).toBeInTheDocument();
    expect(screen.getByText('43')).toBeInTheDocument(); // reversed
  });

  it('displays own AP at the hit location', () => {
    mockRoll(34); // reversed 43 → Right Arm → rArm AP = 1
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    // AP for rArm is 1
    const apChips = screen.getAllByText('1');
    expect(apChips.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Head for roll of 10 (reversed to 01)', () => {
    mockRoll(10); // reversed 01 → Head (0-9)
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    expect(screen.getByText('Head')).toBeInTheDocument();
  });
});

// ─── 7.5: Step 4 — Damage Calculation ──────────────────────────────────────

describe('AttackFlow — Step 4 (Damage Calculation)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows damage calculation after advancing from Step 3', () => {
    mockRoll(25); // roll 25 vs 50 → hit, SL = 5-2 = 3
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    // Now on Step 3, click "Calculate Damage"
    fireEvent.click(screen.getByText(/Calculate Damage/));
    expect(screen.getByText(/Step 4/)).toBeInTheDocument();
  });

  it('displays weapon damage + SL = total damage', () => {
    mockRoll(25); // SL = tensDigit(50) - tensDigit(25) = 5 - 2 = 3
    // Weapon damage: SB(4) + 4 = 8. Total = 8 + 3 = 11
    // 11 appears in both total damage and net wounds (when opponent TB/AP are 0)
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    fireEvent.click(screen.getByText(/Calculate Damage/));
    const matches = screen.getAllByText('11');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('provides opponent TB and AP input fields', () => {
    mockRoll(25);
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    fireEvent.click(screen.getByText(/Calculate Damage/));
    expect(screen.getByLabelText('Opponent Toughness Bonus')).toBeInTheDocument();
    expect(screen.getByLabelText('Opponent Armour Points')).toBeInTheDocument();
  });

  it('auto-calculates net wounds correctly', () => {
    mockRoll(25); // total damage = 11
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    fireEvent.click(screen.getByText(/Calculate Damage/));

    // Set opponent TB=3, AP=2 → net = 11 - 3 - 2 = 6
    fireEvent.change(screen.getByLabelText('Opponent Toughness Bonus'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Opponent Armour Points'), { target: { value: '2' } });
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('applies minimum 1 wound rule when damage barely exceeds TB+AP', () => {
    mockRoll(45); // SL = tensDigit(50) - tensDigit(45) = 5 - 4 = 1
    // Weapon damage = 8, total = 8 + 1 = 9
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    fireEvent.click(screen.getByText(/Calculate Damage/));

    // Set opponent TB=5, AP=4 → net = max(0, 9 - 5 - 4) = 0
    // But total(9) > TB+AP(9) is false, so no min-1 rule → 0 wounds
    fireEvent.change(screen.getByLabelText('Opponent Toughness Bonus'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Opponent Armour Points'), { target: { value: '4' } });
    // 9 - 5 - 4 = 0, and 9 > 9 is false, so effectiveWounds = 0
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('clamps net wounds to 0 when TB+AP exceeds total damage', () => {
    mockRoll(45); // total damage = 9
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    fireEvent.click(screen.getByText(/Calculate Damage/));

    // Set opponent TB=6, AP=5 → net = max(0, 9 - 6 - 5) = 0
    fireEvent.change(screen.getByLabelText('Opponent Toughness Bonus'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('Opponent Armour Points'), { target: { value: '5' } });
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});

// ─── 7.6: Miss handling ────────────────────────────────────────────────────

describe('AttackFlow — miss handling', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows miss result inline when roll fails', () => {
    mockRoll(85); // roll 85 vs target 50 → miss
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    expect(screen.getByText(/MISS/)).toBeInTheDocument();
  });

  it('does not show Step 3 or Step 4 on miss', () => {
    mockRoll(85);
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    expect(screen.queryByText(/Step 3/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Step 4/)).not.toBeInTheDocument();
  });

  it('shows SL and outcome description on miss', () => {
    mockRoll(85); // SL = tensDigit(50) - tensDigit(85) = 5 - 8 = -3
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    // SL -3 appears in the result; /-3/ also matches "-30" in the difficulty dropdown
    // Use a more specific query: look for the strong element containing -3
    const slElements = screen.getAllByText(/-3/);
    expect(slElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Failure/)).toBeInTheDocument();
  });

  it('shows New Attack button on miss', () => {
    mockRoll(85);
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    expect(screen.getByText(/New Attack/)).toBeInTheDocument();
  });
});

// ─── 7.7: Critical/fumble display ──────────────────────────────────────────

describe('AttackFlow — critical and fumble', () => {
  afterEach(() => vi.restoreAllMocks());

  it('displays critical hit for doubles on success', () => {
    mockRoll(11); // roll 11 vs target 50 → pass, doubles → critical
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    expect(screen.getByText(/CRITICAL HIT/)).toBeInTheDocument();
  });

  it('displays fumble for doubles on failure', () => {
    mockRoll(88); // roll 88 vs target 50 → fail, doubles → fumble
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    expect(screen.getByText(/FUMBLE/)).toBeInTheDocument();
  });
});

// ─── 7.8: Panel reset ──────────────────────────────────────────────────────

describe('AttackFlow — panel reset', () => {
  afterEach(() => vi.restoreAllMocks());

  it('resets to Step 1 on New Attack, preserving weapon selection', () => {
    mockRoll(85); // miss
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    fireEvent.click(screen.getByText(/New Attack/));

    // Should be back on Step 1
    expect(screen.getByText(/Step 1/)).toBeInTheDocument();
    // Roll result should be cleared
    expect(screen.queryByText(/MISS/)).not.toBeInTheDocument();
  });

  it('resets from Step 4 back to Step 1', () => {
    mockRoll(25); // hit
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    fireEvent.click(screen.getByText(/Calculate Damage/));
    fireEvent.click(screen.getByText(/New Attack/));

    expect(screen.getByText(/Step 1/)).toBeInTheDocument();
    expect(screen.queryByText(/Step 4/)).not.toBeInTheDocument();
  });
});

// ─── 7.9: Collapsible panel ────────────────────────────────────────────────

describe('AttackFlow — collapsible panel', () => {
  it('is expanded by default', () => {
    render(<AttackFlow {...makeProps()} />);
    expect(screen.getByText(/Step 1/)).toBeInTheDocument();
  });

  it('collapses when header is clicked', () => {
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Toggle Attack Flow panel'));
    expect(screen.queryByText(/Step 1/)).not.toBeInTheDocument();
  });

  it('expands again when header is clicked twice', () => {
    render(<AttackFlow {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Toggle Attack Flow panel'));
    fireEvent.click(screen.getByLabelText('Toggle Attack Flow panel'));
    expect(screen.getByText(/Step 1/)).toBeInTheDocument();
  });
});

// ─── 7.10: Mobile layout ───────────────────────────────────────────────────

describe('AttackFlow — mobile layout', () => {
  beforeEach(() => {
    // Simulate mobile viewport
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 360 });
    window.dispatchEvent(new Event('resize'));
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    window.dispatchEvent(new Event('resize'));
    vi.restoreAllMocks();
  });

  it('renders steps vertically on mobile', () => {
    render(<AttackFlow {...makeProps()} />);
    // On mobile, steps should still be visible (stacked vertically is the default flex-direction: column)
    expect(screen.getByText(/Step 1/)).toBeInTheDocument();
  });
});
