import { describe, it, expect } from 'vitest';
import { undoAdvancement, redoAdvancement } from '../advancement';
import type { Character, CharacteristicKey, CharacteristicValue, AdvancementEntry } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';
import { CAREER_SCHEMES } from '../../data/careers';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ALL_CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

function makeTestCharacter(overrides: Partial<Character> = {}): Character {
  const chars: Record<CharacteristicKey, CharacteristicValue> = {} as any;
  for (const key of ALL_CHAR_KEYS) {
    chars[key] = { i: 30, a: 0, b: 0 };
  }
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Test Hero',
    species: 'Human / Reiklander',
    class: 'Warriors',
    career: 'Soldier',
    careerLevel: 'Recruit',
    careerPath: 'Recruit',
    status: 'Silver 1',
    chars,
    xpCur: 500,
    xpSpent: 0,
    xpTotal: 500,
    bSkills: [
      { n: 'Athletics', c: 'Ag', a: 0 },
      { n: 'Cool', c: 'WP', a: 5 },
      { n: 'Dodge', c: 'Ag', a: 10 },
    ],
    aSkills: [
      { n: 'Language (Battle)', c: 'Int', a: 0 },
    ],
    talents: [],
    advancementLog: [],
    ...overrides,
  };
}

function makeEntry(overrides: Partial<AdvancementEntry> = {}): AdvancementEntry {
  return {
    timestamp: 1000,
    type: 'characteristic',
    name: 'WS',
    from: 0,
    to: 1,
    xpCost: 25,
    careerLevel: 'Recruit',
    inCareer: true,
    ...overrides,
  };
}

// ─── Property 1: Undo-then-redo round trip ───────────────────────────────────
// Validates: Requirements 5.3

describe('Property 1: Undo-then-redo round trip', () => {
  it('characteristic: advance WS 0→1, undo, redo → matches original advanced state', () => {
    const entry = makeEntry({ type: 'characteristic', name: 'WS', from: 0, to: 1, xpCost: 25 });
    const advanced = makeTestCharacter({
      chars: (() => {
        const c: Record<CharacteristicKey, CharacteristicValue> = {} as any;
        for (const k of ALL_CHAR_KEYS) c[k] = { i: 30, a: 0, b: 0 };
        c.WS = { i: 30, a: 1, b: 0 };
        return c;
      })(),
      xpCur: 475,
      xpSpent: 25,
      advancementLog: [entry],
    });

    const undoResult = undoAdvancement(advanced);
    expect(undoResult).not.toBeNull();
    const redoResult = redoAdvancement(undoResult!.character, undoResult!.undoneEntry);
    expect(redoResult).not.toBeNull();

    expect(redoResult!.character.chars.WS.a).toBe(advanced.chars.WS.a);
    expect(redoResult!.character.xpCur).toBe(advanced.xpCur);
    expect(redoResult!.character.xpSpent).toBe(advanced.xpSpent);
    expect(redoResult!.character.advancementLog).toHaveLength(1);
    expect(redoResult!.character.advancementLog[0]).toEqual(entry);
  });

  it('skill: advance Athletics 0→1, undo, redo → matches original advanced state', () => {
    const entry = makeEntry({ type: 'skill', name: 'Athletics', from: 0, to: 1, xpCost: 10 });
    const advanced = makeTestCharacter({
      bSkills: [
        { n: 'Athletics', c: 'Ag', a: 1 },
        { n: 'Cool', c: 'WP', a: 5 },
        { n: 'Dodge', c: 'Ag', a: 10 },
      ],
      xpCur: 490,
      xpSpent: 10,
      advancementLog: [entry],
    });

    const undoResult = undoAdvancement(advanced);
    expect(undoResult).not.toBeNull();
    const redoResult = redoAdvancement(undoResult!.character, undoResult!.undoneEntry);
    expect(redoResult).not.toBeNull();

    const ath = redoResult!.character.bSkills.find(s => s.n === 'Athletics');
    expect(ath!.a).toBe(1);
    expect(redoResult!.character.xpCur).toBe(advanced.xpCur);
    expect(redoResult!.character.xpSpent).toBe(advanced.xpSpent);
    expect(redoResult!.character.advancementLog).toHaveLength(1);
  });

  it('talent: acquire Strike Mighty Blow 0→1, undo, redo → matches original advanced state', () => {
    const entry = makeEntry({ type: 'talent', name: 'Strike Mighty Blow', from: 0, to: 1, xpCost: 100 });
    const advanced = makeTestCharacter({
      talents: [{ n: 'Strike Mighty Blow', lvl: 1, desc: '' }],
      xpCur: 400,
      xpSpent: 100,
      advancementLog: [entry],
    });

    const undoResult = undoAdvancement(advanced);
    expect(undoResult).not.toBeNull();
    // After undo, talent should be removed (level went to 0)
    expect(undoResult!.character.talents.find(t => t.n === 'Strike Mighty Blow')).toBeUndefined();

    const redoResult = redoAdvancement(undoResult!.character, undoResult!.undoneEntry);
    expect(redoResult).not.toBeNull();

    const talent = redoResult!.character.talents.find(t => t.n === 'Strike Mighty Blow');
    expect(talent).toBeDefined();
    expect(talent!.lvl).toBe(1);
    expect(redoResult!.character.xpCur).toBe(advanced.xpCur);
    expect(redoResult!.character.xpSpent).toBe(advanced.xpSpent);
    expect(redoResult!.character.advancementLog).toHaveLength(1);
  });
});

