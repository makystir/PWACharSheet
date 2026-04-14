import { describe, it, expect } from 'vitest';
import {
  computeCastingTarget,
  computeChannellingTarget,
  resolveCastingResult,
  computeOvercastSlots,
  computeOvercastOptions,
  resolveChannellingResult,
  lookupMiscast,
  reverseRollDigits,
  getHitLocation,
  computeMagicMissileDamage,
} from '../spell-casting';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, SpellItem } from '../../types/character';
import type { RollResult } from '../dice-roller';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a test character from BLANK_CHARACTER with specific overrides. */
function makeCharacter(overrides: Partial<{
  intI: number; intA: number; intB: number;
  wpI: number; wpA: number; wpB: number;
  aSkills: Character['aSkills'];
  talents: Character['talents'];
}>): Character {
  const c = structuredClone(BLANK_CHARACTER);
  if (overrides.intI !== undefined) c.chars.Int.i = overrides.intI;
  if (overrides.intA !== undefined) c.chars.Int.a = overrides.intA;
  if (overrides.intB !== undefined) c.chars.Int.b = overrides.intB;
  if (overrides.wpI !== undefined) c.chars.WP.i = overrides.wpI;
  if (overrides.wpA !== undefined) c.chars.WP.a = overrides.wpA;
  if (overrides.wpB !== undefined) c.chars.WP.b = overrides.wpB;
  if (overrides.aSkills) c.aSkills = overrides.aSkills;
  if (overrides.talents) c.talents = overrides.talents;
  return c;
}

/** Build a minimal mock RollResult. */
function makeRollResult(overrides: Partial<RollResult> = {}): RollResult {
  return {
    roll: 42,
    targetNumber: 50,
    baseTarget: 50,
    difficulty: 'Challenging',
    passed: true,
    sl: 0,
    isCritical: false,
    isFumble: false,
    isAutoSuccess: false,
    isAutoFailure: false,
    outcome: 'Marginal Success',
    skillOrCharName: 'Language (Magick)',
    timestamp: Date.now(),
    ...overrides,
  };
}

/** Build a minimal SpellItem. */
function makeSpell(overrides: Partial<SpellItem> = {}): SpellItem {
  return {
    name: 'Test Spell',
    cn: '4',
    range: '48 yards',
    target: '1',
    duration: 'WPB rounds',
    effect: 'A bolt of energy strikes the target.',
    ...overrides,
  };
}


// ─── Property 1: Casting target computation ───────────────────────────────────
// **Validates: Requirements 2.1, 2.5**
describe('computeCastingTarget — Property 1: Casting target computation', () => {
  it('Int 20 + Language (Magick) advances 0 → target 20', () => {
    const char = makeCharacter({
      intI: 20,
      aSkills: [{ n: 'Language (Magick)', c: 'Int', a: 0 }],
    });
    expect(computeCastingTarget(char)).toBe(20);
  });

  it('Int 45 + Language (Magick) advances 10 → target 55', () => {
    const char = makeCharacter({
      intI: 45,
      aSkills: [{ n: 'Language (Magick)', c: 'Int', a: 10 }],
    });
    expect(computeCastingTarget(char)).toBe(55);
  });

  it('Int 73 + Language (Magick) advances 25 → target 98', () => {
    const char = makeCharacter({
      intI: 73,
      aSkills: [{ n: 'Language (Magick)', c: 'Int', a: 25 }],
    });
    expect(computeCastingTarget(char)).toBe(98);
  });

  it('Int split across i/a/b (30+5+5) + advances 15 → target 55', () => {
    const char = makeCharacter({
      intI: 30, intA: 5, intB: 5,
      aSkills: [{ n: 'Language (Magick)', c: 'Int', a: 15 }],
    });
    expect(computeCastingTarget(char)).toBe(55);
  });

  it('missing Language (Magick) skill → advances treated as 0', () => {
    const char = makeCharacter({ intI: 40 });
    expect(computeCastingTarget(char)).toBe(40);
  });
});

