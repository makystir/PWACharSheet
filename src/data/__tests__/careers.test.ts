import { describe, it, expect } from 'vitest';
import { CAREER_SCHEMES } from '../careers';

/**
 * Unit tests for Ogre career data structures.
 * Validates: Requirements 3.1, 4.1, 5.1
 */

describe('Ogre career data', () => {
  // ─── Maneater (Warriors) ─────────────────────────────────────────────────

  describe('Maneater career', () => {
    const maneater = CAREER_SCHEMES['Maneater'];

    it('exists in CAREER_SCHEMES', () => {
      expect(maneater).toBeDefined();
    });

    it('belongs to Warriors class', () => {
      expect(maneater.class).toBe('Warriors');
    });

    describe('level structure', () => {
      it('level 1 is Fresh Meat at Brass 3', () => {
        expect(maneater.level1.title).toBe('Fresh Meat');
        expect(maneater.level1.status).toBe('Brass 3');
      });

      it('level 2 is Maneater at Silver 1', () => {
        expect(maneater.level2.title).toBe('Maneater');
        expect(maneater.level2.status).toBe('Silver 1');
      });

      it('level 3 is Maneater Crusher at Silver 3', () => {
        expect(maneater.level3.title).toBe('Maneater Crusher');
        expect(maneater.level3.status).toBe('Silver 3');
      });

      it('level 4 is Maneater Captain at Silver 5', () => {
        expect(maneater.level4.title).toBe('Maneater Captain');
        expect(maneater.level4.status).toBe('Silver 5');
      });
    });

    describe('level 1 details', () => {
      it('has correct characteristics', () => {
        expect(maneater.level1.characteristics).toEqual(['WS', 'S', 'T']);
      });

      it('has 10 skills', () => {
        expect(maneater.level1.skills).toHaveLength(10);
      });

      it('has 4 talents', () => {
        expect(maneater.level1.talents).toHaveLength(4);
      });

      it('includes expected talents', () => {
        expect(maneater.level1.talents).toEqual([
          'Dirty Fighting', 'Menacing', 'Strong Back', 'Sturdy',
        ]);
      });
    });
  });

  // ─── Rhinox Herder (Rangers) ─────────────────────────────────────────────

  describe('Rhinox Herder career', () => {
    const rhinox = CAREER_SCHEMES['Rhinox Herder'];

    it('exists in CAREER_SCHEMES', () => {
      expect(rhinox).toBeDefined();
    });

    it('belongs to Rangers class', () => {
      expect(rhinox.class).toBe('Rangers');
    });

    describe('level structure', () => {
      it('level 1 is Rhinox Rustler at Silver 1', () => {
        expect(rhinox.level1.title).toBe('Rhinox Rustler');
        expect(rhinox.level1.status).toBe('Silver 1');
      });

      it('level 2 is Rhinox Herder at Silver 3', () => {
        expect(rhinox.level2.title).toBe('Rhinox Herder');
        expect(rhinox.level2.status).toBe('Silver 3');
      });

      it('level 3 is Rhinox Breaker at Silver 5', () => {
        expect(rhinox.level3.title).toBe('Rhinox Breaker');
        expect(rhinox.level3.status).toBe('Silver 5');
      });

      it('level 4 is Rhinox Master at Gold 1', () => {
        expect(rhinox.level4.title).toBe('Rhinox Master');
        expect(rhinox.level4.status).toBe('Gold 1');
      });
    });

    describe('level 1 details', () => {
      it('has correct characteristics', () => {
        expect(rhinox.level1.characteristics).toEqual(['BS', 'S', 'T']);
      });

      it('has 10 skills', () => {
        expect(rhinox.level1.skills).toHaveLength(10);
      });

      it('has 4 talents', () => {
        expect(rhinox.level1.talents).toHaveLength(4);
      });

      it('includes expected talents', () => {
        expect(rhinox.level1.talents).toEqual([
          'Flee!', 'Marksman', 'Rover', 'Strider (Mountains)',
        ]);
      });
    });
  });

  // ─── Ogre Butcher (Academics) ────────────────────────────────────────────

  describe('Ogre Butcher career', () => {
    const butcher = CAREER_SCHEMES['Ogre Butcher'];

    it('exists in CAREER_SCHEMES', () => {
      expect(butcher).toBeDefined();
    });

    it('belongs to Academics class', () => {
      expect(butcher.class).toBe('Academics');
    });

    describe('level structure', () => {
      it('level 1 is Slopscooper at Brass 3', () => {
        expect(butcher.level1.title).toBe('Slopscooper');
        expect(butcher.level1.status).toBe('Brass 3');
      });

      it('level 2 is Ogre Butcher at Silver 1', () => {
        expect(butcher.level2.title).toBe('Ogre Butcher');
        expect(butcher.level2.status).toBe('Silver 1');
      });

      it('level 3 is Mawsage at Silver 2', () => {
        expect(butcher.level3.title).toBe('Mawsage');
        expect(butcher.level3.status).toBe('Silver 2');
      });

      it('level 4 is Slaughtermaster at Silver 4', () => {
        expect(butcher.level4.title).toBe('Slaughtermaster');
        expect(butcher.level4.status).toBe('Silver 4');
      });
    });

    describe('level 1 details', () => {
      it('has correct characteristics', () => {
        expect(butcher.level1.characteristics).toEqual(['WS', 'T', 'WP']);
      });

      it('has 10 skills', () => {
        expect(butcher.level1.skills).toHaveLength(10);
      });

      it('has 4 talents', () => {
        expect(butcher.level1.talents).toHaveLength(4);
      });

      it('includes expected talents', () => {
        expect(butcher.level1.talents).toEqual([
          'Implacable', 'Petty Magic', 'Sixth Sense', 'Strong Back',
        ]);
      });
    });
  });
});
