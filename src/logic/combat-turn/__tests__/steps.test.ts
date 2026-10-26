import { describe, it, expect } from 'vitest';
import { STEP_SEQUENCE } from '../reducer';
import { defaultTurnAdvisor, describeStep } from '../steps';
import type { TurnStep } from '../types';

describe('describeStep — cited copy (guards against invented rules, AC-15)', () => {
  it('returns a non-empty title, body, and citation for every step', () => {
    for (const step of STEP_SEQUENCE) {
      const info = describeStep(step, { inCombat: true });
      expect(info.step).toBe(step);
      expect(info.title.length).toBeGreaterThan(0);
      expect(info.body.length).toBeGreaterThan(0);
      expect(info.citation.length).toBeGreaterThan(0);
    }
  });

  it('every citation references a Core page (no invented source)', () => {
    for (const step of STEP_SEQUENCE) {
      const { citation } = describeStep(step, { inCombat: true });
      expect(citation).toMatch(/Core p\.\d/);
    }
  });

  it('cites the verified Core pages per the approved design', () => {
    const cite = (step: TurnStep) => describeStep(step, { inCombat: true }).citation;
    // Start: default Challenging difficulty (p.157) + end-of-turn condition timing (p.167-169)
    expect(cite('start')).toContain('p.157');
    expect(cite('start')).toContain('p.167-169');
    // Choose: one-Move-one-Action turn shape (p.156-157) + On The Defensive (p.157) + Advantage (p.164)
    expect(cite('choose')).toContain('p.156-157');
    expect(cite('choose')).toContain('p.157');
    expect(cite('choose')).toContain('p.164');
    // Resolve: Attacking (p.157-158)
    expect(cite('resolve')).toContain('p.157-158');
    // End: end-of-turn condition timing (p.167-169)
    expect(cite('end')).toContain('p.167-169');
  });

  it('defaultTurnAdvisor is a synchronous object wrapping describeStep (AC-18)', () => {
    const result = defaultTurnAdvisor.describe('start', { inCombat: true });
    // Synchronous-by-default: not a Promise.
    expect(result).not.toBeInstanceOf(Promise);
    expect(result).toEqual(describeStep('start', { inCombat: true }));
  });
});
