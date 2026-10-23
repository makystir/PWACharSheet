import { describe, it, expect } from 'vitest';
import {
  conditionReminderText,
  deriveConditionReminders,
  derivePsychologyReminders,
  deriveAllReminders,
} from '../reminders';
import type { PsychologyTrait } from '../../types/character';

describe('conditionReminderText (single source of truth for end-of-turn strings)', () => {
  it('returns the exact byte-identical literal for each reminder-bearing condition', () => {
    expect(conditionReminderText('Stunned')).toBe('Endurance Test (Challenging +0) required to remove');
    expect(conditionReminderText('Poisoned')).toBe('Endurance Test to remove (each SL removes extra)');
    expect(conditionReminderText('Broken')).toBe('Cool Test to remove');
    expect(conditionReminderText('Blinded')).toBe('1 level removed every other round');
    expect(conditionReminderText('Deafened')).toBe('1 level removed every other round');
  });

  it('returns undefined for conditions with no per-Round turn reminder and unknown names', () => {
    for (const name of ['Entangled', 'Fatigued', 'Prone', 'Surprised', 'Unconscious', 'Bleeding', 'Ablaze', 'Nonexistent']) {
      expect(conditionReminderText(name)).toBeUndefined();
    }
  });
});

describe('deriveConditionReminders', () => {
  it('maps Stunned to an Endurance (T) skill test at Challenging difficulty', () => {
    const [r] = deriveConditionReminders([{ name: 'Stunned', level: 1 }]);
    expect(r.id).toBe('condition:Stunned');
    expect(r.source).toBe('condition');
    expect(r.test).toEqual({
      def: { kind: 'skill', skillName: 'Endurance', fallbackChar: 'T' },
      difficulty: 'Challenging',
      rollName: 'Endurance (remove Stunned)',
    });
    expect(r.citation).toContain('p.169');
  });

  it('maps Poisoned to an Endurance (T) skill test', () => {
    const [r] = deriveConditionReminders([{ name: 'Poisoned', level: 2 }]);
    expect(r.test?.def).toEqual({ kind: 'skill', skillName: 'Endurance', fallbackChar: 'T' });
    expect(r.test?.rollName).toBe('Endurance (remove Poisoned)');
  });

  it('maps Broken to a Cool (WP) skill test', () => {
    const [r] = deriveConditionReminders([{ name: 'Broken', level: 1 }]);
    expect(r.test?.def).toEqual({ kind: 'skill', skillName: 'Cool', fallbackChar: 'WP' });
    expect(r.test?.difficulty).toBe('Challenging');
  });

  it('maps Ablaze to an Athletics (Ag) skill test', () => {
    const [r] = deriveConditionReminders([{ name: 'Ablaze', level: 3 }]);
    expect(r.id).toBe('condition:Ablaze');
    expect(r.test?.def).toEqual({ kind: 'skill', skillName: 'Athletics', fallbackChar: 'Ag' });
    expect(r.test?.rollName).toBe('Athletics (extinguish Ablaze)');
    expect(r.citation).toContain('p.168');
  });

  it('marks Blinded and Deafened informational (no test)', () => {
    const reminders = deriveConditionReminders([
      { name: 'Blinded', level: 1 },
      { name: 'Deafened', level: 1 },
    ]);
    for (const r of reminders) {
      expect(r.test).toBeUndefined();
    }
  });

  it('omits conditions with no reminder (Bleeding, Prone, Entangled)', () => {
    const reminders = deriveConditionReminders([
      { name: 'Bleeding', level: 1 },
      { name: 'Prone', level: 1 },
      { name: 'Entangled', level: 1 },
    ]);
    expect(reminders).toHaveLength(0);
  });

  it('orders output Stunned, Poisoned, Broken, Blinded, Deafened, Ablaze regardless of input order', () => {
    const reminders = deriveConditionReminders([
      { name: 'Ablaze', level: 1 },
      { name: 'Deafened', level: 1 },
      { name: 'Broken', level: 1 },
      { name: 'Poisoned', level: 1 },
      { name: 'Blinded', level: 1 },
      { name: 'Stunned', level: 1 },
    ]);
    expect(reminders.map((r) => r.label)).toEqual([
      'Stunned', 'Poisoned', 'Broken', 'Blinded', 'Deafened', 'Ablaze',
    ]);
  });
});

describe('derivePsychologyReminders', () => {
  const traits: PsychologyTrait[] = [
    { id: 'a', type: 'Animosity', target: 'Nobles' },
    { id: 'h', type: 'Hatred', target: 'Skaven' },
    { id: 'f', type: 'Fear', target: '', rating: 2 },
    { id: 't', type: 'Terror', target: '', rating: 3 },
    { id: 'z', type: 'Frenzy', target: '' },
    { id: 'p', type: 'Prejudice', target: 'Elves' },
    { id: 'b', type: 'Phobia', target: 'Snakes' },
    { id: 'r', type: 'Trauma', target: 'Fire' },
  ];

  it('returns [] when disabled', () => {
    expect(derivePsychologyReminders(traits, false)).toEqual([]);
  });

  it('returns [] and does not throw when traits is undefined', () => {
    expect(derivePsychologyReminders(undefined, true)).toEqual([]);
  });

  it('maps all eight types with verbatim PSYCHOLOGY_REMINDERS descriptions', () => {
    const reminders = derivePsychologyReminders(traits, true);
    expect(reminders).toHaveLength(8);
    const fear = reminders.find((r) => r.id === 'psych:f')!;
    expect(fear.description).toBe('Must pass Cool Test or gain Broken condition');
    expect(fear.test?.rollName).toBe('Cool (overcome Fear)');
  });

  it('labels Fear/Terror with the rating', () => {
    const reminders = derivePsychologyReminders(traits, true);
    expect(reminders.find((r) => r.id === 'psych:f')!.label).toBe('Fear (Rating 2)');
    expect(reminders.find((r) => r.id === 'psych:t')!.label).toBe('Terror (Rating 3)');
  });

  it('shows Rating ? when a Fear rating is undefined', () => {
    const reminders = derivePsychologyReminders([{ id: 'x', type: 'Fear', target: '' }], true);
    expect(reminders[0].label).toBe('Fear (Rating ?)');
  });

  it('marks Trauma informational (no test)', () => {
    const reminders = derivePsychologyReminders(traits, true);
    expect(reminders.find((r) => r.id === 'psych:r')!.test).toBeUndefined();
  });

  it('uses a Willpower roll name for Frenzy but Cool for the others', () => {
    const reminders = derivePsychologyReminders(traits, true);
    expect(reminders.find((r) => r.id === 'psych:z')!.test?.rollName).toBe('Willpower (resist Frenzy)');
    expect(reminders.find((r) => r.id === 'psych:a')!.test?.rollName).toBe('Cool (end Animosity)');
  });
});

describe('deriveAllReminders', () => {
  it('lists condition reminders first, then psychology reminders', () => {
    const reminders = deriveAllReminders({
      conditions: [{ name: 'Stunned', level: 1 }],
      psychologyTraits: [{ id: 'f', type: 'Fear', target: '', rating: 1 }],
      psychologyEnabled: true,
    });
    expect(reminders.map((r) => r.source)).toEqual(['condition', 'psychology']);
  });

  it('omits psychology reminders when disabled', () => {
    const reminders = deriveAllReminders({
      conditions: [{ name: 'Stunned', level: 1 }],
      psychologyTraits: [{ id: 'f', type: 'Fear', target: '', rating: 1 }],
      psychologyEnabled: false,
    });
    expect(reminders.every((r) => r.source === 'condition')).toBe(true);
  });
});
