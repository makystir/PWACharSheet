import { describe, it, expect } from 'vitest';
import {
  computeCastingTarget,
  computeChannellingTarget,
  resolveCastingResult,
  computeOvercastSlots,
  computeOvercastOptions,
  resolveChannellingResult,
  resolveChannellingInterruption,
  hasAethyricAttunement,
  lookupMiscast,
  reverseRollDigits,
  getHitLocation,
  computeMagicMissileDamage,
  OVERCAST_TABLE,
  lookupOvercastEffect,
  resolveOvercastAllocations,
  computeOvercastDamagePreview,
  getArmourCastingPenalty,
  isMetalArmour,
  isLeatherArmour,
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

  it('normal spell → all non-damage options enabled, damage disabled (non-missile)', () => {
    const spell = makeSpell({ range: '48 yards', target: '1', duration: 'WPB rounds' });
    const options = computeOvercastOptions(spell);
    const range = options.find(o => o.category === 'range')!;
    const aoe = options.find(o => o.category === 'aoe')!;
    const duration = options.find(o => o.category === 'duration')!;
    const targets = options.find(o => o.category === 'targets')!;
    const damage = options.find(o => o.category === 'damage')!;
    expect(range.enabled).toBe(true);
    expect(aoe.enabled).toBe(true);
    expect(duration.enabled).toBe(true);
    expect(targets.enabled).toBe(true);
    expect(damage.enabled).toBe(false);
  });

  it('magic missile spell → damage option also enabled', () => {
    const spell = makeSpell({ range: '48 yards', target: '1', duration: 'Instant', effect: 'A bolt of energy strikes the target. Dmg +4' });
    const options = computeOvercastOptions(spell);
    const damage = options.find(o => o.category === 'damage')!;
    expect(damage.enabled).toBe(true);
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
    expect(result.isCriticalChannelling).toBe(false);
    expect(result.isFumbledChannelling).toBe(false);
    expect(result.triggerMinorMiscast).toBe(false);
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
      { roll: 1, expectedName: 'Witchsign' },
      { roll: 8, expectedName: 'Soured Milk' },
      { roll: 13, expectedName: 'Blight' },
      { roll: 18, expectedName: 'Soulwax' },
      { roll: 23, expectedName: 'Freezing Breath' },
      { roll: 28, expectedName: 'Unfasten' },
      { roll: 33, expectedName: 'Wayward Garb' },
      { roll: 38, expectedName: 'Curse of Temperance' },
      { roll: 43, expectedName: 'Cloyed Tongue' },
      { roll: 48, expectedName: 'Driven to Distraction' },
      { roll: 53, expectedName: 'Unholy Visions' },
      { roll: 58, expectedName: 'Hexeyes' },
      { roll: 63, expectedName: 'Rupture' },
      { roll: 68, expectedName: 'Fell Whispers' },
      { roll: 73, expectedName: 'The Horror!' },
      { roll: 78, expectedName: 'Curse of Corruption' },
      { roll: 83, expectedName: 'Intestinal Rebellion' },
      { roll: 88, expectedName: 'Marked by Magic' },
      { roll: 92, expectedName: 'Multiplying Misfortune' },
      { roll: 98, expectedName: 'Cascading Chaos' },
    ])('roll $roll → $expectedName', ({ roll, expectedName }) => {
      expect(lookupMiscast(roll, 'minor').name).toBe(expectedName);
    });
  });

  describe('minor table — boundary values', () => {
    it('roll 5 → Witchsign (upper boundary)', () => {
      expect(lookupMiscast(5, 'minor').name).toBe('Witchsign');
    });
    it('roll 6 → Soured Milk (lower boundary)', () => {
      expect(lookupMiscast(6, 'minor').name).toBe('Soured Milk');
    });
    it('roll 90 → Marked by Magic (upper boundary)', () => {
      expect(lookupMiscast(90, 'minor').name).toBe('Marked by Magic');
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
    it('roll 5 → Ghostly Voices', () => {
      expect(lookupMiscast(5, 'major').name).toBe('Ghostly Voices');
    });
    it('roll 50 → Darkling Sight', () => {
      expect(lookupMiscast(50, 'major').name).toBe('Darkling Sight');
    });
    it('roll 100 → Aethyric Feedback', () => {
      expect(lookupMiscast(100, 'major').name).toBe('Aethyric Feedback');
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
  it('Dmg +4, WPB 4, SL 3 → 7', () => {
    const spell = makeSpell({ effect: 'Dmg +4' });
    // New signature: (spell, castingSL, wpBonus?, tbBonus?)
    // baseDamage = parseDamageFromEffect("Dmg +4", 4) = 4, result = 4 + 3 = 7
    expect(computeMagicMissileDamage(spell, 3, 4)).toBe(7);
  });

  it('Dmg +0, WPB 3, SL 1 → 1', () => {
    const spell = makeSpell({ effect: 'Dmg +0' });
    // baseDamage = 0, result = 0 + 1 = 1
    expect(computeMagicMissileDamage(spell, 1, 3)).toBe(1);
  });

  it('Dmg +12, WPB 5, SL 6 → 18', () => {
    const spell = makeSpell({ effect: 'Dmg +12' });
    // baseDamage = 12, result = 12 + 6 = 18
    expect(computeMagicMissileDamage(spell, 6, 5)).toBe(18);
  });

  it('no damage pattern in effect → 0 + SL', () => {
    const spell = makeSpell({ effect: 'Target is healed.' });
    // baseDamage = 0, result = 0 + 2 = 2
    expect(computeMagicMissileDamage(spell, 2, 4)).toBe(2);
  });
});


// ─── Overcast Table (Winds of Magic) ─────────────────────────────────────────
// **Validates: Requirements 5.1, 5.2, 5.3**
describe('OVERCAST_TABLE — data structure', () => {
  it('has 7 rows with Fibonacci-like SL thresholds', () => {
    expect(OVERCAST_TABLE).toHaveLength(7);
    expect(OVERCAST_TABLE.map(r => r.sl)).toEqual([1, 2, 3, 5, 8, 13, 21]);
  });

  it('damage values are +1 through +7', () => {
    expect(OVERCAST_TABLE.map(r => r.damage)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('target values follow +1/+1/+1/+2/+2/+2/+3 pattern', () => {
    expect(OVERCAST_TABLE.map(r => r.targets)).toEqual([
      '+1 Target', '+1 Target', '+1 Target',
      '+2 Targets', '+2 Targets', '+2 Targets',
      '+3 Targets',
    ]);
  });

  it('range values follow 2×/2×/2×/3×/3×/3×/4× pattern', () => {
    expect(OVERCAST_TABLE.map(r => r.range)).toEqual([
      '2× Range', '2× Range', '2× Range',
      '3× Range', '3× Range', '3× Range',
      '4× Range',
    ]);
  });

  it('duration values follow listed/2×/2×/2×/3×/3×/3× pattern', () => {
    expect(OVERCAST_TABLE.map(r => r.duration)).toEqual([
      'Listed Duration', '2× Duration', '2× Duration',
      '2× Duration', '3× Duration', '3× Duration',
      '3× Duration',
    ]);
  });

  it('aoe values follow listed/listed/2×/2×/2×/2×/3× pattern', () => {
    expect(OVERCAST_TABLE.map(r => r.aoe)).toEqual([
      'Listed AoE', 'Listed AoE', '2× AoE',
      '2× AoE', '2× AoE', '2× AoE',
      '3× AoE',
    ]);
  });
});

describe('lookupOvercastEffect — single column lookup', () => {
  it('SL 0 → null (below minimum threshold)', () => {
    expect(lookupOvercastEffect('damage', 0)).toBeNull();
  });

  it('SL 1 → first row for damage (+1 Damage)', () => {
    expect(lookupOvercastEffect('damage', 1)).toBe('+1 Damage');
  });

  it('SL 2 → second row for targets (+1 Target)', () => {
    expect(lookupOvercastEffect('targets', 2)).toBe('+1 Target');
  });

  it('SL 4 → still third row (threshold 3 met, 5 not met) for range (2× Range)', () => {
    expect(lookupOvercastEffect('range', 4)).toBe('2× Range');
  });

  it('SL 5 → fourth row for range (3× Range)', () => {
    expect(lookupOvercastEffect('range', 5)).toBe('3× Range');
  });

  it('SL 8 → fifth row for duration (3× Duration)', () => {
    expect(lookupOvercastEffect('duration', 8)).toBe('3× Duration');
  });

  it('SL 13 → sixth row for damage (+6 Damage)', () => {
    expect(lookupOvercastEffect('damage', 13)).toBe('+6 Damage');
  });

  it('SL 21 → seventh row for targets (+3 Targets)', () => {
    expect(lookupOvercastEffect('targets', 21)).toBe('+3 Targets');
  });

  it('SL 30 (above 21) → still seventh row for aoe (3× AoE)', () => {
    expect(lookupOvercastEffect('aoe', 30)).toBe('3× AoE');
  });
});

describe('resolveOvercastAllocations — multi-column allocation', () => {
  it('allocating 3 SL to damage and 2 SL to range with 5 surplus', () => {
    const result = resolveOvercastAllocations(5, { damage: 3, range: 2 });
    expect(result.surplusSL).toBe(5);
    expect(result.unspentSL).toBe(0);
    expect(result.columnEffects).toHaveLength(2);
    const damageEffect = result.columnEffects.find(e => e.category === 'damage');
    const rangeEffect = result.columnEffects.find(e => e.category === 'range');
    expect(damageEffect?.effect).toBe('+3 Damage');
    expect(damageEffect?.slSpent).toBe(3);
    expect(rangeEffect?.effect).toBe('2× Range');
    expect(rangeEffect?.slSpent).toBe(2);
  });

  it('allocating more SL than surplus caps to available', () => {
    const result = resolveOvercastAllocations(3, { damage: 2, range: 5 });
    expect(result.columnEffects).toHaveLength(2);
    const rangeEffect = result.columnEffects.find(e => e.category === 'range');
    // Only 1 SL left for range (3 surplus - 2 spent on damage)
    expect(rangeEffect?.slSpent).toBe(1);
    expect(rangeEffect?.effect).toBe('2× Range');
    expect(result.unspentSL).toBe(0);
  });

  it('empty allocations → no effects, all SL unspent', () => {
    const result = resolveOvercastAllocations(5, {});
    expect(result.columnEffects).toHaveLength(0);
    expect(result.unspentSL).toBe(5);
  });

  it('zero SL allocations are skipped', () => {
    const result = resolveOvercastAllocations(5, { damage: 0, range: 3, targets: 0 });
    expect(result.columnEffects).toHaveLength(1);
    expect(result.columnEffects[0].category).toBe('range');
    expect(result.unspentSL).toBe(2);
  });

  it('CastingResult includes overcastAllocation as null by default', () => {
    const char = makeCharacter({ intI: 40 });
    const roll = makeRollResult({ sl: 8, passed: true });
    const spell = makeSpell({ cn: '4' });
    const result = resolveCastingResult(roll, spell, char);
    expect(result.overcastAllocation).toBeNull();
    expect(result.surplusSL).toBe(4);
  });
});


// ─── Property 12: Critical Channelling ───────────────────────────────────────
// **Validates: Requirements 6.2**
describe('resolveChannellingResult — Critical Channelling (doubles + success)', () => {
  it('critical roll adds WP Bonus SL on top of normal SL', () => {
    // Character with WP 45 → WP Bonus = 4
    const char = makeCharacter({
      wpI: 45,
      aSkills: [{ n: 'Channelling', c: 'WP', a: 10 }],
    });
    // Rolled doubles on a success: isCritical = true, SL = 3
    const roll = makeRollResult({ sl: 3, passed: true, isCritical: true, roll: 22 });
    const result = resolveChannellingResult(roll, 2, 12, char);
    // accumulated = 2 (prior) + 3 (normal SL) + 4 (WP Bonus) = 9
    expect(result.accumulatedSL).toBe(9);
    expect(result.isCriticalChannelling).toBe(true);
    expect(result.bonusSL).toBe(4);
  });

  it('critical channelling triggers Minor Miscast without Aethyric Attunement', () => {
    const char = makeCharacter({ wpI: 30 });
    const roll = makeRollResult({ sl: 2, passed: true, isCritical: true, roll: 11 });
    const result = resolveChannellingResult(roll, 0, 8, char);
    expect(result.triggerMinorMiscast).toBe(true);
    expect(result.isCriticalChannelling).toBe(true);
  });

  it('critical channelling does NOT trigger Minor Miscast with Aethyric Attunement', () => {
    const char = makeCharacter({
      wpI: 40,
      talents: [{ n: 'Aethyric Attunement', lvl: 1, desc: '' }],
    });
    const roll = makeRollResult({ sl: 3, passed: true, isCritical: true, roll: 33 });
    const result = resolveChannellingResult(roll, 0, 8, char);
    expect(result.triggerMinorMiscast).toBe(false);
    expect(result.isCriticalChannelling).toBe(true);
    // Still gets the WP Bonus SL (4)
    expect(result.bonusSL).toBe(4);
    expect(result.accumulatedSL).toBe(7); // 0 + 3 + 4
  });

  it('critical channelling can make the spell ready', () => {
    // WP 50 → WP Bonus = 5
    const char = makeCharacter({ wpI: 50 });
    const roll = makeRollResult({ sl: 2, passed: true, isCritical: true, roll: 44 });
    // Prior progress = 3, spell CN = 8
    // accumulated = 3 + 2 + 5 = 10 >= 8
    const result = resolveChannellingResult(roll, 3, 8, char);
    expect(result.accumulatedSL).toBe(10);
    expect(result.ready).toBe(true);
  });

  it('without character parameter, critical still triggers miscast but no bonus SL', () => {
    const roll = makeRollResult({ sl: 3, passed: true, isCritical: true, roll: 22 });
    const result = resolveChannellingResult(roll, 0, 8);
    expect(result.isCriticalChannelling).toBe(true);
    expect(result.triggerMinorMiscast).toBe(true);
    expect(result.bonusSL).toBe(0);
    expect(result.accumulatedSL).toBe(3); // Just normal SL, no bonus
  });
});

// ─── Property 13: Fumbled Channelling ────────────────────────────────────────
// **Validates: Requirements 6.3**
describe('resolveChannellingResult — Fumbled Channelling (doubles + failure)', () => {
  it('fumble loses all accumulated SL', () => {
    const char = makeCharacter({ wpI: 40 });
    const roll = makeRollResult({ sl: -2, passed: false, isFumble: true, roll: 88 });
    const result = resolveChannellingResult(roll, 5, 8, char);
    expect(result.accumulatedSL).toBe(0);
    expect(result.isFumbledChannelling).toBe(true);
  });

  it('fumble triggers Minor Miscast', () => {
    const char = makeCharacter({ wpI: 40 });
    const roll = makeRollResult({ sl: -3, passed: false, isFumble: true, roll: 99 });
    const result = resolveChannellingResult(roll, 7, 8, char);
    expect(result.triggerMinorMiscast).toBe(true);
  });

  it('fumble makes spell not ready (lost all SL)', () => {
    const char = makeCharacter({ wpI: 40 });
    const roll = makeRollResult({ sl: -1, passed: false, isFumble: true, roll: 66 });
    const result = resolveChannellingResult(roll, 10, 8, char);
    expect(result.ready).toBe(false);
    expect(result.accumulatedSL).toBe(0);
  });

  it('fumble with zero prior progress stays at 0', () => {
    const roll = makeRollResult({ sl: -2, passed: false, isFumble: true, roll: 77 });
    const result = resolveChannellingResult(roll, 0, 8);
    expect(result.accumulatedSL).toBe(0);
    expect(result.isFumbledChannelling).toBe(true);
    expect(result.triggerMinorMiscast).toBe(true);
  });
});

// ─── Property 14: Channelling Interruption ───────────────────────────────────
// **Validates: Requirements 6.4**
describe('resolveChannellingInterruption — Interruption handling', () => {
  it('passed Cool test → channelling continues, SL preserved', () => {
    const coolRoll = makeRollResult({ sl: 1, passed: true, roll: 30 });
    const result = resolveChannellingInterruption(coolRoll, 5);
    expect(result.coolTestPassed).toBe(true);
    expect(result.accumulatedSL).toBe(5);
    expect(result.triggerMinorMiscast).toBe(false);
  });

  it('failed Cool test → lose all SL + Minor Miscast', () => {
    const coolRoll = makeRollResult({ sl: -2, passed: false, roll: 75 });
    const result = resolveChannellingInterruption(coolRoll, 6);
    expect(result.coolTestPassed).toBe(false);
    expect(result.accumulatedSL).toBe(0);
    expect(result.triggerMinorMiscast).toBe(true);
  });

  it('failed Cool test with zero prior SL → stays at 0, still triggers miscast', () => {
    const coolRoll = makeRollResult({ sl: -1, passed: false, roll: 60 });
    const result = resolveChannellingInterruption(coolRoll, 0);
    expect(result.coolTestPassed).toBe(false);
    expect(result.accumulatedSL).toBe(0);
    expect(result.triggerMinorMiscast).toBe(true);
  });

  it('passed Cool test preserves high accumulated SL', () => {
    const coolRoll = makeRollResult({ sl: 3, passed: true, roll: 15 });
    const result = resolveChannellingInterruption(coolRoll, 12);
    expect(result.coolTestPassed).toBe(true);
    expect(result.accumulatedSL).toBe(12);
    expect(result.triggerMinorMiscast).toBe(false);
  });
});

// ─── hasAethyricAttunement utility ───────────────────────────────────────────
describe('hasAethyricAttunement', () => {
  it('returns true when character has Aethyric Attunement talent', () => {
    const char = makeCharacter({
      wpI: 40,
      talents: [{ n: 'Aethyric Attunement', lvl: 1, desc: '' }],
    });
    expect(hasAethyricAttunement(char)).toBe(true);
  });

  it('returns false when character lacks the talent', () => {
    const char = makeCharacter({ wpI: 40 });
    expect(hasAethyricAttunement(char)).toBe(false);
  });

  it('returns true for variant naming (e.g. with parenthetical)', () => {
    const char = makeCharacter({
      wpI: 40,
      talents: [{ n: 'Aethyric Attunement (Ghyran)', lvl: 1, desc: '' }],
    });
    expect(hasAethyricAttunement(char)).toBe(true);
  });
});

// ─── Armour Casting Penalty ──────────────────────────────────────────────────
// **Validates: Requirements 7.1, 7.2, 7.3**
describe('getArmourCastingPenalty', () => {
  it('returns 0 for character with no worn armour', () => {
    const char = makeCharacter({ intI: 40 });
    expect(getArmourCastingPenalty(char)).toBe(0);
  });

  it('returns 0 for character with only non-worn armour', () => {
    const char = makeCharacter({ intI: 40 });
    char.armour = [
      { name: 'Leather Jerkin', locations: 'Body', enc: '1', ap: 1, qualities: '—', worn: false },
    ];
    expect(getArmourCastingPenalty(char)).toBe(0);
  });

  it('returns highest AP location value as penalty', () => {
    const char = makeCharacter({ intI: 40 });
    char.armour = [
      { name: 'Leather Jerkin', locations: 'Body', enc: '1', ap: 1, qualities: '—', worn: true },
      { name: 'Plate Helm', locations: 'Head', enc: '2', ap: 2, qualities: 'Impenetrable', worn: true },
    ];
    expect(getArmourCastingPenalty(char)).toBe(2);
  });

  it('returns penalty based on multi-location armour', () => {
    const char = makeCharacter({ intI: 40 });
    char.armour = [
      { name: 'Mail Coat', locations: 'Arms, Body', enc: '3', ap: 3, qualities: 'Flexible', worn: true },
    ];
    // Body and Arms all have AP 3
    expect(getArmourCastingPenalty(char)).toBe(3);
  });

  it('Metal wizard wearing only metal armour is exempt', () => {
    const char = makeCharacter({
      intI: 40,
      talents: [{ n: 'Arcane Magic (Metal)', lvl: 1, desc: '' }],
    });
    char.armour = [
      { name: 'Mail Shirt', locations: 'Body', enc: '2', ap: 2, qualities: 'Flexible', worn: true },
      { name: 'Plate Helm', locations: 'Head', enc: '2', ap: 2, qualities: 'Impenetrable', worn: true },
    ];
    expect(getArmourCastingPenalty(char)).toBe(0);
  });

  it('Metal (Chamon) wizard wearing only metal armour is exempt', () => {
    const char = makeCharacter({
      intI: 40,
      talents: [{ n: 'Arcane Magic (Chamon)', lvl: 1, desc: '' }],
    });
    char.armour = [
      { name: 'Chain Mail', locations: 'Arms, Body', enc: '3', ap: 3, qualities: 'Flexible', worn: true },
    ];
    expect(getArmourCastingPenalty(char)).toBe(0);
  });

  it('Metal wizard wearing mixed armour (metal + leather) gets penalty', () => {
    const char = makeCharacter({
      intI: 40,
      talents: [{ n: 'Arcane Magic (Metal)', lvl: 1, desc: '' }],
    });
    char.armour = [
      { name: 'Mail Shirt', locations: 'Body', enc: '2', ap: 2, qualities: 'Flexible', worn: true },
      { name: 'Leather Leggings', locations: 'Legs', enc: '1', ap: 1, qualities: '—', worn: true },
    ];
    expect(getArmourCastingPenalty(char)).toBe(2);
  });

  it('Beasts wizard wearing only leather armour is exempt', () => {
    const char = makeCharacter({
      intI: 40,
      talents: [{ n: 'Arcane Magic (Beasts)', lvl: 1, desc: '' }],
    });
    char.armour = [
      { name: 'Leather Jack', locations: 'Arms, Body', enc: '1', ap: 1, qualities: '—', worn: true },
      { name: 'Leather Leggings', locations: 'Legs', enc: '1', ap: 1, qualities: '—', worn: true },
    ];
    expect(getArmourCastingPenalty(char)).toBe(0);
  });

  it('Beasts (Ghur) wizard wearing only leather armour is exempt', () => {
    const char = makeCharacter({
      intI: 40,
      talents: [{ n: 'Arcane Magic (Ghur)', lvl: 1, desc: '' }],
    });
    char.armour = [
      { name: 'Hide Armour', locations: 'Body', enc: '2', ap: 2, qualities: '—', worn: true },
    ];
    expect(getArmourCastingPenalty(char)).toBe(0);
  });

  it('Beasts wizard wearing mixed armour (leather + metal) gets penalty', () => {
    const char = makeCharacter({
      intI: 40,
      talents: [{ n: 'Arcane Magic (Beasts)', lvl: 1, desc: '' }],
    });
    char.armour = [
      { name: 'Leather Jerkin', locations: 'Body', enc: '1', ap: 1, qualities: '—', worn: true },
      { name: 'Plate Helm', locations: 'Head', enc: '2', ap: 2, qualities: 'Impenetrable', worn: true },
    ];
    expect(getArmourCastingPenalty(char)).toBe(2);
  });

  it('non-wizard (no Arcane Magic talent) gets full penalty', () => {
    const char = makeCharacter({
      intI: 40,
      talents: [{ n: 'Petty Magic', lvl: 1, desc: '' }],
    });
    char.armour = [
      { name: 'Mail Shirt', locations: 'Body', enc: '2', ap: 2, qualities: 'Flexible', worn: true },
    ];
    expect(getArmourCastingPenalty(char)).toBe(2);
  });

  it('Fire wizard wearing metal armour gets full penalty (no exemption)', () => {
    const char = makeCharacter({
      intI: 40,
      talents: [{ n: 'Arcane Magic (Fire)', lvl: 1, desc: '' }],
    });
    char.armour = [
      { name: 'Mail Shirt', locations: 'Body', enc: '2', ap: 2, qualities: 'Flexible', worn: true },
    ];
    expect(getArmourCastingPenalty(char)).toBe(2);
  });
});

describe('isMetalArmour', () => {
  it.each([
    { name: 'Mail Shirt', expected: true },
    { name: 'Plate Breastplate', expected: true },
    { name: 'Chain Mail', expected: true },
    { name: 'Helm', expected: true },
    { name: 'Steel Gauntlets', expected: true },
    { name: 'Iron Helm', expected: true },
    { name: 'Gromril Armour', expected: true },
    { name: 'Ithilmar Armour', expected: true },
    { name: 'Leather Jerkin', expected: false },
    { name: 'Hide Armour', expected: false },
    { name: 'Fur Cloak', expected: false },
  ])('$name → $expected', ({ name, expected }) => {
    const item = { name, locations: 'Body', enc: '1', ap: 1, qualities: '—' };
    expect(isMetalArmour(item)).toBe(expected);
  });
});

describe('isLeatherArmour', () => {
  it.each([
    { name: 'Leather Jerkin', expected: true },
    { name: 'Leather Jack', expected: true },
    { name: 'Hide Armour', expected: true },
    { name: 'Fur Cloak', expected: true },
    { name: 'Pelt Armour', expected: true },
    { name: 'Barkskin Vest', expected: true },
    { name: 'Mail Shirt', expected: false },
    { name: 'Plate Breastplate', expected: false },
    { name: 'Helm', expected: false },
  ])('$name → $expected', ({ name, expected }) => {
    const item = { name, locations: 'Body', enc: '1', ap: 1, qualities: '—' };
    expect(isLeatherArmour(item)).toBe(expected);
  });
});

// ─── computeOvercastDamagePreview ────────────────────────────────────────────
// **Validates: Requirements 7.2, 7.3**
describe('computeOvercastDamagePreview', () => {
  it('0 allocation → bonus 0, total equals base', () => {
    const result = computeOvercastDamagePreview(8, 0);
    expect(result).toEqual({ base: 8, bonus: 0, total: 8 });
  });

  it('negative allocation → treated as 0 allocation', () => {
    const result = computeOvercastDamagePreview(5, -1);
    expect(result).toEqual({ base: 5, bonus: 0, total: 5 });
  });

  it('allocation 1 → bonus 1 (first OVERCAST_TABLE row)', () => {
    const result = computeOvercastDamagePreview(8, 1);
    expect(result).toEqual({ base: 8, bonus: 1, total: 9 });
  });

  it('allocation 2 → bonus 2 (second row)', () => {
    const result = computeOvercastDamagePreview(8, 2);
    expect(result).toEqual({ base: 8, bonus: 2, total: 10 });
  });

  it('allocation 3 → bonus 3 (third row)', () => {
    const result = computeOvercastDamagePreview(8, 3);
    expect(result).toEqual({ base: 8, bonus: 3, total: 11 });
  });

  it('allocation 4 → bonus 3 (between thresholds 3 and 5)', () => {
    const result = computeOvercastDamagePreview(8, 4);
    expect(result).toEqual({ base: 8, bonus: 3, total: 11 });
  });

  it('allocation 5 → bonus 4 (fourth row)', () => {
    const result = computeOvercastDamagePreview(8, 5);
    expect(result).toEqual({ base: 8, bonus: 4, total: 12 });
  });

  it('allocation 8 → bonus 5 (fifth row)', () => {
    const result = computeOvercastDamagePreview(8, 8);
    expect(result).toEqual({ base: 8, bonus: 5, total: 13 });
  });

  it('allocation 13 → bonus 6 (sixth row)', () => {
    const result = computeOvercastDamagePreview(8, 13);
    expect(result).toEqual({ base: 8, bonus: 6, total: 14 });
  });

  it('allocation 21 → bonus 7 (seventh/max row)', () => {
    const result = computeOvercastDamagePreview(8, 21);
    expect(result).toEqual({ base: 8, bonus: 7, total: 15 });
  });

  it('allocation above 21 → still bonus 7 (capped at max row)', () => {
    const result = computeOvercastDamagePreview(8, 50);
    expect(result).toEqual({ base: 8, bonus: 7, total: 15 });
  });

  it('base damage 0 → total equals bonus only', () => {
    const result = computeOvercastDamagePreview(0, 3);
    expect(result).toEqual({ base: 0, bonus: 3, total: 3 });
  });

  it('NaN baseDamage → treated as 0', () => {
    const result = computeOvercastDamagePreview(NaN, 2);
    expect(result).toEqual({ base: 0, bonus: 2, total: 2 });
  });

  it('undefined baseDamage → treated as 0', () => {
    const result = computeOvercastDamagePreview(undefined as unknown as number, 3);
    expect(result).toEqual({ base: 0, bonus: 3, total: 3 });
  });

  it('Infinity baseDamage → treated as 0', () => {
    const result = computeOvercastDamagePreview(Infinity, 1);
    expect(result).toEqual({ base: 0, bonus: 1, total: 1 });
  });
});