// ─── Property 2: Undo removes last log entry and returns it ──────────────────
// Validates: Requirements 1.1, 1.7

describe('Property 2: Undo removes last log entry and returns it', () => {
  it('single entry log → undo produces empty log, returned entry matches', () => {
    const entry = makeEntry({ type: 'characteristic', name: 'BS', from: 0, to: 1, xpCost: 25 });
    const char = makeTestCharacter({
      chars: (() => {
        const c: Record<CharacteristicKey, CharacteristicValue> = {} as any;
        for (const k of ALL_CHAR_KEYS) c[k] = { i: 30, a: 0, b: 0 };
        c.BS = { i: 30, a: 1, b: 0 };
        return c;
      })(),
      xpCur: 475,
      xpSpent: 25,
      advancementLog: [entry],
    });

    const result = undoAdvancement(char);
    expect(result).not.toBeNull();
    expect(result!.character.advancementLog).toHaveLength(0);
    expect(result!.undoneEntry).toEqual(entry);
  });

  it('multi-entry log (3 entries) → undo produces 2-entry log, returned entry is the last', () => {
    const entry1 = makeEntry({ timestamp: 1000, type: 'characteristic', name: 'WS', from: 0, to: 1, xpCost: 25 });
    const entry2 = makeEntry({ timestamp: 2000, type: 'skill', name: 'Athletics', from: 0, to: 1, xpCost: 10 });
    const entry3 = makeEntry({ timestamp: 3000, type: 'characteristic', name: 'T', from: 0, to: 1, xpCost: 25 });

    const char = makeTestCharacter({
      chars: (() => {
        const c: Record<CharacteristicKey, CharacteristicValue> = {} as any;
        for (const k of ALL_CHAR_KEYS) c[k] = { i: 30, a: 0, b: 0 };
        c.WS = { i: 30, a: 1, b: 0 };
        c.T = { i: 30, a: 1, b: 0 };
        return c;
      })(),
      bSkills: [
        { n: 'Athletics', c: 'Ag', a: 1 },
        { n: 'Cool', c: 'WP', a: 5 },
        { n: 'Dodge', c: 'Ag', a: 10 },
      ],
      xpCur: 440,
      xpSpent: 60,
      advancementLog: [entry1, entry2, entry3],
    });

    const result = undoAdvancement(char);
    expect(result).not.toBeNull();
    expect(result!.character.advancementLog).toHaveLength(2);
    expect(result!.character.advancementLog[0]).toEqual(entry1);
    expect(result!.character.advancementLog[1]).toEqual(entry2);
    expect(result!.undoneEntry).toEqual(entry3);
  });
});

