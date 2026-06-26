import { describe, it, expect } from 'vitest';
import { processEndOfTurn } from '../end-of-turn';

describe('processEndOfTurn', () => {
  describe('round advancement', () => {
    it('always advances round by 1', () => {
      const result = processEndOfTurn(10, [], 1);
      expect(result.roundAdvanced).toBe(2);
    });

    it('advances from round 0 to 1', () => {
      const result = processEndOfTurn(5, [], 0);
      expect(result.roundAdvanced).toBe(1);
    });
  });

  describe('Bleeding damage', () => {
    it('reduces wounds by Bleeding level', () => {
      const result = processEndOfTurn(10, [{ name: 'Bleeding', level: 3 }], 1);
      expect(result.newWounds).toBe(7);
    });

    it('records a damage effect for Bleeding', () => {
      const result = processEndOfTurn(10, [{ name: 'Bleeding', level: 2 }], 1);
      const bleedEffect = result.effects.find(e => e.condition === 'Bleeding');
      expect(bleedEffect).toBeDefined();
      expect(bleedEffect!.type).toBe('damage');
      expect(bleedEffect!.amount).toBe(2);
    });

    it('Bleeding level 1 reduces wounds by 1', () => {
      const result = processEndOfTurn(5, [{ name: 'Bleeding', level: 1 }], 1);
      expect(result.newWounds).toBe(4);
    });
  });

  describe('Ablaze damage', () => {
    it('reduces wounds by Ablaze level', () => {
      const result = processEndOfTurn(10, [{ name: 'Ablaze', level: 4 }], 1);
      expect(result.newWounds).toBe(6);
    });

    it('records a damage effect for Ablaze', () => {
      const result = processEndOfTurn(10, [{ name: 'Ablaze', level: 3 }], 1);
      const ablazeEffect = result.effects.find(e => e.condition === 'Ablaze');
      expect(ablazeEffect).toBeDefined();
      expect(ablazeEffect!.type).toBe('damage');
      expect(ablazeEffect!.amount).toBe(3);
    });
  });

  describe('combined Bleeding and Ablaze', () => {
    it('reduces wounds by combined levels', () => {
      const result = processEndOfTurn(15, [
        { name: 'Bleeding', level: 3 },
        { name: 'Ablaze', level: 2 }
      ], 1);
      expect(result.newWounds).toBe(10);
    });

    it('records separate effects for each condition', () => {
      const result = processEndOfTurn(15, [
        { name: 'Bleeding', level: 2 },
        { name: 'Ablaze', level: 3 }
      ], 1);
      expect(result.effects.filter(e => e.type === 'damage')).toHaveLength(2);
    });
  });

  describe('wound floor at 0', () => {
    it('floors wounds at 0 when damage exceeds current', () => {
      const result = processEndOfTurn(3, [{ name: 'Bleeding', level: 5 }], 1);
      expect(result.newWounds).toBe(0);
    });

    it('floors at 0 with combined damage exceeding wounds', () => {
      const result = processEndOfTurn(4, [
        { name: 'Bleeding', level: 3 },
        { name: 'Ablaze', level: 5 }
      ], 1);
      expect(result.newWounds).toBe(0);
    });
  });

  describe('skip damage when wounds at 0', () => {
    it('skips all damage processing when wounds are 0', () => {
      const result = processEndOfTurn(0, [
        { name: 'Bleeding', level: 3 },
        { name: 'Ablaze', level: 2 }
      ], 1);
      expect(result.newWounds).toBe(0);
      expect(result.effects.filter(e => e.type === 'damage')).toHaveLength(0);
    });

    it('keeps wounds at 0 even with high condition levels', () => {
      const result = processEndOfTurn(0, [
        { name: 'Bleeding', level: 10 },
        { name: 'Ablaze', level: 10 }
      ], 1);
      expect(result.newWounds).toBe(0);
    });
  });

  describe('auto-remove Stunned and Surprised', () => {
    it('removes Stunned condition', () => {
      const result = processEndOfTurn(10, [{ name: 'Stunned', level: 1 }], 1);
      expect(result.removedConditions).toContain('Stunned');
    });

    it('removes Surprised condition', () => {
      const result = processEndOfTurn(10, [{ name: 'Surprised', level: 1 }], 1);
      expect(result.removedConditions).toContain('Surprised');
    });

    it('removes both Stunned and Surprised', () => {
      const result = processEndOfTurn(10, [
        { name: 'Stunned', level: 1 },
        { name: 'Surprised', level: 1 }
      ], 1);
      expect(result.removedConditions).toContain('Stunned');
      expect(result.removedConditions).toContain('Surprised');
    });

    it('records remove_condition effects', () => {
      const result = processEndOfTurn(10, [
        { name: 'Stunned', level: 1 },
        { name: 'Surprised', level: 1 }
      ], 1);
      const removeEffects = result.effects.filter(e => e.type === 'remove_condition');
      expect(removeEffects).toHaveLength(2);
    });

    it('removes Stunned/Surprised even when wounds are 0', () => {
      const result = processEndOfTurn(0, [
        { name: 'Stunned', level: 1 },
        { name: 'Surprised', level: 1 }
      ], 1);
      expect(result.removedConditions).toContain('Stunned');
      expect(result.removedConditions).toContain('Surprised');
    });
  });

  describe('conditions not affected by end-of-turn', () => {
    it('does not remove other conditions', () => {
      const result = processEndOfTurn(10, [
        { name: 'Prone', level: 1 },
        { name: 'Blinded', level: 1 },
        { name: 'Fatigued', level: 2 }
      ], 1);
      expect(result.removedConditions).toHaveLength(0);
    });

    it('does not report damage for non-damage conditions', () => {
      const result = processEndOfTurn(10, [
        { name: 'Broken', level: 1 },
        { name: 'Entangled', level: 1 }
      ], 1);
      expect(result.effects.filter(e => e.type === 'damage')).toHaveLength(0);
    });
  });

  describe('no conditions', () => {
    it('returns unchanged wounds with no conditions', () => {
      const result = processEndOfTurn(12, [], 5);
      expect(result.newWounds).toBe(12);
      expect(result.effects).toHaveLength(0);
      expect(result.removedConditions).toHaveLength(0);
      expect(result.roundAdvanced).toBe(6);
    });
  });
});
