import { describe, it, expect } from 'vitest';
import { STEP_SEQUENCE, initialDiseaseFlowState, guidedDiseaseReducer } from '../reducer';
import type { DiseaseFlowState } from '../types';

describe('guidedDiseaseReducer — unit', () => {
  it('start binds the flow to a disease at the overview step', () => {
    const dirty: DiseaseFlowState = { step: 'duration', diseaseId: 7 };
    const s = guidedDiseaseReducer(dirty, { kind: 'start', diseaseId: 3 });
    expect(s.step).toBe('overview');
    expect(s.diseaseId).toBe(3);
  });

  it('next walks overview -> symptoms -> duration', () => {
    const start: DiseaseFlowState = { step: 'overview', diseaseId: 1 };
    const atSymptoms = guidedDiseaseReducer(start, { kind: 'next' });
    expect(atSymptoms.step).toBe('symptoms');
    const atDuration = guidedDiseaseReducer(atSymptoms, { kind: 'next' });
    expect(atDuration.step).toBe('duration');
  });

  it('back walks duration -> symptoms -> overview', () => {
    const start: DiseaseFlowState = { step: 'duration', diseaseId: 1 };
    const atSymptoms = guidedDiseaseReducer(start, { kind: 'back' });
    expect(atSymptoms.step).toBe('symptoms');
    const atOverview = guidedDiseaseReducer(atSymptoms, { kind: 'back' });
    expect(atOverview.step).toBe('overview');
  });

  it('next clamps at the last step and is idempotent there (same reference)', () => {
    const atDuration: DiseaseFlowState = { step: 'duration', diseaseId: 1 };
    const again = guidedDiseaseReducer(atDuration, { kind: 'next' });
    expect(again).toBe(atDuration);
  });

  it('back clamps at the first step and is idempotent there (same reference)', () => {
    const atOverview: DiseaseFlowState = { step: 'overview', diseaseId: 1 };
    const again = guidedDiseaseReducer(atOverview, { kind: 'back' });
    expect(again).toBe(atOverview);
  });

  it('next then back round-trips from an interior step', () => {
    const atOverview: DiseaseFlowState = { step: 'overview', diseaseId: 2 };
    const fwd = guidedDiseaseReducer(atOverview, { kind: 'next' });
    expect(fwd.step).toBe('symptoms');
    const back = guidedDiseaseReducer(fwd, { kind: 'back' });
    expect(back.step).toBe('overview');
  });

  it('goto jumps to the named step and preserves diseaseId', () => {
    const start: DiseaseFlowState = { step: 'overview', diseaseId: 5 };
    const s = guidedDiseaseReducer(start, { kind: 'goto', step: 'duration' });
    expect(s.step).toBe('duration');
    expect(s.diseaseId).toBe(5);
  });

  it('goto to the current step is a same-reference no-op', () => {
    const start: DiseaseFlowState = { step: 'symptoms', diseaseId: 5 };
    expect(guidedDiseaseReducer(start, { kind: 'goto', step: 'symptoms' })).toBe(start);
  });

  it('reset returns a fresh initial (deep-equal but not same reference) and clears diseaseId', () => {
    const dirty: DiseaseFlowState = { step: 'duration', diseaseId: 9 };
    const s = guidedDiseaseReducer(dirty, { kind: 'reset' });
    expect(s).toEqual(initialDiseaseFlowState);
    expect(s).not.toBe(initialDiseaseFlowState);
    expect(s.diseaseId).toBeNull();
  });

  it('STEP_SEQUENCE is the fixed three-step order', () => {
    expect(STEP_SEQUENCE).toEqual(['overview', 'symptoms', 'duration']);
  });
});