// ─── Property 3: Undo restores XP, redo deducts XP ──────────────────────────
// Validates: Requirements 1.5, 2.5

describe('Property 3: Undo restores XP, redo deducts XP', () => {
  it.each([
    { type: 'characteristic', name: 'WS', xpCost: 25 },
    { type: 'skill', name: 'Athletics', xpCost: 10 },
    { type: 'characteristic', name: 'S', xpCost: 50 },
    { type: 'talent', name: 'Warrior Born', xpCost: 100 },
  ])('undo restores $xpCost XP for $type "$name", redo deducts it back', ({ type, name, xpCost }) => {
    const entry = makeEntry({ type, name, from: 0, to: 1, xpCost });

    // Build character in the "advanced" state
    const overrides: Partial<Character> = {
      xpCur: 500 - xpCost,
      xpSpent: xpCost,
      advancementLog: [entry],
    };
    if (type === 'characteristic') {
      const c: Record<CharacteristicKey, CharacteristicValue> = {} as any;
      for (const k of ALL_CHAR_KEYS) c[k] = { i: 30, a: 0, b: 0 };
      c[name as CharacteristicKey] = { i: 30, a: 1, b: 0 };
      overrides.chars = c;
    } else if (type === 'skill') {
      overrides.bSkills = [
        { n: 'Athletics', c: 'Ag', a: 1 },
        { n: 'Cool', c: 'WP', a: 5 },
        { n: 'Dodge', c: 'Ag', a: 10 },
      ];
    } else if (type === 'talent') {
      overrides.talents = [{ n: name, lvl: 1, desc: '' }];
    }

    const char = makeTestCharacter(overrides);

    // Undo: XP restored
    const undoResult = undoAdvancement(char);
    expect(undoResult).not.toBeNull();
    expect(undoResult!.character.xpCur).toBe(char.xpCur + xpCost);
    expect(undoResult!.character.xpSpent).toBe(char.xpSpent - xpCost);

    // Redo: XP deducted
    const redoResult = redoAdvancement(undoResult!.character, entry);
    expect(redoResult).not.toBeNull();
    expect(redoResult!.character.xpCur).toBe(char.xpCur);
    expect(redoResult!.character.xpSpent).toBe(char.xpSpent);
  });
});

// ─── Property 4: Undo decrements characteristic and skill advances ───────────
// Validates: Requirements 1.2, 1.3

