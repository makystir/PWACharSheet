import { describe, it, expect } from 'vitest';
import { STEP_SEQUENCE } from '../reducer';
import { defaultCastAdvisor, describeCastStep } from '../steps';
import type { CastRoute, CastStep } from '../types';

const ctx: { isPetty: boolean; route: CastRoute } = { isPetty: false, route: null };

describe('describeCastStep — cited copy (guards against invented rules)', () => {
  it('returns a non-empty title, body, and citation for every step', () => {
    for (const step of STEP_SEQUENCE) {
      const info = describeCastStep(step, ctx);
      expect(info.step).toBe(step);
      expect(info.title.length).toBeGreaterThan(0);
      expect(info.body.length).toBeGreaterThan(0);
      expect(info.citation.length).toBeGreaterThan(0);
    }
  });

  it('every citation references a rulebook source (no invented source)', () => {
    for (const step of STEP_SEQUENCE) {
      const { citation } = describeCastStep(step, ctx);
      expect(citation).toMatch(/Core p\.\d|WoM/);
    }
  });

  it('cites the exact rulebook pages per the approved design', () => {
    const cite = (step: CastStep, c = ctx) => describeCastStep(step, c).citation;
    // Casting Test — Core p.234.
    expect(cite('select')).toContain('Core p.234');
    // Route — Core p.234 (cast) + Core p.237 + WoM Channelling Test (channel).
    expect(cite('route')).toContain('Core p.234');
    expect(cite('route')).toContain('Core p.237');
    expect(cite('route')).toContain('Channelling Test');
    // Critical/Fumbled — Core p.234-235 + WoM Critical/Fumbled Casting.
    expect(cite('resolve')).toContain('Core p.234-235');
    expect(cite('resolve')).toContain('Critical Casting');
    expect(cite('resolve')).toContain('Fumbled Casting');
    // Overcasting — Core p.238 superseded by WoM Overcast Table p.23.
    expect(cite('overcast')).toContain('Core p.238');
    expect(cite('overcast')).toContain('p.23');
    // Miscast tables — Core p.234-235.
    expect(cite('miscast')).toContain('Core p.234-235');
    // Outcome — Core p.234 + WoM Overcast Table.
    expect(cite('outcome')).toContain('Core p.234');
  });

  it('Step 2 separates the Core cast/CN cite from the app-convention Petty clause', () => {
    const nonPetty = describeCastStep('route', { isPetty: false, route: null });
    const petty = describeCastStep('route', { isPetty: true, route: null });
    // Core cast/CN citation present regardless of Petty.
    expect(nonPetty.citation).toContain('Core p.234');
    expect(petty.citation).toContain('Core p.234');
    // The Petty-no-channel clause is an app convention, added only when Petty.
    expect(nonPetty.citation).not.toContain('app convention');
    expect(petty.citation).toContain('app convention');
    expect(petty.body).toContain('Petty');
  });

  it('copy invents no TN or cost numbers', () => {
    for (const step of STEP_SEQUENCE) {
      const { body } = describeCastStep(step, ctx);
      // No "+NN" style target numbers and no coin costs in the guidance copy.
      expect(body).not.toMatch(/[+-]\d{2,}/);
      expect(body).not.toMatch(/\d+\s?(gc|ss|bp)\b/i);
    }
  });

  it('defaultCastAdvisor is a synchronous object wrapping describeCastStep', () => {
    const result = defaultCastAdvisor.describe('select', ctx);
    expect(result).not.toBeInstanceOf(Promise);
    expect(result).toEqual(describeCastStep('select', ctx));
  });
});
