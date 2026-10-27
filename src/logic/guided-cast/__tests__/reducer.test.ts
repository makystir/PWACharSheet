import { describe, it, expect } from 'vitest';
import {
  STEP_SEQUENCE,
  applicableSteps,
  initialGuidedCastState,
  guidedCastReducer,
} from '../reducer';
import type { GuidedCastState } from '../types';
import type { CastingResult } from '../../spell-casting';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a CastingResult with only the flags the reducer reads mattering. */
function makeResult(overrides: Partial<CastingResult> = {}): CastingResult {
  return {
    rollResult: {} as CastingResult['rollResult'],
    spell: { name: 'X', cn: '3', range: '', target: '', duration: '', effect: '' },
    cn: 3,
    slAchieved: 5,
    castSuccess: true,
    surplusSL: 2,
    overcastSlots: 2,
    overcastAllocation: null,
    isCriticalCast: false,
    isFumbledCast: false,
    triggerMinorMiscast: false,
    triggerMajorMiscast: false,
    isMagicMissile: false,
    hitLocation: null,
    damage: null,
    isFullyChannelled: false,
    isUndispellable: false,
    ...overrides,
  };
}

/** A plain success with overcast available (overcast step applicable). */
const overcastResult = makeResult({ castSuccess: true, overcastSlots: 2 });
/** A success with no surplus and a Minor Miscast (miscast step applicable). */
const miscastResult = makeResult({
  castSuccess: true,
  overcastSlots: 0,
  triggerMinorMiscast: true,
});

