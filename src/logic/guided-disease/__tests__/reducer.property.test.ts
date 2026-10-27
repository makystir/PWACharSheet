import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { STEP_SEQUENCE, initialDiseaseFlowState, guidedDiseaseReducer } from '../reducer';
import type { DiseaseStep, DiseaseFlowEvent, DiseaseFlowState } from '../types';

const steps: DiseaseStep[] = [...STEP_SEQUENCE];

const arbEvent: fc.Arbitrary<DiseaseFlowEvent> = fc.oneof(
  fc.integer({ min: 1, max: 20 }).map<DiseaseFlowEvent>((diseaseId) => ({ kind: 'start', diseaseId })),
  fc.constant<DiseaseFlowEvent>({ kind: 'next' }),
  fc.constant<DiseaseFlowEvent>({ kind: 'back' }),
  fc.constantFrom(...steps).map<DiseaseFlowEvent>((step) => ({ kind: 'goto', step })),
  fc.constant<DiseaseFlowEvent>({ kind: 'reset' }),
);

const arbState: fc.Arbitrary<DiseaseFlowState> = fc.record({
  step: fc.constantFrom(...steps),
  diseaseId: fc.option(fc.integer({ min: 1, max: 20 }), { nil: null }),
});

describe('guidedDiseaseReducer — properties', () => {
  it('step is always a member of STEP_SEQUENCE after any event sequence', () => {
    fc.assert(
      fc.property(fc.array(arbEvent, { maxLength: 40 }), (events) => {
        let s = initialDiseaseFlowState;
        for (const e of events) s = guidedDiseaseReducer(s, e);
        expect(STEP_SEQUENCE).toContain(s.step);
      }),
    );
  });

  it('next/back/goto keep the step in-sequence (and clamped)', () => {
    const navOnly: fc.Arbitrary<DiseaseFlowEvent> = fc.oneof(
      fc.constant<DiseaseFlowEvent>({ kind: 'next' }),
      fc.constant<DiseaseFlowEvent>({ kind: 'back' }),
      fc.constantFrom(...steps).map<DiseaseFlowEvent>((step) => ({ kind: 'goto', step })),
    );
    fc.assert(
      fc.property(arbState, navOnly, (base, e) => {
        const s = guidedDiseaseReducer(base, e);
        expect(STEP_SEQUENCE).toContain(s.step);
      }),
    );
  });

  it('next from the last step and back from the first are reference-identical no-ops', () => {
    fc.assert(
      fc.property(fc.option(fc.integer({ min: 1, max: 20 }), { nil: null }), (diseaseId) => {
        const atLast: DiseaseFlowState = { step: 'duration', diseaseId };
        expect(guidedDiseaseReducer(atLast, { kind: 'next' })).toBe(atLast);
        const atFirst: DiseaseFlowState = { step: 'overview', diseaseId };
        expect(guidedDiseaseReducer(atFirst, { kind: 'back' })).toBe(atFirst);
      }),
    );
  });

  it('reset from any state deep-equals initialDiseaseFlowState', () => {
    fc.assert(
      fc.property(arbState, (s) => {
        expect(guidedDiseaseReducer(s, { kind: 'reset' })).toEqual(initialDiseaseFlowState);
      }),
    );
  });

  it('is a pure function of (state, event): same inputs -> deeply-equal output', () => {
    fc.assert(
      fc.property(arbState, arbEvent, (s, e) => {
        const a = guidedDiseaseReducer({ ...s }, { ...e } as DiseaseFlowEvent);
        const b = guidedDiseaseReducer({ ...s }, { ...e } as DiseaseFlowEvent);
        expect(a).toEqual(b);
      }),
    );
  });

  it('never throws on a frozen input state', () => {
    fc.assert(
      fc.property(arbState, arbEvent, (s, e) => {
        const frozen = Object.freeze({ ...s });
        expect(() => guidedDiseaseReducer(frozen, e)).not.toThrow();
      }),
    );
  });

  it('only start sets diseaseId; reset clears it; next/back/goto preserve it', () => {
    fc.assert(
      fc.property(arbState, (base) => {
        expect(guidedDiseaseReducer(base, { kind: 'start', diseaseId: 42 }).diseaseId).toBe(42);
        expect(guidedDiseaseReducer(base, { kind: 'reset' }).diseaseId).toBeNull();
        expect(guidedDiseaseReducer(base, { kind: 'next' }).diseaseId).toBe(base.diseaseId);
        expect(guidedDiseaseReducer(base, { kind: 'back' }).diseaseId).toBe(base.diseaseId);
        expect(
          guidedDiseaseReducer(base, { kind: 'goto', step: 'duration' }).diseaseId,
        ).toBe(base.diseaseId);
      }),
    );
  });

  it('no event implicitly advances past the bound overview step', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant<DiseaseFlowEvent>({ kind: 'back' }),
          fc.constant<DiseaseFlowEvent>({ kind: 'reset' }),
          fc.integer({ min: 1, max: 20 }).map<DiseaseFlowEvent>((d) => ({ kind: 'start', diseaseId: d })),
        ),
        (e) => {
          const start = guidedDiseaseReducer(initialDiseaseFlowState, { kind: 'start', diseaseId: 1 });
          // back/reset/start never move forward from overview.
          expect(guidedDiseaseReducer(start, e).step).toBe('overview');
        },
      ),
    );
  });
});
