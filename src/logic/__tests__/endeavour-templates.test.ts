import { describe, it, expect } from 'vitest';
import { ENDEAVOUR_TEMPLATES, applyEndeavourTemplate } from '../endeavour-templates';

describe('ENDEAVOUR_TEMPLATES', () => {
  it('contains exactly 6 templates', () => {
    expect(ENDEAVOUR_TEMPLATES).toHaveLength(6);
  });

  it('includes all expected template types', () => {
    const types = ENDEAVOUR_TEMPLATES.map(t => t.type);
    expect(types).toEqual(['Training', 'Income', 'Research', 'Crafting', 'Healing', 'Socialising']);
  });

  it('all templates have non-empty notes', () => {
    for (const template of ENDEAVOUR_TEMPLATES) {
      expect(template.notes.length).toBeGreaterThan(0);
    }
  });

  it('Income template has null cost', () => {
    const income = ENDEAVOUR_TEMPLATES.find(t => t.type === 'Income');
    expect(income?.cost).toBeNull();
  });

  it('templates with cost have Brass, Silver, Gold keys', () => {
    for (const template of ENDEAVOUR_TEMPLATES) {
      if (template.cost !== null) {
        expect(Object.keys(template.cost)).toEqual(['Brass', 'Silver', 'Gold']);
      }
    }
  });
});

describe('applyEndeavourTemplate', () => {
  describe('case-insensitive lookup', () => {
    it('finds template with exact case', () => {
      const result = applyEndeavourTemplate('Training', 'Silver 2');
      expect(result.type).toBe('Training');
    });

    it('finds template with lowercase', () => {
      const result = applyEndeavourTemplate('training', 'Silver 2');
      expect(result.type).toBe('Training');
    });

    it('finds template with uppercase', () => {
      const result = applyEndeavourTemplate('RESEARCH', 'Gold 1');
      expect(result.type).toBe('Research');
    });

    it('finds template with mixed case', () => {
      const result = applyEndeavourTemplate('sOcIaLiSiNg', 'Brass 4');
      expect(result.type).toBe('Socialising');
    });
  });

  describe('unknown template type', () => {
    it('returns empty notes and cost with warning', () => {
      const result = applyEndeavourTemplate('Gardening', 'Silver 2');
      expect(result.type).toBe('Gardening');
      expect(result.notes).toBe('');
      expect(result.cost).toBe('');
      expect(result.warning).toBe('Unknown template type');
    });
  });

  describe('template with null cost (Income)', () => {
    it('always returns empty cost regardless of status tier', () => {
      const result = applyEndeavourTemplate('Income', 'Gold 3');
      expect(result.type).toBe('Income');
      expect(result.notes).toContain('earn money');
      expect(result.cost).toBe('');
      expect(result.warning).toBeUndefined();
    });

    it('returns empty cost when no status tier', () => {
      const result = applyEndeavourTemplate('Income', undefined);
      expect(result.cost).toBe('');
      expect(result.warning).toBeUndefined();
    });
  });

  describe('template with cost and status tier provided', () => {
    it('looks up Brass cost correctly', () => {
      const result = applyEndeavourTemplate('Socialising', 'Brass 4');
      expect(result.cost).toBe('1d10 d');
      expect(result.warning).toBeUndefined();
    });

    it('looks up Silver cost correctly', () => {
      const result = applyEndeavourTemplate('Research', 'Silver 2');
      expect(result.cost).toBe('1d10 s');
      expect(result.warning).toBeUndefined();
    });

    it('looks up Gold cost correctly', () => {
      const result = applyEndeavourTemplate('Healing', 'Gold 1');
      expect(result.cost).toBe('1 GC');
      expect(result.warning).toBeUndefined();
    });

    it('extracts tier category from full status string', () => {
      const result = applyEndeavourTemplate('Socialising', 'Silver 3');
      expect(result.cost).toBe('1d10 s');
    });

    it('populates notes from template', () => {
      const result = applyEndeavourTemplate('Crafting', 'Brass 1');
      expect(result.notes).toContain('Trade skill');
      expect(result.cost).toBe('Varies');
    });
  });

  describe('template with cost but no status tier', () => {
    it('returns empty cost and warning when statusTier is undefined', () => {
      const result = applyEndeavourTemplate('Socialising', undefined);
      expect(result.cost).toBe('');
      expect(result.warning).toBe('Status tier needed for cost calculation');
    });

    it('returns empty cost and warning when statusTier is empty string', () => {
      const result = applyEndeavourTemplate('Research', '');
      expect(result.cost).toBe('');
      expect(result.warning).toBe('Status tier needed for cost calculation');
    });

    it('returns empty cost and warning when statusTier is whitespace', () => {
      const result = applyEndeavourTemplate('Healing', '   ');
      expect(result.cost).toBe('');
      expect(result.warning).toBe('Status tier needed for cost calculation');
    });
  });

  describe('unrecognized tier in status string', () => {
    it('returns warning when tier category cannot be extracted', () => {
      const result = applyEndeavourTemplate('Socialising', 'Platinum 5');
      expect(result.cost).toBe('');
      expect(result.warning).toBe('Status tier needed for cost calculation');
    });
  });
});