// ─── Property 2: Channelling target computation ──────────────────────────────
// **Validates: Requirements 3.2**
describe('computeChannellingTarget — Property 2: Channelling target computation', () => {
  it('WP 35 + Channelling advances 10 → target 45', () => {
    const char = makeCharacter({
      wpI: 35,
      aSkills: [{ n: 'Channelling', c: 'WP', a: 10 }],
    });
    expect(computeChannellingTarget(char)).toBe(45);
  });

  it('WP 50 + Channelling advances 0 → target 50', () => {
    const char = makeCharacter({
      wpI: 50,
      aSkills: [{ n: 'Channelling', c: 'WP', a: 0 }],
    });
    expect(computeChannellingTarget(char)).toBe(50);
  });

  it('WP split (25+10+5) + Channelling advances 20 → target 60', () => {
    const char = makeCharacter({
      wpI: 25, wpA: 10, wpB: 5,
      aSkills: [{ n: 'Channelling', c: 'WP', a: 20 }],
    });
    expect(computeChannellingTarget(char)).toBe(60);
  });

  it('Channelling (Aqshy) lore variant is recognised', () => {
    const char = makeCharacter({
      wpI: 40,
      aSkills: [{ n: 'Channelling (Aqshy)', c: 'WP', a: 15 }],
    });
    expect(computeChannellingTarget(char)).toBe(55);
  });

  it('Channelling (Ghur) lore variant is recognised', () => {
    const char = makeCharacter({
      wpI: 30,
      aSkills: [{ n: 'Channelling (Ghur)', c: 'WP', a: 5 }],
    });
    expect(computeChannellingTarget(char)).toBe(35);
  });

  it('missing Channelling skill → advances treated as 0', () => {
    const char = makeCharacter({ wpI: 42 });
    expect(computeChannellingTarget(char)).toBe(42);
  });
});


// ─── Property 3: Casting success is determined by SL vs CN ───────────────────
// **Validates: Requirements 2.2, 2.3**
describe('resolveCastingResult — Property 3: Casting success is determined by SL vs CN', () => {
  const char = makeCharacter({ intI: 40 });

  it('SL equal to CN → successful cast', () => {
    const roll = makeRollResult({ sl: 4, passed: true });
    const spell = makeSpell({ cn: '4' });
    const result = resolveCastingResult(roll, spell, char);
    expect(result.castSuccess).toBe(true);
  });

  it('SL exceeding CN → successful cast', () => {
    const roll = makeRollResult({ sl: 6, passed: true });
    const spell = makeSpell({ cn: '4' });
    const result = resolveCastingResult(roll, spell, char);
    expect(result.castSuccess).toBe(true);
    expect(result.surplusSL).toBe(2);
  });

  it('SL one below CN → failed cast', () => {
    const roll = makeRollResult({ sl: 3, passed: true });
    const spell = makeSpell({ cn: '4' });
    const result = resolveCastingResult(roll, spell, char);
    expect(result.castSuccess).toBe(false);
  });

  it('negative SL (failed roll) → failed cast', () => {
    const roll = makeRollResult({ sl: -2, passed: false });
    const spell = makeSpell({ cn: '6' });
    const result = resolveCastingResult(roll, spell, char);
    expect(result.castSuccess).toBe(false);
  });

  it('CN 0 Petty spell with SL 0 → successful cast', () => {
    const roll = makeRollResult({ sl: 0, passed: true });
    const spell = makeSpell({ cn: '0' });
    const result = resolveCastingResult(roll, spell, char);
    expect(result.castSuccess).toBe(true);
  });
});

// ─── Property 4: Total Power overrides CN check ─────────────────────────────
// **Validates: Requirements 5.2**
describe('resolveCastingResult — Property 4: Total Power overrides CN check', () => {
  const char = makeCharacter({ intI: 40 });

  it('SL < CN with totalPower → castSuccess is true', () => {
    const roll = makeRollResult({ sl: 2, passed: true, isCritical: true, roll: 22 });
    const spell = makeSpell({ cn: '6' });
    const result = resolveCastingResult(roll, spell, char, { totalPower: true });
    expect(result.castSuccess).toBe(true);
  });

  it('SL < CN without totalPower → castSuccess is false', () => {
    const roll = makeRollResult({ sl: 2, passed: true });
    const spell = makeSpell({ cn: '6' });
    const result = resolveCastingResult(roll, spell, char);
    expect(result.castSuccess).toBe(false);
  });
});

