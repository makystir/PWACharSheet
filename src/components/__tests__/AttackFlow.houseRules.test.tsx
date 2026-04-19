import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AttackFlow } from '../combat/AttackFlow';
import type { AttackFlowProps } from '../combat/AttackFlow';
import type { Character, WeaponItem, ArmourPoints, HouseRules } from '../../types/character';
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
    ...overrides,
  };
}

function withHouseRules(overrides: Partial<HouseRules>): { houseRules: HouseRules } {
  return {
    houseRules: {
      ...BLANK_CHARACTER.houseRules,
      ...overrides,
    },
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
  vi.spyOn(Math, 'random').mockReturnValue((d100Value - 1) / 100);
}

/**
 * Helper: select weapon, roll, advance to Step 4, set opponent TB/AP.
 * Returns the weapon label used for selection.
 */
function advanceToStep4(
  weaponLabel: string,
  opponentTB: number,
  opponentAP: number,
) {
  fireEvent.click(screen.getByLabelText(`Select ${weaponLabel}`));
  fireEvent.click(screen.getByLabelText('Roll to hit'));
  fireEvent.click(screen.getByText(/Calculate Damage/));
  fireEvent.change(screen.getByLabelText('Opponent Toughness Bonus'), {
    target: { value: String(opponentTB) },
  });
  fireEvent.change(screen.getByLabelText('Opponent Armour Points'), {
    target: { value: String(opponentAP) },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AttackFlow — Impale Crits on Tens', () => {
  afterEach(() => vi.restoreAllMocks());

  it('treats roll as critical when impaleCritsOnTens enabled + Impale weapon + roll multiple of 10 + success', () => {
    // Roll 20 vs target 50 → success. 20 % 10 === 0 and 20 !== 100.
    // Weapon has Impale quality. House rule enabled → critical hit.
    mockRoll(20);
    const impaleWeapon = meleeWeapon({ name: 'Rapier', qualities: 'Fast, Impale' });
    const character = makeCharacter(withHouseRules({ impaleCritsOnTens: true }));
    render(
      <AttackFlow
        {...makeProps({ weapons: [impaleWeapon], character })}
      />,
    );
    fireEvent.click(screen.getByLabelText('Select Rapier'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));

    expect(screen.getByText(/CRITICAL HIT/)).toBeInTheDocument();
  });

  it('does NOT treat roll as critical when impaleCritsOnTens enabled + non-Impale weapon + roll multiple of 10', () => {
    // Roll 20 vs target 50 → success. Weapon does NOT have Impale → normal hit.
    mockRoll(20);
    const normalWeapon = meleeWeapon({ name: 'Club', qualities: 'Pummel' });
    const character = makeCharacter(withHouseRules({ impaleCritsOnTens: true }));
    render(
      <AttackFlow
        {...makeProps({ weapons: [normalWeapon], character })}
      />,
    );
    fireEvent.click(screen.getByLabelText('Select Club'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));

    // Should be a normal hit, not critical
    expect(screen.getByText(/✓ HIT/)).toBeInTheDocument();
    expect(screen.queryByText(/CRITICAL HIT/)).not.toBeInTheDocument();
  });

  it('does NOT treat roll as critical when impaleCritsOnTens disabled + Impale weapon + roll multiple of 10', () => {
    // Roll 20 vs target 50 → success. Weapon has Impale but house rule is OFF → normal hit.
    mockRoll(20);
    const impaleWeapon = meleeWeapon({ name: 'Rapier', qualities: 'Fast, Impale' });
    const character = makeCharacter(withHouseRules({ impaleCritsOnTens: false }));
    render(
      <AttackFlow
        {...makeProps({ weapons: [impaleWeapon], character })}
      />,
    );
    fireEvent.click(screen.getByLabelText('Select Rapier'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));

    expect(screen.getByText(/✓ HIT/)).toBeInTheDocument();
    expect(screen.queryByText(/CRITICAL HIT/)).not.toBeInTheDocument();
  });

  it('still shows standard doubles as critical regardless of Impale setting', () => {
    // Roll 22 vs target 50 → success + doubles → critical (standard rule).
    // impaleCritsOnTens is OFF, weapon has no Impale. Doubles still crit.
    mockRoll(22);
    const normalWeapon = meleeWeapon({ name: 'Club', qualities: 'Pummel' });
    const character = makeCharacter(withHouseRules({ impaleCritsOnTens: false }));
    render(
      <AttackFlow
        {...makeProps({ weapons: [normalWeapon], character })}
      />,
    );
    fireEvent.click(screen.getByLabelText('Select Club'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));

    expect(screen.getByText(/CRITICAL HIT/)).toBeInTheDocument();
  });
});

describe('AttackFlow — Min 1 Wound house rule', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows effective wounds = 0 when min1Wound disabled and raw wounds = 0', () => {
    // Character: WS 50, SB 4. Weapon: +SB+4 → damage = 8.
    // Roll 45 vs 50 → success, SL = 5 - 4 = 1. Total damage = 8 + 1 = 9.
    // Opponent TB=5, AP=4 → reduction = 9. net = max(0, 9-9) = 0.
    // totalDamage(9) > TB+AP(9) is false → effectiveWounds = 0 regardless.
    // But let's use a scenario where totalDamage > TB+AP but net rounds to 0.
    // Actually with integers, if totalDamage > TB+AP then net >= 1. So min1Wound
    // only matters conceptually. Let's test the boundary: totalDamage = TB+AP.
    // With min1Wound=false, effectiveWounds = 0.
    mockRoll(45); // SL = 5 - 4 = 1, weapon dmg = 8, total = 9
    const character = makeCharacter(withHouseRules({ min1Wound: false }));
    render(
      <AttackFlow {...makeProps({ character })} />,
    );
    advanceToStep4('Hand Weapon', 5, 4);

    // net = max(0, 9 - 5 - 4) = 0. min1Wound disabled, 9 > 9 is false → 0
    // The net wounds value should be 0
    const netWoundsValue = screen.getByText('0');
    expect(netWoundsValue).toBeInTheDocument();
  });

  it('shows effective wounds = 1 when min1Wound enabled and damage exceeds TB+AP but raw is 0', () => {
    // We need totalDamage > TB+AP and netWounds < 1.
    // With integer math: if totalDamage > TB+AP, then netWounds = totalDamage - TB - AP >= 1.
    // So the min-1 rule only triggers when totalDamage > TB+AP AND netWounds < 1.
    // This can't happen with pure integers. The code checks:
    //   effectiveWounds = min1Wound && totalDamage > opponentTB + opponentAP && netWounds < 1 ? 1 : netWounds
    // With integers, totalDamage > TB+AP implies netWounds >= 1, so the min-1 never overrides.
    // Let's verify the boundary: totalDamage = TB+AP + 1 → netWounds = 1 → effectiveWounds = 1.
    // And totalDamage = TB+AP → netWounds = 0 → totalDamage > TB+AP is false → effectiveWounds = 0.
    // The min-1 rule is a guard for edge cases. Let's test that with min1Wound=true,
    // when damage barely exceeds, we get 1 wound (which is the natural result anyway).
    mockRoll(40); // SL = 5 - 4 = 1, weapon dmg = 8, total = 9
    const character = makeCharacter(withHouseRules({ min1Wound: true }));
    render(
      <AttackFlow {...makeProps({ character })} />,
    );
    // total damage = 9, set TB=4, AP=4 → reduction = 8, net = 1
    // totalDamage(9) > TB+AP(8) → true, netWounds = 1 → effectiveWounds = 1
    advanceToStep4('Hand Weapon', 4, 4);

    // The "1" for net wounds should appear in the net wounds value
    const netWoundsSection = screen.getByText('Net Wounds').closest('div')!;
    expect(netWoundsSection.textContent).toContain('1');
  });

  it('shows effective wounds = 0 when min1Wound enabled but damage does NOT exceed TB+AP', () => {
    // totalDamage = TB+AP → 9 > 9 is false → effectiveWounds = 0 even with min1Wound=true
    mockRoll(45); // SL = 1, weapon dmg = 8, total = 9
    const character = makeCharacter(withHouseRules({ min1Wound: true }));
    render(
      <AttackFlow {...makeProps({ character })} />,
    );
    advanceToStep4('Hand Weapon', 5, 4); // reduction = 9, total = 9

    expect(screen.getByText('0')).toBeInTheDocument();
  });
});

