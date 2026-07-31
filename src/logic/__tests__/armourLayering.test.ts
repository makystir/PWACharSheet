import { describe, it, expect } from 'vitest';
import {
  validateLayering,
  canLayerOver,
  calculateEffectiveAP,
  isWeakpointsSuppressed,
  coversLocation,
} from '../armourLayering';
import type { ArmourItem } from '../../types/character';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<ArmourItem> & { name: string }): ArmourItem {
  return {
    locations: 'Body',
    enc: '1',
    ap: 2,
    qualities: '—',
    worn: true,
    ...overrides,
  };
}

const softKit: ArmourItem = makeItem({
  name: 'Soft Kit',
  locations: 'Arms, Body, Legs',
  ap: 0,
  enc: '0',
  qualities: '—',
  armourType: 'SoftKit',
});

const reinforcedSoftKit: ArmourItem = makeItem({
  name: 'Reinforced Soft Kit',
  locations: 'Arms, Body, Legs',
  ap: 1,
  enc: '1',
  qualities: 'Partial, Reinforced',
  armourType: 'SoftKit',
});

const leatherJack: ArmourItem = makeItem({
  name: 'Leather Jack',
  locations: 'Arms, Body',
  ap: 1,
  enc: '1',
  qualities: '—',
  armourType: 'BoiledLeather',
});

const chainmailCoat: ArmourItem = makeItem({
  name: 'Chainmail Coat',
  locations: 'Arms, Body',
  ap: 2,
  enc: '3',
  qualities: '—',
  armourType: 'Chainmail',
});

const brigandineJack: ArmourItem = makeItem({
  name: 'Brigandine Jack',
  locations: 'Arms, Body',
  ap: 2,
  enc: '2',
  qualities: 'Overcoat',
  armourType: 'Brigandine',
});

const breastplate: ArmourItem = makeItem({
  name: 'Breastplate',
  locations: 'Body',
  ap: 3,
  enc: '3',
  qualities: 'Impenetrable, Overcoat, Weakpoints',
  armourType: 'Plate',
});

const bracers: ArmourItem = makeItem({
  name: 'Bracers',
  locations: 'Arms',
  ap: 3,
  enc: '3',
  qualities: 'Impenetrable, Requires Kit, Weakpoints',
  armourType: 'Plate',
});

const plateLeggings: ArmourItem = makeItem({
  name: 'Plate Leggings',
  locations: 'Legs',
  ap: 3,
  enc: '3',
  qualities: 'Impenetrable, Requires Kit, Weakpoints',
  armourType: 'Plate',
});

// ─── coversLocation ──────────────────────────────────────────────────────────

describe('coversLocation', () => {
  it('maps "Arms" to lArm and rArm', () => {
    expect(coversLocation(softKit, 'lArm')).toBe(true);
    expect(coversLocation(softKit, 'rArm')).toBe(true);
  });

  it('maps "Body" to body', () => {
    expect(coversLocation(softKit, 'body')).toBe(true);
  });

  it('maps "Legs" to lLeg and rLeg', () => {
    expect(coversLocation(softKit, 'lLeg')).toBe(true);
    expect(coversLocation(softKit, 'rLeg')).toBe(true);
  });

  it('"Arms, Body" does not cover head', () => {
    expect(coversLocation(leatherJack, 'head')).toBe(false);
  });

  it('"Head" covers head', () => {
    const coif = makeItem({ name: 'Chainmail Coif', locations: 'Head', armourType: 'Chainmail' });
    expect(coversLocation(coif, 'head')).toBe(true);
  });
});

// ─── validateLayering ────────────────────────────────────────────────────────