// ─── Property 5: Critical cast triggers Minor Miscast unless Instinctive Diction
// **Validates: Requirements 5.5**
describe('resolveCastingResult — Property 5: Critical cast triggers Minor Miscast unless Instinctive Diction', () => {
  it('critical roll without Instinctive Diction → triggerMinorMiscast true', () => {
    const char = makeCharacter({ intI: 40 });
    const roll = makeRollResult({ sl: 5, passed: true, isCritical: true, roll: 33 });
    const spell = makeSpell({ cn: '4' });
    const result = resolveCastingResult(roll, spell, char);
    expect(result.triggerMinorMiscast).toBe(true);
  });

  it('critical roll with Instinctive Diction → triggerMinorMiscast false', () => {
    const char = makeCharacter({
      intI: 40,
      talents: [{ n: 'Instinctive Diction', lvl: 1, desc: '' }],
    });
    const roll = makeRollResult({ sl: 5, passed: true, isCritical: true, roll: 33 });
    const spell = makeSpell({ cn: '4' });
    const result = resolveCastingResult(roll, spell, char);
    expect(result.triggerMinorMiscast).toBe(false);
  });

  it('fumble → triggerMinorMiscast true regardless of Instinctive Diction', () => {
    const char = makeCharacter({
      intI: 40,
      talents: [{ n: 'Instinctive Diction', lvl: 1, desc: '' }],
    });
    const roll = makeRollResult({ sl: -3, passed: false, isFumble: true, roll: 88 });
    const spell = makeSpell({ cn: '4' });
    const result = resolveCastingResult(roll, spell, char);
    expect(result.triggerMinorMiscast).toBe(true);
  });

  it('non-critical, non-fumble roll → triggerMinorMiscast false', () => {
    const char = makeCharacter({ intI: 40 });
    const roll = makeRollResult({ sl: 4, passed: true, isCritical: false, isFumble: false });
    const spell = makeSpell({ cn: '4' });
    const result = resolveCastingResult(roll, spell, char);
    expect(result.triggerMinorMiscast).toBe(false);
  });
});


// ─── Property 6: Overcast slot computation ───────────────────────────────────
// **Validates: Requirements 4.1**
describe('computeOvercastSlots — Property 6: Overcast slot computation', () => {
  it.each([
    { sl: 4, cn: 4, expected: 0, label: 'surplus 0 → 0 slots' },
    { sl: 5, cn: 4, expected: 0, label: 'surplus 1 → 0 slots' },
    { sl: 6, cn: 4, expected: 1, label: 'surplus 2 → 1 slot' },
    { sl: 7, cn: 4, expected: 1, label: 'surplus 3 → 1 slot' },
    { sl: 8, cn: 4, expected: 2, label: 'surplus 4 → 2 slots' },
    { sl: 9, cn: 4, expected: 2, label: 'surplus 5 → 2 slots' },
    { sl: 14, cn: 4, expected: 5, label: 'surplus 10 → 5 slots' },
  ])('$label (SL=$sl, CN=$cn)', ({ sl, cn, expected }) => {
    expect(computeOvercastSlots(sl, cn)).toBe(expected);
  });

  it('SL below CN → 0 slots', () => {
    expect(computeOvercastSlots(2, 6)).toBe(0);
  });
});

// ─── Property 7: Overcast option availability ────────────────────────────────
// **Validates: Requirements 4.2, 4.3, 4.4, 4.5**
describe('computeOvercastOptions — Property 7: Overcast option availability', () => {
  it('self-targeting spell (range "You", target "You") → Range and Targets disabled', () => {
    const spell = makeSpell({ range: 'You', target: 'You', duration: 'WPB rounds' });
    const options = computeOvercastOptions(spell);
    const range = options.find(o => o.category === 'range')!;
    const targets = options.find(o => o.category === 'targets')!;
    const aoe = options.find(o => o.category === 'aoe')!;
    const duration = options.find(o => o.category === 'duration')!;
    expect(range.enabled).toBe(false);
    expect(targets.enabled).toBe(false);
    expect(aoe.enabled).toBe(true);
    expect(duration.enabled).toBe(true);
  });

  it('touch spell (range "Touch") → Range disabled, Targets enabled', () => {
    const spell = makeSpell({ range: 'Touch', target: '1' });
    const options = computeOvercastOptions(spell);
    const range = options.find(o => o.category === 'range')!;
    const targets = options.find(o => o.category === 'targets')!;
    expect(range.enabled).toBe(false);
    expect(targets.enabled).toBe(true);
  });

  it('instant spell (duration "Instant") → Duration disabled', () => {
    const spell = makeSpell({ duration: 'Instant' });
    const options = computeOvercastOptions(spell);
    const duration = options.find(o => o.category === 'duration')!;
    expect(duration.enabled).toBe(false);
  });

  it('normal spell → all options enabled', () => {
    const spell = makeSpell({ range: '48 yards', target: '1', duration: 'WPB rounds' });
    const options = computeOvercastOptions(spell);
    expect(options.every(o => o.enabled)).toBe(true);
  });
});

