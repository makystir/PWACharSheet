import { describe, it, expect } from 'vitest';
import {
  getCareersByClass,
  getCareerScheme,
  getCareerLevelOptions,
  getStatusForCareerLevel,
  applyCareerSkills,
  resolveCareerName,
  getCareerSkills,
  getSpecialisationOptions,
} from '../careers';
import { BLANK_CHARACTER } from '../../types/character';
import { inGroup } from '../grouped-names';

// ─── getSpecialisationOptions: dropdown suggestions for placeholders ─────────
// Suggestions only: they are derived from the game data and never gate
// matching, so a custom (homebrew) specialisation is always allowed for "(Any)".

describe('getSpecialisationOptions', () => {
  const TEN_WINDS = [
    'Channelling (Aqshy)', 'Channelling (Azyr)', 'Channelling (Chamon)', 'Channelling (Dhar)',
    'Channelling (Ghur)', 'Channelling (Ghyran)', 'Channelling (Hysh)', 'Channelling (Qhaysh)',
    'Channelling (Shyish)', 'Channelling (Ulgu)',
  ];

  it('suggests "no specialisation" first, then the ten winds, with custom allowed', () => {
    const { names, allowCustom } = getSpecialisationOptions('Channelling (Any Colour)', 'skill');
    expect(names[0]).toBe('Channelling');
    expect(names).toEqual(expect.arrayContaining(TEN_WINDS));
    // Anything else comes from the game data (e.g. the Ogre Butcher career), never from a hand-kept list.
    expect(names.every(n => inGroup(n, 'Channelling'))).toBe(true);
    expect(allowCustom).toBe(true);
  });

  it('reads the placeholder tolerantly', () => {
    expect(getSpecialisationOptions('Channeling (Any)', 'skill')).toEqual(
      getSpecialisationOptions('Channelling (Any Colour)', 'skill'),
    );
  });

  it('collects languages from skill, career and species data, without a bare option', () => {
    const { names, allowCustom } = getSpecialisationOptions('Language (Any)', 'skill');
    expect(names).toEqual(expect.arrayContaining([
      'Language (Battle)', 'Language (Magick)', 'Language (Khazalid)', 'Language (Eltharin)',
    ]));
    expect(names).not.toContain('Language');
    expect(names.every(n => n.startsWith('Language ('))).toBe(true);
    expect(allowCustom).toBe(true);
  });

  it('offers exactly the listed options for a choice, without custom entry', () => {
    expect(getSpecialisationOptions('Art (Calligraphy or Engraving)', 'skill')).toEqual({
      names: ['Art (Calligraphy)', 'Art (Engraving)'],
      allowCustom: false,
    });
  });

  it('uses the canonical spelling of a listed option when the data has one', () => {
    expect(getSpecialisationOptions('Melee (Basic or Two-handed)', 'skill').names).toEqual([
      'Melee (Basic)', 'Melee (Two-Handed)',
    ]);
  });

  it('suggests talent specialisations named in career data, not talent-list templates', () => {
    const { names, allowCustom } = getSpecialisationOptions('Etiquette (Any)', 'talent');
    expect(names).toEqual(expect.arrayContaining(['Etiquette (Nobles)', 'Etiquette (Soldiers)']));
    expect(names).not.toContain('Etiquette (Group)');
    expect(allowCustom).toBe(true);
  });

  it('suggests every sense the talent list names separately', () => {
    expect(getSpecialisationOptions('Acute Sense (Any)', 'talent').names).toEqual(expect.arrayContaining([
      'Acute Sense (Hearing)', 'Acute Sense (Sight)', 'Acute Sense (Smell)', 'Acute Sense (Taste)', 'Acute Sense (Touch)',
    ]));
  });

  it('still allows a custom entry for a group the data does not know', () => {
    expect(getSpecialisationOptions('Made Up Group (Any)', 'skill')).toEqual({ names: [], allowCustom: true });
  });
});

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
    const char = { ...structuredClone(BLANK_CHARACTER), career: '', careerLevel: '', class: '', status: '' };
    const result = applyCareerSkills(char, 'Unknown', '1');
    expect(result.career).toBe('');
  });

  it('sets career fields for valid career and level', () => {
    const char = { ...structuredClone(BLANK_CHARACTER), career: '', careerLevel: '', class: '', status: '' };
    const result = applyCareerSkills(char, 'Soldier', '2');
    expect(result.career).toBe('Soldier');
    expect(result.careerLevel).toBe('Soldier');
    expect(result.class).toBe('Warriors');
    expect(result.status).toBe('Silver 3');
  });
});

describe('getCareerSkills', () => {
  it('returns skills for a valid career and career level title', () => {
    const skills = getCareerSkills('Soldier', 'Recruit');
    expect(skills).toContain('Athletics');
    expect(skills).toContain('Dodge');
    expect(skills).toContain('Endurance');
    expect(skills.length).toBeGreaterThan(0);
  });

  it('returns skills for a higher career level', () => {
    const skills = getCareerSkills('Soldier', 'Soldier');
    expect(skills).toContain('Melee (Basic)');
    expect(skills.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown career', () => {
    expect(getCareerSkills('UnknownCareer', 'Level1')).toEqual([]);
  });

  it('returns empty array for empty career', () => {
    expect(getCareerSkills('', '')).toEqual([]);
  });

  it('returns empty array when career level title does not match any level', () => {
    expect(getCareerSkills('Soldier', 'NonexistentLevel')).toEqual([]);
  });

  it('returns empty array when career is valid but careerLevel is empty', () => {
    expect(getCareerSkills('Soldier', '')).toEqual([]);
  });
});
