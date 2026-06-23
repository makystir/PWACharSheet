import { describe, it, expect } from 'vitest';
import {
  HIRELING_PROFILES,
  HIRELING_TEMPLATES,
  PHYSICAL_QUIRKS,
  WORK_ETHICS,
  PERSONALITY_QUIRKS,
} from '../hirelings';

describe('Static hireling data validation', () => {
  describe('HIRELING_PROFILES', () => {
    it('has exactly 6 entries', () => {
      expect(HIRELING_PROFILES).toHaveLength(6);
    });

    it('contains the correct profile names', () => {
      const names = HIRELING_PROFILES.map((p) => p.name);
      expect(names).toEqual([
        'Seasoned Mercenary',
        'Local Scout',
        'Lawyer',
        'Porter',
        'Doktor',
        'Scribe',
      ]);
    });

    it('each profile has all required HirelingProfile fields', () => {
      const requiredFields = [
        'name',
        'role',
        'status',
        'M',
        'WS',
        'BS',
        'S',
        'T',
        'I',
        'Ag',
        'Dex',
        'Int',
        'WP',
        'Fel',
        'W',
        'skills',
        'talents',
        'traits',
        'trappings',
      ] as const;

      for (const profile of HIRELING_PROFILES) {
        for (const field of requiredFields) {
          expect(profile).toHaveProperty(field);
          expect(profile[field]).toBeDefined();
        }
      }
    });
  });

  describe('HIRELING_TEMPLATES', () => {
    it('has exactly 7 entries', () => {
      expect(HIRELING_TEMPLATES).toHaveLength(7);
    });

    it('first template is "None"', () => {
      expect(HIRELING_TEMPLATES[0].name).toBe('None');
    });
  });

  describe('Quirk tables', () => {
    it('PHYSICAL_QUIRKS has exactly 100 entries', () => {
      expect(PHYSICAL_QUIRKS).toHaveLength(100);
    });

    it('WORK_ETHICS has exactly 100 entries', () => {
      expect(WORK_ETHICS).toHaveLength(100);
    });

    it('PERSONALITY_QUIRKS has exactly 100 entries', () => {
      expect(PERSONALITY_QUIRKS).toHaveLength(100);
    });
  });
});
