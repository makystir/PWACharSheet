import { describe, it, expect } from 'vitest';
import { lookupCriticalWound } from '../critical-wounds';
import {
  HEAD_CRITICAL_TABLE,
  ARM_CRITICAL_TABLE,
  LEG_CRITICAL_TABLE,
} from '../../data/critical-wound-tables';

// ─── lookupCriticalWound unit tests ──────────────────────────────────────────
// Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6

describe('lookupCriticalWound', () => {
  it('Head roll=1 returns first Head table entry', () => {
    const result = lookupCriticalWound('Head', 1);
    expect(result).toEqual(HEAD_CRITICAL_TABLE[0]);
  });

  it('Head roll=100 returns last Head table entry', () => {
    const result = lookupCriticalWound('Head', 100);
    expect(result).toEqual(HEAD_CRITICAL_TABLE[HEAD_CRITICAL_TABLE.length - 1]);
  });

  it('Left Arm roll=50 equals Right Arm roll=50', () => {
    const left = lookupCriticalWound('Left Arm', 50);
    const right = lookupCriticalWound('Right Arm', 50);
    expect(left).toEqual(right);
  });

  it('Left Leg roll=25 equals Right Leg roll=25', () => {
    const left = lookupCriticalWound('Left Leg', 25);
    const right = lookupCriticalWound('Right Leg', 25);
    expect(left).toEqual(right);
  });

  it('Body roll=0 returns undefined', () => {
    expect(lookupCriticalWound('Body', 0)).toBeUndefined();
  });

  it('Body roll=101 returns undefined', () => {
    expect(lookupCriticalWound('Body', 101)).toBeUndefined();
  });

  it('Head roll=5.5 returns undefined', () => {
    expect(lookupCriticalWound('Head', 5.5)).toBeUndefined();
  });
});
