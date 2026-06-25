import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getHelpContent } from '../help-content';

// Feature: ux-improvements, Property 7: Help content length constraint

const KNOWN_CONCEPT_IDS = ['status-tier', 'slot-calculation', 'career-advancement', 'yenlui-balance'] as const;

describe('Property 7: Help content length constraint', () => {
  it('for any registered help content entry, the explanatory text length shall be at most 280 characters', () => {
    fc.assert(
      fc.property(fc.constantFrom(...KNOWN_CONCEPT_IDS), (conceptId) => {
        const content = getHelpContent(conceptId);

        // Each entry must be non-empty (it's a registered concept)
        expect(content.length).toBeGreaterThan(0);

        // The explanatory text length must be at most 280 characters
        expect(content.length).toBeLessThanOrEqual(280);
      }),
      { numRuns: 100 }
    );
  });

  it('each known concept returns a non-empty string', () => {
    fc.assert(
      fc.property(fc.constantFrom(...KNOWN_CONCEPT_IDS), (conceptId) => {
        const content = getHelpContent(conceptId);
        expect(content).not.toBe('');
        expect(typeof content).toBe('string');
      }),
      { numRuns: 100 }
    );
  });
});
