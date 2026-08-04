import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ArmourMap } from '../ArmourMap';
import type { ArmourMapProps } from '../ArmourMap';
import type { ArmourItem, ArmourPoints } from '../../../types/character';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeArmourItem(overrides: Partial<ArmourItem> = {}): ArmourItem {
  return {
    name: 'Leather Cap',
    locations: 'Head',
    enc: '1',
    ap: 1,
    qualities: '—',
    worn: true,
    ...overrides,
  };
}

function makeDefaultProps(overrides: Partial<ArmourMapProps> = {}): ArmourMapProps {
  return {
    armourPoints: { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 },
    armourList: [],
    weapons: [],
    toughnessBonus: 3,
    ...overrides,
  };
}

// ─── Integration Tests: ArmourMap AP Tooltips ────────────────────────────────

describe('ArmourMap AP Tooltip Integration', () => {
  /**
   * Validates: Requirements 5.1, 5.2
   * Test: click AP location cell → tooltip lists armour items and total
   */
  it('shows tooltip with armour items and total when AP cell is clicked', () => {
    const leatherCap = makeArmourItem({ name: 'Leather Cap', locations: 'Head', ap: 1, worn: true });
    const mailCoif = makeArmourItem({ name: 'Mail Coif', locations: 'Head', ap: 2, worn: true });

    const props = makeDefaultProps({
      armourPoints: { head: 3, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 },
      armourList: [leatherCap, mailCoif],
    });

    render(<ArmourMap {...props} />);

    // Click the Head AP cell (ariaLabel = "Head AP 3")
    const headApCell = screen.getByRole('button', { name: 'Head AP 3' });
    fireEvent.click(headApCell);

    // Tooltip should appear with role="tooltip"
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();

    // Should list both armour items with their AP values
    expect(tooltip).toHaveTextContent('Leather Cap');
    expect(tooltip).toHaveTextContent('Mail Coif');
    expect(tooltip).toHaveTextContent('Total:');
    expect(tooltip).toHaveTextContent('3');
  });

  /**
   * Validates: Requirements 5.3
   * Test: click AP location with no armour → shows "No armour covers this location"
   */
  it('shows "No armour covers this location" when no armour covers the clicked location', () => {
    // Only body armour, no head armour
    const breastplate = makeArmourItem({ name: 'Breastplate', locations: 'Body', ap: 3, worn: true });

    const props = makeDefaultProps({
      armourPoints: { head: 0, lArm: 0, rArm: 0, body: 3, lLeg: 0, rLeg: 0, shield: 0 },
      armourList: [breastplate],
    });

    render(<ArmourMap {...props} />);

    // Click the Head AP cell (no armour covers head)
    const headApCell = screen.getByRole('button', { name: 'Head AP 0' });
    fireEvent.click(headApCell);

    // Tooltip should display the empty message
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('No armour covers this location');
    expect(tooltip).toHaveTextContent('Total:');
    expect(tooltip).toHaveTextContent('0');
  });

  /**
   * Validates: Requirements 5.1, 5.4, 6.3
   * Test: switching between locations updates tooltip content
   */
  it('updates tooltip content when switching between locations', () => {
    const leatherCap = makeArmourItem({ name: 'Leather Cap', locations: 'Head', ap: 1, worn: true });
    const breastplate = makeArmourItem({ name: 'Breastplate', locations: 'Body', ap: 3, worn: true });

    const props = makeDefaultProps({
      armourPoints: { head: 1, lArm: 0, rArm: 0, body: 3, lLeg: 0, rLeg: 0, shield: 0 },
      armourList: [leatherCap, breastplate],
    });

    render(<ArmourMap {...props} />);

    // Click the Head AP cell first
    const headApCell = screen.getByRole('button', { name: 'Head AP 1' });
    fireEvent.click(headApCell);

    // Verify head tooltip content
    let tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Leather Cap');
    expect(tooltip).not.toHaveTextContent('Breastplate');

    // Now click the Body AP cell
    const bodyApCell = screen.getByRole('button', { name: 'Body AP 3' });
    fireEvent.click(bodyApCell);

    // Tooltip should now show body armour (only one tooltip at a time - Req 6.3)
    tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Breastplate');
    expect(tooltip).not.toHaveTextContent('Leather Cap');
    expect(tooltip).toHaveTextContent('3');
  });
});
