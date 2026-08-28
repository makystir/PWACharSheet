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

// Validates Archives of the Empire III: flat -10 Stealth for any Chainmail/Plate;
// Perception is a per-item helmet penalty (suppressed when visor is open).

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

  it('keeps the Stealth penalty flat at -10 across multiple worn Mail/Plate pieces', () => {
    render(
      <ArmourMap
        armourPoints={ZERO_AP}
        armourList={[
          armour({ name: 'Mail Shirt', armourType: 'Chainmail' }),
          armour({ name: 'Breastplate', armourType: 'Plate' }),
          armour({ name: 'Plate Leggings', locations: 'Legs', armourType: 'Plate' }),
        ]}
      />,
    );
    // Archives III: flat -10, not 3 × 10
    expect(screen.getByTestId('stealth-penalty-badge')).toHaveTextContent('−10 Stealth');
  });

  it('shows an Open Helm as a -10 Perception penalty', () => {
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

  it('shows a Great Helm as a -20 Perception penalty', () => {
    render(
      <ArmourMap
        armourPoints={ZERO_AP}
        armourList={[armour({ name: 'Great Helm', locations: 'Head', armourType: 'Plate' })]}
      />,
    );
    expect(screen.getByTestId('perception-penalty-badge')).toHaveTextContent('−20 Perception');
  });

  it('drops the Perception penalty when a visor helmet is worn open', () => {
    render(
      <ArmourMap
        armourPoints={ZERO_AP}
        armourList={[armour({ name: 'Bascinet', locations: 'Head', armourType: 'Plate', visorOpen: true })]}
      />,
    );
    // Visor open → no Perception penalty (badge absent). Still -10 Stealth (Plate).
    expect(screen.queryByTestId('perception-penalty-badge')).not.toBeInTheDocument();
    expect(screen.getByTestId('stealth-penalty-badge')).toHaveTextContent('−10 Stealth');
  });

  it('opens a Stealth breakdown tooltip listing the triggering pieces and flat total', () => {
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
    // Flat -10 total regardless of the number of triggering pieces.
    expect(tooltip).toHaveTextContent('−10');
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
