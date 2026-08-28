import { describe, it, expect } from 'vitest';
import { getStealthPenalty, getPerceptionPenalty } from '../armourPenalties';
import type { ArmourItem } from '../../types/character';

// Validates Archives of the Empire III armour penalties:
//  - Stealth: flat -10 if any worn Chainmail or Plate (does NOT stack) — p.1531
//  - Perception: per-item helmet penalty (Open Helm/Chainmail Coif -10;
//    Great Helm/Bascinet/Armet/Sallet -20); suppressed when visor is open.

function item(overrides: Partial<ArmourItem>): ArmourItem {
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

describe('getStealthPenalty (Archives III p.1531)', () => {
  it('is 0 with no Mail/Plate worn', () => {
    const result = getStealthPenalty([
      item({ name: 'Leather Jack', armourType: 'BoiledLeather' }),
      item({ name: 'Soft Kit', armourType: 'SoftKit' }),
    ]);
    expect(result.total).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it('is -10 for a single worn Mail piece', () => {
    const result = getStealthPenalty([item({ name: 'Mail Shirt', armourType: 'Chainmail' })]);
    expect(result.total).toBe(10);
    expect(result.items).toHaveLength(1);
  });

  it('is a FLAT -10 regardless of how many Mail/Plate pieces are worn (no stacking)', () => {
    const result = getStealthPenalty([
      item({ name: 'Mail Shirt', armourType: 'Chainmail' }),
      item({ name: 'Plate Breastplate', armourType: 'Plate' }),
      item({ name: 'Plate Leggings', armourType: 'Plate' }),
    ]);
    // Archives III: flat -10, not 3 × 10
    expect(result.total).toBe(10);
    // Triggering pieces are still listed for the breakdown.
    expect(result.items.map((i) => i.name)).toEqual([
      'Mail Shirt',
      'Plate Breastplate',
      'Plate Leggings',
    ]);
  });

  it('ignores unworn Mail/Plate pieces (still flat -10 if any worn one remains)', () => {
    const result = getStealthPenalty([
      item({ name: 'Mail Shirt', armourType: 'Chainmail', worn: true }),
      item({ name: 'Plate Leggings', armourType: 'Plate', worn: false }),
    ]);
    expect(result.total).toBe(10);
    expect(result.items).toHaveLength(1);
  });

  it('does not penalise Brigandine (Overcoat) which is not Mail or Plate type', () => {
    const result = getStealthPenalty([item({ name: 'Brigandine', armourType: 'Brigandine' })]);
    expect(result.total).toBe(0);
  });
});

describe('getPerceptionPenalty (Archives III armour table)', () => {
  it('is 0 when no penalising helmet is worn', () => {
    const result = getPerceptionPenalty([
      item({ name: 'Breastplate', armourType: 'Plate' }),
      item({ name: 'Mail Shirt', armourType: 'Chainmail' }),
    ]);
    expect(result.total).toBe(0);
  });

  it('applies -10 for an Open Helm', () => {
    const result = getPerceptionPenalty([item({ name: 'Open Helm', locations: 'Head', armourType: 'Plate' })]);
    expect(result.total).toBe(10);
    expect(result.items).toEqual([{ name: 'Open Helm', penalty: 10 }]);
  });

  it('applies -10 for a Chainmail Coif', () => {
    expect(
      getPerceptionPenalty([item({ name: 'Chainmail Coif', locations: 'Head', armourType: 'Chainmail' })]).total,
    ).toBe(10);
  });

  it('applies -20 for the fully-enclosed plate helms (Great Helm/Bascinet/Armet/Sallet)', () => {
    for (const name of ['Great Helm', 'Bascinet', 'Armet', 'Sallet']) {
      const result = getPerceptionPenalty([item({ name, locations: 'Head', armourType: 'Plate' })]);
      expect(result.total, `${name} should be -20 Perception`).toBe(20);
    }
  });

  it('suppresses the Perception penalty when a visor helmet is worn open', () => {
    const closed = getPerceptionPenalty([item({ name: 'Bascinet', locations: 'Head', armourType: 'Plate', visorOpen: false })]);
    expect(closed.total).toBe(20);

    const open = getPerceptionPenalty([item({ name: 'Bascinet', locations: 'Head', armourType: 'Plate', visorOpen: true })]);
    expect(open.total).toBe(0);
  });

  it('ignores unworn helmets', () => {
    const result = getPerceptionPenalty([
      item({ name: 'Open Helm', locations: 'Head', armourType: 'Plate', worn: false }),
    ]);
    expect(result.total).toBe(0);
  });
});

describe('Chainmail Coif dual-penalty (Archives III)', () => {
  it('a Chainmail Coif imposes both -10 Stealth and -10 Perception', () => {
    const armour = [item({ name: 'Chainmail Coif', locations: 'Head', armourType: 'Chainmail' })];
    expect(getStealthPenalty(armour).total).toBe(10);
    expect(getPerceptionPenalty(armour).total).toBe(10);
  });
});
