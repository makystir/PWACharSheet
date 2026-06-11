import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { SPECIES_DATA } from '../../data/species';

// ─── Property 1: Bug Condition — Missing Random Talent Slots and Rolling Mechanism
// **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
//
// This test encodes the EXPECTED behavior. It will FAIL on unfixed code (proving
// the bug exists) and PASS after the fix is implemented.
//
// On unfixed code:
//   - randomTalentSlots is undefined (tests 1 & 2 fail)
//   - src/data/randomTalents.ts does not exist (test 3 fails)
//   - rollRandomTalent cannot be called (test 4 fails)
// After fix:
//   - All tests pass, confirming the bug is resolved

describe('Property 1: Bug Condition - Missing Random Talent Slots and Rolling Mechanism', () => {

  // 1.1 — Human / Reiklander should have randomTalentSlots = 3
  it('SPECIES_DATA["Human / Reiklander"].randomTalentSlots exists and equals 3', () => {
    const humanData = SPECIES_DATA['Human / Reiklander'];
    expect(humanData).toBeDefined();
    expect((humanData as any).randomTalentSlots).toBeDefined();
    expect((humanData as any).randomTalentSlots).toBe(3);
  });

  // 1.2 — Halfling should have randomTalentSlots = 2
  it('SPECIES_DATA["Halfling"].randomTalentSlots exists and equals 2', () => {
    const halflingData = SPECIES_DATA['Halfling'];
    expect(halflingData).toBeDefined();
    expect((halflingData as any).randomTalentSlots).toBeDefined();
    expect((halflingData as any).randomTalentSlots).toBe(2);
  });

  // 1.4 — RANDOM_TALENT_TABLE module must exist as a file
  it('src/data/randomTalents.ts module file exists on disk', () => {
    const modulePath = resolve(__dirname, '../../data/randomTalents.ts');
    expect(
      existsSync(modulePath)
    ).toBe(true);
  });

  // 1.4 + 1.3 — When the module exists, RANDOM_TALENT_TABLE has 36 entries
  // and rollRandomTalent maps every d100 roll to a valid talent.
  // This test uses a property-based approach over d100 values.
  it('for any d100 roll value (1-100), rollRandomTalent(roll) returns a non-empty valid talent string', async () => {
    const modulePath = resolve(__dirname, '../../data/randomTalents.ts');
    if (!existsSync(modulePath)) {
      expect.fail(
        'Cannot test rollRandomTalent: src/data/randomTalents.ts does not exist — confirms bug condition (Req 1.3, 1.4)'
      );
      return;
    }

    // If we reach here, the module exists (post-fix). We use dynamic import
    // for compatibility with vitest's ESM environment.
    const mod = await import('../../data/randomTalents');
    const { RANDOM_TALENT_TABLE, rollRandomTalent } = mod;

    // Validate table structure
    expect(RANDOM_TALENT_TABLE).toBeDefined();
    expect(Array.isArray(RANDOM_TALENT_TABLE)).toBe(true);
    expect(RANDOM_TALENT_TABLE.length).toBe(36);

    // Verify full coverage 1-100 with no gaps or overlaps
    const sorted = [...RANDOM_TALENT_TABLE].sort((a: any, b: any) => a.min - b.min);
    expect(sorted[0].min).toBe(1);
    expect(sorted[sorted.length - 1].max).toBe(100);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].min).toBe(sorted[i - 1].max + 1);
    }

    // Property: for any d100 value, rollRandomTalent returns a non-empty talent
    expect(rollRandomTalent).toBeDefined();
    expect(typeof rollRandomTalent).toBe('function');

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (roll) => {
          const talent = rollRandomTalent(roll);
          expect(typeof talent).toBe('string');
          expect(talent.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
