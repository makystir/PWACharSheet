import { describe, it, expect } from 'vitest';
import {
  validateEngineeringPlacement,
  getAvailableEngineeringRunes,
  calculateForgingCharges,
  activateRuneOfForging,
  resetForgingCharges,
} from '../engineeringRunes';
import type { EngineeringItem } from '../../types/character';

function makeItem(overrides: Partial<EngineeringItem> = {}): EngineeringItem {
  return {
    id: 'item-1',
    name: 'Test Grudge Thrower',
    type: 'Grudge Thrower',
    runes: [],
    ...overrides,
  };
}

describe('validateEngineeringPlacement', () => {
  it('allows a valid engineering rune on an empty item', () => {
    const result = validateEngineeringPlacement('engineering-rune-of-accuracy', makeItem());
    expect(result).toEqual({ valid: true });
  });

  it('rejects an unknown rune ID', () => {
    const result = validateEngineeringPlacement('nonexistent-rune', makeItem());
    expect(result).toEqual({ valid: false, error: 'Unknown rune.' });
  });

  it('rejects a non-engineering rune', () => {
    const result = validateEngineeringPlacement('rune-of-might', makeItem());
    expect(result).toEqual({
      valid: false,
      error: 'Only engineering runes can be inscribed on artillery weapons.',
    });
  });

  it('rejects when item already has 3 runes', () => {
    const item = makeItem({
      runes: [
        'engineering-rune-of-accuracy',
        'engineering-rune-of-burning',
        'engineering-rune-of-forging',
      ],
    });
    const result = validateEngineeringPlacement('engineering-rune-of-seeking', item);
    expect(result).toEqual({
      valid: false,
      error: 'This item already has the maximum of 3 runes.',
    });
  });

  it('rejects a second master rune', () => {
    const item = makeItem({ runes: ['engineering-master-rune-of-defence'] });
    const result = validateEngineeringPlacement('engineering-master-rune-of-disguise', item);
    expect(result).toEqual({
      valid: false,
      error: 'Only one Master Rune is allowed per item.',
    });
  });

  it('allows a master rune when no master rune is present', () => {
    const item = makeItem({ runes: ['engineering-rune-of-accuracy'] });
    const result = validateEngineeringPlacement('engineering-master-rune-of-defence', item);
    expect(result).toEqual({ valid: true });
  });
});

describe('getAvailableEngineeringRunes', () => {
  it('returns only known engineering runes', () => {
    const known = ['engineering-rune-of-accuracy', 'engineering-rune-of-burning', 'rune-of-might'];
    const result = getAvailableEngineeringRunes(known);
    expect(result.every(r => r.category === 'engineering')).toBe(true);
    expect(result.map(r => r.id)).toContain('engineering-rune-of-accuracy');
    expect(result.map(r => r.id)).toContain('engineering-rune-of-burning');
    expect(result.map(r => r.id)).not.toContain('rune-of-might');
  });

  it('returns empty array when no engineering runes are known', () => {
    const result = getAvailableEngineeringRunes(['rune-of-might', 'rune-of-stone']);
    expect(result).toEqual([]);
  });
});

describe('calculateForgingCharges', () => {
  it('returns 0 for an item with no Runes of Forging', () => {
    const item = makeItem({ runes: ['engineering-rune-of-accuracy'] });
    expect(calculateForgingCharges(item)).toBe(0);
  });

  it('returns 1 for an item with one Rune of Forging', () => {
    const item = makeItem({ runes: ['engineering-rune-of-forging'] });
    expect(calculateForgingCharges(item)).toBe(1);
  });

  it('returns count of Runes of Forging inscribed', () => {
    const item = makeItem({
      runes: ['engineering-rune-of-forging', 'engineering-rune-of-accuracy', 'engineering-rune-of-forging'],
    });
    expect(calculateForgingCharges(item)).toBe(2);
  });
});

describe('activateRuneOfForging', () => {
  it('succeeds and decrements charges when charges are available', () => {
    const item = makeItem({ runes: ['engineering-rune-of-forging'] });
    const charges = { 'item-1': 1 };
    const result = activateRuneOfForging(item, charges);
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.updatedCharges['item-1']).toBe(0);
  });

  it('fails when charges are depleted', () => {
    const item = makeItem({ runes: ['engineering-rune-of-forging'] });
    const charges = { 'item-1': 0 };
    const result = activateRuneOfForging(item, charges);
    expect(result.success).toBe(false);
    expect(result.error).toBe('All Runes of Forging on this item have been used this adventure.');
    expect(result.updatedCharges).toBe(charges);
  });

  it('uses calculateForgingCharges as default when item not in charges record', () => {
    const item = makeItem({ runes: ['engineering-rune-of-forging', 'engineering-rune-of-forging'] });
    const result = activateRuneOfForging(item, {});
    expect(result.success).toBe(true);
    expect(result.updatedCharges['item-1']).toBe(1);
  });

  it('fails when item has no Rune of Forging and no prior charges', () => {
    const item = makeItem({ runes: ['engineering-rune-of-accuracy'] });
    const result = activateRuneOfForging(item, {});
    expect(result.success).toBe(false);
    expect(result.error).toBe('All Runes of Forging on this item have been used this adventure.');
  });
});

describe('resetForgingCharges', () => {
  it('returns correct charges for all items', () => {
    const items = [
      makeItem({ id: 'item-1', runes: ['engineering-rune-of-forging'] }),
      makeItem({ id: 'item-2', runes: ['engineering-rune-of-forging', 'engineering-rune-of-forging'] }),
      makeItem({ id: 'item-3', runes: ['engineering-rune-of-accuracy'] }),
    ];
    const result = resetForgingCharges(items);
    expect(result).toEqual({ 'item-1': 1, 'item-2': 2, 'item-3': 0 });
  });

  it('returns empty record for empty items array', () => {
    expect(resetForgingCharges([])).toEqual({});
  });
});
