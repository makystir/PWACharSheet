import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TakeDamagePanel } from '../TakeDamagePanel';
import type { TakeDamagePanelProps } from '../TakeDamagePanel';
import type { ArmourItem, ArmourPoints } from '../../../types/character';
import { migrateCharacterArmour, ARMOUR_NAME_MAP } from '../../../logic/armourMigration';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDefaultProps(overrides: Partial<TakeDamagePanelProps> = {}): TakeDamagePanelProps {
  return {
    toughnessBonus: 3,
    armourPoints: { head: 0, lArm: 0, rArm: 0, body: 3, lLeg: 0, rLeg: 0, shield: 0 },
    armourList: [],
    useCriticalDeflection: false,
    onArmourUpdate: vi.fn(),
    wCur: 12,
    totalWounds: 12,
    onApplyWounds: vi.fn(),
    min1Wound: true,
    onDown: vi.fn(),
    ...overrides,
  };
}

// ─── Integration Test 1: Layered armour damage → correct wound calculation with currentAp ───

describe('Integration: Layered armour damage with currentAp', () => {
  it('uses currentAp (not base ap) when calculating net wounds', () => {
    // Breastplate with ap: 3 but currentAp: 1 (damaged)
    const breastplate: ArmourItem = {
      name: 'Breastplate',
      locations: 'Body',
      enc: '3',
      ap: 3,
      qualities: 'Impenetrable, Overcoat, Weakpoints',
      worn: true,
      armourType: 'Plate',
      currentAp: 1,
    };

    // Reinforced Soft Kit underneath (suppresses Weakpoints)
    const softKit: ArmourItem = {
      name: 'Reinforced Soft Kit',
      locations: 'Arms, Body, Legs',
      enc: '1',
      ap: 1,
      qualities: 'Partial, Reinforced',
      worn: true,
      armourType: 'SoftKit',
      currentAp: 1,
    };

    const armourList = [softKit, breastplate];

    // Total AP at body: currentAp(softKit)=1 + currentAp(breastplate)=1 = 2
    // But Soft Kit has Partial flaw, so when to-hit is even, its AP is bypassed
    // With to-hit odd (default): effective AP = 1 (softKit) + 1 (breastplate) = 2
    // TB = 3, so total reduction = 5
    // Damage 10 → net wounds = 10 - 3(TB) - 2(AP) = 5

    const props = makeDefaultProps({
      armourList,
      armourPoints: { head: 0, lArm: 0, rArm: 0, body: 2, lLeg: 0, rLeg: 0, shield: 0 },
      toughnessBonus: 3,
      wCur: 12,
    });

    render(<TakeDamagePanel {...props} />);

    // Set damage to 10
    const damageInput = screen.getByLabelText('Incoming damage');
    fireEvent.change(damageInput, { target: { value: '10' } });

    // Select Body location (should be default)
    const locationSelect = screen.getByLabelText('Hit location');
    fireEvent.change(locationSelect, { target: { value: 'Body' } });

    // Verify net wounds: 10 - 3(TB) - 2(AP from currentAp values) = 5
    const netWounds = screen.getByTestId('net-wounds');
    expect(netWounds).toHaveTextContent('5');
  });

  it('calculates correctly with heavily damaged armour (currentAp much lower than ap)', () => {
    // Breastplate ap: 3, currentAp: 1 only
    const breastplate: ArmourItem = {
      name: 'Breastplate',
      locations: 'Body',
      enc: '3',
      ap: 3,
      qualities: 'Impenetrable, Overcoat, Weakpoints',
      worn: true,
      armourType: 'Plate',
      currentAp: 1,
    };

    // No soft kit, no Weakpoints suppression, but we use odd to-hit (default)
    // to avoid weakpoints triggering (needs critical hit + impale)
    const armourList = [breastplate];

    // Effective AP = 1 (currentAp), TB = 3
    // Damage 10 → 10 - 3 - 1 = 6 wounds
    const props = makeDefaultProps({
      armourList,
      armourPoints: { head: 0, lArm: 0, rArm: 0, body: 1, lLeg: 0, rLeg: 0, shield: 0 },
      toughnessBonus: 3,
      wCur: 12,
    });

    render(<TakeDamagePanel {...props} />);

    const damageInput = screen.getByLabelText('Incoming damage');
    fireEvent.change(damageInput, { target: { value: '10' } });

    const locationSelect = screen.getByLabelText('Hit location');
    fireEvent.change(locationSelect, { target: { value: 'Body' } });

    const netWounds = screen.getByTestId('net-wounds');
    expect(netWounds).toHaveTextContent('6');
  });
});

// ─── Integration Test 2: Critical Deflection end-to-end ─────────────────────

