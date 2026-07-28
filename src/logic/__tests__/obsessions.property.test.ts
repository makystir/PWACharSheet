// Feature: app-quality-improvements, Property 10: Obsession data persistence round-trip

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getObsessionDisplayState, type ObsessionData } from '../obsessions';
import type { YenluiState } from '../../types/character';

// --- Generators ---

/** Generate an arbitrary valid ObsessionData with non-empty strings */
const arbObsessionData: fc.Arbitrary<ObsessionData> = fc.record({
  description: fc.string({ minLength: 1 }),
  relatedTests: fc.string({ minLength: 1 }),
});

const arbYenluiState = fc.constantFrom<YenluiState | undefined>('light', 'balanced', 'dark', undefined);

/**
 * **Validates: Requirements 10.6**
 *
 * Property: For any valid ObsessionData (description and relatedTests as non-empty strings),
 * serializing to JSON and deserializing shall produce an equivalent object.
 */
describe('Feature: app-quality-improvements, Property 10: Obsession data persistence round-trip', () => {
  it('JSON.parse(JSON.stringify(data)) deep-equals original ObsessionData', () => {
    fc.assert(
      fc.property(
        arbObsessionData,
        (data) => {
          const serialized = JSON.stringify(data);
          const deserialized = JSON.parse(serialized);

          expect(deserialized).toEqual(data);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: app-quality-improvements, Property 9: Obsession state-dependent display

/**
 * **Validates: Requirements 10.3, 10.4, 10.5**
 *
 * Property: For any obsession data and Yenlui state, getObsessionDisplayState shall return:
 * benefit shown and no penalty when Light; benefit and penalty shown when Balanced;
 * only penalty shown when Dark; nothing shown when state is undefined.
 */
describe('Feature: app-quality-improvements, Property 9: Obsession state-dependent display', () => {
  it('Light state: benefit shown, no penalty', () => {
    fc.assert(
      fc.property(arbObsessionData, (obsession) => {
        const result = getObsessionDisplayState('light', obsession);
        expect(result.showBenefit).toBe(true);
        expect(result.showPenalty).toBe(false);
        expect(result.benefitText).not.toBe('');
        expect(result.penaltyText).toBe('');
      }),
      { numRuns: 100 }
    );
  });

  it('Balanced state: benefit and penalty both shown', () => {
    fc.assert(
      fc.property(arbObsessionData, (obsession) => {
        const result = getObsessionDisplayState('balanced', obsession);
        expect(result.showBenefit).toBe(true);
        expect(result.showPenalty).toBe(true);
        expect(result.benefitText).not.toBe('');
        expect(result.penaltyText).not.toBe('');
      }),
      { numRuns: 100 }
    );
  });

  it('Dark state: only penalty shown', () => {
    fc.assert(
      fc.property(arbObsessionData, (obsession) => {
        const result = getObsessionDisplayState('dark', obsession);
        expect(result.showBenefit).toBe(false);
        expect(result.showPenalty).toBe(true);
        expect(result.benefitText).toBe('');
        expect(result.penaltyText).not.toBe('');
      }),
      { numRuns: 100 }
    );
  });

  it('Undefined state: nothing shown', () => {
    fc.assert(
      fc.property(arbObsessionData, (obsession) => {
        const result = getObsessionDisplayState(undefined, obsession);
        expect(result.showBenefit).toBe(false);
        expect(result.showPenalty).toBe(false);
        expect(result.benefitText).toBe('');
        expect(result.penaltyText).toBe('');
      }),
      { numRuns: 100 }
    );
  });

  it('for any obsession and any Yenlui state, display flags match expected mapping', () => {
    fc.assert(
      fc.property(arbYenluiState, arbObsessionData, (state, obsession) => {
        const result = getObsessionDisplayState(state, obsession);

        switch (state) {
          case 'light':
            expect(result.showBenefit).toBe(true);
            expect(result.showPenalty).toBe(false);
            break;
          case 'balanced':
            expect(result.showBenefit).toBe(true);
            expect(result.showPenalty).toBe(true);
            break;
          case 'dark':
            expect(result.showBenefit).toBe(false);
            expect(result.showPenalty).toBe(true);
            break;
          default:
            expect(result.showBenefit).toBe(false);
            expect(result.showPenalty).toBe(false);
            break;
        }
      }),
      { numRuns: 100 }
    );
  });
});
