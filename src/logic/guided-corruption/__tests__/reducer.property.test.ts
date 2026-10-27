import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { STEP_SEQUENCE, initialCorruptionFlowState, guidedCorruptionReducer } from '../reducer';
import type { CorruptionStep, CorruptionFlowEvent, CorruptionFlowState } from '../types';

const steps: CorruptionStep[] = [...STEP_SEQUENCE];

const arbEvent: fc.Arbitrary<CorruptionFlowEvent> = fc.oneof(
  fc.constant<CorruptionFlowEvent>({ kind: 'start' }),
  fc.constant<CorruptionFlowEvent>({ kind: 'next' }),
  fc.constant<CorruptionFlowEvent>({ kind: 'back' }),
  fc.constantFrom(...steps).map<CorruptionFlowEvent>((step) => ({ kind: 'goto', step })),
  fc.constant<CorruptionFlowEvent>({ kind: 'reset' }),
);

const arbState: fc.Arbitrary<CorruptionFlowState> = fc.record({
  step: fc.constantFrom(...steps),
});

describe('guidedCorruptionReducer — properties', () => {
  it('step is always a member of STEP_SEQUENCE after any event sequence', () => {
    fc.assert(
      fc.property(fc.array(arbEvent, { maxLength: 40 }), (events) => {
        let s = initialCorruptionFlowState;
        for (const e of events) s = guidedCorruptionReducer(s, e);
        expect(STEP_SEQUENCE).toContain(s.step);
      }),
    );
  });

  it('next/back/goto keep the step in-sequence (and clamped)', () => {
    const navOnly: fc.Arbitrary<CorruptionFlowEvent> = fc.oneof(
      fc.constant<CorruptionFlowEvent>({ kind: 'next' }),
      fc.constant<CorruptionFlowEvent>({ kind: 'back' }),
      fc.constantFrom(...steps).map<CorruptionFlowEvent>((step) => ({ kind: 'goto', step })),
    );
    fc.assert(
      fc.property(arbState, navOnly, (base, e) => {
        const s = guidedCorruptionReducer(base, e);
        expect(STEP_SEQUENCE).toContain(s.step);
      }),
    );
  });

  it('next from the last step and back from the first are reference-identical no-ops', () => {
    const atLast: CorruptionFlowState = { step: 'mutation' };
    expect(guidedCorruptionReducer(atLast, { kind: 'next' })).toBe(atLast);
    const atFirst: CorruptionFlowState = { step: 'threshold' };
    expect(guidedCorruptionReducer(atFirst, { kind: 'back' })).toBe(atFirst);
  });

  it('reset from any state deep-equals initialCorruptionFlowState', () => {
    fc.assert(
      fc.property(arbState, (s) => {
        expect(guidedCorruptionReducer(s, { kind: 'reset' })).toEqual(initialCorruptionFlowState);
      }),
    );
  });

  it('is a pure function of (state, event): same inputs -> deeply-equal output', () => {
    fc.assert(
      fc.property(arbState, arbEvent, (s, e) => {
        const a = guidedCorruptionReducer({ ...s }, { ...e } as CorruptionFlowEvent);
        const b = guidedCorruptionReducer({ ...s }, { ...e } as CorruptionFlowEvent);
        expect(a).toEqual(b);
      }),
    );
  });

  it('never throws on a frozen input state', () => {
    fc.assert(
      fc.property(arbState, arbEvent, (s, e) => {
        const frozen = Object.freeze({ ...s });
        expect(() => guidedCorruptionReducer(frozen, e)).not.toThrow();
      }),
    );
  });

  it('no event implicitly advances past the initial threshold step', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant<CorruptionFlowEvent>({ kind: 'back' }),
          fc.constant<CorruptionFlowEvent>({ kind: 'reset' }),
          fc.constant<CorruptionFlowEvent>({ kind: 'start' }),
        ),
        (e) => {
          const start = guidedCorruptionReducer(initialCorruptionFlowState, { kind: 'start' });
          // back/reset/start never move forward from threshold.
          expect(guidedCorruptionReducer(start, e).step).toBe('threshold');
        },
      ),
    );
  });
});
