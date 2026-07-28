import { describe, it, expect } from 'vitest';
import { getObsessionDisplayState, type ObsessionData } from '../obsessions';
import type { YenluiState } from '../../types/character';

describe('getObsessionDisplayState', () => {
  const obsession: ObsessionData = {
    description: 'Painting masterpieces',
    relatedTests: 'Art (Any)',
  };

  it('returns nothing shown when obsession is undefined', () => {
    const result = getObsessionDisplayState('light', undefined);
    expect(result).toEqual({ showBenefit: false, showPenalty: false, benefitText: '', penaltyText: '' });
  });

  it('returns nothing shown when obsession has empty description', () => {
    const result = getObsessionDisplayState('light', { description: '', relatedTests: 'Art' });
    expect(result).toEqual({ showBenefit: false, showPenalty: false, benefitText: '', penaltyText: '' });
  });

  it('returns nothing shown when yenluiState is undefined', () => {
    const result = getObsessionDisplayState(undefined, obsession);
    expect(result).toEqual({ showBenefit: false, showPenalty: false, benefitText: '', penaltyText: '' });
  });

  it('returns benefit only for light state', () => {
    const result = getObsessionDisplayState('light', obsession);
    expect(result.showBenefit).toBe(true);
    expect(result.showPenalty).toBe(false);
    expect(result.benefitText).toBe('+2 SL on related Tests');
    expect(result.penaltyText).toBe('');
  });

  it('returns benefit and penalty for balanced state', () => {
    const result = getObsessionDisplayState('balanced', obsession);
    expect(result.showBenefit).toBe(true);
    expect(result.showPenalty).toBe(true);
    expect(result.benefitText).toBe('+2 SL on related Tests');
    expect(result.penaltyText).toBe('Must take benefit first; penalty then applies');
  });

  it('returns penalty only for dark state', () => {
    const result = getObsessionDisplayState('dark', obsession);
    expect(result.showBenefit).toBe(false);
    expect(result.showPenalty).toBe(true);
    expect(result.benefitText).toBe('');
    expect(result.penaltyText).toBe('Penalty applies even without benefit');
  });
});