describe('Integration: Critical Deflection end-to-end', () => {
  it('shows Deflect Critical button and reduces AP on click', () => {
    // Setup: armour with AP > 0 at the body location
    const breastplate: ArmourItem = {
      name: 'Breastplate',
      locations: 'Body',
      enc: '3',
      ap: 3,
      qualities: 'Impenetrable, Overcoat, Weakpoints',
      worn: true,
      armourType: 'Plate',
      currentAp: 2,
    };

    // Reinforced Soft Kit underneath to suppress Weakpoints
    const softKit: ArmourItem = {
      name: 'Reinforced Soft Kit',
      locations: 'Arms, Body, Legs',
      enc: '1',
      ap: 1,
      qualities: 'Partial, Reinforced',
      worn: true,
      armourType: 'SoftKit',
      currentAp: 1,
    };

    const armourList = [softKit, breastplate];
    const onArmourUpdate = vi.fn();

    // wCur = 5, so we need net wounds >= 5 to trigger critical
    // With odd to-hit (default): effective AP = 1(softKit) + 2(breastplate) = 3
    // TB = 3, reduction = 6
    // Need damage such that damage - 6 >= 5 → damage >= 11
    const props = makeDefaultProps({
      armourList,
      armourPoints: { head: 0, lArm: 0, rArm: 0, body: 3, lLeg: 0, rLeg: 0, shield: 0 },
      toughnessBonus: 3,
      useCriticalDeflection: true,
      onArmourUpdate,
      wCur: 5,
    });

    render(<TakeDamagePanel {...props} />);

    // Set damage high enough to trigger critical wound
    const damageInput = screen.getByLabelText('Incoming damage');
    fireEvent.change(damageInput, { target: { value: '15' } });

    // Body should be default, but ensure it
    const locationSelect = screen.getByLabelText('Hit location');
    fireEvent.change(locationSelect, { target: { value: 'Body' } });

    // Net wounds should be 15 - 3(TB) - 3(AP) = 9, which exceeds wCur=5 → critical
    const netWounds = screen.getByTestId('net-wounds');
    expect(Number(netWounds.textContent)).toBeGreaterThanOrEqual(5);

    // Deflect Critical button should be visible
    const deflectBtn = screen.getByTestId('deflect-critical-btn');
    expect(deflectBtn).toBeInTheDocument();

    // Click Deflect Critical
    fireEvent.click(deflectBtn);

    // onArmourUpdate should have been called with the deflected item (currentAp reduced by 1)
    expect(onArmourUpdate).toHaveBeenCalledTimes(1);
    const [updatedItem, index] = onArmourUpdate.mock.calls[0];
    // The first item with AP > 0 in the filtered-by-location list could be softKit or breastplate
    // The component finds the first armour item at the location with currentAp > 0
    expect(updatedItem.currentAp).toBe((armourList[index].currentAp ?? armourList[index].ap) - 1);

    // Deflected note should appear
    const deflectedNote = screen.getByTestId('critical-deflected-note');
    expect(deflectedNote).toBeInTheDocument();
    expect(deflectedNote).toHaveTextContent(/Critical Wound deflected/i);
  });

  it('does not show Deflect Critical button when house rule is disabled', () => {
    const breastplate: ArmourItem = {
      name: 'Breastplate',
      locations: 'Body',
      enc: '3',
      ap: 3,
      qualities: 'Impenetrable, Overcoat, Weakpoints',
      worn: true,
      armourType: 'Plate',
      currentAp: 2,
    };

    const softKit: ArmourItem = {
      name: 'Reinforced Soft Kit',
      locations: 'Arms, Body, Legs',
      enc: '1',
      ap: 1,
      qualities: 'Partial, Reinforced',
      worn: true,
      armourType: 'SoftKit',
      currentAp: 1,
    };

    const props = makeDefaultProps({
      armourList: [softKit, breastplate],
      armourPoints: { head: 0, lArm: 0, rArm: 0, body: 3, lLeg: 0, rLeg: 0, shield: 0 },
      toughnessBonus: 3,
      useCriticalDeflection: false,
      wCur: 5,
    });

    render(<TakeDamagePanel {...props} />);

    const damageInput = screen.getByLabelText('Incoming damage');
    fireEvent.change(damageInput, { target: { value: '15' } });

    // Deflect Critical button should NOT appear
    expect(screen.queryByTestId('deflect-critical-btn')).not.toBeInTheDocument();
  });

  it('does not show Deflect Critical when all armour at location has 0 AP', () => {
    const breastplate: ArmourItem = {
      name: 'Breastplate',
      locations: 'Body',
      enc: '3',
      ap: 3,
      qualities: 'Impenetrable, Overcoat, Weakpoints',
      worn: true,
      armourType: 'Plate',
      currentAp: 0, // Destroyed
    };

    const props = makeDefaultProps({
      armourList: [breastplate],
      armourPoints: { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 },
      toughnessBonus: 3,
      useCriticalDeflection: true,
      wCur: 5,
    });

    render(<TakeDamagePanel {...props} />);

    const damageInput = screen.getByLabelText('Incoming damage');
    fireEvent.change(damageInput, { target: { value: '15' } });

    // Deflect Critical button should NOT appear (no AP to sacrifice)
    expect(screen.queryByTestId('deflect-critical-btn')).not.toBeInTheDocument();
  });
});