describe('Property 4: Undo decrements characteristic and skill advances', () => {
  it('undo WS advance 0→1 → WS.a becomes 0', () => {
    const entry = makeEntry({ type: 'characteristic', name: 'WS', from: 0, to: 1, xpCost: 25 });
    const char = makeTestCharacter({
      chars: (() => {
        const c: Record<CharacteristicKey, CharacteristicValue> = {} as any;
        for (const k of ALL_CHAR_KEYS) c[k] = { i: 30, a: 0, b: 0 };
        c.WS = { i: 30, a: 1, b: 0 };
        return c;
      })(),
      xpCur: 475,
      xpSpent: 25,
      advancementLog: [entry],
    });

    const result = undoAdvancement(char);
    expect(result!.character.chars.WS.a).toBe(0);
  });

  it('undo T advance 3→4 → T.a becomes 3', () => {
    const entry = makeEntry({ type: 'characteristic', name: 'T', from: 3, to: 4, xpCost: 25 });
    const char = makeTestCharacter({
      chars: (() => {
        const c: Record<CharacteristicKey, CharacteristicValue> = {} as any;
        for (const k of ALL_CHAR_KEYS) c[k] = { i: 30, a: 0, b: 0 };
        c.T = { i: 30, a: 4, b: 0 };
        return c;
      })(),
      xpCur: 475,
      xpSpent: 25,
      advancementLog: [entry],
    });

    const result = undoAdvancement(char);
    expect(result!.character.chars.T.a).toBe(3);
  });

  it('undo Ag advance 10→11 → Ag.a becomes 10', () => {
    const entry = makeEntry({ type: 'characteristic', name: 'Ag', from: 10, to: 11, xpCost: 40 });
    const char = makeTestCharacter({
      chars: (() => {
        const c: Record<CharacteristicKey, CharacteristicValue> = {} as any;
        for (const k of ALL_CHAR_KEYS) c[k] = { i: 30, a: 0, b: 0 };
        c.Ag = { i: 30, a: 11, b: 0 };
        return c;
      })(),
      xpCur: 460,
      xpSpent: 40,
      advancementLog: [entry],
    });

    const result = undoAdvancement(char);
    expect(result!.character.chars.Ag.a).toBe(10);
  });

  it('undo skill Athletics advance 0→1 → Athletics.a becomes 0', () => {
    const entry = makeEntry({ type: 'skill', name: 'Athletics', from: 0, to: 1, xpCost: 10 });
    const char = makeTestCharacter({
      bSkills: [
        { n: 'Athletics', c: 'Ag', a: 1 },
        { n: 'Cool', c: 'WP', a: 5 },
        { n: 'Dodge', c: 'Ag', a: 10 },
      ],
      xpCur: 490,
      xpSpent: 10,
      advancementLog: [entry],
    });

    const result = undoAdvancement(char);
    const ath = result!.character.bSkills.find(s => s.n === 'Athletics');
    expect(ath!.a).toBe(0);
  });

  it('undo skill Cool advance 5→6 → Cool.a becomes 5', () => {
    const entry = makeEntry({ type: 'skill', name: 'Cool', from: 5, to: 6, xpCost: 15 });
    const char = makeTestCharacter({
      bSkills: [
        { n: 'Athletics', c: 'Ag', a: 0 },
        { n: 'Cool', c: 'WP', a: 6 },
        { n: 'Dodge', c: 'Ag', a: 10 },
      ],
      xpCur: 485,
      xpSpent: 15,
      advancementLog: [entry],
    });

    const result = undoAdvancement(char);
    const cool = result!.character.bSkills.find(s => s.n === 'Cool');
    expect(cool!.a).toBe(5);
  });

  it('undo advanced skill Language (Battle) advance 0→1 → a becomes 0', () => {
    const entry = makeEntry({ type: 'skill', name: 'Language (Battle)', from: 0, to: 1, xpCost: 10 });
    const char = makeTestCharacter({
      aSkills: [{ n: 'Language (Battle)', c: 'Int', a: 1 }],
      xpCur: 490,
      xpSpent: 10,
      advancementLog: [entry],
    });

    const result = undoAdvancement(char);
    const lang = result!.character.aSkills.find(s => s.n === 'Language (Battle)');
    expect(lang!.a).toBe(0);
  });
});

// ─── Property 5: Undo decrements talent level and removes at zero ────────────
// Validates: Requirements 1.4