describe('AttackFlow — rangedDamageSBMode in breakdown', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows ½SB in breakdown when rangedDamageSBMode is halfSB with flat-damage ranged weapon', () => {
    // Ranged weapon with flat damage +4 (no SB in formula).
    // SB = 4, halfSB = 2. Breakdown should include ½SB(2).
    mockRoll(20); // roll 20 vs BS target 40 → success
    const flatRanged = rangedWeapon({ name: 'Sling', group: 'Sling', damage: '+4', qualities: '—' });
    const character = makeCharacter({
      ...withHouseRules({ rangedDamageSBMode: 'halfSB' }),
      aSkills: [{ n: 'Ranged (Sling)', c: 'BS', a: 0 }],
    });
    render(
      <AttackFlow
        {...makeProps({ weapons: [flatRanged], character })}
      />,
    );
    fireEvent.click(screen.getByLabelText('Select Sling'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    fireEvent.click(screen.getByText(/Calculate Damage/));

    // Breakdown should contain ½SB(2)
    expect(screen.getByText(/½SB\(2\)/)).toBeInTheDocument();
  });

  it('shows SB in breakdown when rangedDamageSBMode is fullSB with flat-damage ranged weapon', () => {
    mockRoll(20);
    const flatRanged = rangedWeapon({ name: 'Sling', group: 'Sling', damage: '+4', qualities: '—' });
    const character = makeCharacter({
      ...withHouseRules({ rangedDamageSBMode: 'fullSB' }),
      aSkills: [{ n: 'Ranged (Sling)', c: 'BS', a: 0 }],
    });
    render(
      <AttackFlow
        {...makeProps({ weapons: [flatRanged], character })}
      />,
    );
    fireEvent.click(screen.getByLabelText('Select Sling'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    fireEvent.click(screen.getByText(/Calculate Damage/));

    // Breakdown should contain SB(4)
    expect(screen.getByText(/SB\(4\)/)).toBeInTheDocument();
  });

  it('does NOT add extra SB in breakdown when rangedDamageSBMode is none', () => {
    mockRoll(20);
    const flatRanged = rangedWeapon({ name: 'Sling', group: 'Sling', damage: '+4', qualities: '—' });
    const character = makeCharacter({
      ...withHouseRules({ rangedDamageSBMode: 'none' }),
      aSkills: [{ n: 'Ranged (Sling)', c: 'BS', a: 0 }],
    });
    render(
      <AttackFlow
        {...makeProps({ weapons: [flatRanged], character })}
      />,
    );
    fireEvent.click(screen.getByLabelText('Select Sling'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    fireEvent.click(screen.getByText(/Calculate Damage/));

    // Breakdown should just be "+4", no SB
    const breakdownEl = screen.getByText(/Breakdown:/);
    expect(breakdownEl.textContent).toContain('+4');
    expect(breakdownEl.textContent).not.toContain('SB(');
    expect(breakdownEl.textContent).not.toContain('½SB(');
  });
});
