import { describe, it, expect } from 'vitest';
import {
  getCareersByClass,
  getCareerScheme,
  getCareerLevelOptions,
  getStatusForCareerLevel,
  applyCareerSkills,
  resolveCareerName,
} from '../careers';

// ─── Property 11: Career class filtering returns correct careers ─────────────
// Validates: Requirements 6.1

describe('getCareersByClass — Property 11', () => {
  it.each([
    'Academics',
    'Burghers',
    'Courtiers',
    'Peasants',
    'Rangers',
    'Riverfolk',
    'Rogues',
    'Warriors',
  ])('class "%s" returns non-empty results', (className) => {
    const careers = getCareersByClass(className);
    expect(careers.length).toBeGreaterThan(0);
  });

  it('all returned careers for Warriors have class "Warriors"', () => {
    const careers = getCareersByClass('Warriors');
    for (const name of careers) {
      const scheme = getCareerScheme(name);
      expect(scheme?.class).toBe('Warriors');
    }
  });

  it('all returned careers for Academics have class "Academics"', () => {
    const careers = getCareersByClass('Academics');
    for (const name of careers) {
      const scheme = getCareerScheme(name);
      expect(scheme?.class).toBe('Academics');
    }
  });

  it('no cross-class contamination: Warriors careers not in Academics', () => {
    const warriors = getCareersByClass('Warriors');
    const academics = getCareersByClass('Academics');
    for (const name of warriors) {
      expect(academics).not.toContain(name);
    }
  });

  it('returns empty array for unknown class', () => {
    expect(getCareersByClass('Nobles')).toEqual([]);
  });
});

// ─── Property 12: Career scheme returns all 4 levels ─────────────────────────
// Validates: Requirements 6.2

describe('getCareerScheme / getCareerLevelOptions — Property 12', () => {
  it('Soldier has 4 levels with correct structure', () => {
    const scheme = getCareerScheme('Soldier');
    expect(scheme).toBeDefined();
    const levels = getCareerLevelOptions('Soldier');
    expect(levels).toHaveLength(4);

    for (const level of levels) {
      expect(level.title).toBeTruthy();
      expect(level.status).toBeTruthy();
      expect(level.characteristics.length).toBeGreaterThan(0);
      expect(level.skills.length).toBeGreaterThan(0);
      expect(level.talents.length).toBeGreaterThan(0);
    }
  });

  it('Apothecary has 4 levels with correct structure', () => {
    const levels = getCareerLevelOptions('Apothecary');
    expect(levels).toHaveLength(4);
    expect(levels[0].title).toBe("Apothecary's Apprentice");
    expect(levels[1].title).toBe('Apothecary');
    expect(levels[2].title).toBe('Master Apothecary');
    expect(levels[3].title).toBe('Apothecary-General');
  });

  it('Cavalryman level 1 is Horseman with Silver 2 status', () => {
    const levels = getCareerLevelOptions('Cavalryman');
    expect(levels[0].title).toBe('Horseman');
    expect(levels[0].status).toBe('Silver 2');
  });

  it('returns undefined for unknown career', () => {
    expect(getCareerScheme('Dragon Rider')).toBeUndefined();
  });

  it('returns empty array for unknown career levels', () => {
    expect(getCareerLevelOptions('Dragon Rider')).toEqual([]);
  });
});

describe('getStatusForCareerLevel', () => {
  it('returns correct status for Soldier level 1', () => {
    expect(getStatusForCareerLevel('Soldier', 1)).toBe('Silver 1');
  });

  it('returns correct status for Soldier level 4', () => {
    expect(getStatusForCareerLevel('Soldier', 4)).toBe('Gold 1');
  });

  it('returns empty string for unknown career', () => {
    expect(getStatusForCareerLevel('Unknown', 1)).toBe('');
  });

  it('returns empty string for invalid level', () => {
    expect(getStatusForCareerLevel('Soldier', 5)).toBe('');
  });
});

describe('resolveCareerName', () => {
  it('resolves direct career name', () => {
    const result = resolveCareerName('Soldier');
    expect(result).toEqual({ careerName: 'Soldier', levelNumber: null });
  });

  it('resolves level title to career and level', () => {
    const result = resolveCareerName('Recruit');
    expect(result).toEqual({ careerName: 'Soldier', levelNumber: 1 });
  });

  it('resolves level 4 title', () => {
    const result = resolveCareerName('Officer');
    expect(result).toEqual({ careerName: 'Soldier', levelNumber: 4 });
  });

  it('returns null for unknown input', () => {
    expect(resolveCareerName('Nonexistent')).toBeNull();
  });
});

describe('applyCareerSkills', () => {
  it('returns unchanged character for unknown career', () => {
    const char = { career: '', careerLevel: '', class: '', status: '' } as any;
    const result = applyCareerSkills(char, 'Unknown', '1');
    expect(result.career).toBe('');
  });

  it('sets career fields for valid career and level', () => {
    const char = { career: '', careerLevel: '', class: '', status: '' } as any;
    const result = applyCareerSkills(char, 'Soldier', '2');
    expect(result.career).toBe('Soldier');
    expect(result.careerLevel).toBe('Soldier');
    expect(result.class).toBe('Warriors');
    expect(result.status).toBe('Silver 3');
  });
});