describe('Property 5: Undo decrements talent level and removes at zero', () => {
  it('undo talent from 1→2 → talent level becomes 1', () => {
    const entry = makeEntry({ type: 'talent', name: 'Strike Mighty Blow', from: 1, to: 2, xpCost: 200 });
    const char = makeTestCharacter({
      talents: [{ n: 'Strike Mighty Blow', lvl: 2, desc: '' }],
      xpCur: 300,
      xpSpent: 200,
      advancementLog: [entry],
    });

    const result = undoAdvancement(char);
    expect(result).not.toBeNull();
    const talent = result!.character.talents.find(t => t.n === 'Strike Mighty Blow');
    expect(talent).toBeDefined();
    expect(talent!.lvl).toBe(1);
  });

  it('undo talent from 0→1 → talent is removed entirely', () => {
    const entry = makeEntry({ type: 'talent', name: 'Warrior Born', from: 0, to: 1, xpCost: 100 });
    const char = makeTestCharacter({
      talents: [{ n: 'Warrior Born', lvl: 1, desc: '' }],
      xpCur: 400,
      xpSpent: 100,
      advancementLog: [entry],
    });

    const result = undoAdvancement(char);
    expect(result).not.toBeNull();
    expect(result!.character.talents.find(t => t.n === 'Warrior Born')).toBeUndefined();
    expect(result!.character.talents).toHaveLength(0);
  });

  it('undo talent from 2→3 → talent level becomes 2, other talents unaffected', () => {
    const entry = makeEntry({ type: 'talent', name: 'Marksman', from: 2, to: 3, xpCost: 300 });
    const char = makeTestCharacter({
      talents: [
        { n: 'Warrior Born', lvl: 1, desc: '' },
        { n: 'Marksman', lvl: 3, desc: '' },
      ],
      xpCur: 200,
      xpSpent: 300,
      advancementLog: [entry],
    });

    const result = undoAdvancement(char);
    expect(result).not.toBeNull();
    expect(result!.character.talents.find(t => t.n === 'Marksman')!.lvl).toBe(2);
    expect(result!.character.talents.find(t => t.n === 'Warrior Born')!.lvl).toBe(1);
  });
});

// ─── Property 6: Redo increments characteristic and skill advances ───────────
// Validates: Requirements 2.2, 2.3

describe('Property 6: Redo increments characteristic and skill advances', () => {
  it('redo WS entry (0→1) → WS.a becomes 1', () => {
    const entry = makeEntry({ type: 'characteristic', name: 'WS', from: 0, to: 1, xpCost: 25 });
    const char = makeTestCharacter({ xpCur: 500 });

    const result = redoAdvancement(char, entry);
    expect(result).not.toBeNull();
    expect(result!.character.chars.WS.a).toBe(1);
  });

  it('redo BS entry (5→6) → BS.a becomes 6', () => {
    const entry = makeEntry({ type: 'characteristic', name: 'BS', from: 5, to: 6, xpCost: 30 });
    const char = makeTestCharacter({
      chars: (() => {
        const c: Record<CharacteristicKey, CharacteristicValue> = {} as any;
        for (const k of ALL_CHAR_KEYS) c[k] = { i: 30, a: 0, b: 0 };
        c.BS = { i: 30, a: 5, b: 0 };
        return c;
      })(),
      xpCur: 500,
    });

    const result = redoAdvancement(char, entry);
    expect(result).not.toBeNull();
    expect(result!.character.chars.BS.a).toBe(6);
  });

  it('redo skill Athletics entry (0→1) → Athletics.a becomes 1', () => {
    const entry = makeEntry({ type: 'skill', name: 'Athletics', from: 0, to: 1, xpCost: 10 });
    const char = makeTestCharacter({ xpCur: 500 });

    const result = redoAdvancement(char, entry);
    expect(result).not.toBeNull();
    const ath = result!.character.bSkills.find(s => s.n === 'Athletics');
    expect(ath!.a).toBe(1);
  });

  it('redo skill Cool entry (5→6) → Cool.a becomes 6', () => {
    const entry = makeEntry({ type: 'skill', name: 'Cool', from: 5, to: 6, xpCost: 15 });
    const char = makeTestCharacter({ xpCur: 500 });

    const result = redoAdvancement(char, entry);
    expect(result).not.toBeNull();
    const cool = result!.character.bSkills.find(s => s.n === 'Cool');
    expect(cool!.a).toBe(6);
  });

  it('redo advanced skill Language (Battle) entry (0→1) → a becomes 1', () => {
    const entry = makeEntry({ type: 'skill', name: 'Language (Battle)', from: 0, to: 1, xpCost: 10 });
    const char = makeTestCharacter({ xpCur: 500 });

    const result = redoAdvancement(char, entry);
    expect(result).not.toBeNull();
    const lang = result!.character.aSkills.find(s => s.n === 'Language (Battle)');
    expect(lang!.a).toBe(1);
  });
});

