import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  STEP_SEQUENCE,
  applicableSteps,
  applicableIndex,
  initialGuidedCastState,
  guidedCastReducer,
} from '../reducer';
import type { CastRoute, CastStep, GuidedCastEvent, GuidedCastState } from '../types';
import type { CastingResult } from '../../spell-casting';

const steps: CastStep[] = [...STEP_SEQUENCE];
const routes: CastRoute[] = ['cast', 'channel', null];

/** Representative CastingResult flag combinations (null plus a flag matrix). */
const arbResult: fc.Arbitrary<CastingResult | null> = fc.option(
  fc
    .record({
      castSuccess: fc.boolean(),
      overcastSlots: fc.integer({ min: 0, max: 8 }),
      triggerMinorMiscast: fc.boolean(),
      triggerMajorMiscast: fc.boolean(),
    })
    .map<CastingResult>((flags) => ({
      rollResult: {} as CastingResult['rollResult'],
      spell: { name: 'X', cn: '3', range: '', target: '', duration: '', effect: '' },
      cn: 3,
      slAchieved: 5,
      castSuccess: flags.castSuccess,
      surplusSL: flags.overcastSlots,
      overcastSlots: flags.overcastSlots,
      overcastAllocation: null,
      isCriticalCast: false,
      isFumbledCast: false,
      triggerMinorMiscast: flags.triggerMinorMiscast,
      triggerMajorMiscast: flags.triggerMajorMiscast,
      isMagicMissile: false,
      hitLocation: null,
      damage: null,
      isFullyChannelled: false,
      isUndispellable: false,
    })),
  { nil: null, freq: 4 },
);

const arbEvent: fc.Arbitrary<GuidedCastEvent> = fc.oneof(
  fc.string().map<GuidedCastEvent>((spellName) => ({ kind: 'start', spellName })),
  fc.constant<GuidedCastEvent>({ kind: 'next' }),
  fc.constant<GuidedCastEvent>({ kind: 'back' }),
  fc.constantFrom(...steps).map<GuidedCastEvent>((step) => ({ kind: 'goto', step })),
  fc.constantFrom(...routes).map<GuidedCastEvent>((route) => ({ kind: 'chooseRoute', route })),
  fc
    .dictionary(fc.string(), fc.integer({ min: 0, max: 8 }))
    .map<GuidedCastEvent>((allocations) => ({ kind: 'overcastResolved', allocations })),
  fc.constant<GuidedCastEvent>({ kind: 'miscastCompleted' }),
  fc.constant<GuidedCastEvent>({ kind: 'reset' }),
);

const arbState: fc.Arbitrary<GuidedCastState> = fc.record({
  step: fc.constantFrom(...steps),
  spellName: fc.option(fc.string(), { nil: null }),
  route: fc.constantFrom(...routes),
  result: arbResult,
  overcastDone: fc.boolean(),
  overcastAllocations: fc.option(
    fc.dictionary(fc.string(), fc.integer({ min: 0, max: 8 })),
    { nil: null },
  ),
  miscastDone: fc.boolean(),
});

describe('guidedCastReducer — properties', () => {
  it('step is always a member of STEP_SEQUENCE after any event sequence', () => {
    fc.assert(
      fc.property(fc.array(arbEvent, { maxLength: 40 }), (events) => {
        let s = initialGuidedCastState;
        for (const e of events) s = guidedCastReducer(s, e);
        expect(STEP_SEQUENCE).toContain(s.step);
      }),
    );
  });

  it('after next/back/goto, the step is within the applicable subset', () => {
    const navOnly: fc.Arbitrary<GuidedCastEvent> = fc.oneof(
      fc.constant<GuidedCastEvent>({ kind: 'next' }),
      fc.constant<GuidedCastEvent>({ kind: 'back' }),
      fc.constantFrom(...steps).map<GuidedCastEvent>((step) => ({ kind: 'goto', step })),
    );
    fc.assert(
      fc.property(arbState, navOnly, (base, e) => {
        // Start from a state whose step is already applicable so navigation stays in-subset.
        const steps0 = applicableSteps(base);
        const start: GuidedCastState = { ...base, step: steps0[applicableIndex(base)] };
        const s = guidedCastReducer(start, e);
        expect(applicableSteps(s)).toContain(s.step);
      }),
    );
  });

  it('next then back round-trips over the applicable subset from an interior step', () => {
    fc.assert(
      fc.property(arbState, (base) => {
        const subset = applicableSteps(base);
        // Pick an interior applicable step (not first, not last) if one exists.
        if (subset.length < 3) return;
        const interior = subset[1];
        const s: GuidedCastState = { ...base, step: interior };
        const rt = guidedCastReducer(guidedCastReducer(s, { kind: 'next' }), { kind: 'back' });
        expect(rt.step).toBe(interior);
      }),
    );
  });

  it('reset from any state deep-equals initialGuidedCastState', () => {
    fc.assert(
      fc.property(arbState, (s) => {
        expect(guidedCastReducer(s, { kind: 'reset' })).toEqual(initialGuidedCastState);
      }),
    );
  });

  it('overcastResolved / miscastCompleted never change step', () => {
    fc.assert(
      fc.property(
        arbState,
        fc.dictionary(fc.string(), fc.integer({ min: 0, max: 8 })),
        (s, allocations) => {
          expect(guidedCastReducer(s, { kind: 'overcastResolved', allocations }).step).toBe(s.step);
          expect(guidedCastReducer(s, { kind: 'miscastCompleted' }).step).toBe(s.step);
        },
      ),
    );
  });

  it('never throws on a frozen input state', () => {
    fc.assert(
      fc.property(arbState, arbEvent, (s, e) => {
        const frozen = Object.freeze({ ...s });
        expect(() => guidedCastReducer(frozen, e)).not.toThrow();
      }),
    );
  });

  it('is a pure function of (state, event): same inputs -> deeply-equal output', () => {
    fc.assert(
      fc.property(arbState, arbEvent, (s, e) => {
        const a = guidedCastReducer({ ...s }, { ...e } as GuidedCastEvent);
        const b = guidedCastReducer({ ...s }, { ...e } as GuidedCastEvent);
        expect(a).toEqual(b);
      }),
    );
  });
});
