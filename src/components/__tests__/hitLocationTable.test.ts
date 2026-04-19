import { describe, it, expect } from 'vitest';
import { getHitLocation } from '../combat/hitLocationTable';

// ─── Hit Location Utility ───────────────────────────────────────

describe('getHitLocation', () => {
  // ── Head (reversed 00–09) ──────────────────────────────────

  it('roll 100 → reversed 00 → Head', () => {
    const r = getHitLocation(100);
    expect(r.reversed).toBe(0);
    expect(r.location).toBe('Head');
    expect(r.apKey).toBe('head');
  });

  it('roll 10 → reversed 01 → Head', () => {
    const r = getHitLocation(10);
    expect(r.reversed).toBe(1);
    expect(r.location).toBe('Head');
    expect(r.apKey).toBe('head');
  });

  it('roll 90 → reversed 09 → Head', () => {
    const r = getHitLocation(90);
    expect(r.reversed).toBe(9);
    expect(r.location).toBe('Head');
    expect(r.apKey).toBe('head');
  });

  it('boundary: roll that reverses to 9 → Head', () => {
    // roll 90 → reversed 09 → Head (already tested above)
    // Also test roll 0 (edge: ones=0, tens=0 → reversed 00)
    const r = getHitLocation(0);
    expect(r.reversed).toBe(0);
    expect(r.location).toBe('Head');
    expect(r.apKey).toBe('head');
  });

  // ── Left Arm (reversed 10–24) ─────────────────────────────

  it('boundary: reversed 10 → Left Arm (roll 01)', () => {
    const r = getHitLocation(1);
    expect(r.reversed).toBe(10);
    expect(r.location).toBe('Left Arm');
    expect(r.apKey).toBe('lArm');
  });

  it('roll 11 → reversed 11 → Left Arm (doubles)', () => {
    const r = getHitLocation(11);
    expect(r.reversed).toBe(11);
    expect(r.location).toBe('Left Arm');
    expect(r.apKey).toBe('lArm');
  });

  it('boundary: reversed 24 → Left Arm (roll 42)', () => {
    const r = getHitLocation(42);
    expect(r.reversed).toBe(24);
    expect(r.location).toBe('Left Arm');
    expect(r.apKey).toBe('lArm');
  });

  // ── Right Arm (reversed 25–44) ────────────────────────────

  it('boundary: reversed 25 → Right Arm (roll 52)', () => {
    const r = getHitLocation(52);
    expect(r.reversed).toBe(25);
    expect(r.location).toBe('Right Arm');
    expect(r.apKey).toBe('rArm');
  });

  it('roll 34 → reversed 43 → Right Arm', () => {
    const r = getHitLocation(34);
    expect(r.reversed).toBe(43);
    expect(r.location).toBe('Right Arm');
    expect(r.apKey).toBe('rArm');
  });

  it('boundary: reversed 44 → Right Arm (roll 44)', () => {
    const r = getHitLocation(44);
    expect(r.reversed).toBe(44);
    expect(r.location).toBe('Right Arm');
    expect(r.apKey).toBe('rArm');
  });

  // ── Body (reversed 45–79) ─────────────────────────────────

  it('boundary: reversed 45 → Body (roll 54)', () => {
    const r = getHitLocation(54);
    expect(r.reversed).toBe(45);
    expect(r.location).toBe('Body');
    expect(r.apKey).toBe('body');
  });

  it('roll 55 → reversed 55 → Body (doubles)', () => {
    const r = getHitLocation(55);
    expect(r.reversed).toBe(55);
    expect(r.location).toBe('Body');
    expect(r.apKey).toBe('body');
  });

  it('roll 05 → reversed 50 → Body', () => {
    const r = getHitLocation(5);
    expect(r.reversed).toBe(50);
    expect(r.location).toBe('Body');
    expect(r.apKey).toBe('body');
  });

  it('boundary: reversed 79 → Body (roll 97)', () => {
    const r = getHitLocation(97);
    expect(r.reversed).toBe(79);
    expect(r.location).toBe('Body');
    expect(r.apKey).toBe('body');
  });

  // ── Left Leg (reversed 80–89) ─────────────────────────────

  it('boundary: reversed 80 → Left Leg (roll 8)', () => {
    const r = getHitLocation(8);
    expect(r.reversed).toBe(80);
    expect(r.location).toBe('Left Leg');
    expect(r.apKey).toBe('lLeg');
  });

  it('boundary: reversed 89 → Left Leg (roll 98)', () => {
    const r = getHitLocation(98);
    expect(r.reversed).toBe(89);
    expect(r.location).toBe('Left Leg');
    expect(r.apKey).toBe('lLeg');
  });

  // ── Right Leg (reversed 90–99) ────────────────────────────

  it('boundary: reversed 90 → Right Leg (roll 9)', () => {
    const r = getHitLocation(9);
    expect(r.reversed).toBe(90);
    expect(r.location).toBe('Right Leg');
    expect(r.apKey).toBe('rLeg');
  });

  it('roll 89 → reversed 98 → Right Leg', () => {
    const r = getHitLocation(89);
    expect(r.reversed).toBe(98);
    expect(r.location).toBe('Right Leg');
    expect(r.apKey).toBe('rLeg');
  });

  it('roll 99 → reversed 99 → Right Leg', () => {
    const r = getHitLocation(99);
    expect(r.reversed).toBe(99);
    expect(r.location).toBe('Right Leg');
    expect(r.apKey).toBe('rLeg');
  });

  // ── All six locations covered ─────────────────────────────

  it('covers all six hit locations', () => {
    const locations = new Set<string>();
    // One representative roll per location
    locations.add(getHitLocation(100).location); // Head
    locations.add(getHitLocation(1).location);   // Left Arm
    locations.add(getHitLocation(34).location);  // Right Arm
    locations.add(getHitLocation(55).location);  // Body
    locations.add(getHitLocation(8).location);   // Left Leg
    locations.add(getHitLocation(9).location);   // Right Leg
    expect(locations.size).toBe(6);
  });

  // ── apKey mapping correctness ─────────────────────────────

  it('maps each location to the correct ArmourPoints key', () => {
    expect(getHitLocation(100).apKey).toBe('head');
    expect(getHitLocation(1).apKey).toBe('lArm');
    expect(getHitLocation(34).apKey).toBe('rArm');
    expect(getHitLocation(55).apKey).toBe('body');
    expect(getHitLocation(8).apKey).toBe('lLeg');
    expect(getHitLocation(9).apKey).toBe('rLeg');
  });
});