// ─── Integration Test 3: Migration on character load → correct expanded format ───

describe('Integration: Migration on character load', () => {
  it('sets currentAp to ap for items without currentAp field', () => {
    const oldItems: ArmourItem[] = [
      { name: 'Leather Jack', locations: 'Arms, Body', enc: '1', ap: 1, qualities: '—', worn: true },
      { name: 'Chainmail Coat', locations: 'Arms, Body', enc: '3', ap: 2, qualities: '—', worn: true },
    ];

    const migrated = migrateCharacterArmour(oldItems);

    expect(migrated[0].currentAp).toBe(1); // ap = 1
    expect(migrated[1].currentAp).toBe(2); // ap = 2
  });

  it('sets visorOpen to false for items with Visor quality', () => {
    const oldItems: ArmourItem[] = [
      { name: 'Bascinet', locations: 'Head', enc: '2', ap: 3, qualities: 'Impenetrable, Visor, Weakpoints', worn: true },
      { name: 'Armet', locations: 'Head', enc: '2', ap: 3, qualities: 'Impenetrable, Visor, Weakpoints', worn: false },
    ];

    const migrated = migrateCharacterArmour(oldItems);

    expect(migrated[0].visorOpen).toBe(false);
    expect(migrated[1].visorOpen).toBe(false);
  });

  it('does not set visorOpen for items without Visor quality', () => {
    const oldItems: ArmourItem[] = [
      { name: 'Open Helm', locations: 'Head', enc: '2', ap: 3, qualities: 'Partial', worn: true },
    ];

    const migrated = migrateCharacterArmour(oldItems);

    expect(migrated[0].visorOpen).toBeUndefined();
  });

  it('maps old core-rulebook names to Archives Vol. III names', () => {
    const oldItems: ArmourItem[] = [
      { name: 'Mail Coat', locations: 'Arms, Body', enc: '3', ap: 2, qualities: '—', worn: true },
      { name: 'Mail Chausses', locations: 'Legs', enc: '2', ap: 2, qualities: '—', worn: true },
      { name: 'Plate Breastplate', locations: 'Body', enc: '3', ap: 3, qualities: '—', worn: true },
      { name: 'Helm', locations: 'Head', enc: '2', ap: 3, qualities: '—', worn: true },
    ];

    const migrated = migrateCharacterArmour(oldItems);

    expect(migrated[0].name).toBe('Chainmail Coat');
    expect(migrated[1].name).toBe('Chainmail Chausses');
    expect(migrated[2].name).toBe('Breastplate');
    expect(migrated[3].name).toBe('Great Helm');
  });

  it('preserves all existing fields during migration', () => {
    const oldItems: ArmourItem[] = [
      {
        name: 'Mail Coat',
        locations: 'Arms, Body',
        enc: '3',
        ap: 2,
        qualities: '—',
        worn: true,
        runes: ['Rune of Protection'],
      },
    ];

    const migrated = migrateCharacterArmour(oldItems);

    // Name is renamed
    expect(migrated[0].name).toBe('Chainmail Coat');
    // All other fields preserved
    expect(migrated[0].locations).toBe('Arms, Body');
    expect(migrated[0].enc).toBe('3');
    expect(migrated[0].ap).toBe(2);
    expect(migrated[0].qualities).toBe('—');
    expect(migrated[0].worn).toBe(true);
    expect(migrated[0].runes).toEqual(['Rune of Protection']);
    // New fields added
    expect(migrated[0].currentAp).toBe(2);
  });

  it('clamps invalid currentAp values to valid range', () => {
    const items: ArmourItem[] = [
      { name: 'Breastplate', locations: 'Body', enc: '3', ap: 3, qualities: '—', worn: true, currentAp: -2 },
      { name: 'Leather Jack', locations: 'Arms, Body', enc: '1', ap: 1, qualities: '—', worn: true, currentAp: 5 },
    ];

    const migrated = migrateCharacterArmour(items);

    expect(migrated[0].currentAp).toBe(0);  // Clamped from -2 to 0
    expect(migrated[1].currentAp).toBe(1);  // Clamped from 5 to ap (1)
  });

  it('infers armourType from the ARMOURS database', () => {
    const items: ArmourItem[] = [
      { name: 'Breastplate', locations: 'Body', enc: '3', ap: 3, qualities: 'Impenetrable, Overcoat, Weakpoints', worn: true },
      { name: 'Chainmail Coat', locations: 'Arms, Body', enc: '3', ap: 2, qualities: '—', worn: true },
      { name: 'Soft Kit', locations: 'Arms, Body, Legs', enc: '0', ap: 0, qualities: '—', worn: true },
    ];

    const migrated = migrateCharacterArmour(items);

    expect(migrated[0].armourType).toBe('Plate');
    expect(migrated[1].armourType).toBe('Chainmail');
    expect(migrated[2].armourType).toBe('SoftKit');
  });
});