describe('guidedCastReducer — unit', () => {
  it('start binds the flow to a spell at the select step', () => {
    const dirty: GuidedCastState = { ...initialGuidedCastState, step: 'outcome', spellName: 'Old' };
    const s = guidedCastReducer(dirty, { kind: 'start', spellName: 'Fireball' });
    expect(s.step).toBe('select');
    expect(s.spellName).toBe('Fireball');
    expect(s.result).toBeNull();
  });

  it('with no result, applicable steps exclude overcast and miscast', () => {
    expect(applicableSteps(initialGuidedCastState)).toEqual(['select', 'route', 'resolve', 'outcome']);
  });

  it('next from resolve lands on overcast when applicable, else outcome', () => {
    const withOvercast: GuidedCastState = {
      ...initialGuidedCastState,
      step: 'resolve',
      result: overcastResult,
    };
    expect(guidedCastReducer(withOvercast, { kind: 'next' }).step).toBe('overcast');

    const noOvercast: GuidedCastState = { ...initialGuidedCastState, step: 'resolve' };
    expect(guidedCastReducer(noOvercast, { kind: 'next' }).step).toBe('outcome');
  });

  it('next from resolve lands on miscast when only miscast is applicable', () => {
    const withMiscast: GuidedCastState = {
      ...initialGuidedCastState,
      step: 'resolve',
      result: miscastResult,
    };
    expect(guidedCastReducer(withMiscast, { kind: 'next' }).step).toBe('miscast');
  });

  it('next clamps at the last applicable step and is idempotent there', () => {
    const atOutcome: GuidedCastState = { ...initialGuidedCastState, step: 'outcome' };
    const again = guidedCastReducer(atOutcome, { kind: 'next' });
    expect(again).toBe(atOutcome);
  });

  it('back clamps at select and is idempotent there', () => {
    const atStart: GuidedCastState = { ...initialGuidedCastState, step: 'select' };
    const again = guidedCastReducer(atStart, { kind: 'back' });
    expect(again).toBe(atStart);
  });

  it('next then back round-trips across the applicable subset (skipping overcast)', () => {
    // No overcast: resolve -> outcome -> resolve.
    const atResolve: GuidedCastState = { ...initialGuidedCastState, step: 'resolve' };
    const fwd = guidedCastReducer(atResolve, { kind: 'next' });
    expect(fwd.step).toBe('outcome');
    const back = guidedCastReducer(fwd, { kind: 'back' });
    expect(back.step).toBe('resolve');
  });

  it('goto to an applicable step jumps; goto to an inapplicable step is a no-op', () => {
    const withOvercast: GuidedCastState = {
      ...initialGuidedCastState,
      result: overcastResult,
    };
    expect(guidedCastReducer(withOvercast, { kind: 'goto', step: 'overcast' }).step).toBe('overcast');
    // No result => miscast is not applicable.
    const s = guidedCastReducer(initialGuidedCastState, { kind: 'goto', step: 'miscast' });
    expect(s).toBe(initialGuidedCastState);
  });

  it('chooseRoute sets route without changing step', () => {
    const atRoute: GuidedCastState = { ...initialGuidedCastState, step: 'route' };
    const s = guidedCastReducer(atRoute, { kind: 'chooseRoute', route: 'channel' });
    expect(s.route).toBe('channel');
    expect(s.step).toBe('route');
  });

  it('castResolved stores the result and resets overcast/miscast flags', () => {
    const dirty: GuidedCastState = {
      ...initialGuidedCastState,
      step: 'resolve',
      overcastDone: true,
      miscastDone: true,
      overcastAllocations: { damage: 2 },
    };
    const s = guidedCastReducer(dirty, { kind: 'castResolved', result: overcastResult });
    expect(s.result).toBe(overcastResult);
    expect(s.overcastDone).toBe(false);
    expect(s.miscastDone).toBe(false);
    expect(s.overcastAllocations).toBeNull();
  });

  it('castResolved clamps to the nearest applicable step when the current step becomes inapplicable', () => {
    // On overcast, then a re-resolve zeroes overcastSlots → overcast inapplicable.
    const onOvercast: GuidedCastState = {
      ...initialGuidedCastState,
      step: 'overcast',
      result: overcastResult,
    };
    const reResolved = makeResult({ castSuccess: true, overcastSlots: 0 });
    const s = guidedCastReducer(onOvercast, { kind: 'castResolved', result: reResolved });
    // Nearest prior applicable step to 'overcast' is 'resolve'.
    expect(s.step).toBe('resolve');
    expect(applicableSteps(s)).not.toContain('overcast');
  });

  it('overcastResolved stores allocations and sets overcastDone without changing step', () => {
    const onOvercast: GuidedCastState = {
      ...initialGuidedCastState,
      step: 'overcast',
      result: overcastResult,
    };
    const s = guidedCastReducer(onOvercast, {
      kind: 'overcastResolved',
      allocations: { damage: 2 },
    });
    expect(s.overcastAllocations).toEqual({ damage: 2 });
    expect(s.overcastDone).toBe(true);
    expect(s.step).toBe('overcast');
  });

  it('miscastCompleted sets miscastDone without changing step', () => {
    const onMiscast: GuidedCastState = {
      ...initialGuidedCastState,
      step: 'miscast',
      result: miscastResult,
    };
    const s = guidedCastReducer(onMiscast, { kind: 'miscastCompleted' });
    expect(s.miscastDone).toBe(true);
    expect(s.step).toBe('miscast');
  });

  it('reset returns a fresh initialGuidedCastState from any state', () => {
    const dirty: GuidedCastState = {
      step: 'outcome',
      spellName: 'Fireball',
      route: 'cast',
      result: overcastResult,
      overcastDone: true,
      overcastAllocations: { damage: 2 },
      miscastDone: true,
    };
    const s = guidedCastReducer(dirty, { kind: 'reset' });
    expect(s).toEqual(initialGuidedCastState);
    expect(s).not.toBe(initialGuidedCastState);
  });

  it('STEP_SEQUENCE is the full six-step ordinal order', () => {
    expect(STEP_SEQUENCE).toEqual(['select', 'route', 'resolve', 'overcast', 'miscast', 'outcome']);
  });
});
