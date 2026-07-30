import { describe, it, expect } from 'vitest';
import { getExcludedCareers, isCareerEligible } from '../career-eligibility';

/**
 * Unit tests for Ogre career species restriction.
 * Validates: Requirements 13.1, 13.2, 13.3
 */

describe('Ogre career eligibility', () => {
  const ogreOnlyCareers = ['Maneater', 'Rhinox Herder', 'Ogre Butcher'];

  describe('getExcludedCareers for Ogre', () => {
    const excluded = getExcludedCareers('Ogre');

    it('does NOT exclude Maneater for Ogre', () => {
      expect(excluded).not.toContain('Maneater');
    });

    it('does NOT exclude Rhinox Herder for Ogre', () => {
      expect(excluded).not.toContain('Rhinox Herder');
    });

    it('does NOT exclude Ogre Butcher for Ogre', () => {
      expect(excluded).not.toContain('Ogre Butcher');
    });
  });

  describe('getExcludedCareers for Human', () => {
    const excluded = getExcludedCareers('Human');

    it('excludes Maneater for Human', () => {
      expect(excluded).toContain('Maneater');
    });

    it('excludes Rhinox Herder for Human', () => {
      expect(excluded).toContain('Rhinox Herder');
    });

    it('excludes Ogre Butcher for Human', () => {
      expect(excluded).toContain('Ogre Butcher');
    });
  });

  describe('isCareerEligible', () => {
    it('Maneater is eligible for Ogre', () => {
      expect(isCareerEligible('Maneater', 'Ogre')).toBe(true);
    });

    it('Rhinox Herder is eligible for Ogre', () => {
      expect(isCareerEligible('Rhinox Herder', 'Ogre')).toBe(true);
    });

    it('Ogre Butcher is eligible for Ogre', () => {
      expect(isCareerEligible('Ogre Butcher', 'Ogre')).toBe(true);
    });

    it('Maneater is NOT eligible for Human', () => {
      expect(isCareerEligible('Maneater', 'Human')).toBe(false);
    });

    it('Rhinox Herder is NOT eligible for Human', () => {
      expect(isCareerEligible('Rhinox Herder', 'Human')).toBe(false);
    });

    it('Ogre Butcher is NOT eligible for Human', () => {
      expect(isCareerEligible('Ogre Butcher', 'Human')).toBe(false);
    });

    it('Maneater is NOT eligible for Dwarf', () => {
      expect(isCareerEligible('Maneater', 'Dwarf')).toBe(false);
    });

    it('Rhinox Herder is NOT eligible for High Elf', () => {
      expect(isCareerEligible('Rhinox Herder', 'High Elf')).toBe(false);
    });

    it('Ogre Butcher is NOT eligible for Halfling', () => {
      expect(isCareerEligible('Ogre Butcher', 'Halfling')).toBe(false);
    });
  });
});
