import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { STEP_SEQUENCE, initialTurnState, turnReducer } from '../reducer';
import type { TurnEvent, TurnOption, TurnState, TurnStep } from '../types';

const steps: TurnStep[] = [...STEP_SEQUENCE];
const options: TurnOption[] = ['attack', 'cast', 'defend', 'skill', null];

const arbEvent: fc.Arbitrary<TurnEvent> = fc.oneof(
  fc.constant<TurnEvent>({ kind: 'next' }),
  fc.constant<TurnEvent>({ kind: 'back' }),
  fc.constantFrom(...steps).map<TurnEvent>((step) => ({ kind: 'goto', step })),
  fc.constantFrom(...options).map<TurnEvent>((option) => ({ kind: 'chooseOption', option })),
  fc.boolean().map<TurnEvent>((used) => ({ kind: 'markMove', used })),
  fc.boolean().map<TurnEvent>((used) => ({ kind: 'markAction', used })),
  fc.constant<TurnEvent>({ kind: 'reset' }),
);

const arbState: fc.Arbitrary<TurnState> = fc.record({
  step: fc.constantFrom(...steps),
  moveUsed: fc.boolean(),
  actionUsed: fc.boolean(),
  chosenOption: fc.constantFrom(...options),
});

describe('turnReducer — properties', () => {
  it('step is always a member of STEP_SEQUENCE after any event sequence', () => {
    fc.assert(
      fc.property(fc.array(arbEvent, { maxLength: 40 }), (events) => {
        let s = initialTurnState;
        for (const e of events) s = turnReducer(s, e);
        expect(STEP_SEQUENCE).toContain(s.step);
      }),
    );
  });

  it('next then back round-trips from any interior step', () => {
    const interior: TurnStep[] = ['choose', 'resolve']; // not clamped boundaries
    fc.assert(
      fc.property(fc.constantFrom(...interior), arbState, (step, base) => {
        const s: TurnState = { ...base, step };
        const rt = turnReducer(turnReducer(s, { kind: 'next' }), { kind: 'back' });
        expect(rt.step).toBe(step);
      }),
    );
  });

  it('reset from any state deep-equals initialTurnState', () => {
    fc.assert(
      fc.property(arbState, (s) => {
        expect(turnReducer(s, { kind: 'reset' })).toEqual(initialTurnState);
      }),
    );
  });

  it('markMove / markAction never change step', () => {
    fc.assert(
      fc.property(arbState, fc.boolean(), (s, used) => {
        expect(turnReducer(s, { kind: 'markMove', used }).step).toBe(s.step);
        expect(turnReducer(s, { kind: 'markAction', used }).step).toBe(s.step);
      }),
    );
  });

  it('never mutates a frozen input state', () => {
    fc.assert(
      fc.property(arbState, arbEvent, (s, e) => {
        const frozen = Object.freeze({ ...s });
        // Would throw in strict mode if the reducer mutated its argument.
        expect(() => turnReducer(frozen, e)).not.toThrow();
      }),
    );
  });

  it('is a pure function of (state, event): same inputs -> deeply-equal output', () => {
    fc.assert(
      fc.property(arbState, arbEvent, (s, e) => {
        const a = turnReducer({ ...s }, { ...e } as TurnEvent);
        const b = turnReducer({ ...s }, { ...e } as TurnEvent);
        expect(a).toEqual(b);
      }),
    );
  });
});
