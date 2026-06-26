import { describe, it, expect } from 'vitest';
import { processEndOfTurn } from '../end-of-turn';

/** Helper to call processEndOfTurn with defaults for tb, lowestAP, and injectedD10 */
function callEOT(
  currentWounds: number,
  conditions: { name: string; level: number }[],
  currentRound: number,
  opts?: { tb?: number; lowestAP?: number; injectedD10?: number }
) {
  return processEndOfTurn({
    currentWounds,
    conditions,
    currentRound,
    tb: opts?.tb ?? 0,
    lowestAP: opts?.lowestAP ?? 0,
    injectedD10: opts?.injectedD10 ?? 5, // Default injected d10 for deterministic tests
  });
}

describe('processEndOfTurn', () => {
  describe('round advancement', () => {
    it('always advances round by 1', () => {
      const result = callEOT(10, [], 1);
      expect(result.roundAdvanced).toBe(2);
    });

    it('advances from round 0 to 1', () => {
      const result = callEOT(5, [], 0);
      expect(result.roundAdvanced).toBe(1);
    });
  });

  describe('Bleeding damage', () => {
    it('reduces wounds by Bleeding level', () => {
      const result = callEOT(10, [{ name: 'Bleeding', level: 3 }], 1);
      expect(result.newWounds).toBe(7);
    });

    it('records a damage effect for Bleeding', () => {
      const result = callEOT(10, [{ name: 'Bleeding', level: 2 }], 1);
      const bleedEffect = result.effects.find(e => e.condition === 'Bleeding');
      expect(bleedEffect).toBeDefined();
      expect(bleedEffect!.type).toBe('damage');
      expect(bleedEffect!.amount).toBe(2);
    });

    it('Bleeding level 1 reduces wounds by 1', () => {
      const result = callEOT(5, [{ name: 'Bleeding', level: 1 }], 1);
      expect(result.newWounds).toBe(4);
    });
  });

  describe('Ablaze damage', () => {
    it('reduces wounds by Ablaze formula (d10 + level-1 - TB - AP, min 1)', () => {
      // injectedD10=5, level=4, tb=0, ap=0 → damage = max(1, 5+3-0-0) = 8
      const result = callEOT(10, [{ name: 'Ablaze', level: 4 }], 1);
      expect(result.newWounds).toBe(2);
    });

    it('records a damage effect for Ablaze with d10 roll', () => {
      // injectedD10=5, level=3, tb=0, ap=0 → damage = max(1, 5+2-0-0) = 7
      const result = callEOT(10, [{ name: 'Ablaze', level: 3 }], 1);
      const ablazeEffect = result.effects.find(e => e.condition === 'Ablaze');
      expect(ablazeEffect).toBeDefined();
      expect(ablazeEffect!.type).toBe('damage');
      expect(ablazeEffect!.amount).toBe(7);
      expect(ablazeEffect!.d10Roll).toBe(5);
    });

    it('Ablaze damage is minimum 1 even with high TB and AP', () => {
      // injectedD10=1, level=1, tb=5, ap=5 → damage = max(1, 1+0-5-5) = max(1,-9) = 1
      const result = callEOT(10, [{ name: 'Ablaze', level: 1 }], 1, { injectedD10: 1, tb: 5, lowestAP: 5 });
      expect(result.newWounds).toBe(9);
      const ablazeEffect = result.effects.find(e => e.condition === 'Ablaze');
      expect(ablazeEffect!.amount).toBe(1);
    });
  });

  describe('combined Bleeding and Ablaze', () => {
    it('reduces wounds by Bleeding level + Ablaze formula', () => {
      // Bleeding 3 = 3 flat, Ablaze 2 with d10=5: max(1, 5+1-0-0)=6, total=9
      const result = callEOT(15, [
        { name: 'Bleeding', level: 3 },
        { name: 'Ablaze', level: 2 }
      ], 1);
      expect(result.newWounds).toBe(6);
    });

    it('records separate effects for each condition', () => {
      const result = callEOT(15, [
        { name: 'Bleeding', level: 2 },
        { name: 'Ablaze', level: 3 }
      ], 1);
      expect(result.effects.filter(e => e.type === 'damage')).toHaveLength(2);
    });
  });

  describe('wound floor at 0', () => {
    it('floors wounds at 0 when damage exceeds current', () => {
      const result = callEOT(3, [{ name: 'Bleeding', level: 5 }], 1);
      expect(result.newWounds).toBe(0);
    });

    it('floors at 0 with combined damage exceeding wounds', () => {
      // Bleeding 3 + Ablaze 5 (d10=5: max(1, 5+4-0-0)=9), total=12 > 4
      const result = callEOT(4, [
        { name: 'Bleeding', level: 3 },
        { name: 'Ablaze', level: 5 }
      ], 1);
      expect(result.newWounds).toBe(0);
    });
  });

  describe('skip damage when wounds at 0', () => {
    it('skips all damage processing when wounds are 0', () => {
      const result = callEOT(0, [
        { name: 'Bleeding', level: 3 },
        { name: 'Ablaze', level: 2 }
      ], 1);
      expect(result.newWounds).toBe(0);
      expect(result.effects.filter(e => e.type === 'damage')).toHaveLength(0);
    });

    it('keeps wounds at 0 even with high condition levels', () => {
      const result = callEOT(0, [
        { name: 'Bleeding', level: 10 },
        { name: 'Ablaze', level: 10 }
      ], 1);
      expect(result.newWounds).toBe(0);
    });
  });

  describe('Stunned reminder and Surprised auto-removal', () => {
    it('emits reminder for Stunned (not auto-removed)', () => {
      const result = callEOT(10, [{ name: 'Stunned', level: 1 }], 1);
      expect(result.removedConditions).not.toContain('Stunned');
      const reminderEffect = result.effects.find(e => e.condition === 'Stunned');
      expect(reminderEffect).toBeDefined();
      expect(reminderEffect!.type).toBe('reminder');
      expect(reminderEffect!.description).toContain('Endurance Test');
    });

    it('removes Surprised condition', () => {
      const result = callEOT(10, [{ name: 'Surprised', level: 1 }], 1);
      expect(result.removedConditions).toContain('Surprised');
    });

    it('emits Stunned reminder and removes Surprised', () => {
      const result = callEOT(10, [
        { name: 'Stunned', level: 1 },
        { name: 'Surprised', level: 1 }
      ], 1);
      expect(result.removedConditions).not.toContain('Stunned');
      expect(result.removedConditions).toContain('Surprised');
    });

    it('records remove_condition for Surprised and reminder for Stunned', () => {
      const result = callEOT(10, [
        { name: 'Stunned', level: 1 },
        { name: 'Surprised', level: 1 }
      ], 1);
      const removeEffects = result.effects.filter(e => e.type === 'remove_condition');
      expect(removeEffects).toHaveLength(1);
      expect(removeEffects[0].condition).toBe('Surprised');
      const reminderEffects = result.effects.filter(e => e.type === 'reminder' && e.condition === 'Stunned');
      expect(reminderEffects).toHaveLength(1);
    });

    it('emits Stunned reminder even when wounds are 0', () => {
      const result = callEOT(0, [
        { name: 'Stunned', level: 1 },
        { name: 'Surprised', level: 1 }
      ], 1);
      expect(result.removedConditions).not.toContain('Stunned');
      expect(result.removedConditions).toContain('Surprised');
      const stunnedReminder = result.effects.find(e => e.condition === 'Stunned' && e.type === 'reminder');
      expect(stunnedReminder).toBeDefined();
    });
  });

  describe('conditions not affected by end-of-turn', () => {
    it('does not remove other conditions', () => {
      const result = callEOT(10, [
        { name: 'Prone', level: 1 },
        { name: 'Blinded', level: 1 },
        { name: 'Fatigued', level: 2 }
      ], 1);
      expect(result.removedConditions).toHaveLength(0);
    });

    it('does not report damage for non-damage conditions', () => {
      const result = callEOT(10, [
        { name: 'Broken', level: 1 },
        { name: 'Entangled', level: 1 }
      ], 1);
      expect(result.effects.filter(e => e.type === 'damage')).toHaveLength(0);
    });

    it('emits reminders for Broken, Blinded, Deafened', () => {
      const result = callEOT(10, [
        { name: 'Broken', level: 1 },
        { name: 'Blinded', level: 2 },
        { name: 'Deafened', level: 1 }
      ], 1);
      const reminders = result.effects.filter(e => e.type === 'reminder');
      expect(reminders.find(r => r.condition === 'Broken')).toBeDefined();
      expect(reminders.find(r => r.condition === 'Blinded')).toBeDefined();
      expect(reminders.find(r => r.condition === 'Deafened')).toBeDefined();
    });
  });

  describe('no conditions', () => {
    it('returns unchanged wounds with no conditions', () => {
      const result = callEOT(12, [], 5);
      expect(result.newWounds).toBe(12);
      expect(result.effects).toHaveLength(0);
      expect(result.removedConditions).toHaveLength(0);
      expect(result.roundAdvanced).toBe(6);
    });
  });
});
