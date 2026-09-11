import { describe, it, expect } from 'vitest';
import { awardXp, removeXpAward } from '../advancement';
import type { Character } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Test Hero',
    xpCur: 100,
    xpSpent: 40,
    xpTotal: 140,
    xpLog: [],
    eventLog: [],
    ...overrides,
  };
}

describe('awardXp', () => {
  it('raises xpCur and xpTotal by the awarded amount', () => {
    const result = awardXp(makeCharacter(), 150, 'Session 5');
    expect(result.xpCur).toBe(250);
    expect(result.xpTotal).toBe(290);
    // Spent XP is unaffected by an award
    expect(result.xpSpent).toBe(40);
  });

  it('appends an audit entry to xpLog with amount, trimmed reason, and timestamp', () => {
    const before = Date.now();
    const result = awardXp(makeCharacter(), 150, '  Session 5  ');
    const log = result.xpLog ?? [];
    expect(log).toHaveLength(1);
    expect(log[0].amount).toBe(150);
    expect(log[0].reason).toBe('Session 5');
    expect(log[0].timestamp).toBeGreaterThanOrEqual(before);
  });

  it('mirrors a display-only event into the unified event log', () => {
    const result = awardXp(makeCharacter(), 150, 'Session 5');
    const events = result.eventLog ?? [];
    expect(events).toHaveLength(1);
    expect(events[0].category).toBe('advancement');
    expect(events[0].type).toBe('advancement.xpAward');
    expect(events[0].summary).toContain('+150 XP');
    expect(events[0].summary).toContain('Session 5');
  });

  it('supports negative awards (corrections) and formats the summary with a minus sign', () => {
    const result = awardXp(makeCharacter(), -50, 'Correction');
    expect(result.xpCur).toBe(50);
    expect(result.xpTotal).toBe(90);
    expect((result.eventLog ?? [])[0].summary).toContain('−50 XP');
  });

  it('is a no-op for a zero or non-finite amount', () => {
    const base = makeCharacter();
    expect(awardXp(base, 0, 'nope')).toBe(base);
    expect(awardXp(base, Number.NaN, 'nope')).toBe(base);
  });

  it('does not mutate the input character', () => {
    const base = makeCharacter();
    const snapshot = structuredClone(base);
    awardXp(base, 150, 'Session 5');
    expect(base).toEqual(snapshot);
  });
});

describe('removeXpAward', () => {
  it('reverses the effect of a logged award and removes it from xpLog', () => {
    const awarded = awardXp(makeCharacter(), 150, 'Session 5');
    const ts = (awarded.xpLog ?? [])[0].timestamp;
    const result = removeXpAward(awarded, ts);
    expect(result.xpCur).toBe(100);
    expect(result.xpTotal).toBe(140);
    expect(result.xpLog).toHaveLength(0);
  });

  it('records the reversal as a mirror event with a negated amount', () => {
    const awarded = awardXp(makeCharacter(), 150, 'Session 5');
    const ts = (awarded.xpLog ?? [])[0].timestamp;
    const result = removeXpAward(awarded, ts);
    const events = result.eventLog ?? [];
    // one for the award, one for the removal
    expect(events).toHaveLength(2);
    expect(events[1].summary).toContain('−150 XP');
    expect(events[1].summary).toContain('Removed');
  });

  it('is a no-op when no entry with the timestamp exists', () => {
    const base = makeCharacter();
    expect(removeXpAward(base, 123456)).toBe(base);
  });
});
