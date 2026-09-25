import { describe, it, expect } from 'vitest';
import { generateUUID } from '../uuid';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('generateUUID', () => {
  it('returns a v4-shaped UUID string', () => {
    expect(generateUUID()).toMatch(UUID_V4);
  });

  it('returns distinct values across calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateUUID()));
    expect(ids.size).toBe(100);
  });
});
