import { describe, it, expect } from 'vitest';
import { getEncumbranceLevel, formatEncumbrance } from '../encumbrance';

describe('getEncumbranceLevel', () => {
  it('returns "neutral" when ratio < 0.5', () => {
    expect(getEncumbranceLevel(4, 18)).toBe('neutral');
    expect(getEncumbranceLevel(0, 10)).toBe('neutral');
    expect(getEncumbranceLevel(8, 18)).toBe('neutral');
  });

  it('returns "warning" when 0.5 <= ratio < 0.75', () => {
    expect(getEncumbranceLevel(9, 18)).toBe('warning');
    expect(getEncumbranceLevel(5, 10)).toBe('warning');
    expect(getEncumbranceLevel(13, 18)).toBe('warning');
  });

  it('returns "danger" when 0.75 <= ratio < 1.0', () => {
    expect(getEncumbranceLevel(14, 18)).toBe('danger');
    expect(getEncumbranceLevel(15, 18)).toBe('danger');
    expect(getEncumbranceLevel(17, 18)).toBe('danger');
  });

  it('returns "critical" when ratio >= 1.0', () => {
    expect(getEncumbranceLevel(18, 18)).toBe('critical');
    expect(getEncumbranceLevel(20, 18)).toBe('critical');
    expect(getEncumbranceLevel(100, 10)).toBe('critical');
  });

  it('returns "critical" when max is 0 (edge case)', () => {
    expect(getEncumbranceLevel(0, 0)).toBe('critical');
    expect(getEncumbranceLevel(5, 0)).toBe('critical');
  });

  it('handles exact boundary at 50%', () => {
    expect(getEncumbranceLevel(50, 100)).toBe('warning');
  });

  it('handles exact boundary at 75%', () => {
    expect(getEncumbranceLevel(75, 100)).toBe('danger');
  });

  it('handles exact boundary at 100%', () => {
    expect(getEncumbranceLevel(100, 100)).toBe('critical');
  });
});

describe('formatEncumbrance', () => {
  it('formats current and max as "current / max"', () => {
    expect(formatEncumbrance(12, 18)).toBe('12 / 18');
  });

  it('handles zero values', () => {
    expect(formatEncumbrance(0, 18)).toBe('0 / 18');
    expect(formatEncumbrance(0, 0)).toBe('0 / 0');
  });

  it('contains both numeric values as substrings', () => {
    const result = formatEncumbrance(7, 15);
    expect(result).toContain('7');
    expect(result).toContain('15');
  });
});
