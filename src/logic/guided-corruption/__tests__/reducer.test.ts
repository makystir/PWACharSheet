import { describe, it, expect } from 'vitest';
import { STEP_SEQUENCE, initialCorruptionFlowState, guidedCorruptionReducer } from '../reducer';
import type { CorruptionFlowState } from '../types';

describe('guidedCorruptionReducer — unit', () => {
  it('start returns a fresh flow at the threshold step', () => {
    const dirty: CorruptionFlowState = { step: 'mutation' };
    const s = guidedCorruptionReducer(dirty, { kind: 'start' });
    expect(s.step).toBe('threshold');
  });

  it('next walks threshold -> resistance -> mutation', () => {
    const start: CorruptionFlowState = { step: 'threshold' };
    const atResistance = guidedCorruptionReducer(start, { kind: 'next' });
    expect(atResistance.step).toBe('resistance');
    const atMutation = guidedCorruptionReducer(atResistance, { kind: 'next' });
    expect(atMutation.step).toBe('mutation');
  });

  it('back walks mutation -> resistance -> threshold', () => {
    const start: CorruptionFlowState = { step: 'mutation' };
    const atResistance = guidedCorruptionReducer(start, { kind: 'back' });
    expect(atResistance.step).toBe('resistance');
    const atThreshold = guidedCorruptionReducer(atResistance, { kind: 'back' });
    expect(atThreshold.step).toBe('threshold');
  });

  it('next clamps at the last step and is idempotent there (same reference)', () => {
    const atMutation: CorruptionFlowState = { step: 'mutation' };
    const again = guidedCorruptionReducer(atMutation, { kind: 'next' });
    expect(again).toBe(atMutation);
  });

  it('back clamps at the first step and is idempotent there (same reference)', () => {
    const atThreshold: CorruptionFlowState = { step: 'threshold' };
    const again = guidedCorruptionReducer(atThreshold, { kind: 'back' });
    expect(again).toBe(atThreshold);
  });

  it('next then back round-trips from the first step', () => {
    const atThreshold: CorruptionFlowState = { step: 'threshold' };
    const fwd = guidedCorruptionReducer(atThreshold, { kind: 'next' });
    expect(fwd.step).toBe('resistance');
    const back = guidedCorruptionReducer(fwd, { kind: 'back' });
    expect(back.step).toBe('threshold');
  });

  it('goto jumps to the named step', () => {
    const start: CorruptionFlowState = { step: 'threshold' };
    const s = guidedCorruptionReducer(start, { kind: 'goto', step: 'mutation' });
    expect(s.step).toBe('mutation');
  });

  it('goto to the current step is a same-reference no-op', () => {
    const start: CorruptionFlowState = { step: 'resistance' };
    expect(guidedCorruptionReducer(start, { kind: 'goto', step: 'resistance' })).toBe(start);
  });

  it('reset returns a fresh initial (deep-equal but not same reference)', () => {
    const dirty: CorruptionFlowState = { step: 'mutation' };
    const s = guidedCorruptionReducer(dirty, { kind: 'reset' });
    expect(s).toEqual(initialCorruptionFlowState);
    expect(s).not.toBe(initialCorruptionFlowState);
  });

  it('STEP_SEQUENCE is the fixed three-step order', () => {
    expect(STEP_SEQUENCE).toEqual(['threshold', 'resistance', 'mutation']);
  });
});