describe('validateLayering', () => {
  it('returns valid for a single item', () => {
    const result = validateLayering([leatherJack], 'body');
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('allows Soft Kit under Boiled Leather', () => {
    const result = validateLayering([softKit, leatherJack], 'body');
    expect(result.valid).toBe(true);
  });

  it('allows Soft Kit under Chainmail', () => {
    const result = validateLayering([softKit, chainmailCoat], 'body');
    expect(result.valid).toBe(true);
  });

  it('allows Soft Kit under Brigandine', () => {
    const result = validateLayering([softKit, brigandineJack], 'body');
    expect(result.valid).toBe(true);
  });

  it('allows Soft Kit under Plate (no Overcoat)', () => {
    const result = validateLayering([softKit, bracers], 'lArm');
    expect(result.valid).toBe(true);
  });

  it('allows Soft Kit under Plate (Overcoat)', () => {
    const result = validateLayering([softKit, breastplate], 'body');
    expect(result.valid).toBe(true);
  });

  it('allows Brigandine over Boiled Leather', () => {
    const result = validateLayering([leatherJack, brigandineJack], 'body');
    expect(result.valid).toBe(true);
  });

  it('allows Brigandine over Chainmail', () => {
    const result = validateLayering([chainmailCoat, brigandineJack], 'body');
    expect(result.valid).toBe(true);
  });

  it('allows Plate (Overcoat) over Boiled Leather', () => {
    const result = validateLayering([leatherJack, breastplate], 'body');
    expect(result.valid).toBe(true);
  });

  it('allows Plate (Overcoat) over Chainmail', () => {
    const result = validateLayering([chainmailCoat, breastplate], 'body');
    expect(result.valid).toBe(true);
  });

  it('rejects two Soft Kits in same location', () => {
    const result = validateLayering([softKit, reinforcedSoftKit], 'body');
    expect(result.valid).toBe(false);
  });

  it('rejects Chainmail over Boiled Leather (no Overcoat)', () => {
    const result = validateLayering([leatherJack, chainmailCoat], 'body');
    expect(result.valid).toBe(false);
  });

  it('rejects Plate (no Overcoat) over Boiled Leather', () => {
    // Bracers don't have Overcoat
    const result = validateLayering([leatherJack, bracers], 'lArm');
    expect(result.valid).toBe(false);
  });

  it('rejects Plate (no Overcoat) over Chainmail', () => {
    const result = validateLayering([chainmailCoat, bracers], 'lArm');
    expect(result.valid).toBe(false);
  });

  it('warns about Requires Kit without Soft Kit', () => {
    const result = validateLayering([bracers], 'lArm');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Requires Kit');
  });

  it('no Requires Kit warning when Soft Kit is present', () => {
    const result = validateLayering([softKit, bracers], 'lArm');
    const kitWarnings = result.warnings.filter((w) => w.includes('Requires Kit'));
    expect(kitWarnings).toHaveLength(0);
  });

  it('ignores items that do not cover the given location', () => {
    // Leather Jack covers Arms + Body, but not legs
    const result = validateLayering([leatherJack, plateLeggings], 'lLeg');
    // Only plateLeggings covers lLeg, so single item = valid
    expect(result.valid).toBe(true);
  });

  it('ignores items that are not worn', () => {
    const unwornLeather = { ...leatherJack, worn: false };
    const result = validateLayering([unwornLeather, chainmailCoat], 'body');
    // Only chainmail is worn, so valid
    expect(result.valid).toBe(true);
  });

  it('allows three layers: Soft Kit + Leather + Brigandine', () => {
    const result = validateLayering([softKit, leatherJack, brigandineJack], 'body');
    expect(result.valid).toBe(true);
  });

  it('allows three layers: Soft Kit + Chainmail + Breastplate (Overcoat)', () => {
    const result = validateLayering([softKit, chainmailCoat, breastplate], 'body');
    expect(result.valid).toBe(true);
  });
});

// ─── canLayerOver ────────────────────────────────────────────────────────────

describe('canLayerOver', () => {
  it('allows adding any piece to empty slot', () => {
    expect(canLayerOver([], leatherJack, 'body')).toBe(true);
  });

  it('allows adding Brigandine over existing Leather', () => {
    expect(canLayerOver([leatherJack], brigandineJack, 'body')).toBe(true);
  });

  it('rejects adding Chainmail over existing Leather', () => {
    expect(canLayerOver([leatherJack], chainmailCoat, 'body')).toBe(false);
  });

  it('allows adding Breastplate (Overcoat) over Chainmail', () => {
    expect(canLayerOver([chainmailCoat], breastplate, 'body')).toBe(true);
  });

  it('rejects adding Bracers (no Overcoat) over Chainmail', () => {
    expect(canLayerOver([chainmailCoat], bracers, 'lArm')).toBe(false);
  });
});

// ─── calculateEffectiveAP ────────────────────────────────────────────────────

describe('calculateEffectiveAP', () => {
  it('returns 0 for empty array', () => {
    expect(calculateEffectiveAP([], 'body')).toBe(0);
  });

  it('sums ap for items covering the location', () => {
    // Soft Kit (0) + Leather (1) = 1
    expect(calculateEffectiveAP([softKit, leatherJack], 'body')).toBe(1);
  });

  it('uses currentAp when available', () => {
    const damaged = { ...breastplate, currentAp: 1 };
    expect(calculateEffectiveAP([damaged], 'body')).toBe(1);
  });

  it('falls back to ap when currentAp is not set', () => {
    expect(calculateEffectiveAP([breastplate], 'body')).toBe(3);
  });

  it('ignores items not covering the location', () => {
    // Breastplate covers Body, not lArm
    expect(calculateEffectiveAP([breastplate], 'lArm')).toBe(0);
  });

  it('ignores items that are not worn', () => {
    const unworn = { ...breastplate, worn: false };
    expect(calculateEffectiveAP([unworn], 'body')).toBe(0);
  });

  it('sums multiple layers correctly', () => {
    // Soft Kit (0) + Chainmail (2) + Breastplate (3) = 5
    expect(calculateEffectiveAP([softKit, chainmailCoat, breastplate], 'body')).toBe(5);
  });
});

// ─── isWeakpointsSuppressed ──────────────────────────────────────────────────

describe('isWeakpointsSuppressed', () => {
  it('returns true when Reinforced Soft Kit is under Plate with Weakpoints', () => {
    expect(isWeakpointsSuppressed([reinforcedSoftKit, breastplate], 'body')).toBe(true);
  });

  it('returns false when regular Soft Kit is under Plate with Weakpoints', () => {
    expect(isWeakpointsSuppressed([softKit, breastplate], 'body')).toBe(false);
  });

  it('returns false when no Plate with Weakpoints is present', () => {
    expect(isWeakpointsSuppressed([reinforcedSoftKit, leatherJack], 'body')).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(isWeakpointsSuppressed([], 'body')).toBe(false);
  });

  it('returns true when Reinforced Soft Kit under Bracers (Weakpoints) on arm', () => {
    expect(isWeakpointsSuppressed([reinforcedSoftKit, bracers], 'lArm')).toBe(true);
  });

  it('returns false when items do not cover the location', () => {
    // Breastplate covers Body, checking head
    expect(isWeakpointsSuppressed([reinforcedSoftKit, breastplate], 'head')).toBe(false);
  });
});
