import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ArmourMap } from '../ArmourMap';
import type { ArmourItem, ArmourPoints } from '../../../types/character';

const ZERO_AP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function armour(overrides: Partial<ArmourItem>): ArmourItem {
  return {
    name: 'Piece',
    locations: 'Body',
    enc: '1',
    ap: 2,
    qualities: '—',
    worn: true,
    ...overrides,
  };
}

// Validates WFRP4e Core p.293: Stealth stacks -10 per Mail/Plate; Perception is per-item.

describe('ArmourMap — armour test penalties', () => {
  it('shows a single -10 Stealth for one Mail piece', () => {
    render(
      <ArmourMap
        armourPoints={ZERO_AP}
        armourList={[armour({ name: 'Mail Shirt', armourType: 'Chainmail' })]}
      />,
    );
    expect(screen.getByTestId('stealth-penalty-badge')).toHaveTextContent('−10 Stealth');
  });

  it('stacks the Stealth penalty across multiple worn Mail/Plate pieces', () => {
    render(
      <ArmourMap
        armourPoints={ZERO_AP}
        armourList={[
          armour({ name: 'Mail Shirt', armourType: 'Chainmail' }),
          armour({ name: 'Plate Breastplate', armourType: 'Plate' }),
          armour({ name: 'Plate Leggings', locations: 'Legs', armourType: 'Plate' }),
        ]}
      />,
    );
    // 3 pieces × 10 = 30
    expect(screen.getByTestId('stealth-penalty-badge')).toHaveTextContent('−30 Stealth');
  });

  it('shows an Open Helm as a Perception penalty, not only Stealth', () => {
    render(
      <ArmourMap
        armourPoints={ZERO_AP}
        armourList={[armour({ name: 'Open Helm', locations: 'Head', armourType: 'Plate' })]}
      />,
    );
    const perception = screen.getByTestId('perception-penalty-badge');
    expect(perception).toBeInTheDocument();
    expect(perception).toHaveTextContent('−10 Perception');
  });

  it('opens a breakdown tooltip listing each contributing Stealth piece', () => {
    render(
      <ArmourMap
        armourPoints={ZERO_AP}
        armourList={[
          armour({ name: 'Mail Shirt', armourType: 'Chainmail' }),
          armour({ name: 'Plate Leggings', locations: 'Legs', armourType: 'Plate' }),
        ]}
      />,
    );
    fireEvent.click(screen.getByTestId('stealth-penalty-badge'));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Mail Shirt');
    expect(tooltip).toHaveTextContent('Plate Leggings');
    expect(tooltip).toHaveTextContent('Total:');
    expect(tooltip).toHaveTextContent('−20');
  });

  it('shows no penalty row when only soft leather is worn', () => {
    render(
      <ArmourMap
        armourPoints={ZERO_AP}
        armourList={[armour({ name: 'Leather Jack', armourType: 'BoiledLeather' })]}
      />,
    );
    expect(screen.queryByTestId('armour-penalty-row')).not.toBeInTheDocument();
  });
});
