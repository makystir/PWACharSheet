import { describe, it, expect } from 'vitest';
import { getStealthPenalty, getPerceptionPenalty } from '../armourPenalties';
import type { ArmourItem } from '../../types/character';

// Validates WFRP4e Core p.293:
//  - Stealth: -10 per worn Mail or Plate piece (stacks; armour table footnote)
//  - Perception: per-item helmet penalty (Mail Coif/Open Helm -10, Helm -20)

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

describe('getStealthPenalty', () => {
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

  it('stacks -10 for each worn Mail/Plate piece', () => {
    const result = getStealthPenalty([
      item({ name: 'Mail Shirt', armourType: 'Chainmail' }),
      item({ name: 'Plate Breastplate', armourType: 'Plate' }),
      item({ name: 'Plate Leggings', armourType: 'Plate' }),
    ]);
    // 3 pieces × 10 = 30
    expect(result.total).toBe(30);
    expect(result.items.map((i) => i.name)).toEqual([
      'Mail Shirt',
      'Plate Breastplate',
      'Plate Leggings',
    ]);
  });

  it('ignores unworn Mail/Plate pieces', () => {
    const result = getStealthPenalty([
      item({ name: 'Mail Shirt', armourType: 'Chainmail', worn: true }),
      item({ name: 'Plate Leggings', armourType: 'Plate', worn: false }),
    ]);
    expect(result.total).toBe(10);
  });

  it('does not penalise Brigandine (Overcoat) which is not Mail or Plate type', () => {
    const result = getStealthPenalty([item({ name: 'Brigandine', armourType: 'Brigandine' })]);
    expect(result.total).toBe(0);
  });
});

describe('getPerceptionPenalty', () => {
  it('is 0 when no penalising helmet is worn', () => {
    const result = getPerceptionPenalty([
      item({ name: 'Plate Breastplate', armourType: 'Plate' }),
      item({ name: 'Mail Shirt', armourType: 'Chainmail' }),
    ]);
    expect(result.total).toBe(0);
  });

  it('applies -10 for an Open Helm (not a Stealth penalty)', () => {
    const result = getPerceptionPenalty([item({ name: 'Open Helm', locations: 'Head', armourType: 'Plate' })]);
    expect(result.total).toBe(10);
    expect(result.items).toEqual([{ name: 'Open Helm', penalty: 10 }]);
  });

  it('applies -10 for a Chainmail Coif and -20 for a Great Helm', () => {
    expect(
      getPerceptionPenalty([item({ name: 'Chainmail Coif', locations: 'Head', armourType: 'Chainmail' })]).total,
    ).toBe(10);
    expect(
      getPerceptionPenalty([item({ name: 'Great Helm', locations: 'Head', armourType: 'Plate' })]).total,
    ).toBe(20);
  });

  it('ignores unworn helmets', () => {
    const result = getPerceptionPenalty([
      item({ name: 'Open Helm', locations: 'Head', armourType: 'Plate', worn: false }),
    ]);
    expect(result.total).toBe(0);
  });
});

describe('Open Helm penalty classification (regression)', () => {
  it('Open Helm gives a Perception penalty, and its Stealth penalty is the general Plate -10 (not a helmet-specific stealth penalty)', () => {
    const armour = [item({ name: 'Open Helm', locations: 'Head', armourType: 'Plate' })];
    // Perception penalty exists...
    expect(getPerceptionPenalty(armour).total).toBe(10);
    // ...and the only Stealth penalty comes from the general Mail/Plate rule.
    const stealth = getStealthPenalty(armour);
    expect(stealth.total).toBe(10);
    expect(stealth.items).toHaveLength(1);
  });
});
