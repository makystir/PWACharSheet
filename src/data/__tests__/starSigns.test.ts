import { describe, it, expect } from 'vitest';
import { STAR_SIGNS } from '../starSigns';

describe('Star Signs data', () => {
  it('should contain exactly 20 star sign entries', () => {
    expect(STAR_SIGNS).toHaveLength(20);
  });
});