// ─── Property 8: Channelling accumulation and readiness ──────────────────────
// **Validates: Requirements 3.3, 3.5**
describe('resolveChannellingResult — Property 8: Channelling accumulation and readiness', () => {
  it('adding SL 3 to progress 0 → accumulatedSL 3, not ready (CN > 3)', () => {
    const roll = makeRollResult({ sl: 3, passed: true });
    const result = resolveChannellingResult(roll, 0, 8);
    expect(result.accumulatedSL).toBe(3);
    expect(result.ready).toBe(false);
  });

  it('adding SL 2 to progress 4 with CN 6 → accumulatedSL 6, ready true', () => {
    const roll = makeRollResult({ sl: 2, passed: true });
    const result = resolveChannellingResult(roll, 4, 6);
    expect(result.accumulatedSL).toBe(6);
    expect(result.ready).toBe(true);
  });

  it('failed roll → progress unchanged', () => {
    const roll = makeRollResult({ sl: -1, passed: false });
    const result = resolveChannellingResult(roll, 4, 8);
    expect(result.accumulatedSL).toBe(4);
    expect(result.ready).toBe(false);
  });

  it('passed roll with SL 0 → progress unchanged', () => {
    const roll = makeRollResult({ sl: 0, passed: true });
    const result = resolveChannellingResult(roll, 3, 8);
    expect(result.accumulatedSL).toBe(3);
    expect(result.ready).toBe(false);
  });

  it('accumulation exactly at CN → ready true', () => {
    const roll = makeRollResult({ sl: 4, passed: true });
    const result = resolveChannellingResult(roll, 0, 4);
    expect(result.accumulatedSL).toBe(4);
    expect(result.ready).toBe(true);
  });
});