// ─── Property 7: Redo increments talent level and creates if missing ─────────
// Validates: Requirements 2.4

describe('Property 7: Redo increments talent level and creates if missing', () => {
  it('redo talent entry (0→1) on character without the talent → talent created with level 1', () => {
    const entry = makeEntry({ type: 'talent', name: 'Strike Mighty Blow', from: 0, to: 1, xpCost: 100 });
    const char = makeTestCharacter({ talents: [], xpCur: 500 });

    const result = redoAdvancement(char, entry);
    expect(result).not.toBeNull();
    const talent = result!.character.talents.find(t => t.n === 'Strike Mighty Blow');
    expect(talent).toBeDefined();
    expect(talent!.lvl).toBe(1);
  });

  it('redo talent entry (1→2) on character with talent at level 1 → level becomes 2', () => {
    const entry = makeEntry({ type: 'talent', name: 'Strike Mighty Blow', from: 1, to: 2, xpCost: 200 });
    const char = makeTestCharacter({
      talents: [{ n: 'Strike Mighty Blow', lvl: 1, desc: '' }],
      xpCur: 500,
    });

    const result = redoAdvancement(char, entry);
    expect(result).not.toBeNull();
    const talent = result!.character.talents.find(t => t.n === 'Strike Mighty Blow');
    expect(talent).toBeDefined();
    expect(talent!.lvl).toBe(2);
  });

  it('redo talent does not affect other existing talents', () => {
    const entry = makeEntry({ type: 'talent', name: 'Marksman', from: 0, to: 1, xpCost: 100 });
    const char = makeTestCharacter({
      talents: [{ n: 'Warrior Born', lvl: 1, desc: '' }],
      xpCur: 500,
    });

    const result = redoAdvancement(char, entry);
    expect(result).not.toBeNull();
    expect(result!.character.talents.find(t => t.n === 'Warrior Born')!.lvl).toBe(1);
    expect(result!.character.talents.find(t => t.n === 'Marksman')!.lvl).toBe(1);
  });
});

// ─── Property 8: No mutation of input Character ──────────────────────────────
// Validates: Requirements 5.1

describe('Property 8: No mutation of input Character', () => {
  it('undoAdvancement does not mutate the input character', () => {
    const entry = makeEntry({ type: 'characteristic', name: 'WS', from: 0, to: 1, xpCost: 25 });
    const char = makeTestCharacter({
      chars: (() => {
        const c: Record<CharacteristicKey, CharacteristicValue> = {} as any;
        for (const k of ALL_CHAR_KEYS) c[k] = { i: 30, a: 0, b: 0 };
        c.WS = { i: 30, a: 1, b: 0 };
        return c;
      })(),
      xpCur: 475,
      xpSpent: 25,
      advancementLog: [entry],
    });

    const snapshot = JSON.parse(JSON.stringify(char));
    undoAdvancement(char);
    expect(char).toEqual(snapshot);
  });

  it('redoAdvancement does not mutate the input character', () => {
    const entry = makeEntry({ type: 'skill', name: 'Athletics', from: 0, to: 1, xpCost: 10 });
    const char = makeTestCharacter({ xpCur: 500 });

    const snapshot = JSON.parse(JSON.stringify(char));
    redoAdvancement(char, entry);
    expect(char).toEqual(snapshot);
  });

  it('undoAdvancement does not mutate talent array', () => {
    const entry = makeEntry({ type: 'talent', name: 'Warrior Born', from: 0, to: 1, xpCost: 100 });
    const char = makeTestCharacter({
      talents: [{ n: 'Warrior Born', lvl: 1, desc: '' }],
      xpCur: 400,
      xpSpent: 100,
      advancementLog: [entry],
    });

    const snapshot = JSON.parse(JSON.stringify(char));
    undoAdvancement(char);
    expect(char).toEqual(snapshot);
  });

  it('redoAdvancement does not mutate the advancement log array', () => {
    const entry = makeEntry({ type: 'characteristic', name: 'WS', from: 0, to: 1, xpCost: 25 });
    const char = makeTestCharacter({ xpCur: 500, advancementLog: [] });

    const logBefore = char.advancementLog.length;
    redoAdvancement(char, entry);
    expect(char.advancementLog).toHaveLength(logBefore);
  });
});

