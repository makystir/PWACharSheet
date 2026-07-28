// Feature: app-quality-improvements, Property 7: Spell card field completeness
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { SpellCard } from '../../shared/SpellCastingPanel';
import type { SpellItem } from '../../../types/character';

/**
 * Property 7: Spell card field completeness
 *
 * **Validates: Requirements 8.2, 8.3**
 *
 * For any spell data with non-empty fields, the rendered mobile card shall
 * contain the spell name, CN value, range, target, duration, and effect text.
 */

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generate a non-empty string suitable for spell fields (no extreme lengths) */
const nonEmptyString = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

/** Generate a valid CN string (numeric-ish values as used in the app) */
const cnString = fc.oneof(
  fc.integer({ min: 0, max: 20 }).map(String),
  fc.constant('-'),
);

/** Generate arbitrary SpellItem with non-empty fields */
const arbitrarySpell: fc.Arbitrary<SpellItem> = fc.record({
  name: nonEmptyString,
  cn: cnString,
  range: nonEmptyString,
  target: nonEmptyString,
  duration: nonEmptyString,
  effect: nonEmptyString,
  memorized: fc.constant(true),
});

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: app-quality-improvements', () => {
  describe('Property 7: Spell card field completeness', () => {
    it('rendered SpellCard contains spell name, CN, range, target, duration, and effect', () => {
      fc.assert(
        fc.property(
          arbitrarySpell,
          (spell) => {
            const { container } = render(<SpellCard spell={spell} />);
            const text = container.textContent || '';

            // Spell name must be present
            expect(text).toContain(spell.name);

            // CN value must be present (rendered as "CN {value}")
            expect(text).toContain(`CN ${spell.cn}`);

            // Range must be present
            expect(text).toContain(spell.range);

            // Target must be present
            expect(text).toContain(spell.target);

            // Duration must be present
            expect(text).toContain(spell.duration);

            // Effect must be present
            expect(text).toContain(spell.effect);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
