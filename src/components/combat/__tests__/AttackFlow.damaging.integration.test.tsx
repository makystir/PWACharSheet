import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AttackFlow } from '../AttackFlow';
import type { AttackFlowProps } from '../AttackFlow';
import type { Character, WeaponItem, ArmourPoints } from '../../../types/character';
import { BLANK_CHARACTER } from '../../../types/character';

// ─── Test Helpers ────────────────────────────────────────────────────────────

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
      { n: 'Melee (Basic)', c: 'WS', a: 10 },
    ],
    ...overrides,
  };
}

function damagingWeapon(overrides: Partial<WeaponItem> = {}): WeaponItem {
  return {
    name: 'Warhammer',
    group: 'Basic',
    enc: '2',
    rangeReach: 'Average',
    damage: '+SB+4',
    qualities: 'Damaging',
    ...overrides,
  };
}

function normalWeapon(overrides: Partial<WeaponItem> = {}): WeaponItem {
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

const defaultArmourPoints: ArmourPoints = {
  head: 2, lArm: 1, rArm: 1, body: 3, lLeg: 0, rLeg: 0, shield: 0,
};

function makeProps(overrides: Partial<AttackFlowProps> = {}): AttackFlowProps {
  return {
    weapons: [damagingWeapon()],
    character: makeCharacter(),
    armourPoints: defaultArmourPoints,
    onRoll: vi.fn(),
    ...overrides,
  };
}

/**
 * Mock Math.random to return a specific d100 value (1-100).
 * AttackFlow calculates: Math.floor(Math.random() * 100) + 1
 * So to get d100Value, we set Math.random() to return (d100Value - 1) / 100.
 */
function mockRoll(d100Value: number) {
  vi.spyOn(Math, 'random').mockReturnValue((d100Value - 1) / 100);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AttackFlow — Damaging weapon integration (Requirements 2.1–2.4)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('full pipeline: select Damaging weapon → roll hit → damage uses max(units digit, SL)', () => {
    // Roll 34 vs target 50 → passes (SL = 5 - 3 = 2), units digit = 4
    // Damaging: max(4, 2) = 4, so effectiveSL = 4
    mockRoll(34);

    render(<AttackFlow {...makeProps()} />);

    // Step 1: Select weapon
    fireEvent.click(screen.getByLabelText('Select Warhammer'));

    // Step 2: Roll to hit
    fireEvent.click(screen.getByLabelText('Roll to hit'));

    // Should advance to step 3 (hit location) since it passed
    expect(screen.getByText(/Step 3/)).toBeInTheDocument();

    // Click to calculate damage (advance to step 4)
    fireEvent.click(screen.getByText('→ Calculate Damage'));

    // Step 4: Verify Damaging breakdown is shown
    const breakdown = screen.getByTestId('damaging-breakdown');
    expect(breakdown).toBeInTheDocument();
    // Units digit of 34 is 4, SL is 2, effective SL should be 4
    expect(breakdown.textContent).toContain('4'); // units digit
    expect(breakdown.textContent).toContain('2'); // original SL
    expect(breakdown.textContent).toContain('using 4'); // effective SL
  });

  it('uses SL when SL exceeds units digit for Damaging weapon', () => {
    // Roll 21 vs target 50 → passes (SL = 5 - 2 = 3), units digit = 1
    // Damaging: max(1, 3) = 3, so effectiveSL = 3 (SL wins)
    mockRoll(21);

    render(<AttackFlow {...makeProps()} />);

    fireEvent.click(screen.getByLabelText('Select Warhammer'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    fireEvent.click(screen.getByText('→ Calculate Damage'));

    const breakdown = screen.getByTestId('damaging-breakdown');
    expect(breakdown).toBeInTheDocument();
    // Units digit = 1, SL = 3, effective = 3
    expect(breakdown.textContent).toContain('1'); // units digit
    expect(breakdown.textContent).toContain('3'); // original SL = effective SL
    expect(breakdown.textContent).toContain('using 3');
  });

  it('uses units digit when it exceeds SL for Damaging weapon', () => {
    // Roll 18 vs target 50 → passes (SL = 5 - 1 = 4), units digit = 8
    // Damaging: max(8, 4) = 8, so effectiveSL = 8 (units wins)
    mockRoll(18);

    render(<AttackFlow {...makeProps()} />);

    fireEvent.click(screen.getByLabelText('Select Warhammer'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    fireEvent.click(screen.getByText('→ Calculate Damage'));

    const breakdown = screen.getByTestId('damaging-breakdown');
    expect(breakdown).toBeInTheDocument();
    // Units digit = 8, SL = 4, effective = 8
    expect(breakdown.textContent).toContain('8'); // units digit
    expect(breakdown.textContent).toContain('4'); // original SL
    expect(breakdown.textContent).toContain('using 8'); // effective SL
  });

  it('displays Damaging breakdown with correct format', () => {
    // Roll 37 vs target 50 → passes (SL = 5 - 3 = 2), units digit = 7
    mockRoll(37);

    render(<AttackFlow {...makeProps()} />);

    fireEvent.click(screen.getByLabelText('Select Warhammer'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    fireEvent.click(screen.getByText('→ Calculate Damage'));

    const breakdown = screen.getByTestId('damaging-breakdown');
    // Expected format from component: "Damaging: Units digit (7) vs SL (2) → using 7"
    expect(breakdown.textContent).toMatch(/Damaging.*Units digit.*7.*vs.*SL.*2.*using 7/i);
  });

  it('non-Damaging weapon does NOT show the Damaging breakdown', () => {
    // Roll 25 vs target 50 → passes
    mockRoll(25);

    render(<AttackFlow {...makeProps({ weapons: [normalWeapon()] })} />);

    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    fireEvent.click(screen.getByText('→ Calculate Damage'));

    // The damaging-breakdown element should NOT exist
    expect(screen.queryByTestId('damaging-breakdown')).not.toBeInTheDocument();
  });

  it('damage total includes effective SL from Damaging quality', () => {
    // Roll 18 vs target 50 → passes (SL = 5 - 1 = 4), units digit = 8
    // Damaging: effectiveSL = 8
    // Weapon damage = SB(4) + 4 = 8
    // Total damage = weapon(8) + effectiveSL(8) = 16
    mockRoll(18);

    render(<AttackFlow {...makeProps()} />);

    fireEvent.click(screen.getByLabelText('Select Warhammer'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    fireEvent.click(screen.getByText('→ Calculate Damage'));

    // The total damage display should show 16
    const totalChip = screen.getByText('Total').closest('[class]');
    expect(totalChip).toBeInTheDocument();
    expect(screen.getByText('16')).toBeInTheDocument();
  });

  it('effective SL is displayed in the SL chip in Step 4', () => {
    // Roll 34 vs target 50 → SL = 2, units = 4, effectiveSL = 4
    mockRoll(34);

    render(<AttackFlow {...makeProps()} />);

    fireEvent.click(screen.getByLabelText('Select Warhammer'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    fireEvent.click(screen.getByText('→ Calculate Damage'));

    // The SL stat chip in Step 4 shows the effective SL (+4), not the original (+2)
    // Structure: <div class="statChip"><span class="statChipLabel">SL</span><span class="statChipValue">+4</span></div>
    const slLabels = screen.getAllByText('SL');
    // The Step 4 SL label is in the damage calculation section — find the one whose parent contains "+4"
    const step4SlChip = slLabels.find(el => el.parentElement?.textContent?.includes('+4'));
    expect(step4SlChip).toBeTruthy();
    expect(step4SlChip!.parentElement?.textContent).toContain('+4');
  });
});