// ─── Property 9: Redo with insufficient XP returns null ──────────────────────
// Validates: Requirements 2.7

describe('Property 9: Redo with insufficient XP returns null', () => {
  it('xpCur=0, redo entry with xpCost=25 → returns null', () => {
    const entry = makeEntry({ type: 'characteristic', name: 'WS', from: 0, to: 1, xpCost: 25 });
    const char = makeTestCharacter({ xpCur: 0 });

    const result = redoAdvancement(char, entry);
    expect(result).toBeNull();
  });

  it('xpCur=10, redo entry with xpCost=50 → returns null', () => {
    const entry = makeEntry({ type: 'characteristic', name: 'S', from: 15, to: 16, xpCost: 50 });
    const char = makeTestCharacter({ xpCur: 10 });

    const result = redoAdvancement(char, entry);
    expect(result).toBeNull();
  });

  it('xpCur=99, redo talent entry with xpCost=100 → returns null', () => {
    const entry = makeEntry({ type: 'talent', name: 'Warrior Born', from: 0, to: 1, xpCost: 100 });
    const char = makeTestCharacter({ xpCur: 99 });

    const result = redoAdvancement(char, entry);
    expect(result).toBeNull();
  });

  it('xpCur exactly equals xpCost → redo succeeds (boundary)', () => {
    const entry = makeEntry({ type: 'characteristic', name: 'WS', from: 0, to: 1, xpCost: 25 });
    const char = makeTestCharacter({ xpCur: 25 });

    const result = redoAdvancement(char, entry);
    expect(result).not.toBeNull();
    expect(result!.character.xpCur).toBe(0);
  });
});

// ─── Edge cases ──────────────────────────────────────────────────────────────
// Validates: Requirements 1.6, 4.1, 4.2, 4.3, 4.4