// ─── Property 9: Miscast table lookup covers full d100 range ─────────────────
// **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
describe('lookupMiscast — Property 9: Miscast table lookup covers full d100 range', () => {
  describe('minor table — one roll per range', () => {
    it.each([
      { roll: 1, expectedName: 'Witchfire' },
      { roll: 15, expectedName: 'Sickened' },
      { roll: 25, expectedName: 'Unfocused' },
      { roll: 35, expectedName: 'Pushed Back' },
      { roll: 45, expectedName: 'Knocked Down' },
      { roll: 55, expectedName: 'Distracted' },
      { roll: 65, expectedName: 'Aethyric Shock' },
      { roll: 75, expectedName: 'Drained' },
      { roll: 85, expectedName: 'Loss of Concentration' },
      { roll: 92, expectedName: 'Multiplying Misfortune' },
      { roll: 98, expectedName: 'Cascading Chaos' },
    ])('roll $roll → $expectedName', ({ roll, expectedName }) => {
      expect(lookupMiscast(roll, 'minor').name).toBe(expectedName);
    });
  });

  describe('minor table — boundary values', () => {
    it('roll 10 → Witchfire (upper boundary)', () => {
      expect(lookupMiscast(10, 'minor').name).toBe('Witchfire');
    });
    it('roll 11 → Sickened (lower boundary)', () => {
      expect(lookupMiscast(11, 'minor').name).toBe('Sickened');
    });
    it('roll 90 → Loss of Concentration (upper boundary)', () => {
      expect(lookupMiscast(90, 'minor').name).toBe('Loss of Concentration');
    });
    it('roll 91 → Multiplying Misfortune (lower boundary)', () => {
      expect(lookupMiscast(91, 'minor').name).toBe('Multiplying Misfortune');
    });
    it('roll 95 → Multiplying Misfortune (upper boundary)', () => {
      expect(lookupMiscast(95, 'minor').name).toBe('Multiplying Misfortune');
    });
    it('roll 96 → Cascading Chaos (lower boundary)', () => {
      expect(lookupMiscast(96, 'minor').name).toBe('Cascading Chaos');
    });
    it('roll 100 → Cascading Chaos (upper boundary)', () => {
      expect(lookupMiscast(100, 'minor').name).toBe('Cascading Chaos');
    });
  });

  describe('special flags', () => {
    it('rolls 91-95 have multiplying_misfortune special', () => {
      for (const roll of [91, 93, 95]) {
        expect(lookupMiscast(roll, 'minor').special).toBe('multiplying_misfortune');
      }
    });
    it('rolls 96-100 have cascading_chaos special', () => {
      for (const roll of [96, 98, 100]) {
        expect(lookupMiscast(roll, 'minor').special).toBe('cascading_chaos');
      }
    });
  });

  describe('major table — representative rolls', () => {
    it('roll 5 → Aethyric Feedback', () => {
      expect(lookupMiscast(5, 'major').name).toBe('Aethyric Feedback');
    });
    it('roll 50 → Corruption', () => {
      expect(lookupMiscast(50, 'major').name).toBe('Corruption');
    });
    it('roll 100 → Realm of Chaos', () => {
      expect(lookupMiscast(100, 'major').name).toBe('Realm of Chaos');
    });
  });
});

// ─── Property 10: Reverse roll digits for hit location ───────────────────────
// **Validates: Requirements 8.3**
describe('reverseRollDigits & getHitLocation — Property 10: Reverse roll digits for hit location', () => {
  it.each([
    { roll: 34, expectedReversed: 43, expectedLocation: 'Right Arm' },
    { roll: 70, expectedReversed: 7, expectedLocation: 'Head' },
    { roll: 100, expectedReversed: 1, expectedLocation: 'Head' },
    { roll: 11, expectedReversed: 11, expectedLocation: 'Left Arm' },
    { roll: 5, expectedReversed: 50, expectedLocation: 'Body' },
  ])('roll $roll → reversed $expectedReversed → $expectedLocation', ({ roll, expectedReversed, expectedLocation }) => {
    expect(reverseRollDigits(roll)).toBe(expectedReversed);
    expect(getHitLocation(expectedReversed)).toBe(expectedLocation);
  });

  it('all reversed values map to a valid hit location', () => {
    const validLocations = ['Head', 'Left Arm', 'Right Arm', 'Body', 'Left Leg', 'Right Leg'];
    for (const roll of [1, 10, 25, 50, 75, 90, 99, 100]) {
      const reversed = reverseRollDigits(roll);
      expect(reversed).toBeGreaterThanOrEqual(1);
      expect(reversed).toBeLessThanOrEqual(100);
      expect(validLocations).toContain(getHitLocation(reversed));
    }
  });
});

// ─── Property 11: Magic missile damage computation ───────────────────────────
// **Validates: Requirements 8.4**
describe('computeMagicMissileDamage — Property 11: Magic missile damage computation', () => {
  it('Dmg +4, WPB 4, SL 3 → 11', () => {
    const spell = makeSpell({ effect: 'Dmg +4' });
    expect(computeMagicMissileDamage(spell, 4, 3)).toBe(11);
  });

  it('Dmg +0, WPB 3, SL 1 → 4', () => {
    const spell = makeSpell({ effect: 'Dmg +0' });
    expect(computeMagicMissileDamage(spell, 3, 1)).toBe(4);
  });

  it('Dmg +12, WPB 5, SL 6 → 23', () => {
    const spell = makeSpell({ effect: 'Dmg +12' });
    expect(computeMagicMissileDamage(spell, 5, 6)).toBe(23);
  });

  it('no damage pattern in effect → 0 + WPB + SL', () => {
    const spell = makeSpell({ effect: 'Target is healed.' });
    expect(computeMagicMissileDamage(spell, 4, 2)).toBe(6);
  });
});