describe('Edge cases', () => {
  it('undo on empty advancement log → returns null', () => {
    const char = makeTestCharacter({ advancementLog: [] });
    const result = undoAdvancement(char);
    expect(result).toBeNull();
  });

  // ─── career_level undo/redo ────────────────────────────────────────────────

  it('undo career_level entry → reverts careerLevel and status to previous level', () => {
    // Soldier level1 = Recruit (Silver 1), level2 = Soldier (Silver 3)
    const entry = makeEntry({
      type: 'career_level',
      name: 'Soldier → Soldier',
      from: 1,
      to: 2,
      xpCost: 100,
      careerLevel: 'Soldier',
    });
    const char = makeTestCharacter({
      career: 'Soldier',
      careerLevel: 'Soldier',
      status: 'Silver 3',
      xpCur: 400,
      xpSpent: 100,
      advancementLog: [entry],
    });

    const result = undoAdvancement(char);
    expect(result).not.toBeNull();
    expect(result!.character.careerLevel).toBe('Recruit');
    expect(result!.character.status).toBe('Silver 1');
    expect(result!.character.xpCur).toBe(500);
    expect(result!.character.xpSpent).toBe(0);
  });

  it('redo career_level entry → advances careerLevel and status', () => {
    const entry = makeEntry({
      type: 'career_level',
      name: 'Soldier → Soldier',
      from: 1,
      to: 2,
      xpCost: 100,
      careerLevel: 'Recruit',
    });
    const char = makeTestCharacter({
      career: 'Soldier',
      careerLevel: 'Recruit',
      status: 'Silver 1',
      xpCur: 500,
    });

    const result = redoAdvancement(char, entry);
    expect(result).not.toBeNull();
    expect(result!.character.careerLevel).toBe('Soldier');
    expect(result!.character.status).toBe('Silver 3');
    expect(result!.character.xpCur).toBe(400);
    expect(result!.character.xpSpent).toBe(100);
  });

  it('undo career_level from level 2→3 → reverts to level 2', () => {
    // Soldier level2 = Soldier (Silver 3), level3 = Sergeant (Silver 5)
    const soldierScheme = CAREER_SCHEMES['Soldier'];
    const entry = makeEntry({
      type: 'career_level',
      name: 'Soldier → Sergeant',
      from: 2,
      to: 3,
      xpCost: 200,
      careerLevel: 'Sergeant',
    });
    const char = makeTestCharacter({
      career: 'Soldier',
      careerLevel: 'Sergeant',
      status: soldierScheme.level3.status,
      xpCur: 300,
      xpSpent: 200,
      advancementLog: [entry],
    });

    const result = undoAdvancement(char);
    expect(result).not.toBeNull();
    expect(result!.character.careerLevel).toBe(soldierScheme.level2.title);
    expect(result!.character.status).toBe(soldierScheme.level2.status);
  });

  // ─── career_switch undo/redo ───────────────────────────────────────────────

  it('undo career_switch entry → reverts career, class, careerLevel, status, careerPath', () => {
    // Switch from Soldier (Recruit) to Wizard (Wizard's Apprentice)
    const prevEntry = makeEntry({
      timestamp: 500,
      type: 'characteristic',
      name: 'WS',
      from: 0,
      to: 1,
      xpCost: 25,
      careerLevel: 'Recruit',
    });
    const switchEntry = makeEntry({
      timestamp: 1000,
      type: 'career_switch',
      name: 'Soldier → Wizard',
      from: 0,
      to: 0,
      xpCost: 100,
      careerLevel: "Wizard's Apprentice",
    });

    const char = makeTestCharacter({
      career: 'Wizard',
      class: 'Academics',
      careerLevel: "Wizard's Apprentice",
      status: 'Brass 3',
      careerPath: "Recruit → Wizard's Apprentice",
      xpCur: 375,
      xpSpent: 125,
      chars: (() => {
        const c: Record<CharacteristicKey, CharacteristicValue> = {} as any;
        for (const k of ALL_CHAR_KEYS) c[k] = { i: 30, a: 0, b: 0 };
        c.WS = { i: 30, a: 1, b: 0 };
        return c;
      })(),
      advancementLog: [prevEntry, switchEntry],
    });

    const result = undoAdvancement(char);
    expect(result).not.toBeNull();
    expect(result!.character.career).toBe('Soldier');
    expect(result!.character.class).toBe('Warriors');
    expect(result!.character.careerLevel).toBe('Recruit');
    expect(result!.character.status).toBe('Silver 1');
    expect(result!.character.careerPath).toBe('Recruit');
    expect(result!.character.xpCur).toBe(475);
    expect(result!.character.xpSpent).toBe(25);
  });

  it('redo career_switch entry → sets career, class, careerLevel, status, careerPath', () => {
    const switchEntry = makeEntry({
      type: 'career_switch',
      name: 'Soldier → Wizard',
      from: 0,
      to: 0,
      xpCost: 100,
      careerLevel: 'Recruit',
    });

    const char = makeTestCharacter({
      career: 'Soldier',
      class: 'Warriors',
      careerLevel: 'Recruit',
      status: 'Silver 1',
      careerPath: 'Recruit',
      xpCur: 500,
    });

    const result = redoAdvancement(char, switchEntry);
    expect(result).not.toBeNull();
    expect(result!.character.career).toBe('Wizard');
    expect(result!.character.class).toBe('Academics');
    expect(result!.character.careerLevel).toBe("Wizard's Apprentice");
    expect(result!.character.status).toBe('Brass 3');
    expect(result!.character.careerPath).toBe("Recruit → Wizard's Apprentice");
    expect(result!.character.xpCur).toBe(400);
    expect(result!.character.xpSpent).toBe(100);
  });
});
